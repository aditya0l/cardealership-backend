import { Router } from 'express';
import {
  getRevenueChartData,
  getSalesPerformance,
  getRecentActivities,
  getDashboardStats
} from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// Dashboard analytics endpoints
router.get('/stats', getDashboardStats);
router.get('/revenue-chart', getRevenueChartData);
router.get('/sales-performance', getSalesPerformance);
router.get('/recent-activities', getRecentActivities);

export default router;

