import admin from 'firebase-admin';
import { config } from './env';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
      databaseURL: config.firebase.databaseURL,
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
}

export const auth = admin.auth();
export const messaging = admin.messaging();
export const firestore = admin.firestore();

export default admin;
