import admin from 'firebase-admin';

// Initialize Firebase Admin with environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "car-dealership-app-9f2d5",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: "",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: ""
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin init error:', error);
    process.exit(1);
  }
}

async function testTokenValidation() {
  console.log('🔧 Testing Firebase token validation...\n');

  try {
    // Step 1: List users to see what we have
    console.log('Step 1: Listing Firebase users...');
    const listUsersResult = await admin.auth().listUsers(10);
    console.log(`✅ Found ${listUsersResult.users.length} users:`);
    
    listUsersResult.users.forEach(user => {
      console.log(`  - ${user.email} (${user.uid})`);
    });

    // Step 2: Test with newadvisor@test.com
    console.log('\nStep 2: Testing token generation for newadvisor@test.com...');
    const testEmail = 'newadvisor@test.com';
    
    try {
      const user = await admin.auth().getUserByEmail(testEmail);
      console.log(`✅ User found: ${user.email} (${user.uid})`);
      
      // Step 3: Generate custom token (this is what your app might be doing)
      console.log('\nStep 3: Generating custom token...');
      const customToken = await admin.auth().createCustomToken(user.uid);
      console.log(`✅ Custom token generated (length: ${customToken.length})`);
      console.log(`   Token preview: ${customToken.substring(0, 100)}...`);
      
      // Step 4: Test token verification
      console.log('\nStep 4: Testing token verification...');
      try {
        // This should fail because custom tokens can't be verified with verifyIdToken
        const decodedToken = await admin.auth().verifyIdToken(customToken);
        console.log('✅ Custom token verified as ID token:', decodedToken);
      } catch (verifyError) {
        console.log('❌ Custom token verification failed (expected):', verifyError.message);
        
        // Step 5: Decode the token manually
        console.log('\nStep 5: Decoding custom token manually...');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(customToken, { complete: true });
        
        if (decoded && decoded.payload) {
          console.log('✅ Custom token decoded successfully:');
          console.log(`   UID: ${decoded.payload.uid}`);
          console.log(`   Claims:`, decoded.payload.claims);
        } else {
          console.log('❌ Failed to decode custom token');
        }
      }
      
    } catch (userError) {
      console.log(`❌ User not found: ${userError}`);
    }

    // Step 6: Test ID token generation (what your app SHOULD be doing)
    console.log('\nStep 6: Testing ID token approach...');
    console.log('📱 Your Expo app should be using:');
    console.log('   const idToken = await userCredential.user.getIdToken();');
    console.log('   NOT custom tokens!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testTokenValidation();
