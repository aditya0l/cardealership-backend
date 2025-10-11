import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

async function generateFreshToken() {
  try {
    const user = await admin.auth().getUserByEmail('advisor.new@test.com');
    console.log('✅ Found user:', user.email);
    console.log('   UID:', user.uid);
    
    // Generate a custom token
    const customToken = await admin.auth().createCustomToken(user.uid);
    console.log('✅ Generated custom token (length:', customToken.length + ')');
    console.log('Token (first 100 chars):', customToken.substring(0, 100) + '...');
    
    console.log('');
    console.log('🔧 To test this token, you need to:');
    console.log('1. Use Firebase Web SDK to sign in with custom token');
    console.log('2. Get the ID token from the signed-in user');
    console.log('3. Use that ID token for API calls');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

generateFreshToken();
