import app from './app';
import { config } from './config/env';
import prisma from './config/db';
import './config/firebase'; // Initialize Firebase Admin SDK
import BookingImportProcessor from './services/booking-import-processor.service';
import { checkRedisConnection } from './services/queue.service';
import { networkInterfaces } from 'os';

const PORT = config.port;

// Get local IP address for network access
const getLocalIPAddress = (): string => {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
};

// Graceful shutdown handler
const gracefulShutdown = (server: any, signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async (err: any) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('HTTP server closed.');
    
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
      console.log('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during database shutdown:', error);
      process.exit(1);
    }
  });
};

// Database connection check
const checkDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test database with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test passed');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct');
    process.exit(1);
  }
};

// Initialize roles in database
const initializeRoles = async () => {
  try {
    const roles = ['ADMIN', 'GENERAL_MANAGER', 'SALES_MANAGER', 'TEAM_LEAD', 'CUSTOMER_ADVISOR'];
    
    for (const roleName of roles) {
      await prisma.role.upsert({
        where: { name: roleName as any },
        update: {},
        create: { name: roleName as any }
      });
    }
    
    console.log('✅ Roles initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize roles:', error);
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    // Check database connection
    await checkDatabaseConnection();
    
    // Initialize roles (skip if already exist)
    try {
      await initializeRoles();
    } catch (error) {
      console.log('⚠️ Role initialization skipped (roles may already exist)');
    }
    
            // Check Redis connection and initialize job processor (optional for basic functionality)
            const redisConnected = await checkRedisConnection();
            if (redisConnected) {
              BookingImportProcessor.initialize();
              console.log('✅ Redis connected and job processor initialized');
            } else {
              console.warn('⚠️  Redis not available - bulk import will work but without background processing');
              console.log('💡 To enable background processing, start Redis with: brew services start redis');
            }
    
    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      const localIP = getLocalIPAddress();
      console.log('\n🚀 Car Dealership Backend Server Started');
      console.log('==========================================');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Network access: http://${localIP}:${PORT}/api/health`);
      console.log(`🔗 Other devices can access: http://${localIP}:${PORT}`);
      console.log('==========================================\n');
      
      if (config.nodeEnv === 'development') {
        console.log('📝 Available endpoints:');
        console.log(`   GET  /api/health - Health check`);
        console.log(`   POST /api/auth/register - User registration`);
        console.log(`   POST /api/auth/login - User login`);
        console.log(`   GET  /api/auth/profile - User profile`);
        console.log(`   *    /api/enquiries - Enquiries CRUD`);
        console.log(`   *    /api/bookings - Enhanced Bookings CRUD + Import`);
        console.log(`   *    /api/quotations - Quotations CRUD`);
        console.log(`   *    /api/stock - Stock CRUD\n`);
        
        console.log('🚀 New Bulk Import Features:');
        console.log(`   POST /api/bookings/import/upload - Upload CSV/Excel`);
        console.log(`   POST /api/bookings/import/preview - Preview import file`);
        console.log(`   GET  /api/bookings/imports - Import history`);
        console.log(`   GET  /api/bookings/advisor/my-bookings - Advisor mobile endpoint\n`);
        
        console.log('💡 Next steps:');
        console.log('   1. Start Redis server for background jobs');
        console.log('   2. Test health endpoint: curl http://localhost:4000/api/health');
        console.log('   3. Test from other devices: curl http://' + localIP + ':4000/api/health');
        console.log('   4. Create sample dealers and users');
        console.log('   5. Upload sample CSV for bulk import\n');
      }
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown(server, 'UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown(server, 'UNHANDLED_REJECTION');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

export default server;
