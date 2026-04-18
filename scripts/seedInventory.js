/**
 * Seed Firestore `inventoryBatches` for tenant `tn_001` using Firebase Admin SDK.
 * Usage: node ./scripts/seedInventory.js
 */

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (e) {}

const tryLoad = (candidate) => {
  try {
    if (!candidate) return null;
    if (candidate.trim().startsWith('{')) return JSON.parse(candidate);
    const p = path.resolve(candidate);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { return null; }
};

const autoScanServiceAccount = () => {
  try {
    const os = require('os');
    const homedir = os.homedir();
    const walk = (dir, depth = 0) => {
      if (depth > 4) return null;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isFile() && /firebase-adminsdk|service.*account|-firebase-adminsdk-/i.test(ent.name)) {
          const loaded = tryLoad(full);
          if (loaded) return loaded;
        }
        if (ent.isDirectory()) {
          const res = walk(full, depth + 1);
          if (res) return res;
        }
      }
      return null;
    };
    const starts = [path.join(homedir, 'Downloads'), homedir, process.cwd()];
    for (const s of starts) {
      const r = walk(s, 0);
      if (r) return r;
    }
  } catch (e) {}
  return null;
};

async function main() {
  let serviceAccount = null;
  if (process.env.SERVICE_ACCOUNT_JSON) serviceAccount = tryLoad(process.env.SERVICE_ACCOUNT_JSON);
  if (!serviceAccount && process.env.SERVICE_ACCOUNT_PATH) serviceAccount = tryLoad(process.env.SERVICE_ACCOUNT_PATH);
  if (!serviceAccount) serviceAccount = autoScanServiceAccount();

  if (!serviceAccount) {
    console.error('No service account found. Set SERVICE_ACCOUNT_PATH or SERVICE_ACCOUNT_JSON, or place key in Downloads.');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const tenantId = 'tn_001';

  // fetch products for tenant
  const productsSnap = await db.collection('products').where('tenantId', '==', tenantId).get();
  if (productsSnap.empty) {
    console.warn('No products found for tenant', tenantId);
    process.exit(0);
  }

  for (const pDoc of productsSnap.docs) {
    const p = pDoc.data();
    const qty = (p.stock && Number(p.stock)) || 10;
    const batchRef = db.collection('inventoryBatches').doc();
    await batchRef.set({
      tenantId,
      productId: pDoc.id,
      quantity: qty,
      remainingQuantity: qty,
      cost: p.cost ?? null,
      supplierId: null,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiryDate: null,
      createdBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: 'seeded batch',
    });

    await db.collection('inventoryTransactions').doc().set({
      tenantId,
      productId: pDoc.id,
      type: 'stock_in',
      quantity: qty,
      batchId: batchRef.id,
      relatedId: null,
      reason: 'seed',
      meta: {},
      createdBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Wrote batch for product', pDoc.id, 'qty', qty);
  }

  console.log('Inventory seeding complete');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
