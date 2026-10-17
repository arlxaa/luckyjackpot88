import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { MAX_BALANCE } from '../config/balance';

// Saves must stay within sane bounds (see firestore.rules).
export async function saveProgress(uid: string, data: {
  displayName: string | null;
  photoURL: string | null;
  balance: number;
  biggestWin: number;
}) {
  if (!db) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...data,
    balance: Math.max(0, Math.min(MAX_BALANCE, Math.floor(data.balance))),
    biggestWin: Math.max(0, Math.min(MAX_BALANCE, Math.floor(data.biggestWin))),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadProgress(uid: string) {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as { balance?: number; biggestWin?: number }) : null;
}
