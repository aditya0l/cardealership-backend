import { PrismaClient, RoleName } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

const prisma = new PrismaClient();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

interface UserConfig {
  email: string;
  password: string;
  name: string;
  role: RoleName;
  employeeId: string;
  dealershipId?: string;
  managerId?: string;
}

// Default users for each role
// Note: Firebase requires passwords to be at least 6 characters
const DEFAULT_USERS: UserConfig[] = [
  {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    role: RoleName.ADMIN,
    employeeId: 'ADM001'
  },
  {
    email: 'gm@test.com',
    password: 'gm12345',
    name: 'General Manager',
    role: RoleName.GENERAL_MANAGER,
    employeeId: 'GM001'
  },
  {
    email: 'sm@test.com',
    password: 'sm12345',
    name: 'Sales Manager',
    role: RoleName.SALES_MANAGER,
    employeeId: 'SM001'
  },
  {
    email: 'tl@test.com',
    password: 'tl12345',
    name: 'Team Lead',
    role: RoleName.TEAM_LEAD,
    employeeId: 'TL001',
    managerId: undefined // Will be set to SM after SM is created
  },
  {
    email: 'ca1@test.com',
    password: 'ca12345',
    name: 'Customer Advisor 1',
    role: RoleName.CUSTOMER_ADVISOR,
    employeeId: 'CA001',
    managerId: undefined // Will be set to TL after TL is created
  },
  {
    email: 'ca2@test.com',
    password: 'ca12345',
    name: 'Customer Advisor 2',
    role: RoleName.CUSTOMER_ADVISOR,
    employeeId: 'CA002',
    managerId: undefined // Will be set to TL after TL is created
  }
];

async function createUser(userConfig: UserConfig, managerFirebaseUid?: string) {
  try {
    console.log(`\n🔧 Creating ${userConfig.role} user: ${userConfig.email}`);

    // 1. Find or create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(userConfig.email);
      console.log(`   ✅ Firebase user found (UID: ${firebaseUser.uid})`);
    } catch (error) {
      console.log(`   📝 Creating Firebase user...`);
      firebaseUser = await admin.auth().createUser({
        email: userConfig.email,
        password: userConfig.password,
        displayName: userConfig.name,
        emailVerified: true,
      });
      console.log(`   ✅ Firebase user created (UID: ${firebaseUser.uid})`);
    }

    // 2. Find role
    const role = await prisma.role.findUnique({
      where: { name: userConfig.role }
    });

    if (!role) {
      console.error(`   ❌ Role ${userConfig.role} not found in database!`);
      return null;
    }

    // 3. Get dealership ID (use first available or create default)
    let dealershipId = userConfig.dealershipId;
    if (!dealershipId) {
      const dealership = await prisma.dealership.findFirst();
      if (dealership) {
        dealershipId = dealership.id;
      }
    }

    // 4. Create or update user in database
    const user = await prisma.user.upsert({
      where: {
        firebaseUid: firebaseUser.uid
      },
      update: {
        email: userConfig.email,
        name: userConfig.name,
        roleId: role.id,
        employeeId: userConfig.employeeId,
        dealershipId: dealershipId || null,
        managerId: managerFirebaseUid || null,
        isActive: true,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email: userConfig.email,
        name: userConfig.name,
        employeeId: userConfig.employeeId,
        roleId: role.id,
        dealershipId: dealershipId || null,
        managerId: managerFirebaseUid || null,
        isActive: true,
      },
      include: {
        role: true
      }
    });

    console.log(`   ✅ User created/updated in database`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Employee ID: ${user.employeeId}`);
    console.log(`      Role: ${user.role.name}`);
    console.log(`      Is Active: ${user.isActive}`);

    return user;
  } catch (error: any) {
    console.error(`   ❌ Error creating user ${userConfig.email}:`, error.message);
    return null;
  }
}

async function createAllUsers() {
  try {
    console.log('🚀 Starting user creation process...\n');
    console.log('=' .repeat(60));

    const createdUsers: Map<RoleName, any> = new Map();

    // Create users in order (Admin -> GM -> SM -> TL -> CA)
    for (const userConfig of DEFAULT_USERS) {
      let managerFirebaseUid: string | undefined;

      // Set manager based on role hierarchy
      if (userConfig.role === RoleName.TEAM_LEAD) {
        // TL reports to SM
        const smUser = createdUsers.get(RoleName.SALES_MANAGER);
        managerFirebaseUid = smUser?.firebaseUid;
      } else if (userConfig.role === RoleName.CUSTOMER_ADVISOR) {
        // CA reports to TL
        const tlUser = createdUsers.get(RoleName.TEAM_LEAD);
        managerFirebaseUid = tlUser?.firebaseUid;
      }

      const user = await createUser(userConfig, managerFirebaseUid);
      if (user) {
        createdUsers.set(userConfig.role, user);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 User creation process completed!\n');

    // Print summary
    console.log('📋 Created Users Summary:');
    console.log('─'.repeat(60));
    for (const userConfig of DEFAULT_USERS) {
      const user = createdUsers.get(userConfig.role);
      if (user) {
        console.log(`\n${userConfig.role}:`);
        console.log(`   Email: ${userConfig.email}`);
        console.log(`   Password: ${userConfig.password}`);
        console.log(`   Name: ${userConfig.name}`);
        console.log(`   Employee ID: ${userConfig.employeeId}`);
        console.log(`   Firebase UID: ${user.firebaseUid}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All users are ready to use!');
    console.log('\n💡 Note: You can use these credentials to login in the Expo app.');

  } catch (error: any) {
    console.error('\n❌ Error in user creation process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAllUsers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

