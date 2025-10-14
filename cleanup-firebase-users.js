// cleanup-firebase-users.js
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

async function deleteAllFirebaseUsers() {
  console.log('🔥 Starting Firebase users cleanup...\n');

  try {
    let deletedCount = 0;
    let totalUsers = 0;

    // List all users
    const listAllUsers = async (nextPageToken) => {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      
      totalUsers += result.users.length;
      console.log(`📋 Found ${result.users.length} users in this batch (Total: ${totalUsers})`);

      // Delete users in batches
      if (result.users.length > 0) {
        console.log('🗑️  Deleting users...');
        
        const deletePromises = result.users.map(async (user) => {
          try {
            await admin.auth().deleteUser(user.uid);
            deletedCount++;
            console.log(`   ✅ Deleted: ${user.email || user.uid}`);
          } catch (error) {
            console.error(`   ❌ Failed to delete ${user.email || user.uid}:`, error.message);
          }
        });

        await Promise.all(deletePromises);
      }

      // If there are more users, continue
      if (result.pageToken) {
        await listAllUsers(result.pageToken);
      }
    };

    await listAllUsers();

    console.log('\n✅ Firebase cleanup completed!');
    console.log(`📊 Total users deleted: ${deletedCount} out of ${totalUsers}`);

  } catch (error) {
    console.error('❌ Error during Firebase cleanup:', error);
    throw error;
  }
}

deleteAllFirebaseUsers()
  .then(() => {
    console.log('\n🎉 All Firebase users have been deleted!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

