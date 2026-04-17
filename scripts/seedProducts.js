/**
 * Seed Firestore `products` collection for tenant `tn_001` using Firebase Admin SDK.
 * Usage:
 * 1) Ensure `firebase-admin` is installed and a service account is available (SERVICE_ACCOUNT_PATH or SERVICE_ACCOUNT_JSON)
 * 2) Run: `node ./scripts/seedProducts.js`
 */

const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config();
} catch (e) {}

const tryLoad = (candidate) => {
  try {
    if (!candidate) return null;
    if (candidate.trim().startsWith('{')) return JSON.parse(candidate);
    const p = path.resolve(candidate);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
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

  const products = [
    { name: 'Ribeye Steak', type: 'Prime', unit: 'kg', price: 39.5, stock: 16 },
    { name: 'Tenderloin', type: 'Premium', unit: 'kg', price: 42, stock: 11 },
    { name: 'Sirloin', type: 'Select', unit: 'kg', price: 28.75, stock: 20 },
    { name: 'Chuck Roast', type: 'Choice', unit: 'kg', price: 19.25, stock: 26 },
    { name: 'Beef Liver', type: 'Byproduct', unit: 'kg', price: 8.5, stock: 34 },
    { name: 'Short Ribs', type: 'Prime', unit: 'kg', price: 31, stock: 14 },
    { name: 'Brisket', type: 'Premium', unit: 'kg', price: 26.4, stock: 18 },
    { name: 'Ground Beef', type: 'Choice', unit: 'kg', price: 14.9, stock: 40 },
  ];

  for (const p of products) {
    const docRef = db.collection('products').doc();
    await docRef.set({ ...p, tenantId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('Wrote product', docRef.id, p.name);
  }

  console.log('Products seeding complete');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
