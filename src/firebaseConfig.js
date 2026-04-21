// Firebase SDK — all imports at the top (required by ESLint import/first)
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ─── App Config ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Safe against double-init (React StrictMode / HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ─── Synchronous Exports (required by existing components) ────
export const db            = getFirestore(app);
export const auth          = getAuth(app);
export const storage       = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { app };

// ─── Lazy Service Getters (for future perf refactoring) ───────
// These dynamic imports keep auth/storage OUT of chunks that don't need them
export const getAuthInstance = async () => {
  const { getAuth: _getAuth } = await import("firebase/auth");
  return _getAuth(app);
};

export const getGoogleProviderInstance = async () => {
  const { GoogleAuthProvider: GAP } = await import("firebase/auth");
  return new GAP();
};

export const getStorageInstance = async () => {
  const { getStorage: _getStorage } = await import("firebase/storage");
  return _getStorage(app);
};

// ─── Analytics — production only, fully lazy ──────────────────
export const getAnalyticsInstance = () => {
  if (process.env.NODE_ENV === "production") {
    return import("firebase/analytics").then(({ getAnalytics }) => getAnalytics(app));
  }
  return Promise.resolve(null);
};