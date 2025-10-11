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
