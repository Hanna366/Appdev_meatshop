import type { Product } from '../../product/types/productTypes';
import type { PurchaseOrder } from '../../purchase/types/purchaseTypes';
import type { SaleRecord } from '../../sales/types/salesTypes';
import type { ProductInventorySummary } from '../../inventory/types/inventoryTypes';

type ReportSnapshot = {
  sales: SaleRecord[];
  purchases: PurchaseOrder[];
  inventorySummaries: ProductInventorySummary[];
  products: Product[];
};

export function buildBusinessReport(snapshot: ReportSnapshot) {
  const grossSales = snapshot.sales.reduce((sum, sale) => sum + sale.subtotal, 0);
  const totalOrders = snapshot.sales.length;
  const avgTicket = totalOrders > 0 ? grossSales / totalOrders : 0;
  const totalWeightSold = snapshot.sales.reduce((sum, sale) => sum + sale.totalWeightKg, 0);
  const pendingOfflineSales = snapshot.sales.filter((sale) => sale.status === 'queued_offline').length;
  const receivedPurchases = snapshot.purchases.filter((purchase) => purchase.status === 'received').length;
  const openPurchases = snapshot.purchases.filter((purchase) => purchase.status !== 'received').length;
  const lowStockCount = snapshot.inventorySummaries.filter((item) => item.lowStock).length;
  const outOfStockCount = snapshot.inventorySummaries.filter((item) => (item.totalQuantity ?? 0) <= 0).length;
  const inventoryValueEstimate = snapshot.products.reduce(
    (sum, product) => sum + Number(product.price ?? 0) * Number(product.stock ?? 0),
    0,
  );

  const productTotals = new Map<string, { productName: string; weightKg: number; revenue: number }>();
  snapshot.sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const current = productTotals.get(line.productId) ?? {
        productName: line.productName,
        weightKg: 0,
        revenue: 0,
      };
      current.weightKg += line.weightKg;
      current.revenue += line.lineTotal;
      productTotals.set(line.productId, current);
    });
  });

  const topSellingProducts = Array.from(productTotals.values())
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  return {
    grossSales,
    totalOrders,
    avgTicket,
    totalWeightSold,
    pendingOfflineSales,
    receivedPurchases,
    openPurchases,
    lowStockCount,
    outOfStockCount,
    inventoryValueEstimate,
    topSellingProducts,
  };
}

export function buildSalesCsv(sales: SaleRecord[]): string {
  const rows = ['sale_id,created_at,customer,payment_method,status,mode,total_weight_kg,subtotal'];
  sales.forEach((sale) => {
    rows.push(
      [
        sale.id,
        sale.createdAt,
        sanitizeCsvValue(sale.customerName ?? 'Walk-in'),
        sale.paymentMethod,
        sale.status,
        sale.mode,
        sale.totalWeightKg.toFixed(2),
        sale.subtotal.toFixed(2),
      ].join(','),
    );
  });
  return rows.join('\n');
}

export function buildInventoryCsv(inventorySummaries: ProductInventorySummary[]): string {
  const rows = ['product_id,product_name,total_quantity,batches_count,next_expiry'];
  inventorySummaries.forEach((summary) => {
    rows.push(
      [
        summary.productId,
        sanitizeCsvValue(summary.productName ?? summary.productId),
        Number(summary.totalQuantity ?? 0).toFixed(2),
        String(summary.batchesCount ?? 0),
        sanitizeCsvValue(String(summary.nextExpiryDate ?? '')),
      ].join(','),
    );
  });
  return rows.join('\n');
}

export function buildPurchasesCsv(purchases: PurchaseOrder[]): string {
  const rows = ['purchase_id,created_at,supplier,product,quantity,cost,status,expiry_date'];
  purchases.forEach((purchase) => {
    rows.push(
      [
        purchase.id,
        purchase.createdAt,
        sanitizeCsvValue(purchase.supplierName),
        sanitizeCsvValue(purchase.productName),
        purchase.quantity.toFixed(2),
        purchase.cost.toFixed(2),
        purchase.status,
        sanitizeCsvValue(purchase.expiryDate ?? ''),
      ].join(','),
    );
  });
  return rows.join('\n');
}

function sanitizeCsvValue(value: string): string {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}
