#!/usr/bin/env tsx
/**
 * Schema Validation Script
 * Prevents adding explicit Enquiry/Booking relations to Remark model
 * that break Prisma Studio count queries
 */

import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

function validateRemarkSchema() {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // Find the Remark model
  const remarkModelMatch = schemaContent.match(/model Remark\s*\{([^}]+)\}/s);
  
  if (!remarkModelMatch) {
    console.error('❌ Could not find Remark model in schema');
    process.exit(1);
  }
  
  const remarkModelContent = remarkModelMatch[1];
  
  // Check for problematic relations
  const hasEnquiryRelation = /Enquiry\s+Enquiry\?\s*@relation/.test(remarkModelContent);
  const hasBookingRelation = /Booking\s+Booking\?\s*@relation/.test(remarkModelContent);
  const hasEnquiryId = /enquiryId\s+String/.test(remarkModelContent);
  const hasBookingId = /bookingId\s+String/.test(remarkModelContent);
  
  if (hasEnquiryRelation || hasBookingRelation || hasEnquiryId || hasBookingId) {
    console.error('🚨 CRITICAL ERROR: Invalid relations found in Remark model!');
    console.error('');
    console.error('The following relations BREAK Prisma Studio:');
    if (hasEnquiryRelation) console.error('  ❌ Enquiry? @relation(...)');
    if (hasBookingRelation) console.error('  ❌ Booking? @relation(...)');
    if (hasEnquiryId) console.error('  ❌ enquiryId String?');
    if (hasBookingId) console.error('  ❌ bookingId String?');
    console.error('');
    console.error('⚠️  These cause Prisma Studio to crash with:');
    console.error('   "Fatal Error: Unable to process count query"');
    console.error('');
    console.error('✅ Solution: Remove these relations and use ONLY:');
    console.error('   - entityType: String');
    console.error('   - entityId: String');
    console.error('');
    console.error('📖 See: REMARK_RELATIONS_WARNING.md for details');
    process.exit(1);
  }
  
  console.log('✅ Remark model schema is valid!');
  console.log('✅ No problematic relations found');
  console.log('✅ Prisma Studio will work correctly');
}

validateRemarkSchema();

