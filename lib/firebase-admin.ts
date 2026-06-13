// Firebase Admin SDK Configuration (Server-side only)
// This file should NEVER be imported in client components
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getServiceAccount(): ServiceAccount | undefined {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_KEY not set. Firebase Admin features will be limited.");
    return undefined;
  }
  try {
    return JSON.parse(key) as ServiceAccount;
  } catch {
    console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY");
    return undefined;
  }
}

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: getServiceAccount() ? cert(getServiceAccount()!) : undefined,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    : getApps()[0];

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
