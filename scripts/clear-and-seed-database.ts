#!/usr/bin/env ts-node

/**
 * Clear all data from database and create fresh test users
 * This will:
 * 1. Delete all data from all tables (preserving schema)
 * 2. Create users in Firebase with known passwords
 * 3. Create corresponding users in database
 * 4. Set up relationships properly
 */

import { auth } from '../src/config/firebase';
import prisma from '../src/config/db';
import { RoleName } from '@prisma/client';

// Test users to create
const TEST_USERS = [
  {
    email: 'advisor@test.com',
    password: 'testpassword123',
    name: 'Test Advisor',
    roleName: RoleName.CUSTOMER_ADVISOR,
    employeeId: 'ADV001'
  },
  {
    email: 'admin@test.com',
    password: 'testpassword123',
    name: 'Admin User',
    roleName: RoleName.ADMIN,
    employeeId: 'ADM001'
  },
  {
    email: 'gm@test.com',
    password: 'testpassword123',
    name: 'General Manager',
    roleName: RoleName.GENERAL_MANAGER,
    employeeId: 'GM001'
  },
  {
    email: 'sm@test.com',
    password: 'testpassword123',
    name: 'Sales Manager',
    roleName: RoleName.SALES_MANAGER,
    employeeId: 'SM001'
  },
  {
    email: 'tl@test.com',
    password: 'testpassword123',
    name: 'Team Lead',
    roleName: RoleName.TEAM_LEAD,
    employeeId: 'TL001'
  }
];

async function clearDatabase() {
  console.log('🗑️  Clearing all data from database...\n');
  
  // Delete in order to respect foreign key constraints
  const deleteOrder = [
    'NotificationLog',
    'Remark',
    'BookingAuditLog',
    'BookingImportError',
    'BookingImport',
    'EnquiryImport',
    'Quotation',
    'Booking',
    'Enquiry',
    'Vehicle',
    'VehicleCatalog',
    'Dealership',
    'User',
    'Role'
  ];
  
  for (const modelName of deleteOrder) {
    try {
      const model = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
      if (model) {
        const count = await model.deleteMany({});
        console.log(`  ✅ Deleted ${count.count || 0} records from ${modelName}`);
      }
    } catch (error: any) {
      // Ignore errors for models that don't exist or are empty
      if (!error.message.includes('does not exist')) {
        console.log(`  ⚠️  Could not delete ${modelName}: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Database cleared!\n');
}

async function ensureRoles() {
  console.log('📋 Ensuring all roles exist...\n');
  
  const roles = [
    RoleName.ADMIN,
    RoleName.GENERAL_MANAGER,
    RoleName.SALES_MANAGER,
    RoleName.TEAM_LEAD,
    RoleName.CUSTOMER_ADVISOR
  ];
  
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName
      }
    });
    console.log(`  ✅ Role: ${roleName} (ID: ${role.id})`);
  }
  
  console.log('');
}

async function ensureDealership() {
  console.log('🏢 Creating default dealership...\n');
  
  const dealership = await prisma.dealership.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      id: 'default-dealership-001',
      name: 'Default Dealership',
      code: 'DEFAULT',
      type: 'TATA',
      email: 'info@default-dealership.com',
      phone: '+1234567890',
      address: '123 Main Street',
      city: 'Default City',
      state: 'Default State',
      pincode: '12345',
      isActive: true,
      onboardingCompleted: true
    }
  });
  
  console.log(`  ✅ Dealership: ${dealership.name} (ID: ${dealership.id})`);
  console.log('');
  
  return dealership;
}

async function deleteFirebaseUser(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.deleteUser(user.uid);
    console.log(`  ✅ Deleted Firebase user: ${email}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // User doesn't exist, that's fine
    } else {
      throw error;
    }
  }
}

async function createFirebaseUser(email: string, password: string, name: string) {
  try {
    // Try to delete existing user first
    await deleteFirebaseUser(email);
  } catch (error) {
    // Ignore errors
  }
  
  // Create new user
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
    disabled: false
  });
  
  console.log(`  ✅ Created Firebase user: ${email} (UID: ${userRecord.uid})`);
  
  return userRecord;
}

async function createDatabaseUser(
  firebaseUid: string,
  email: string,
  name: string,
  roleName: RoleName,
  employeeId: string,
  dealershipId: string
) {
  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });
  
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }
  
  const user = await prisma.user.create({
    data: {
      firebaseUid,
      email,
      name,
      roleId: role.id,
      employeeId,
      dealershipId,
      isActive: true
    },
    include: { role: true }
  });
  
  console.log(`  ✅ Created database user: ${email} (${roleName}, ${employeeId})`);
  
  return user;
}

async function setCustomClaims(uid: string, roleName: RoleName, roleId: string, employeeId: string) {
  await auth.setCustomUserClaims(uid, {
    role: roleName,
    roleId: roleId,
    employeeId: employeeId
  });
  
  console.log(`  ✅ Set custom claims for user`);
}

async function main() {
  console.log('🚀 Starting database clear and seed...\n');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Step 1: Clear database
    await clearDatabase();
    
    // Step 2: Ensure roles exist
    await ensureRoles();
    
    // Step 3: Create default dealership
    const defaultDealership = await ensureDealership();
    
    // Step 4: Create Firebase users and database users
    console.log('👤 Creating test users...\n');
    
    for (const userData of TEST_USERS) {
      console.log(`Creating: ${userData.email} (${userData.roleName})`);
      
      try {
        // Create in Firebase
        const firebaseUser = await createFirebaseUser(
          userData.email,
          userData.password,
          userData.name
        );
        
        // Create in database
        const dbUser = await createDatabaseUser(
          firebaseUser.uid,
          userData.email,
          userData.name,
          userData.roleName,
          userData.employeeId,
          defaultDealership.id
        );
        
        // Set custom claims in Firebase
        await setCustomClaims(
          firebaseUser.uid,
          userData.roleName,
          dbUser.roleId,
          userData.employeeId
        );
        
        console.log('');
        
      } catch (error: any) {
        console.error(`  ❌ Error creating ${userData.email}:`, error.message);
        console.log('');
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ Database cleared and seeded successfully!\n');
    console.log('📋 Test Credentials:\n');
    
    TEST_USERS.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.roleName}`);
      console.log(`   Employee ID: ${user.employeeId}`);
      console.log('');
    });
    
    console.log('🎉 You can now use these credentials to login!\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

