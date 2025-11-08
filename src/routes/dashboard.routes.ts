import { Router } from 'express';
import {
  getRevenueChartData,
  getSalesPerformance,
  getRecentActivities,
  getDashboardStats,
  getTodaysBookingPlan
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
router.get('/booking-plan/today', getTodaysBookingPlan);

export default router;

