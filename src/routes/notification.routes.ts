import { Router } from 'express';
import { 
  updateFCMToken, 
  getFCMToken, 
  removeFCMToken,
  getNotificationHistory,
  getNotificationStats,
  markNotificationAsRead,
  markMultipleNotificationsAsRead,
  deleteNotification,
  sendTestNotification
} from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  notificationRateLimit, 
  fcmTokenRateLimit, 
  testNotificationRateLimit 
} from '../middlewares/rate-limit.middleware';

const router = Router();

// FCM Token Management (with rate limiting)
router.post('/fcm-token', fcmTokenRateLimit, authenticate, updateFCMToken);
router.get('/fcm-token', notificationRateLimit, authenticate, getFCMToken);
router.delete('/fcm-token', fcmTokenRateLimit, authenticate, removeFCMToken);

// Notification History & Stats (with rate limiting)
router.get('/history', notificationRateLimit, authenticate, getNotificationHistory);
router.get('/stats', notificationRateLimit, authenticate, getNotificationStats);
router.patch('/:notificationId/read', notificationRateLimit, authenticate, markNotificationAsRead);
router.patch('/mark-read', notificationRateLimit, authenticate, markMultipleNotificationsAsRead);
router.delete('/:notificationId', notificationRateLimit, authenticate, deleteNotification);

// Test Notification (with strict rate limiting)
router.post('/test', testNotificationRateLimit, authenticate, sendTestNotification);

export default router;
