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
import dealershipRoutes from './routes/dealership.routes'; // Multi-tenant dealership system
import notificationRoutes from './routes/notification.routes'; // FCM notification management
import remarkRoutes from './routes/remark.routes'; // Date-wise remarks and status tracking

// Import middleware
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Import cron service for automated follow-up notifications
// import './services/cron.service';

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
      // Production frontend URLs
      'https://your-react-dashboard.vercel.app',
      'https://your-react-dashboard.netlify.app',
      // Vercel domains (add your specific Vercel URL)
      'https://automotive-dashboard.vercel.app',
      'https://automotive-dashboard-git-main.vercel.app',
      'https://automotive-dashboard-git-develop.vercel.app',
      'https://automotive-dashboard-oj2u7m0ix-nrng2025001s-projects.vercel.app',
      // Wildcard for all Vercel deployments (temporary - replace with specific URL)
      /^https:\/\/.*\.vercel\.app$/,
      // Netlify domains
      /^https:\/\/.*\.netlify\.app$/,
      // Add your deployed frontend URLs here after deployment
    ];
    
    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/quotations', quotationsRoutes); // Re-enabled with RBAC
app.use('/api/stock', stockRoutes); // Re-enabled with Vehicle model and RBAC
app.use('/api/models', modelRoutes); // Model master data management
app.use('/api/dashboard', dashboardRoutes); // Dashboard analytics endpoints
app.use('/api/dealerships', dealershipRoutes); // Multi-tenant dealership system
app.use('/api/notifications', notificationRoutes); // FCM notification management
app.use('/api/remarks', remarkRoutes); // Date-wise remarks and status tracking

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
