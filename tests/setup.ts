import { PrismaClient } from '@prisma/client';

declare global {
  var __MONGO_URI__: string;
  var __MONGO_DB_NAME__: string;
}

// Test setup
beforeAll(async () => {
  // Initialize test database if needed
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup
  console.log('🧹 Cleaning up test environment...');
});

export {};

