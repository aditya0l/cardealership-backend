#!/usr/bin/env node

/**
 * Production Schema Fixer for Remark Model
 * 
 * Automatically removes problematic Enquiry/Booking relations from Remark model
 * that break Prisma Studio count queries.
 * 
 * Run this if validation fails: node scripts/fix-remark-schema.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Remove problematic relations - handle all variations
let fixed = false;

// Pattern 1: All 4 lines together
const pattern1 = /(\s+)(Enquiry\s+Enquiry\?\s+@relation\([^\n]+\n\s+enquiryId\s+String\?\n\s+Booking\s+Booking\?\s+@relation\([^\n]+\n\s+bookingId\s+String\?\n)/g;
if (pattern1.test(schemaContent)) {
  schemaContent = schemaContent.replace(pattern1, '$1');
  fixed = true;
}

// Pattern 2: Individual lines (any order)
const patterns = [
  /\s+Enquiry\s+Enquiry\?\s+@relation\([^\n]+\n/g,
  /\s+enquiryId\s+String\?\n/g,
  /\s+Booking\s+Booking\?\s+@relation\([^\n]+\n/g,
  /\s+bookingId\s+String\?\n/g
];

patterns.forEach(pattern => {
  if (pattern.test(schemaContent)) {
    schemaContent = schemaContent.replace(pattern, '');
    fixed = true;
  }
});

if (fixed) {
  fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
  console.log('✅ Fixed Remark model - removed problematic relations');
  console.log('✅ Run: npx prisma format && npx prisma generate');
} else {
  console.log('✅ Remark model is already correct - no fixes needed');
}

