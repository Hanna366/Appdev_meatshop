/**
 * Sync a Firestore user profile to the Firebase Auth UID document.
 *
 * Usage:
 *   USER_EMAIL=2301111318@student.buksu.edu.ph node ./scripts/syncUserProfile.js
 *   node ./scripts/syncUserProfile.js 2301111318@student.buksu.edu.ph
 *
 * Auth is always identified by email. If a matching Firestore profile exists
 * under a non-UID document id, this copies it to `users/{auth.uid}` and sets
 * tenant/role custom claims for security rules that use token claims.
 */

const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional.
}

function loadServiceAccount() {
  const candidates = [process.env.SERVICE_ACCOUNT_JSON, process.env.SERVICE_ACCOUNT_PATH].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const value = String(candidate).trim();
      if (value.startsWith('{')) {
        return JSON.parse(value);
      }

      const absolutePath = path.resolve(value);
      if (fs.existsSync(absolutePath)) {
        return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      }
    } catch (e) {
      // Try the next candidate.
    }
  }

  throw new Error('Set SERVICE_ACCOUNT_PATH or SERVICE_ACCOUNT_JSON before running this script.');
}

async function main() {
  const email = String(process.argv[2] || process.env.USER_EMAIL || '').trim().toLowerCase();

  if (!email) {
    throw new Error('Pass an email argument or set USER_EMAIL.');
  }

  const admin = require('firebase-admin');
  const serviceAccount = loadServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const authUser = await admin.auth().getUserByEmail(email);
  const db = admin.firestore();
  const uidProfileRef = db.collection('users').doc(authUser.uid);
  const uidProfileSnap = await uidProfileRef.get();

  let profile = uidProfileSnap.exists ? uidProfileSnap.data() : null;

  if (!profile) {
    const profileByEmailSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    const profileByEmailDoc = profileByEmailSnap.docs[0];
    profile = profileByEmailDoc ? profileByEmailDoc.data() : null;
  }

  if (!profile) {
    profile = {
      email,
      name: authUser.displayName || email.split('@')[0],
      tenantId: 'tn_001',
      role: 'manager',
    };
  }

  const syncedProfile = {
    email,
    name: profile.name || authUser.displayName || email.split('@')[0],
    tenantId: profile.tenantId || 'tn_001',
    role: profile.role || 'manager',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await uidProfileRef.set(syncedProfile, { merge: true });
  await admin.auth().setCustomUserClaims(authUser.uid, {
    tenantId: syncedProfile.tenantId,
    role: syncedProfile.role,
  });

  console.log('Synced profile for', email);
  console.log('Auth UID:', authUser.uid);
  console.log('tenantId:', syncedProfile.tenantId);
  console.log('role:', syncedProfile.role);
  console.log('Sign out and sign back in so the app receives the refreshed claims.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
