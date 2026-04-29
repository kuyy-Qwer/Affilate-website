import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Aktifkan emulator hanya saat development (localhost)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    console.log('[Dev] Firebase Emulators connected');
  } catch (e) {
    // Emulator sudah terhubung sebelumnya (hot reload), abaikan error ini
    console.warn('[Dev] Emulator already connected or not running:', (e as Error).message);
  }
}

// Lazy-init analytics only in browser (avoids SSR crash)
export const getAnalyticsInstance = async () => {
  if (typeof window !== 'undefined') {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  }
  return null;
};

// Enable offline persistence so Firestore works even on slow connections
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});
