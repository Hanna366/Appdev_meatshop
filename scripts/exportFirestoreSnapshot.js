/**
 * Exports a snapshot of products and inventory for tenant `tn_001` to
 * `src/config/firestoreSnapshot.json` for local dev use when client Firebase
 * config is not present.
 *
 * Usage: node ./scripts/exportFirestoreSnapshot.js
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let serviceAccount = null;
  try {
    const p = path.resolve('service-account.json');
    if (fs.existsSync(p)) serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}

  if (!serviceAccount) {
    console.error('service-account.json not found in project root. Place your admin key there to export snapshot.');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const tenantId = process.env.TENANT_ID || 'tn_001';

  const productsSnap = await db.collection('products').where('tenantId', '==', tenantId).get();
  const products = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

  const batchesSnap = await db.collection('inventoryBatches').where('tenantId', '==', tenantId).get();
  const batches = batchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

  let txSnap;
  try {
    txSnap = await db.collection('inventoryTransactions').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').get();
  } catch (e) {
    // fallback if composite index not present
    txSnap = await db.collection('inventoryTransactions').where('tenantId', '==', tenantId).get();
  }
  const transactions = txSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

  const out = { tenantId, products, batches, transactions };
  const outPath = path.join('src', 'config', 'firestoreSnapshot.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote snapshot to', outPath);
}

main().catch((err) => { console.error(err); process.exit(1); });
