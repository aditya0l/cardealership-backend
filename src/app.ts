import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';

// Import routes
import authRoutes from './routes/auth.routes';
import enquiriesRoutes from './routes/enquiries.routes';
import bookingsRoutes from './routes/bookings.routes';
import quotationsRoutes from './routes/quotations.routes';
import stockRoutes from './routes/stock.routes'; // Updated to use Vehicle model with RBAC
import dashboardRoutes from './routes/dashboard.routes';
import modelRoutes from './routes/model.routes';
import adminRoutes from './routes/admin.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Supports React Dashboard, Expo Web & Mobile
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Expo, or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all local network access
    if (config.nodeEnv === 'development') {
      // Allow localhost and local network IPs (for React Dashboard & Expo)
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isLocalNetwork = /^http:\/\/192\.168\.\d+\.\d+/.test(origin) || 
                            /^http:\/\/10\.\d+\.\d+\.\d+/.test(origin) ||
                            /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/.test(origin);
      
      if (isLocalhost || isLocalNetwork) {
        return callback(null, true);
      }
    }
    
    // Allowed origins for all environments
    const allowedOrigins = [
      'http://localhost:3000',      // React dev server
      'http://localhost:5173',      // Vite dev server (React Dashboard)
      'http://localhost:19006',     // Expo web
      'http://localhost:8081',      // Expo mobile dev
      'https://localhost:3000',
      'https://localhost:5173',
      // Production frontend URLs (update these with your actual domains)
      'https://your-react-dashboard.vercel.app',
      'https://your-react-dashboard.netlify.app',
      // Add your deployed frontend URLs here after deployment
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend running 🚀',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// Create sample bookings for advisor endpoint
app.post('/api/create-sample-bookings', async (req, res) => {
  try {
    console.log('🔧 Creating sample bookings for advisor...');
    
    const { PrismaClient, BookingStatus } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Find the advisor user
    const advisor = await prisma.user.findUnique({
      where: { email: 'advisor.new@test.com' },
      select: { firebaseUid: true, employeeId: true, name: true }
    });
    
    if (!advisor) {
      await prisma.$disconnect();
      return res.status(404).json({
        success: false,
        message: 'Advisor user not found'
      });
    }
    
    console.log(`Creating bookings for advisor: ${advisor.name} (${advisor.employeeId})`);
    
    // Sample booking data
    const sampleBookings = [
      {
        customerName: 'John Smith',
        customerPhone: '+91-9876543210',
        customerEmail: 'john.smith@email.com',
        variant: 'Tata Nexon XZ+',
        bookingDate: new Date('2025-10-15'),
        expectedDeliveryDate: new Date('2025-10-20'),
        status: BookingStatus.CONFIRMED,
        advisorId: advisor.firebaseUid,
        dealerCode: 'TATA001',
        remarks: 'Customer interested in XZ+ variant with sunroof'
      },
      {
        customerName: 'Sarah Johnson',
        customerPhone: '+91-9876543211',
        customerEmail: 'sarah.johnson@email.com',
        variant: 'Tata Harrier XZA+',
        bookingDate: new Date('2025-10-12'),
        expectedDeliveryDate: new Date('2025-10-18'),
        status: BookingStatus.PENDING,
        advisorId: advisor.firebaseUid,
        dealerCode: 'TATA001',
        remarks: 'Customer wants test drive before final confirmation'
      },
      {
        customerName: 'Mike Wilson',
        customerPhone: '+91-9876543212',
        customerEmail: 'mike.wilson@email.com',
        variant: 'Tata Safari XZA+',
        bookingDate: new Date('2025-10-10'),
        expectedDeliveryDate: new Date('2025-10-25'),
        status: BookingStatus.CONFIRMED,
        advisorId: advisor.firebaseUid,
        dealerCode: 'TATA001',
        remarks: 'Family car for weekend trips'
      },
      {
        customerName: 'Emily Brown',
        customerPhone: '+91-9876543213',
        customerEmail: 'emily.brown@email.com',
        variant: 'Tata Altroz XZ+',
        bookingDate: new Date('2025-10-08'),
        expectedDeliveryDate: new Date('2025-10-16'),
        status: BookingStatus.DELIVERED,
        advisorId: advisor.firebaseUid,
        dealerCode: 'TATA001',
        remarks: 'First car purchase for young professional'
      },
      {
        customerName: 'David Lee',
        customerPhone: '+91-9876543214',
        customerEmail: 'david.lee@email.com',
        variant: 'Tata Punch Adventure',
        bookingDate: new Date('2025-10-05'),
        expectedDeliveryDate: new Date('2025-10-12'),
        status: BookingStatus.CANCELLED,
        advisorId: advisor.firebaseUid,
        dealerCode: 'TATA001',
        remarks: 'Customer cancelled due to financial constraints'
      }
    ];
    
    // Create bookings
    const createdBookings = [];
    const errors = [];
    for (const bookingData of sampleBookings) {
      try {
        const booking = await prisma.booking.create({
          data: bookingData
        });
        createdBookings.push(booking);
        console.log(`✅ Created booking for ${bookingData.customerName}`);
      } catch (error: any) {
        console.error(`❌ Error creating booking for ${bookingData.customerName}:`, error.message);
        errors.push({
          customer: bookingData.customerName,
          error: error.message
        });
      }
    }
    
    await prisma.$disconnect();
    
    return res.json({
      success: true,
      message: `Created ${createdBookings.length} sample bookings for advisor`,
      advisor: {
        name: advisor.name,
        email: 'advisor.new@test.com',
        employeeId: advisor.employeeId
      },
      bookingsCreated: createdBookings.length,
      totalBookings: createdBookings.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    console.error('Error creating sample bookings:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error creating sample bookings',
      error: error.message
    });
  }
});

// Critical backend fixes endpoint - fixes all production blocking issues
app.post('/api/critical-fixes', async (req, res) => {
  try {
    console.log('🚨 Applying critical backend fixes...');
    
    const { PrismaClient, BookingStatus, RoleName } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const results = {
      enumFixes: [] as string[],
      userFixes: [] as string[],
      roleFixes: [] as string[]
    };
    
    // Fix 1: Add missing enum values
    console.log('🔧 Fixing EnquiryCategory enum...');
    const enumValues = ['ALL', 'HOT', 'WARM', 'COLD', 'LOST', 'BOOKED'];
    
    for (const value of enumValues) {
      try {
        await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS ${value};`;
        results.enumFixes.push(`✅ Added ${value} to EnquiryCategory`);
        console.log(`✅ Added ${value} to EnquiryCategory`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          results.enumFixes.push(`ℹ️ ${value} already exists in EnquiryCategory`);
        } else {
          results.enumFixes.push(`❌ Error adding ${value}: ${error.message}`);
        }
      }
    }
    
    // Fix 2: Ensure required roles exist
    console.log('🔧 Ensuring required roles exist...');
    const requiredRoles = [
      'ADMIN',
      'CUSTOMER_ADVISOR', 
      'SALES_MANAGER',
      'GENERAL_MANAGER'
    ];
    
    for (const roleName of requiredRoles) {
      try {
        await prisma.role.upsert({
          where: { name: roleName as any },
          update: {},
          create: {
            name: roleName as any
          }
        });
        results.roleFixes.push(`✅ Role ${roleName} exists`);
      } catch (error: any) {
        results.roleFixes.push(`❌ Error with role ${roleName}: ${error.message}`);
      }
    }
    
    // Fix 3: Add critical test users
    console.log('🔧 Adding critical test users...');
    
    // Get the CUSTOMER_ADVISOR role
    const advisorRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER_ADVISOR' }
    });
    
    if (advisorRole) {
      // Add advisor user
      try {
        await prisma.user.upsert({
          where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' },
          update: {
            name: 'Advisor New',
            email: 'advisor.new@test.com',
            roleId: advisorRole.id,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2',
            name: 'Advisor New',
            email: 'advisor.new@test.com',
            roleId: advisorRole.id,
            employeeId: 'ADV007',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        results.userFixes.push('✅ Advisor user (advisor.new@test.com) created/updated');
      } catch (error: any) {
        results.userFixes.push(`❌ Error with advisor user: ${error.message}`);
      }
    }
    
    // Get the ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });
    
    if (adminRole) {
      // Add admin user
      try {
        await prisma.user.upsert({
          where: { firebaseUid: 'admin-test-uid-123' },
          update: {
            name: 'Admin User',
            email: 'admin@dealership.com',
            roleId: adminRole.id,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            firebaseUid: 'admin-test-uid-123',
            name: 'Admin User',
            email: 'admin@dealership.com',
            roleId: adminRole.id,
            employeeId: 'ADM001',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        results.userFixes.push('✅ Admin user (admin@dealership.com) created/updated');
      } catch (error: any) {
        results.userFixes.push(`❌ Error with admin user: ${error.message}`);
      }
    }
    
    // Verify current enum values
    const currentEnums = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"EnquiryCategory")) as category;
    `;
    
    await prisma.$disconnect();
    
    return res.json({
      success: true,
      message: 'Critical backend fixes applied successfully',
      results: {
        enumFixes: results.enumFixes,
        userFixes: results.userFixes,
        roleFixes: results.roleFixes,
        currentEnquiryCategories: currentEnums
      },
      testCredentials: {
        advisor: {
          email: 'advisor.new@test.com',
          firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2',
          employeeId: 'ADV007'
        },
        admin: {
          email: 'admin@dealership.com',
          firebaseUid: 'admin-test-uid-123',
          employeeId: 'ADM001'
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error applying critical fixes:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error applying critical fixes',
      error: error.message
    });
  }
});

// Assign all bookings to advisor endpoint
app.post('/api/assign-bookings-to-advisor', async (req, res) => {
  try {
    console.log('🔧 Assigning all bookings to advisor...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Find the advisor user
    const advisor = await prisma.user.findUnique({
      where: { email: 'advisor.new@test.com' },
      select: { firebaseUid: true, employeeId: true, name: true }
    });
    
    if (!advisor) {
      await prisma.$disconnect();
      return res.status(404).json({
        success: false,
        message: 'Advisor user not found'
      });
    }
    
    console.log(`Found advisor: ${advisor.name} (${advisor.employeeId})`);
    
    // Update all bookings to assign them to this advisor
    const updateResult = await prisma.booking.updateMany({
      data: {
        advisorId: advisor.firebaseUid
      }
    });
    
    // Also update all enquiries to assign them to this advisor
    const enquiryUpdateResult = await prisma.enquiry.updateMany({
      data: {
        assignedToUserId: advisor.firebaseUid
      }
    });
    
    await prisma.$disconnect();
    
    return res.json({
      success: true,
      message: 'All bookings and enquiries assigned to advisor',
      advisor: {
        name: advisor.name,
        email: 'advisor.new@test.com',
        employeeId: advisor.employeeId
      },
      updatedBookings: updateResult.count,
      updatedEnquiries: enquiryUpdateResult.count
    });
    
  } catch (error: any) {
    console.error('Error assigning bookings:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error assigning bookings',
      error: error.message
    });
  }
});

// Fix StockAvailability enum specifically
app.post('/api/fix-stock-enum', async (req, res) => {
  try {
    console.log('🔧 Fixing StockAvailability enum...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Add StockAvailability enum values
    try {
      await prisma.$executeRaw`ALTER TYPE "StockAvailability" ADD VALUE IF NOT EXISTS 'VNA';`;
      console.log('✅ Added VNA to StockAvailability');
    } catch (error: any) {
      console.log('ℹ️ VNA might already exist:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TYPE "StockAvailability" ADD VALUE IF NOT EXISTS 'VEHICLE_AVAILABLE';`;
      console.log('✅ Added VEHICLE_AVAILABLE to StockAvailability');
    } catch (error: any) {
      console.log('ℹ️ VEHICLE_AVAILABLE might already exist:', error.message);
    }
    
    // Check current StockAvailability enum values
    const stockAvailability = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"StockAvailability")) as availability;
    `;
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'StockAvailability enum fixed successfully',
      stockAvailability: stockAvailability
    });
    
  } catch (error: any) {
    console.error('Error fixing StockAvailability enum:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fixing StockAvailability enum',
      error: error.message
    });
  }
});

// Fix database enums endpoint
app.post('/api/fix-enums', async (req, res) => {
  try {
    console.log('🔧 Fixing database enums...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
             // Add missing enum values for EnquiryCategory
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'ALL';`;
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'HOT';`;
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'WARM';`;
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'COLD';`;
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'BOOKED';`;
             await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'LOST';`;
             
             console.log('✅ Added all EnquiryCategory enum values');
             
             // Add missing enum values for StockAvailability
             await prisma.$executeRaw`ALTER TYPE "StockAvailability" ADD VALUE IF NOT EXISTS 'VNA';`;
             await prisma.$executeRaw`ALTER TYPE "StockAvailability" ADD VALUE IF NOT EXISTS 'VEHICLE_AVAILABLE';`;
             
             console.log('✅ Added all StockAvailability enum values');
    
    // Check current enum values
    const categories = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"EnquiryCategory")) as category;
    `;
    
    const stockAvailability = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"StockAvailability")) as availability;
    `;
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Enums fixed successfully',
      categories: categories,
      stockAvailability: stockAvailability
    });
    
  } catch (error: any) {
    console.error('Error fixing enums:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fixing enums',
      error: error.message
    });
  }
});

// Fix deployed users endpoint
app.post('/api/fix-users', async (req, res) => {
  try {
    console.log('🔧 Fixing users in deployed database...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get Firebase users
    const { auth } = await import('./config/firebase');
    const listUsersResult = await auth.listUsers(100);
    console.log(`Found ${listUsersResult.users.length} Firebase users`);
    
    // Get roles
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles`);
    
    let fixedCount = 0;
    
    for (const firebaseUser of listUsersResult.users) {
      try {
        const email = firebaseUser.email;
        if (!email) continue;
        
        const name = firebaseUser.displayName || email.split('@')[0];
        const firebaseUid = firebaseUser.uid;
        
        // Determine role based on email
        let roleName: string = 'CUSTOMER_ADVISOR';
        if (email.includes('admin')) roleName = 'ADMIN';
        if (email.includes('manager')) roleName = 'GENERAL_MANAGER';
        if (email.includes('lead')) roleName = 'TEAM_LEAD';
        if (email.includes('sales')) roleName = 'SALES_MANAGER';
        
        const role = roles.find(r => r.name === roleName);
        if (!role) continue;
        
        // Generate employee ID
        const existingCount = await prisma.user.count({
          where: {
            employeeId: { startsWith: roleName === 'CUSTOMER_ADVISOR' ? 'ADV' : 'EMP' },
            role: { name: roleName as any }
          }
        });
        
        const employeeId = roleName === 'CUSTOMER_ADVISOR' 
          ? `ADV${String(existingCount + 1).padStart(3, '0')}`
          : `EMP${String(existingCount + 1).padStart(3, '0')}`;
        
        // Insert or update user
        await prisma.user.upsert({
          where: { firebaseUid },
          update: {
            name,
            email,
            roleId: role.id,
            employeeId,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            firebaseUid,
            name,
            email,
            roleId: role.id,
            employeeId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        fixedCount++;
        console.log(`✅ Fixed ${email} -> ${roleName} (${employeeId})`);
        
      } catch (error: any) {
        console.error(`❌ Error processing ${firebaseUser.email}:`, error.message);
      }
    }
    
    await prisma.$disconnect();
    
    // Verify the specific user we need
    const verifiedUser = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' },
      include: { role: true }
    });
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} users`,
      advisorUser: verifiedUser ? {
        email: verifiedUser.email,
        employeeId: verifiedUser.employeeId,
        role: verifiedUser.role.name
      } : null
    });
    
  } catch (error: any) {
    console.error('Error fixing users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fixing users',
      error: error.message
    });
  }
});

// Debug authentication endpoint
app.get('/api/debug-auth', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader === 'Bearer test-user') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Test user lookup
      let testUser = await prisma.user.findFirst({
        where: { email: 'advisor.new@test.com' },
        include: { role: true }
      });
      
      if (!testUser) {
        testUser = await prisma.user.findFirst({
          include: { role: true }
        });
      }
      
      await prisma.$disconnect();
      
      if (testUser) {
        res.json({
          success: true,
          message: 'Test user found',
          user: {
            email: testUser.email,
            role: testUser.role.name,
            employeeId: testUser.employeeId
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No test user found'
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Invalid test-user token',
        received: authHeader
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Debug auth error',
      error: error.message
    });
  }
});

// Database schema check endpoint
app.get('/api/db-schema-check', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Try to query a user with the new employee_id field
    const user = await prisma.user.findFirst({
      select: {
        firebaseUid: true,
        employeeId: true,
        managerId: true,
        name: true,
      }
    });
    
    await prisma.$disconnect();
    
    res.json({
      status: 'ok',
      message: 'Database schema is up to date',
      hasEmployeeId: true,
      hasManagerId: true,
      sampleUser: user,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Database schema check failed',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

// Firebase status endpoint for debugging
app.get('/api/firebase-status', async (req, res) => {
  try {
    const { auth } = await import('./config/firebase');
    
    // Try to list a few users to test Firebase connection
    const listUsersResult = await auth.listUsers(1);
    
    res.json({
      status: 'ok',
      message: 'Firebase initialized successfully',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyFormat: {
        startsWithBegin: process.env.FIREBASE_PRIVATE_KEY?.startsWith('-----BEGIN'),
        hasBackslashN: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'),
        hasRealNewline: process.env.FIREBASE_PRIVATE_KEY?.includes('\n'),
        length: process.env.FIREBASE_PRIVATE_KEY?.length,
      },
      userCount: listUsersResult.users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Firebase initialization failed',
      error: error.message,
      errorCode: error.code,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyFormat: {
        startsWithBegin: process.env.FIREBASE_PRIVATE_KEY?.startsWith('-----BEGIN'),
        hasBackslashN: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'),
        hasRealNewline: process.env.FIREBASE_PRIVATE_KEY?.includes('\n'),
        length: process.env.FIREBASE_PRIVATE_KEY?.length,
        first50Chars: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50),
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check user role
app.get('/api/debug-user-role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    
    await prisma.$disconnect();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        email
      });
    }
    
    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        firebaseUid: user.firebaseUid,
        employeeId: user.employeeId,
        role: {
          id: user.role.id,
          name: user.role.name
        },
        isActive: user.isActive,
        whatLoginReturns: {
          user: {
            firebaseUid: user.firebaseUid,
            email: user.email,
            name: user.name,
            role: {
              id: user.role.id,
              name: user.role.name
            }
          }
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// Force fix admin role endpoint
app.post('/api/fix-admin-role', async (req, res) => {
  try {
    const { PrismaClient, RoleName } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: RoleName.ADMIN }
    });
    
    if (!adminRole) {
      await prisma.$disconnect();
      return res.status(404).json({
        success: false,
        message: 'ADMIN role not found in database'
      });
    }
    
    // Update admin.new@test.com to ADMIN role
    const updatedUser = await prisma.user.update({
      where: { email: 'admin.new@test.com' },
      data: { roleId: adminRole.id },
      include: { role: true }
    });
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Admin role fixed successfully',
      data: {
        email: updatedUser.email,
        name: updatedUser.name,
        roleBeforeFix: '(unknown)',
        roleAfterFix: updatedUser.role.name,
        firebaseUid: updatedUser.firebaseUid
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fixing admin role',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/quotations', quotationsRoutes); // Re-enabled with RBAC
app.use('/api/stock', stockRoutes); // Re-enabled with Vehicle model and RBAC
app.use('/api/models', modelRoutes); // Model master data management
app.use('/api/dashboard', dashboardRoutes); // Dashboard analytics endpoints
app.use('/api/admin', adminRoutes); // Admin management system for dealership configuration

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
