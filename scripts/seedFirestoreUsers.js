/**
 * Seed Firestore `users` collection using Firebase Admin SDK.
 *
 * Usage:
 * 1) Install admin SDK: `npm install firebase-admin`
 * 2) Set `SERVICE_ACCOUNT_PATH` env var to a service account JSON file path, or
 *    set `SERVICE_ACCOUNT_JSON` env var to the JSON string of the service account.
 * 3) Run: `node ./scripts/seedFirestoreUsers.js`
 */

const fs = require('fs');
const path = require('path');

// If dotenv is available, load .env so local env vars (like SERVICE_ACCOUNT_PATH)
// can be set from a file. This is optional and will silently continue if
// dotenv isn't installed.
try {
  require('dotenv').config();
} catch (e) {
  // noop
}

async function promptInput(query) {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

async function main() {
  let serviceAccount = null;

  // helper to try load JSON from a path or JSON string
  const tryLoad = (candidate) => {
    try {
      if (candidate.trim().startsWith('{')) return JSON.parse(candidate);
      const p = path.resolve(candidate);
      if (!fs.existsSync(p)) throw new Error('file not found');
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      return null;
    }
  };

  if (process.env.SERVICE_ACCOUNT_JSON) {
    const loaded = tryLoad(process.env.SERVICE_ACCOUNT_JSON);
    if (loaded) serviceAccount = loaded;
  }

  if (!serviceAccount && process.env.SERVICE_ACCOUNT_PATH) {
    const loaded = tryLoad(process.env.SERVICE_ACCOUNT_PATH);
    if (loaded) serviceAccount = loaded;
    else console.warn('Service account file not found at', process.env.SERVICE_ACCOUNT_PATH);
  }

  // Auto-scan common locations (Downloads + home) for service account JSON when
  // neither SERVICE_ACCOUNT_JSON nor SERVICE_ACCOUNT_PATH yielded a result.
  const tryAutoScan = () => {
    try {
      const os = require('os');
      const homedir = os.homedir();
      const starts = [path.join(homedir, 'Downloads'), path.join(homedir, 'downloads'), homedir, process.cwd()];
      const patterns = [/firebase-adminsdk.*\.json$/i, /service.*account.*\.json$/i, /-firebase-adminsdk-.*\.json$/i];

      const maxDepth = 4;

      const walk = (dir, depth) => {
        if (depth > maxDepth) return null;
        let entries;
        try {
          if (!fs.existsSync(dir)) return null;
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
          return null;
        }

        for (const ent of entries) {
          try {
            const name = ent.name;
            const full = path.join(dir, name);
            if (ent.isFile()) {
              for (const p of patterns) {
                if (p.test(name)) {
                  const loaded = tryLoad(full);
                  if (loaded) {
                    console.log('Auto-found service account at', full);
                    return loaded;
                  }
                }
              }
            } else if (ent.isDirectory()) {
              const res = walk(full, depth + 1);
              if (res) return res;
            }
          } catch (err) {
            // continue
          }
        }
        return null;
      };

      for (const s of starts) {
        const res = walk(s, 0);
        if (res) return res;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  if (!serviceAccount) {
    const scanned = tryAutoScan();
    if (scanned) serviceAccount = scanned;
  }

  // If still not loaded, prompt the user interactively
  while (!serviceAccount) {
    const answer = await promptInput(
      'Enter path to service account JSON file, or paste the JSON directly (leave empty to abort): ',
    );
    if (!answer) {
      console.error('No service account provided — aborting.');
      process.exit(1);
    }
    const loaded = tryLoad(answer);
    if (loaded) {
      serviceAccount = loaded;
      break;
    }
    console.warn('Could not load JSON from that input. Try again.');
  }

  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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
    // Ensure Auth user exists (create if missing)
    try {
      await admin.auth().getUser(u.uid);
      console.log('Auth user exists:', u.uid);
    } catch (e) {
      try {
        // try by email
        const byEmail = await admin.auth().getUserByEmail(u.email).catch(() => null);
        if (byEmail) {
          console.log('Auth account exists for email, using uid:', byEmail.uid);
        } else {
          const created = await admin.auth().createUser({
            uid: u.uid,
            email: u.email,
            emailVerified: false,
            password: 'password123',
            displayName: u.name,
          });
          console.log('Created auth user', created.uid);
        }
      } catch (err) {
        console.warn('Failed to ensure auth user for', u.uid, err.message || err);
      }
    }

    const ref = db.collection('users').doc(u.uid);
    await ref.set({
      email: u.email,
      name: u.name,
      tenantId: u.tenantId,
      role: u.role,
    });
    console.log('Wrote user doc', u.uid);
  }

  console.log('Seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
