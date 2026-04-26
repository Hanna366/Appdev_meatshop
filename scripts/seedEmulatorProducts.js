// Seed demo products into Firestore emulator (no service account required)
// Usage: node ./scripts/seedEmulatorProducts.js

const admin = require('firebase-admin');

const PROJECT_ID = 'appdev-3d42e';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
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
