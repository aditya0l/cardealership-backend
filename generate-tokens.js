const admin = require('firebase-admin');
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

// Generate custom tokens for testing
async function generateTokens() {
  const users = [
    { uid: 'admin-user-001', role: 'ADMIN' },
    { uid: 'gm-user-001', role: 'GENERAL_MANAGER' },
    { uid: 'sm-user-001', role: 'SALES_MANAGER' },
    { uid: 'tl-user-001', role: 'TEAM_LEAD' },
    { uid: 'advisor-user-001', role: 'CUSTOMER_ADVISOR' }
  ];

  console.log('🔑 Generating Firebase Custom Tokens for Postman Testing\n');
  console.log('📋 COPY THESE TOKENS TO YOUR POSTMAN ENVIRONMENT:\n');
  
  for (const user of users) {
    try {
      const customToken = await admin.auth().createCustomToken(user.uid, {
        role: user.role,
        userId: user.uid
      });
      
      console.log(`${user.role}_TOKEN:`);
      console.log(customToken);
      console.log('');
    } catch (error) {
      console.log(`❌ Failed to generate token for ${user.role}:`, error.message);
    }
  }

  console.log('💡 How to use in Postman:');
  console.log('1. Go to your Postman Environment');
  console.log('2. Add these tokens as variables');
  console.log('3. Use {{ADMIN_TOKEN}} in Authorization header');
  console.log('4. Format: Bearer {{ADMIN_TOKEN}}');
  console.log('');
  console.log('⚠️  Note: These are custom tokens, not ID tokens');
  console.log('   Your backend needs to verify them with Firebase Admin SDK');
  
  process.exit(0);
}

generateTokens().catch(console.error);
