#!/usr/bin/env node

/**
 * Resolve the failed EnquiryCategory migration
 * This marks the failed migration as rolled back so it can be re-applied
 */

const { execSync } = require('child_process');

console.log('🔧 Resolving failed EnquiryCategory migration...');

try {
  // Mark the failed migration as rolled back
  execSync('npx prisma migrate resolve --rolled-back 20251221_fix_enquiry_category_enum', {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('✅ Migration marked as rolled back');
  console.log('📦 Now running migrations...');
  
  // Run migrations again
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
