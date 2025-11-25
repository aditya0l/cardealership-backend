#!/usr/bin/env node

/**
 * Check database foreign key constraints on remarks table
 * This helps identify if there are database-level constraints causing issues
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConstraints() {
  try {
    const constraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        confrelid::regclass as referenced_table,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'remarks'::regclass 
        AND contype = 'f'
    `;
    
    console.log('Foreign key constraints on remarks table:');
    if (constraints.length === 0) {
      console.log('✅ No foreign key constraints found (this is correct)');
    } else {
      console.log(JSON.stringify(constraints, null, 2));
      console.log('\n⚠️  If you see constraints referencing enquiries or bookings, they need to be removed');
    }
  } catch (error) {
    console.error('Error checking constraints:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();

