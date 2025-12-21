import prisma from '../src/config/db';

async function addFcmColumns() {
  console.log('🔧 Adding FCM notification columns to users table...');

  try {
    // Check and add users.fcm_token column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'fcm_token'
          ) THEN
            ALTER TABLE users ADD COLUMN fcm_token TEXT;
            RAISE NOTICE '✅ Added users.fcm_token column';
          ELSE
            RAISE NOTICE '⏭️  users.fcm_token column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add users.fcm_token:', error.message);
    }

    // Check and add users.device_type column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'device_type'
          ) THEN
            ALTER TABLE users ADD COLUMN device_type TEXT;
            RAISE NOTICE '✅ Added users.device_type column';
          ELSE
            RAISE NOTICE '⏭️  users.device_type column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add users.device_type:', error.message);
    }

    // Check and add users.last_token_updated column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'last_token_updated'
          ) THEN
            ALTER TABLE users ADD COLUMN last_token_updated TIMESTAMP(3);
            RAISE NOTICE '✅ Added users.last_token_updated column';
          ELSE
            RAISE NOTICE '⏭️  users.last_token_updated column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add users.last_token_updated:', error.message);
    }

    console.log('✅ FCM columns check complete!');
  } catch (error: any) {
    console.error('❌ Error adding FCM columns:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addFcmColumns()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

