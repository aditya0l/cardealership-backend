#!/usr/bin/env ts-node
/**
 * Comprehensive Backend Verification Script
 * 
 * This script verifies all backend requirements are met for the Expo mobile app:
 * 1. Database enum values (EnquiryCategory, StockAvailability)
 * 2. User table and test users
 * 3. Role table and required roles
 * 4. Firebase configuration
 * 5. API endpoint availability
 */

import axios from 'axios';

const BACKEND_URL = 'https://automotive-backend-frqe.onrender.com';
const TEST_USER_EMAIL = 'advisor.new@test.com';
const TEST_USER_UID = 'g5Fr20vtaMZkjCxLRJJr9WORGJc2';

interface VerificationResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function log(category: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
  results.push({ category, status, message, details });
}

async function verifyHealthEndpoint() {
  console.log('\n🔍 1. VERIFYING HEALTH ENDPOINT...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 30000 });
    if (response.status === 200) {
      log('Health', 'PASS', 'Backend is online and responding', response.data);
      return true;
    }
  } catch (error: any) {
    log('Health', 'FAIL', 'Backend is not responding', error.message);
    return false;
  }
}

async function verifyEnumValues() {
  console.log('\n🔍 2. VERIFYING ENUM VALUES...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/fix-enums`, {}, { timeout: 30000 });
    if (response.data.success) {
      const categories = response.data.categories || [];
      const stockAvailability = response.data.stockAvailability || [];
      
      const requiredCategories = ['ALL', 'HOT', 'WARM', 'COLD', 'LOST', 'BOOKED'];
      const requiredStock = ['VNA', 'VEHICLE_AVAILABLE'];
      
      const categoryValues = categories.map((c: any) => c.category);
      const stockValues = stockAvailability.map((s: any) => s.availability);
      
      const missingCategories = requiredCategories.filter(c => !categoryValues.includes(c));
      const missingStock = requiredStock.filter(s => !stockValues.includes(s));
      
      if (missingCategories.length === 0 && missingStock.length === 0) {
        log('Enums', 'PASS', 'All required enum values exist', {
          categories: categoryValues,
          stockAvailability: stockValues
        });
      } else {
        log('Enums', 'WARN', 'Some enum values may be missing', {
          missingCategories,
          missingStock,
          foundCategories: categoryValues,
          foundStock: stockValues
        });
      }
    }
  } catch (error: any) {
    log('Enums', 'FAIL', 'Failed to verify enum values', error.message);
  }
}

async function verifyFirebaseConfig() {
  console.log('\n🔍 3. VERIFYING FIREBASE CONFIGURATION...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/firebase-status`, { timeout: 30000 });
    if (response.data.initialized) {
      log('Firebase', 'PASS', 'Firebase Admin SDK is initialized', {
        projectId: response.data.projectId,
        userCount: response.data.userCount
      });
    } else {
      log('Firebase', 'FAIL', 'Firebase Admin SDK is not initialized', response.data);
    }
  } catch (error: any) {
    log('Firebase', 'FAIL', 'Failed to check Firebase status', error.message);
  }
}

async function verifyTestUser() {
  console.log('\n🔍 4. VERIFYING TEST USER...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/fix-users`, {}, { timeout: 60000 });
    if (response.data.success) {
      const advisorUser = response.data.advisorUser;
      if (advisorUser && advisorUser.email === TEST_USER_EMAIL) {
        log('Test User', 'PASS', 'Test user exists and is properly configured', advisorUser);
      } else {
        log('Test User', 'WARN', 'Test user may not be properly configured', response.data);
      }
    }
  } catch (error: any) {
    log('Test User', 'FAIL', 'Failed to verify test user', error.message);
  }
}

async function verifyAPIEndpoints() {
  console.log('\n🔍 5. VERIFYING API ENDPOINTS...');
  
  const endpoints = [
    { path: '/api/auth/profile', method: 'GET', requiresAuth: true },
    { path: '/api/enquiries', method: 'GET', requiresAuth: true },
    { path: '/api/bookings', method: 'GET', requiresAuth: true },
    { path: '/api/quotations', method: 'GET', requiresAuth: true },
    { path: '/api/stock', method: 'GET', requiresAuth: true },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${BACKEND_URL}${endpoint.path}`,
        headers: endpoint.requiresAuth ? { Authorization: 'Bearer test-user' } : {},
        timeout: 15000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid (auth errors are expected)
      });
      
      if (response.status === 200 || response.status === 401) {
        log('API Endpoints', 'PASS', `${endpoint.method} ${endpoint.path} is available`, {
          status: response.status,
          requiresAuth: endpoint.requiresAuth
        });
      } else {
        log('API Endpoints', 'WARN', `${endpoint.method} ${endpoint.path} returned unexpected status`, {
          status: response.status
        });
      }
    } catch (error: any) {
      log('API Endpoints', 'FAIL', `${endpoint.method} ${endpoint.path} is not accessible`, error.message);
    }
  }
}

async function verifyCriticalFixes() {
  console.log('\n🔍 6. APPLYING CRITICAL FIXES...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/critical-fixes`, {}, { timeout: 60000 });
    if (response.data.success) {
      log('Critical Fixes', 'PASS', 'All critical fixes applied successfully', {
        enumFixes: response.data.results.enumFixes.length,
        userFixes: response.data.results.userFixes.length,
        roleFixes: response.data.results.roleFixes.length
      });
    } else {
      log('Critical Fixes', 'WARN', 'Some critical fixes may have failed', response.data);
    }
  } catch (error: any) {
    log('Critical Fixes', 'FAIL', 'Failed to apply critical fixes', error.message);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  
  console.log(`\n✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`⚠️  WARNINGS: ${warned}`);
  console.log(`📝 TOTAL: ${results.length}`);
  
  if (failed === 0 && warned === 0) {
    console.log('\n🎉 ALL CHECKS PASSED! Backend is ready for the Expo mobile app.');
  } else if (failed === 0) {
    console.log('\n⚠️  Backend is mostly ready, but some warnings should be reviewed.');
  } else {
    console.log('\n❌ Backend has critical issues that need to be fixed.');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 STARTING BACKEND VERIFICATION...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test User: ${TEST_USER_EMAIL}`);
  console.log('='.repeat(80));
  
  const isHealthy = await verifyHealthEndpoint();
  
  if (!isHealthy) {
    console.log('\n❌ Backend is not responding. Deployment may still be in progress.');
    console.log('Please wait a few minutes and try again.');
    process.exit(1);
  }
  
  // Run all verifications
  await verifyEnumValues();
  await verifyFirebaseConfig();
  await verifyCriticalFixes();
  await verifyTestUser();
  await verifyAPIEndpoints();
  
  // Print summary
  await printSummary();
}

main().catch((error) => {
  console.error('\n❌ Verification script failed:', error);
  process.exit(1);
});

