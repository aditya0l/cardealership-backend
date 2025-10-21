import { Request, Response } from 'express';
import prisma from '../config/db';
import { asyncHandler } from '../middlewares/error.middleware';

interface AuthenticatedRequest extends Request {
  user: {
    firebaseUid: string;
    email: string;
    role: {
      name: string;
    };
    dealershipId?: string;
  };
}

// Update FCM token for authenticated user
export const updateFCMToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fcmToken, deviceType } = req.body;
  const userId = req.user.firebaseUid;

  if (!fcmToken) {
    res.status(400).json({
      success: false,
      message: 'FCM token is required'
    });
    return;
  }

  // Validate device type
  if (deviceType && !['android', 'ios'].includes(deviceType)) {
    res.status(400).json({
      success: false,
      message: 'Device type must be either "android" or "ios"'
    });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { firebaseUid: userId },
      data: {
        fcmToken,
        deviceType: deviceType || null,
        lastTokenUpdated: new Date()
      },
      select: {
        firebaseUid: true,
        name: true,
        email: true,
        fcmToken: true,
        deviceType: true,
        lastTokenUpdated: true
      }
    });

    res.json({
      success: true,
      message: 'FCM token updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token'
    });
  }
});

// Get current FCM token for authenticated user
export const getFCMToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId },
      select: {
        firebaseUid: true,
        name: true,
        email: true,
        fcmToken: true,
        deviceType: true,
        lastTokenUpdated: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'FCM token retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve FCM token'
    });
  }
});

// Remove FCM token (logout/device change)
export const removeFCMToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;

  try {
    await prisma.user.update({
      where: { firebaseUid: userId },
      data: {
        fcmToken: null,
        deviceType: null,
        lastTokenUpdated: new Date()
      }
    });

    res.json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token'
    });
  }
});

// Get notification history for authenticated user
export const getNotificationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const { page = 1, limit = 50, type } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          entityId: true,
          sentAt: true,
          delivered: true
        }
      }),
      prisma.notificationLog.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Notification history retrieved successfully',
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification history'
    });
  }
});

// Get notification statistics for authenticated user
export const getNotificationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;

  try {
    const [totalNotifications, unreadCount, typeStats] = await Promise.all([
      prisma.notificationLog.count({ where: { userId } }),
      prisma.notificationLog.count({ 
        where: { 
          userId,
          delivered: false 
        } 
      }),
      prisma.notificationLog.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
        orderBy: { _count: { type: 'desc' } }
      })
    ]);

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentNotifications = await prisma.notificationLog.count({
      where: {
        userId,
        sentAt: { gte: last7Days }
      }
    });

    res.json({
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: {
        totalNotifications,
        unreadCount,
        recentNotifications,
        typeBreakdown: typeStats.map((stat: any) => ({
          type: stat.type,
          count: stat._count
        }))
      }
    });
  } catch (error) {
    console.error('Error retrieving notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification statistics'
    });
  }
});

// Mark notification as read
export const markNotificationAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const { notificationId } = req.params;

  try {
    const notification = await prisma.notificationLog.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
      return;
    }

    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { delivered: true }
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Test notification endpoint (for development/testing)
export const sendTestNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const { title, body } = req.body;

  if (!title || !body) {
    res.status(400).json({
      success: false,
      message: 'Title and body are required for test notification'
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId },
      select: { fcmToken: true, name: true }
    });

    if (!user?.fcmToken) {
      res.status(400).json({
        success: false,
        message: 'FCM token not found. Please update your FCM token first.'
      });
      return;
    }

    // Import FCMService dynamically to avoid circular dependencies
    const FCMService = (await import('../services/fcm.service')).default;
    
    const success = await FCMService.sendNotification(user.fcmToken, {
      title,
      body,
      data: {
        type: 'test',
        priority: 'LOW'
      }
    });

    if (success) {
      // Log the test notification
      await prisma.notificationLog.create({
        data: {
          userId,
          title,
          body,
          type: 'test',
          delivered: true
        }
      });

      res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});
