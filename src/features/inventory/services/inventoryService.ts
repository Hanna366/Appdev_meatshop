import { getDb } from '../../../lib/firebase';
import type {
  InventoryBatch,
  InventoryTransaction,
  ProductInventorySummary,
  StockInInput,
  StockAdjustmentInput,
  WasteLogInput,
} from '../types/inventoryTypes';

// Firestore collection names
const BATCHES = 'inventoryBatches';
const TRANSACTIONS = 'inventoryTransactions';

export async function fetchBatchesByProduct(tenantId: string, productId: string) {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(
    firestore.collection(db, BATCHES),
    firestore.where('tenantId', '==', tenantId),
    firestore.where('productId', '==', productId),
    firestore.where('remainingQuantity', '>', 0),
    firestore.orderBy('receivedAt', 'asc'),
  );
  const snap = await firestore.getDocs(q);
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as InventoryBatch) }));
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
  const prodDocs = await Promise.all(productIds.map((pid: any) => firestore.getDoc(firestore.doc(db, 'products', pid)).catch(() => null)));
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
  const q = firestore.query(firestore.collection(db, 'products'), firestore.where('tenantId', '==', tenantId));
  const snap = await firestore.getDocs(q);
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

// Stock in against a product: atomically update product.stock and write an inventory transaction.
export async function stockInProduct(input: StockInInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  const productRef = firestore.doc(db, 'products', input.productId);
  const txRef = firestore.collection(db, TRANSACTIONS);

  await firestore.runTransaction(db, async (tx: any) => {
    const prodSnap = await tx.get(productRef as any);
    if (!prodSnap.exists()) throw new Error('product not found');
    const prod = prodSnap.data() as any;
    const current = Number(prod.stock ?? 0);
    const newStock = current + input.quantity;
    tx.update(productRef as any, { stock: newStock });

    // create transaction record
    const tDoc = firestore.doc(txRef);
    tx.set(tDoc, {
      tenantId: input.tenantId,
      productId: input.productId,
      type: 'stock_in',
      quantity: input.quantity,
      batchId: null,
      relatedId: null,
      reason: 'receive',
      meta: { cost: input.cost ?? null, notes: input.notes ?? null },
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
    } as any);
  });
}

export async function createStockIn(input: StockInInput): Promise<string> {
  // Transactionally create a batch, update product.stock, and write a transaction
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  const batchRef = firestore.doc(firestore.collection(db, BATCHES));
  const txRef = firestore.doc(firestore.collection(db, TRANSACTIONS));
  const productRef = firestore.doc(db, 'products', input.productId);

  await firestore.runTransaction(db, async (tx: any) => {
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
    const prodSnap = await tx.get(productRef as any);
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
      meta: { supplierId: input.supplierId ?? null },
      createdBy: input.userId ?? null,
      createdAt: firestore.serverTimestamp(),
    } as any);
  });

  return batchRef.id;
}

// create stock out (consumes batches FIFO). Returns list of transactions created.
export async function createStockOut(tenantId: string, productId: string, quantity: number, userId?: string) {
  if (quantity <= 0) throw new Error('quantity must be > 0');

  const transactions: string[] = [];

  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  await firestore.runTransaction(db, async (tx: any) => {
    const batchesQ = firestore.query(
      firestore.collection(db, BATCHES),
      firestore.where('tenantId', '==', tenantId),
      firestore.where('productId', '==', productId),
      firestore.where('remainingQuantity', '>', 0),
      firestore.orderBy('receivedAt', 'asc'),
    );
    const snap = await firestore.getDocs(batchesQ);
    let remaining = quantity;
    for (const docSnap of snap.docs) {
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
        relatedId: null,
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
    } else {
      // FIFO depletion similar to stock_out
      let remaining = qty;
      const batchesQ = firestore.query(
        firestore.collection(db, BATCHES),
        firestore.where('tenantId', '==', tenantId),
        firestore.where('productId', '==', productId),
        firestore.where('remainingQuantity', '>', 0),
        firestore.orderBy('receivedAt', 'asc'),
      );
      const snap = await firestore.getDocs(batchesQ);
      for (const docSnap of snap.docs) {
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
      }

      if (remaining > 0) {
        throw new Error('Insufficient stock to log waste for requested quantity');
      }
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
