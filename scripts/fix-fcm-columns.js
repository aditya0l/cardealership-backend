/**
 * Fix script to add FCM notification columns to users table
 * This ensures the columns exist even if the migration wasn't applied
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function fixFcmColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for FCM notification columns in users table...');
    
    // Check if columns exist by trying to query them
    const testQuery = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('fcm_token', 'device_type', 'last_token_updated')
    `;
    
    const existingColumns = testQuery.map(row => row.column_name);
    console.log(`📊 Existing FCM columns: ${existingColumns.join(', ') || 'none'}`);
    
    const missingColumns = [];
    if (!existingColumns.includes('fcm_token')) missingColumns.push('fcm_token');
    if (!existingColumns.includes('device_type')) missingColumns.push('device_type');
    if (!existingColumns.includes('last_token_updated')) missingColumns.push('last_token_updated');
    
    if (missingColumns.length === 0) {
      console.log('✅ All FCM columns already exist');
      return;
    }
    
    console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
    console.log('🔧 Adding missing columns...');
    
    // Add missing columns one by one
    if (missingColumns.includes('fcm_token')) {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT`;
      console.log('✅ Added fcm_token column');
    }
    
    if (missingColumns.includes('device_type')) {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_type" TEXT`;
      console.log('✅ Added device_type column');
    }
    
    if (missingColumns.includes('last_token_updated')) {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_token_updated" TIMESTAMP(3)`;
      console.log('✅ Added last_token_updated column');
    }
    
    console.log('✅ All FCM columns added successfully');
    
    // Verify columns were added
    const verifyQuery = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('fcm_token', 'device_type', 'last_token_updated')
    `;
    
    const verifiedColumns = verifyQuery.map(row => row.column_name);
    console.log(`✅ Verified columns: ${verifiedColumns.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error fixing FCM columns:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixFcmColumns()
    .then(() => {
      console.log('✅ FCM columns fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ FCM columns fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixFcmColumns };

