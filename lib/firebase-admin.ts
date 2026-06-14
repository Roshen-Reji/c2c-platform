import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function readServiceAccount(): ServiceAccount | undefined {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    } as ServiceAccount;
  }
  
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return undefined;
  try {
    return JSON.parse(key) as ServiceAccount;
  } catch (error) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Falling back to applicationDefault().");
    return undefined;
  }
}

const serviceAccount = readServiceAccount();
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        projectId: serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    : getApps()[0];

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch (error: any) {
  if (!error.message?.includes("already been initialized")) {
    console.error("Firestore settings error:", error);
  }
}
export const adminStorage = getStorage(adminApp);
export default adminApp;
