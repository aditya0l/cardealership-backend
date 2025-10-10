const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function testAPIWithAuth() {
  try {
    console.log('🔑 Creating custom token for admin user...');
    
    // Create custom token
    const customToken = await admin.auth().createCustomToken('admin-user-001', {
      role: 'ADMIN',
      userId: 'admin-user-001'
    });
    
    console.log('✅ Custom token created');
    console.log('📝 Custom Token (first 50 chars):', customToken.substring(0, 50) + '...');
    
    console.log('\n🧪 Testing API endpoints with custom token:');
    console.log('==========================================');
    
    // Test endpoints
    const baseURL = 'http://localhost:4000';
    const headers = {
      'Authorization': `Bearer ${customToken}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: Auth profile
    console.log('\n1️⃣ Testing GET /api/auth/profile');
    try {
      const response = await axios.get(`${baseURL}/api/auth/profile`, { headers });
      console.log('✅ Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Status:', error.response?.status || 'No response');
      console.log('📄 Error:', error.response?.data || error.message);
    }
    
    // Test 2: Vehicles
    console.log('\n2️⃣ Testing GET /api/stock/vehicles');
    try {
      const response = await axios.get(`${baseURL}/api/stock/vehicles`, { headers });
      console.log('✅ Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Status:', error.response?.status || 'No response');
      console.log('📄 Error:', error.response?.data || error.message);
    }
    
    // Test 3: Bookings
    console.log('\n3️⃣ Testing GET /api/bookings');
    try {
      const response = await axios.get(`${baseURL}/api/bookings`, { headers });
      console.log('✅ Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Status:', error.response?.status || 'No response');
      console.log('📄 Error:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 API Authentication Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

testAPIWithAuth();
