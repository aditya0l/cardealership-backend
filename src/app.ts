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

// Fix database enums endpoint
app.post('/api/fix-enums', async (req, res) => {
  try {
    console.log('🔧 Fixing database enums...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Add missing enum values
    await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'HOT';`;
    await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'WARM';`;
    await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'COLD';`;
    await prisma.$executeRaw`ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS 'BOOKED';`;
    
    // Check current enum values
    const categories = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"EnquiryCategory")) as category;
    `;
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Enums fixed successfully',
      categories: categories
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/quotations', quotationsRoutes); // Re-enabled with RBAC
app.use('/api/stock', stockRoutes); // Re-enabled with Vehicle model and RBAC
app.use('/api/models', modelRoutes); // Model master data management
app.use('/api/dashboard', dashboardRoutes); // Dashboard analytics endpoints

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
