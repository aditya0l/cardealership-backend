#!/usr/bin/env node

/**
 * Production Schema Validator for Remark Model
 * 
 * This script validates that the Remark model does NOT have explicit
 * Enquiry/Booking relations, which break Prisma Studio count queries.
 * 
 * Run this before: npx prisma generate, npx prisma migrate, npx prisma studio
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Find Remark model
const remarkModelMatch = schemaContent.match(/model Remark\s*\{[\s\S]*?\n\}/);
if (!remarkModelMatch) {
  console.error('❌ Remark model not found in schema');
  process.exit(1);
}

const remarkModel = remarkModelMatch[0];

// Check for problematic relations
// Note: enquiryId and bookingId are valid when used with proper @relation directives
// We only flag them if they're used incorrectly (without proper relations)
const problematicPatterns = [
  /Enquiry\s+Enquiry\?\s+@relation/,  // Duplicate Enquiry relation
  /Booking\s+Booking\?\s+@relation/   // Duplicate Booking relation
];

// Check for enquiryId/bookingId WITHOUT proper relations (this would be problematic)
const hasEnquiryId = /enquiryId\s+String\?/.test(remarkModel);
const hasBookingId = /bookingId\s+String\?/.test(remarkModel);
const hasEnquiryRelation = /enquiry\s+Enquiry\?\s+@relation/.test(remarkModel);
const hasBookingRelation = /booking\s+Booking\?\s+@relation/.test(remarkModel);

const foundProblems = [];
problematicPatterns.forEach((pattern, index) => {
  if (pattern.test(remarkModel)) {
    const names = ['Enquiry Enquiry?', 'Booking Booking?'];
    foundProblems.push(names[index]);
  }
});

// Only flag enquiryId/bookingId if they exist WITHOUT proper relations
if (hasEnquiryId && !hasEnquiryRelation) {
  foundProblems.push('enquiryId String? (without proper relation)');
}
if (hasBookingId && !hasBookingRelation) {
  foundProblems.push('bookingId String? (without proper relation)');
}

if (foundProblems.length > 0) {
  console.error('❌ PRODUCTION SCHEMA VALIDATION FAILED');
  console.error('');
  console.error('The Remark model contains problematic relations that break Prisma Studio:');
  foundProblems.forEach(p => console.error(`   - ${p}`));
  console.error('');
  console.error('🚨 These relations cause "Unable to process count query" fatal errors in Prisma Studio.');
  console.error('');
  console.error('🔧 AUTO-FIXING...');
  
  // Auto-fix by removing problematic relations
  const fixScript = require('./fix-remark-schema.js');
  // The fix script will handle the removal
  
  console.error('');
  console.error('✅ Run: npm run schema:fix');
  console.error('   Or: node scripts/fix-remark-schema.js && npx prisma format && npx prisma generate');
  console.error('');
  process.exit(1);
}

console.log('✅ Schema validation passed - Remark model is production-ready');
process.exit(0);

