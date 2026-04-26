// Seed demo users into Firestore and Auth emulator (no service account required).
// Usage: node ./scripts/seedEmulatorUsers.js

const admin = require('firebase-admin');

// Ensure emulator host env vars are set to default emulator ports
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

const PROJECT_ID = 'appdev-3d42e';

async function main() {
  if (!admin.apps.length) {
    // Initialize admin SDK pointed at the emulator project
    admin.initializeApp({ projectId: PROJECT_ID });
  }

  const db = admin.firestore();

  const users = [
    {
      uid: 'usr_demo_manager',
      email: 'manager@example.com',
      name: 'Demo Manager',
      tenantId: 'tn_001',
      role: 'manager',
    },
    {
      uid: 'usr_demo_owner',
      email: 'owner@example.com',
      name: 'Demo Owner',
      tenantId: 'tn_001',
      role: 'owner',
    },
    {
      uid: 'usr_demo_cashier',
      email: 'cashier@example.com',
      name: 'Demo Cashier',
      tenantId: 'tn_001',
      role: 'cashier',
    },
  ];

  for (const u of users) {
    try {
      // Ensure Auth user exists in emulator (create if missing)
      await admin.auth().getUser(u.uid).catch(async () => {
        await admin.auth().createUser({ uid: u.uid, email: u.email, password: 'password123', displayName: u.name });
        console.log('Created auth user', u.uid);
      });
    } catch (err) {
      console.warn('Auth create/get failed for', u.uid, err.message || err);
    }

    try {
      await db.collection('users').doc(u.uid).set({ email: u.email, name: u.name, tenantId: u.tenantId, role: u.role });
      console.log('Wrote user doc', u.uid);
    } catch (err) {
      console.error('Failed writing user doc for', u.uid, err.message || err);
    }
  }

  console.log('Emulator seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
