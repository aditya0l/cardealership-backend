import { Router } from 'express';
import { 
  updateFCMToken, 
  getFCMToken, 
  removeFCMToken,
  getNotificationHistory,
  getNotificationStats,
  markNotificationAsRead,
  sendTestNotification
} from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// FCM Token Management
router.post('/fcm-token', authenticate, updateFCMToken);
router.get('/fcm-token', authenticate, getFCMToken);
router.delete('/fcm-token', authenticate, removeFCMToken);

// Notification History & Stats
router.get('/history', authenticate, getNotificationHistory);
router.get('/stats', authenticate, getNotificationStats);
router.patch('/:notificationId/read', authenticate, markNotificationAsRead);

// Test Notification (for development)
router.post('/test', authenticate, sendTestNotification);

export default router;
