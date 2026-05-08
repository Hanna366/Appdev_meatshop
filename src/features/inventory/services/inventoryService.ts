import { getDb } from '../../../lib/firebase';
import type {
  InventoryBatch,
  InventoryTransaction,
  ProductInventorySummary,
  StockInInput,
  StockAdjustmentInput,
  WasteLogInput,
} from '../types/inventoryTypes';
import type { SaleRecord } from '../../sales/types/salesTypes';

// Firestore collection names
const BATCHES = 'inventoryBatches';
const TRANSACTIONS = 'inventoryTransactions';
const SALES = 'sales';

function compareDateLike(left: unknown, right: unknown): number {
  const toMillis = (value: unknown) => {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as any).toMillis === 'function') {
      return (value as any).toMillis();
    }

    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate().getTime();
    }

    const parsed = new Date(String(value ?? '')).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return toMillis(left) - toMillis(right);
}

async function fetchOpenBatchDocs(firestore: any, db: any, tenantId: string, productId: string) {
  try {
    const q = firestore.query(
      firestore.collection(db, BATCHES),
      firestore.where('tenantId', '==', tenantId),
      firestore.where('productId', '==', productId),
      firestore.orderBy('receivedAt', 'asc'),
    );
    const snap = await firestore.getDocs(q);
    return snap.docs;
  } catch (error: any) {
    const message = String(error?.message ?? error);
    const code = String(error?.code ?? '');
    const isMissingIndex = code === 'failed-precondition' || message.includes('requires an index');

    if (!isMissingIndex) {
      throw error;
    }

    const fallbackQ = firestore.query(
      firestore.collection(db, BATCHES),
      firestore.where('tenantId', '==', tenantId),
    );
    const fallbackSnap = await firestore.getDocs(fallbackQ);
    return fallbackSnap.docs
      .filter((docSnap: any) => {
        const data = docSnap.data() as InventoryBatch;
        return data.productId === productId;
      })
      .sort((left: any, right: any) => {
        const leftData = left.data() as InventoryBatch;
        const rightData = right.data() as InventoryBatch;
        return compareDateLike(leftData.receivedAt, rightData.receivedAt);
      });
  }
}

export async function fetchBatchesByProduct(tenantId: string, productId: string) {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const docs = await fetchOpenBatchDocs(firestore, db, tenantId, productId);
  return docs
    .map((d: any) => ({ id: d.id, ...(d.data() as InventoryBatch) }))
    .filter((b: any) => (b.remainingQuantity || 0) > 0);
}

export async function fetchInventoryByTenant(tenantId: string): Promise<ProductInventorySummary[]> {
  // Aggregate batches per product. Simple client-side aggregation.
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(firestore.collection(db, BATCHES), firestore.where('tenantId', '==', tenantId));
  const snap = await firestore.getDocs(q);

  const map = new Map<string, ProductInventorySummary>();
  snap.docs.forEach((d: any) => {
    const b = d.data() as InventoryBatch;
    const pid = b.productId;
    if (!map.has(pid)) {
      map.set(pid, {
        productId: pid,
        tenantId,
        productName: undefined,
        totalQuantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: undefined,
        lowStock: false,
        batchesCount: 0,
        nextExpiryDate: null,
      });
    }
    const s = map.get(pid)!;
    s.totalQuantity += b.remainingQuantity;
    s.batchesCount += 1;
    if (!s.nextExpiryDate && b.expiryDate) s.nextExpiryDate = b.expiryDate;
    else if (b.expiryDate && s.nextExpiryDate && new Date(String(b.expiryDate)).getTime() < new Date(String(s.nextExpiryDate)).getTime()) {
      s.nextExpiryDate = b.expiryDate;
    }
  });

  return Array.from(map.values());
}

// enhanced fetch that also resolves product metadata (name, unit, lowStockThreshold)
export async function fetchInventoryByTenantWithProducts(tenantId: string): Promise<ProductInventorySummary[]> {
  const summaries = await fetchInventoryByTenant(tenantId);
  if (summaries.length === 0) return summaries;

  // fetch product documents for these productIds
  const db = await getDb();
  if (!db) return summaries;
  const firestore: any = await import('firebase/firestore');
  const productIds = summaries.map((s) => s.productId);
  const prodDocs = await Promise.all(
    productIds.map((pid: any) =>
      firestore.getDoc(firestore.doc(db, 'tenants', tenantId, 'products', pid)).catch(() => null),
    ),
  );
  const productMap = new Map<string, any>();
  prodDocs.forEach((d) => {
    if (d && d.exists()) productMap.set(d.id, d.data());
  });

  return summaries.map((s) => {
    const prod = productMap.get(s.productId);
    const productName = prod?.name ?? s.productId;
    const unit = prod?.unit ?? '';
    const lowStockThreshold = prod?.lowStockThreshold ?? prod?.reorderThreshold ?? undefined;
    const lowStock = typeof lowStockThreshold === 'number' ? s.totalQuantity <= lowStockThreshold : false;
    return { ...s, productName, lowStockThreshold, lowStock, unit } as ProductInventorySummary & { unit?: string };
  });
}

// If there are no batches, fall back to using the products collection as the inventory source.
export async function fetchInventoryFromProducts(tenantId: string): Promise<ProductInventorySummary[]> {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const snap = await firestore.getDocs(firestore.collection(db, 'tenants', tenantId, 'products'));
  return snap.docs.map((d: any) => {
    const pdata: any = d.data();
    const totalQuantity = Number(pdata.stock ?? 0);
    return {
      productId: d.id,
      tenantId,
      productName: pdata.name,
      totalQuantity,
      reservedQuantity: 0,
      lowStockThreshold: pdata.lowStockThreshold ?? pdata.reorderThreshold ?? undefined,
      lowStock: typeof (pdata.lowStockThreshold ?? pdata.reorderThreshold) === 'number'
        ? totalQuantity <= (pdata.lowStockThreshold ?? pdata.reorderThreshold)
        : false,
      batchesCount: 0,
      nextExpiryDate: null,
      unit: pdata.unit ?? undefined,
    } as any;
  });
}

// Backward-compatible wrapper: receiving stock should always create a batch.
export async function stockInProduct(input: StockInInput): Promise<void> {
  await createStockIn(input);
}

export async function createStockIn(input: StockInInput): Promise<string> {
  // Transactionally create a batch, update product.stock, and write a transaction
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  const batchRef = firestore.doc(firestore.collection(db, BATCHES));
  const txRef = firestore.doc(firestore.collection(db, TRANSACTIONS));
  const productRef = firestore.doc(db, 'tenants', input.tenantId, 'products', input.productId);

  await firestore.runTransaction(db, async (tx: any) => {
    // Firestore transactions require every read to happen before any write.
    const prodSnap = await tx.get(productRef as any);

    // create batch
    tx.set(batchRef, {
      tenantId: input.tenantId,
      productId: input.productId,
      quantity: input.quantity,
      remainingQuantity: input.quantity,
      cost: input.cost ?? null,
      supplierId: input.supplierId ?? null,
      receivedAt: input.receivedAt ?? firestore.serverTimestamp(),
      expiryDate: input.expiryDate ?? null,
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
      notes: input.notes ?? null,
    } as any);

    // update product stock if exists
    if (prodSnap.exists()) {
      const prod = prodSnap.data() as any;
      const current = Number(prod.stock ?? 0);
      tx.update(productRef as any, { stock: current + input.quantity });
    }

    // create transaction record
    tx.set(txRef, {
      tenantId: input.tenantId,
      productId: input.productId,
      type: 'stock_in',
      quantity: input.quantity,
      batchId: batchRef.id,
      relatedId: null,
      reason: 'receive',
      meta: {
        supplierId: input.supplierId ?? null,
        cost: input.cost ?? null,
        expiryDate: input.expiryDate ?? null,
        notes: input.notes ?? null,
      },
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
    } as any);
  });

  return batchRef.id;
}

// create stock out (consumes batches FIFO). Returns list of transactions created.
export async function createStockOut(
  tenantId: string,
  productId: string,
  quantity: number,
  userId?: string,
  relatedId?: string,
  sale?: SaleRecord,
) {
  if (quantity <= 0) throw new Error('quantity must be > 0');

  const transactions: string[] = [];

  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  await firestore.runTransaction(db, async (tx: any) => {
    const productRef = firestore.doc(db, 'tenants', tenantId, 'products', productId);
    const productSnap = await tx.get(productRef as any);
    const batchDocs = await fetchOpenBatchDocs(firestore, db, tenantId, productId);
    let remaining = quantity;
    for (const docSnap of batchDocs) {
      if (remaining <= 0) break;
      const data = docSnap.data() as InventoryBatch;
      const available = data.remainingQuantity || 0;
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      const batchRef = firestore.doc(db, BATCHES, docSnap.id);
      tx.update(batchRef, { remainingQuantity: available - take });

      // add transaction doc
      const tRef = firestore.doc(firestore.collection(db, TRANSACTIONS));
      tx.set(tRef, {
        tenantId,
        productId,
        type: 'stock_out',
        quantity: -take,
        batchId: docSnap.id,
        relatedId: relatedId ?? null,
        reason: 'sale',
        meta: {},
        createdBy: userId ?? null,
        createdAt: firestore.serverTimestamp(),
      } as any);
      transactions.push(tRef.id);
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error('Insufficient stock to fulfill stock out');
    }

    if (productSnap.exists()) {
      const product = productSnap.data() as any;
      const current = Number(product.stock ?? 0);
      tx.update(productRef as any, { stock: Math.max(0, current - quantity) });
    }

    if (sale) {
      const saleRef = firestore.doc(db, SALES, sale.id);
      tx.set(
        saleRef,
        {
          ...sale,
          updatedAt: firestore.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  return transactions;
}

export async function createWasteLog(input: WasteLogInput): Promise<string[]> {
  // Treat as stock_out with reason 'waste'. Deplete specific batch if provided, otherwise FIFO.
  const tenantId = input.tenantId;
  const productId = input.productId;
  const qty = input.quantity;
  if (qty <= 0) throw new Error('quantity must be > 0');

  const results: string[] = [];
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  await firestore.runTransaction(db, async (tx: any) => {
    let totalRemoved = 0;
    const productRef = firestore.doc(db, 'tenants', tenantId, 'products', productId);
    const productSnap = await tx.get(productRef as any);

    if (input.batchId) {
      const bRef = firestore.doc(db, BATCHES, input.batchId);
      const bSnap = await tx.get(bRef);
      if (!bSnap.exists()) throw new Error('batch not found');
      const b = bSnap.data() as InventoryBatch;
      const take = Math.min(b.remainingQuantity, qty);
      tx.update(bRef, { remainingQuantity: b.remainingQuantity - take });
      const tRef = firestore.doc(firestore.collection(db, TRANSACTIONS));
      tx.set(tRef, {
        tenantId,
        productId,
        type: 'waste',
        quantity: -take,
        batchId: input.batchId,
        relatedId: null,
        reason: input.reason,
        meta: { notes: input.notes ?? null },
        createdBy: input.userId ?? null,
        createdAt: firestore.serverTimestamp(),
      } as any);
      results.push(tRef.id);
      totalRemoved += take;
    } else {
      // FIFO depletion similar to stock_out
      let remaining = qty;
      const batchDocs = await fetchOpenBatchDocs(firestore, db, tenantId, productId);
      for (const docSnap of batchDocs) {
        if (remaining <= 0) break;
        const data = docSnap.data() as InventoryBatch;
        const available = data.remainingQuantity || 0;
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        const batchRef = firestore.doc(db, BATCHES, docSnap.id);
        tx.update(batchRef, { remainingQuantity: available - take });
        const tRef = firestore.doc(firestore.collection(db, TRANSACTIONS));
        tx.set(tRef, {
          tenantId,
          productId,
          type: 'waste',
          quantity: -take,
          batchId: docSnap.id,
          relatedId: null,
          reason: input.reason,
          meta: { notes: input.notes ?? null },
          createdBy: input.userId ?? null,
          createdAt: firestore.serverTimestamp(),
        } as any);
        results.push(tRef.id);
        remaining -= take;
        totalRemoved += take;
      }

      if (remaining > 0) {
        throw new Error('Insufficient stock to log waste for requested quantity');
      }
    }

    if (productSnap.exists()) {
      const product = productSnap.data() as any;
      const current = Number(product.stock ?? 0);
      tx.update(productRef as any, { stock: Math.max(0, current - totalRemoved) });
    }
  });

  return results;
}

export async function adjustStock(input: StockAdjustmentInput): Promise<string> {
  // record adjustment as transaction; do not touch batches unless negative, then deplete FIFO
  if (input.quantity === 0) throw new Error('no adjustment requested');

  if (input.quantity < 0) {
    // deplete FIFO
    await createStockOut(input.tenantId, input.productId, Math.abs(input.quantity), input.userId);
  } else {
    // positive adjustment: create a synthetic batch representing adjustment
    const db = await getDb();
    if (!db) throw new Error('Firestore not initialized');
    const firestore: any = await import('firebase/firestore');
    const batchRef = await firestore.addDoc(firestore.collection(db, BATCHES), {
      tenantId: input.tenantId,
      productId: input.productId,
      quantity: input.quantity,
      remainingQuantity: input.quantity,
      cost: null,
      supplierId: null,
      receivedAt: firestore.serverTimestamp(),
      expiryDate: null,
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
      notes: `adjustment:${input.reason}`,
    });
    await firestore.addDoc(firestore.collection(db, TRANSACTIONS), {
      tenantId: input.tenantId,
      productId: input.productId,
      type: 'adjustment',
      quantity: input.quantity,
      batchId: batchRef.id,
      relatedId: null,
      reason: input.reason,
      meta: { notes: input.notes ?? null },
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
    } as any);

    const productRef = firestore.doc(db, 'tenants', input.tenantId, 'products', input.productId);
    const productSnap = await firestore.getDoc(productRef);
    if (productSnap.exists()) {
      const product = productSnap.data() as any;
      const current = Number(product.stock ?? 0);
      await firestore.setDoc(
        productRef,
        { stock: current + input.quantity, updatedAt: firestore.serverTimestamp() },
        { merge: true },
      );
    }

    return batchRef.id;
  }

  return 'ok';
}

export async function fetchInventoryTransactions(tenantId: string, productId?: string) {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const q = productId
    ? firestore.query(
        firestore.collection(db, TRANSACTIONS),
        firestore.where('tenantId', '==', tenantId),
        firestore.where('productId', '==', productId),
        firestore.orderBy('createdAt', 'desc'),
      )
    : firestore.query(firestore.collection(db, TRANSACTIONS), firestore.where('tenantId', '==', tenantId), firestore.orderBy('createdAt', 'desc'));

  const snap = await firestore.getDocs(q);
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as InventoryTransaction) }));
}
