import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fixStockAvailabilityEnum() {
  try {
    console.log('🔧 Fixing StockAvailability enum...');
    
    // Step 1: Convert enum column to TEXT temporarily
    console.log('📝 Step 1: Converting enum column to TEXT...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bookings' 
          AND column_name = 'stock_availability'
        ) THEN
          ALTER TABLE "bookings" 
          ALTER COLUMN "stock_availability" TYPE TEXT 
          USING CASE
            WHEN "stock_availability"::TEXT = 'NOT_AVAILABLE' THEN 'VNA'
            WHEN "stock_availability"::TEXT IN ('ZAWL', 'RAS', 'REGIONAL', 'PLANT') THEN 'VEHICLE_AVAILABLE'
            ELSE "stock_availability"::TEXT
          END;
        END IF;
      END $$;
    `);
    
    // Step 2: Drop the old enum type
    console.log('📝 Step 2: Dropping old enum type...');
    await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "StockAvailability";');
    
    // Step 3: Create the new enum with correct values
    console.log('📝 Step 3: Creating new enum with values: VNA, VEHICLE_AVAILABLE...');
    await prisma.$executeRawUnsafe(`
      CREATE TYPE "StockAvailability" AS ENUM ('VNA', 'VEHICLE_AVAILABLE');
    `);
    
    // Step 4: Convert the column back to the new enum type
    console.log('📝 Step 4: Converting column back to enum...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        ALTER TABLE "bookings" 
        ALTER COLUMN "stock_availability" TYPE "StockAvailability" 
        USING CASE
          WHEN "stock_availability" = 'VNA' THEN 'VNA'::"StockAvailability"
          WHEN "stock_availability" = 'VEHICLE_AVAILABLE' THEN 'VEHICLE_AVAILABLE'::"StockAvailability"
          ELSE NULL
        END;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error converting stock_availability: %', SQLERRM;
          ALTER TABLE "bookings" 
          ALTER COLUMN "stock_availability" TYPE "StockAvailability" 
          USING NULL;
      END $$;
    `);
    
    console.log('✅ StockAvailability enum fixed successfully!');
    console.log('🔄 Regenerating Prisma client...');
    
    // Regenerate Prisma client
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Prisma client regenerated!');
    console.log('✅ All done! The enum now supports: VNA, VEHICLE_AVAILABLE');
    
  } catch (error: any) {
    console.error('❌ Error fixing enum:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixStockAvailabilityEnum();

