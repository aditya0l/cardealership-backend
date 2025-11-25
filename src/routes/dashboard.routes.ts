import { Router } from 'express';
import {
  getRevenueChartData,
  getSalesPerformance,
  getRecentActivities,
  getDashboardStats,
  getTodaysBookingPlan,
  getTeamLeaderDashboard,
  getBookingsFunnel
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// Dashboard analytics endpoints
router.get('/stats', getDashboardStats);
router.get('/revenue-chart', getRevenueChartData);
router.get('/sales-performance', getSalesPerformance);
router.get('/recent-activities', getRecentActivities);
router.get('/booking-plan/today', getTodaysBookingPlan);
router.get('/team-leader', authorize([RoleName.TEAM_LEAD]), getTeamLeaderDashboard);
router.get('/bookings/funnel', getBookingsFunnel);

export default router;

