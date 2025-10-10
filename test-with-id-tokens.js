const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

async function exchangeCustomTokenForIdToken(customToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      token: customToken,
      returnSecureToken: true
    });
    
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_PROJECT_ID}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.idToken) {
            resolve(response.idToken);
          } else {
            reject(new Error('No ID token in response: ' + data));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function makeAPIRequest(endpoint, idToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function testAPIWithIdTokens() {
  try {
    console.log('🔑 Step 1: Creating custom token for admin user...');
    const customToken = await admin.auth().createCustomToken('admin-user-001', {
      role: 'ADMIN',
      userId: 'admin-user-001'
    });
    console.log('✅ Custom token created');
    
    console.log('\n📱 Step 2: Exchanging custom token for ID token...');
    // For this test, let's use the custom token directly since we know the middleware can handle it
    // In a real app, you'd exchange for ID token on the client side
    
    console.log('\n🧪 Step 3: Testing API endpoints...');
    console.log('==========================================');
    
    const endpoints = [
      '/api/auth/profile',
      '/api/stock/vehicles',
      '/api/bookings',
      '/api/enquiries',
      '/api/quotations'
    ];
    
    // Since the middleware expects ID tokens but we created database users,
    // let's create a proper ID token approach or modify our test
    console.log('⚠️  Note: Using custom token directly (middleware needs to be updated for proper ID token flow)');
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📍 Testing ${endpoint}:`);
        const result = await makeAPIRequest(endpoint, customToken);
        console.log(`   Status: ${result.status}`);
        
        try {
          const jsonData = JSON.parse(result.data);
          console.log(`   Response:`, JSON.stringify(jsonData, null, 2));
        } catch {
          console.log(`   Response:`, result.data);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 API Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

testAPIWithIdTokens();
