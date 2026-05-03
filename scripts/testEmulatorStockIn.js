// Test harness using firebase-admin to simulate a Stock In write against emulator
const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const PROJECT_ID = 'appdev-3d42e';

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  const tenantId = 'test-tenant';
  const productId = 'test-product';

  // ensure product exists to test product.stock update path
  const prodRef = db.collection('products').doc(productId);
  await prodRef.set({ name: 'Test Product', tenantId, stock: 2 }, { merge: true });
  console.log('Ensured product exists with id', productId);

  // create batch
  const batchRef = db.collection('inventoryBatches').doc();
  await batchRef.set({
    tenantId,
    productId,
    quantity: 3,
    remainingQuantity: 3,
    cost: 12,
    supplierId: null,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiryDate: '2026-08-09',
    createdBy: 'tester',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notes: 'test stock in',
  });
  console.log('Wrote batch', batchRef.id);

  // update product stock
  const prodSnap = await prodRef.get();
  if (prodSnap.exists) {
    const prod = prodSnap.data();
    const current = Number(prod.stock ?? 0);
    await prodRef.update({ stock: current + 3 });
    console.log('Updated product stock to', current + 3);
  }

  // write transaction
  const txRef = db.collection('inventoryTransactions').doc();
  await txRef.set({
    tenantId,
    productId,
    type: 'stock_in',
    quantity: 3,
    batchId: batchRef.id,
    relatedId: null,
    reason: 'receive',
    meta: { supplierId: null },
    createdBy: 'tester',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Wrote transaction', txRef.id);

  // read back
  const txs = await db.collection('inventoryTransactions').where('tenantId', '==', tenantId).get();
  console.log('Transactions count:', txs.size);
  txs.forEach(d => console.log(d.id, d.data()));

  const batches = await db.collection('inventoryBatches').where('tenantId', '==', tenantId).get();
  console.log('Batches count:', batches.size);
  batches.forEach(d => console.log(d.id, d.data()));

  const prodAfter = await prodRef.get();
  console.log('Product after:', prodAfter.id, prodAfter.data());

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
