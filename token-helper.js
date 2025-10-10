// Simple Firebase Token Tester
// Use this in browser console or Node.js to get JWT tokens

// For browser (if you have Firebase Web SDK):
/*
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

async function getTokenForUser(email, password) {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    
    console.log(`Token for ${email}:`);
    console.log(token);
    console.log('---');
    
    return token;
  } catch (error) {
    console.error(`Error getting token for ${email}:`, error);
  }
}

// Get tokens for all test users
const testUsers = [
  { email: 'admin@dealership.com', password: 'Admin123!' },
  { email: 'manager@dealership.com', password: 'Manager123!' },
  { email: 'sales@dealership.com', password: 'Sales123!' },
  { email: 'teamlead@dealership.com', password: 'Lead123!' },
  { email: 'advisor@dealership.com', password: 'Advisor123!' }
];

async function getAllTokens() {
  for (const user of testUsers) {
    await getTokenForUser(user.email, user.password);
  }
}

// Run: getAllTokens()
*/

// For testing without Firebase setup:
console.log('🔐 Mock JWT Tokens for Testing:');
console.log('');
console.log('ADMIN Token:');
console.log('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-admin-token');
console.log('');
console.log('GENERAL_MANAGER Token:');
console.log('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-manager-token');
console.log('');
console.log('💡 Use these in Postman Authorization header:');
console.log('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-admin-token');

export const mockTokens = {
  ADMIN: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-admin-token',
  GENERAL_MANAGER: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-manager-token', 
  SALES_MANAGER: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-sales-token',
  TEAM_LEAD: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-teamlead-token',
  CUSTOMER_ADVISOR: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-advisor-token'
};
