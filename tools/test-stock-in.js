// Quick test runner to call createStockIn against the local emulator.
(async () => {
  try {
    // Make getDb detect emulator by mimicking a browser localhost
    global.window = { location: { hostname: 'localhost' } };

    // small delay helper
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // import the service
    const svc = await import('../src/features/inventory/services/inventoryService');

    console.log('Calling createStockIn...');
    const batchId = await svc.createStockIn({
      tenantId: 'test-tenant',
      productId: 'test-product',
      quantity: 3,
      cost: 12,
      expiryDate: '2026-08-09',
      userId: 'tester',
      notes: 'automated test',
    });
    console.log('createStockIn returned batchId:', batchId);

    // wait a moment then query transactions and batches
    await wait(500);
    const firestore = await import('firebase/firestore');
    const { getFirestore, collection, query, where, getDocs } = firestore;
    const fb = await import('../src/lib/firebase');
    const db = await fb.getDb();
    const txQ = query(collection(db, 'inventoryTransactions'), where('tenantId', '==', 'test-tenant'));
    const txSnap = await getDocs(txQ);
    console.log('Found transactions:', txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const bQ = query(collection(db, 'inventoryBatches'), where('tenantId', '==', 'test-tenant'));
    const bSnap = await getDocs(bQ);
    console.log('Found batches:', bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  }
})();
