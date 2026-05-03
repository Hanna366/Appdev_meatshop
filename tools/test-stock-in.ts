// Test the TypeScript client service `createStockIn` against the local emulator.
(async () => {
  try {
    // make firebase client code detect emulator wiring (lib/firebase checks window.location.hostname)
    (global as any).window = { location: { hostname: 'localhost' } };

    const svc = await import('../src/features/inventory/services/inventoryService');
    console.log('Calling client createStockIn()...');
    const batchId = await svc.createStockIn({
      tenantId: 'test-tenant',
      productId: 'test-product',
      quantity: 2,
      cost: 7.5,
      expiryDate: '2026-09-01',
      userId: 'ts-tester',
      notes: 'ts-node integration test',
    });
    console.log('createStockIn returned batchId:', batchId);

    const fb = await import('../src/lib/firebase');
    const firestore = await import('firebase/firestore');
    const db = await fb.getDb();

    const txQ = firestore.query(firestore.collection(db, 'inventoryTransactions'), firestore.where('tenantId', '==', 'test-tenant'));
    const txSnap = await firestore.getDocs(txQ);
    console.log('Transactions:', txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const bQ = firestore.query(firestore.collection(db, 'inventoryBatches'), firestore.where('tenantId', '==', 'test-tenant'));
    const bSnap = await firestore.getDocs(bQ);
    console.log('Batches:', bSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    process.exit(0);
  } catch (err) {
    console.error('client test failed:', err);
    process.exitCode = 1;
  }
})();
