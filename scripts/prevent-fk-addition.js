#!/usr/bin/env node

/**
 * Prevents Prisma from adding explicit foreign keys to Remark model
 * Run this after: npx prisma format
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Remove fields and references from enquiry/booking relations
content = content.replace(
  /enquiry\s+Enquiry\?\s+@relation\("EnquiryRemarks",\s+fields:\s+\[enquiryId\],\s+references:\s+\[id\]\)/g,
  'enquiry Enquiry? @relation("EnquiryRemarks")'
);

content = content.replace(
  /booking\s+Booking\?\s+@relation\("BookingRemarks",\s+fields:\s+\[bookingId\],\s+references:\s+\[id\]\)/g,
  'booking Booking? @relation("BookingRemarks")'
);

// Remove enquiryId and bookingId field definitions
content = content.replace(/\s+enquiryId\s+String\?\s*\n/g, '');
content = content.replace(/\s+bookingId\s+String\?\s*\n/g, '');

fs.writeFileSync(schemaPath, content, 'utf-8');
console.log('✅ Removed explicit foreign keys from Remark model');

