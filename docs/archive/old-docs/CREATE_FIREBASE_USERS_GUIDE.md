# 🔥 CREATE FIREBASE USERS - STEP-BY-STEP GUIDE

## 🎯 **Purpose:**
Create admin and advisor users in Firebase Authentication so they can login to the admin dashboard.

---

## ✅ **METHOD 1: Firebase Console (EASIEST - 5 MINUTES)**

### **Step 1: Open Firebase Console**
1. Go to: https://console.firebase.google.com/
2. Login with your Google account
3. Select project: **car-dealership-app-9f2d5**

### **Step 2: Navigate to Authentication**
1. Click **"Authentication"** in the left sidebar
2. Click **"Users"** tab at the top
3. Click **"Add user"** button

### **Step 3: Create Admin User (Primary)**
1. Email: `admin.new@test.com`
2. Password: `testpassword123`
3. Click **"Add user"**
4. ✅ User created!

### **Step 4: Create Admin User (Alternative)**
1. Click **"Add user"** again
2. Email: `admin@dealership.com`
3. Password: `testpassword123`
4. Click **"Add user"**
5. ✅ User created!

### **Step 5: Create Advisor User**
1. Click **"Add user"** again
2. Email: `advisor.new@test.com`
3. Password: `testpassword123`
4. Click **"Add user"**
5. ✅ User created!

### **Step 6: Verify Users**
You should now see 3 users in the Firebase Authentication Users list:
- ✅ admin.new@test.com
- ✅ admin@dealership.com
- ✅ advisor.new@test.com

---

## ✅ **METHOD 2: Firebase Admin SDK Script (10 MINUTES)**

### **Step 1: Create Script**

**File:** `scripts/create-firebase-users.ts` (use existing file or create new)

```typescript
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

async function createFirebaseUsers() {
  console.log('🔥 Creating Firebase users...\n');

  const users = [
    {
      email: 'admin.new@test.com',
      password: 'testpassword123',
      displayName: 'Admin User (Primary)',
      role: 'ADMIN'
    },
    {
      email: 'admin@dealership.com',
      password: 'testpassword123',
      displayName: 'Admin User (Alternative)',
      role: 'ADMIN'
    },
    {
      email: 'advisor.new@test.com',
      password: 'testpassword123',
      displayName: 'Test Advisor',
      role: 'CUSTOMER_ADVISOR'
    }
  ];

  for (const userData of users) {
    try {
      // Try to create user
      const user = await admin.auth().createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: true,
      });

      console.log(`✅ Created: ${userData.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Role: ${userData.role}`);
      console.log('');

    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`ℹ️  Already exists: ${userData.email}`);
        
        // Get existing user
        const existingUser = await admin.auth().getUserByEmail(userData.email);
        console.log(`   UID: ${existingUser.uid}`);
        console.log(`   Disabled: ${existingUser.disabled}`);
        console.log('');
        
        // Update password if needed
        try {
          await admin.auth().updateUser(existingUser.uid, {
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true,
            disabled: false,
          });
          console.log(`   ✅ Updated password and details`);
          console.log('');
        } catch (updateError) {
          console.log(`   ⚠️  Could not update password`);
          console.log('');
        }
      } else {
        console.error(`❌ Error creating ${userData.email}:`, error.message);
        console.log('');
      }
    }
  }

  console.log('\n✅ Firebase user creation complete!');
  console.log('\n🔑 Login Credentials:');
  console.log('   admin.new@test.com / testpassword123 (ADMIN)');
  console.log('   admin@dealership.com / testpassword123 (ADMIN)');
  console.log('   advisor.new@test.com / testpassword123 (CUSTOMER_ADVISOR)');
  console.log('\n📱 These users can now login to:');
  console.log('   - Admin Dashboard (React)');
  console.log('   - Mobile App (Expo)');
}

createFirebaseUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
```

### **Step 2: Run Script**

```bash
cd /Users/adityajaif/car-dealership-backend

# Run the script
ts-node scripts/create-firebase-users.ts
```

---

## 🧪 **VERIFY USERS EXIST:**

### **Check Firebase:**
```bash
# List all Firebase users
ts-node -e "
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
});

async function listUsers() {
  const listUsersResult = await admin.auth().listUsers(100);
  console.log('Firebase Users:');
  listUsersResult.users.forEach((user) => {
    console.log('- Email:', user.email, '| UID:', user.uid, '| Disabled:', user.disabled);
  });
}

listUsers().then(() => process.exit(0));
"
```

### **Check Database:**
Already verified - users exist! ✅

---

## 🎯 **CURRENT STATUS:**

✅ **Database Users:** 2 admins + 1 advisor exist  
⚠️ **Firebase Users:** Only 1 user exists (need to create 2 more)

**You need to create the admin users in Firebase Authentication!**

---

## 📋 **RECOMMENDED STEPS:**

1. ✅ **Database users exist** (already done via `/api/critical-fixes`)
2. ⏳ **Create Firebase users** (use Method 1 - Firebase Console, 5 minutes)
3. ⏳ **Fix admin dashboard** (use the prompt in ADMIN_DASHBOARD_FIX_PROMPT.md)

**Total Time:** ~10 minutes

---

**Which method do you prefer for creating Firebase users?**
- **Method 1:** Firebase Console (manual, 5 minutes) - EASIEST
- **Method 2:** Run the script above (automated, 2 minutes) - FASTEST

