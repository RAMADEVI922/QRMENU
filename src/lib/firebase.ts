import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// These values should come from `.env.local` and must not be committed to source control.
// Make sure you create `.env.local` and add your Firebase config values there.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is properly configured
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // If your Firebase Storage rules require auth, sign in anonymously so uploads work.
    signInAnonymously(auth).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Firebase anonymous auth failed:', err);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Firebase initialization failed:', error);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('Firebase configuration not found. Some features may not work.');
}

export { app, auth, db, storage, isFirebaseConfigured };
