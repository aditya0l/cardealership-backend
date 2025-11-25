import prisma from '../src/config/db';

/**
 * Create notification_logs table if it doesn't exist
 */
async function createNotificationLogsTable() {
  console.log('🔧 Creating notification_logs table...');

  try {
    // Check if table exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_logs'
      );
    `;

    if (tableExists[0]?.exists) {
      console.log('✅ notification_logs table already exists');
      return;
    }

    // Create the table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "notification_logs" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "entityId" TEXT,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "delivered" BOOLEAN NOT NULL DEFAULT false,
        
        CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
      );
    `);

    // Add foreign key to users table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "notification_logs" 
      ADD CONSTRAINT "notification_logs_userId_fkey" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("firebaseUid") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE;
    `);

    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_userId_idx" ON "notification_logs"("userId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_type_idx" ON "notification_logs"("type");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");
    `);

    console.log('✅ notification_logs table created successfully!');

  } catch (error: any) {
    console.error('❌ Error creating notification_logs table:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createNotificationLogsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

