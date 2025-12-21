/**
 * Fix script to ensure notification_logs table exists
 * This ensures the table exists even if migrations weren't applied
 */

const { PrismaClient } = require('@prisma/client');

async function fixNotificationLogsTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for notification_logs table...');
    
    // Check if table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notification_logs'
    `;
    
    if (tableCheck.length === 0) {
      console.log('📦 Creating notification_logs table...');
      
      // Create the table with all columns
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "notification_logs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "entityId" TEXT,
          "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "delivered" BOOLEAN NOT NULL DEFAULT false,
          CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("firebaseUid") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `;
      
      console.log('✅ Created notification_logs table');
    } else {
      console.log('⏭️  notification_logs table already exists');
      
      // Check if all required columns exist
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'notification_logs'
      `;
      
      const columnNames = columns.map(col => col.column_name);
      const requiredColumns = ['id', 'userId', 'title', 'body', 'type', 'entityId', 'sentAt', 'delivered'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns in notification_logs: ${missingColumns.join(', ')}`);
        console.log('   Table exists but may be incomplete. Consider running migrations.');
      } else {
        console.log('✅ notification_logs table has all required columns');
      }
    }
    
    console.log('✅ Notification logs table check complete!');
    
  } catch (error) {
    console.error('❌ Error fixing notification_logs table:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixNotificationLogsTable()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixNotificationLogsTable };

