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
    return res.status(400).json({
      success: false,
      message: 'FCM token is required'
    });
  }

  // Validate device type
  if (deviceType && !['android', 'ios'].includes(deviceType)) {
    return res.status(400).json({
      success: false,
      message: 'Device type must be either "android" or "ios"'
    });
  }

  try {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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

    return res.json({
      success: true,
      message: 'FCM token updated successfully',
      data: user
    });
  } catch (error: any) {
    console.error('Error updating FCM token:', error);
    
    // More specific error handling
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'FCM token already exists for another user'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      message: 'FCM token retrieved successfully',
      data: user
    });
  } catch (error: any) {
    console.error('Error retrieving FCM token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve FCM token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    return res.json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing FCM token:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get notification history for authenticated user
export const getNotificationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const userRole = req.user.role.name;
  const { page = 1, limit = 50, type } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause based on user role
    let where: any = { userId };
    
    // Role-based filtering
    if (userRole === 'CUSTOMER_ADVISOR') {
      // Customer Advisors only see their own notifications
      where.userId = userId;
    } else if (userRole === 'TEAM_LEAD') {
      // Team Leads see their own notifications + team member notifications
      const teamMembers = await prisma.user.findMany({
        where: { managerId: userId },
        select: { firebaseUid: true }
      });
      const teamMemberIds = teamMembers.map(member => member.firebaseUid);
      where = {
        OR: [
          { userId },
          { userId: { in: teamMemberIds } }
        ]
      };
    } else if (userRole === 'SALES_MANAGER' || userRole === 'GENERAL_MANAGER' || userRole === 'ADMIN') {
      // Management sees all notifications in their dealership
      where = {
        user: {
          dealershipId: req.user.dealershipId
        }
      };
    }

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
          delivered: true,
          user: {
            select: {
              firebaseUid: true,
              name: true,
              role: {
                select: { name: true }
              }
            }
          }
        }
      }),
      prisma.notificationLog.count({ where })
    ]);

    return res.json({
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
  } catch (error: any) {
    console.error('Error retrieving notification history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get notification statistics for authenticated user
export const getNotificationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const userRole = req.user.role.name;

  try {
    // Build where clause based on user role (same logic as getNotificationHistory)
    let where: any = { userId };
    
    if (userRole === 'CUSTOMER_ADVISOR') {
      where.userId = userId;
    } else if (userRole === 'TEAM_LEAD') {
      const teamMembers = await prisma.user.findMany({
        where: { managerId: userId },
        select: { firebaseUid: true }
      });
      const teamMemberIds = teamMembers.map(member => member.firebaseUid);
      where = {
        OR: [
          { userId },
          { userId: { in: teamMemberIds } }
        ]
      };
    } else if (userRole === 'SALES_MANAGER' || userRole === 'GENERAL_MANAGER' || userRole === 'ADMIN') {
      where = {
        user: {
          dealershipId: req.user.dealershipId
        }
      };
    }

    const [totalNotifications, unreadCount, typeStats] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.count({ 
        where: { 
          ...where,
          delivered: false 
        } 
      }),
      prisma.notificationLog.groupBy({
        by: ['type'],
        where,
        _count: true,
        orderBy: { _count: { type: 'desc' } }
      })
    ]);

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentNotifications = await prisma.notificationLog.count({
      where: {
        ...where,
        sentAt: { gte: last7Days }
      }
    });

    return res.json({
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
  } catch (error: any) {
    console.error('Error retrieving notification statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { delivered: true }
    });

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test notification endpoint (for development/testing)
export const sendTestNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: 'Title and body are required for test notification'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId },
      select: { fcmToken: true, name: true }
    });

    if (!user?.fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token not found. Please update your FCM token first.'
      });
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

      return res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark multiple notifications as read
export const markMultipleNotificationsAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.firebaseUid;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'notificationIds array is required'
    });
  }

  try {
    const result = await prisma.notificationLog.updateMany({
      where: {
        id: { in: notificationIds },
        userId
      },
      data: { delivered: true }
    });

    return res.json({
      success: true,
      message: `${result.count} notification(s) marked as read`,
      data: { updatedCount: result.count }
    });
  } catch (error: any) {
    console.error('Error marking multiple notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await prisma.notificationLog.delete({
      where: { id: notificationId }
    });

    return res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
