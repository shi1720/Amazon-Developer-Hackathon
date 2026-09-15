import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Admin SDKs honor FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
// Production uses the Cloud Functions service account through ADC; no key file.
function app() {
  return (
    getApps()[0] ??
    initializeApp({
      projectId:
        process.env.GCLOUD_PROJECT ??
        process.env.GOOGLE_CLOUD_PROJECT ??
        'kindhandoff',
    })
  );
}
export const firebaseAuth = () => getAuth(app());
export const firestore = () => getFirestore(app());
