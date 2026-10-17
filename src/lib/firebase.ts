import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

if (!getApps().length && firebaseConfigured) {
  initializeApp(config as Record<string, string>);
}

export const auth = firebaseConfigured ? getAuth() : null;
export const db = firebaseConfigured ? getFirestore() : null;
export const googleProvider = new GoogleAuthProvider();
