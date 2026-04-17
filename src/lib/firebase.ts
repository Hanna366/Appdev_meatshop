import firebaseConfig from '../config/firebaseConfig';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export const auth = getAuth();
export const db = getFirestore();

export default { auth, db };
