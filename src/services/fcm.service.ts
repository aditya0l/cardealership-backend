import { messaging } from '../config/firebase';
import { Message, MulticastMessage, MessagingPayload } from 'firebase-admin/messaging';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

class FCMService {
  constructor() {
    console.log('✅ FCM Service initialized with Firebase Admin SDK');
  }

  async sendNotification(
    token: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const message: Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      };

      const response = await messaging.send(message);
      console.log('✅ Notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);
      return false;
    }
  }

  async sendNotificationToMultiple(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<boolean> {
    if (tokens.length === 0) {
      console.warn('No tokens provided for notification');
      return false;
    }

    try {
      const message: MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        console.warn(`❌ ${response.failureCount} notifications failed out of ${tokens.length}`);
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            console.error(`Failed token ${tokens[idx]}:`, resp.error);
          }
        });
      }

      console.log(`✅ ${response.successCount} notifications sent successfully out of ${tokens.length}`);
      return response.successCount > 0;
    } catch (error) {
      console.error('❌ Error sending FCM notifications:', error);
      return false;
    }
  }

  // Notification templates for common scenarios
  async notifyNewEnquiry(token: string, enquiryTitle: string): Promise<boolean> {
    return this.sendNotification(token, {
      title: 'New Enquiry Assigned',
      body: `You have been assigned a new enquiry: ${enquiryTitle}`,
      data: {
        type: 'enquiry',
        action: 'assigned'
      }
    });
  }

  async notifyEnquiryStatusUpdate(
    token: string,
    enquiryTitle: string,
    status: string
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: 'Enquiry Status Updated',
      body: `Enquiry "${enquiryTitle}" status changed to ${status}`,
      data: {
        type: 'enquiry',
        action: 'status_update'
      }
    });
  }

  async notifyNewQuotation(
    token: string,
    enquiryTitle: string,
    amount: number
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: 'New Quotation Created',
      body: `A quotation of $${amount.toLocaleString()} has been created for "${enquiryTitle}"`,
      data: {
        type: 'quotation',
        action: 'created'
      }
    });
  }

  async notifyBookingConfirmed(
    token: string,
    customerName: string,
    vehicle: string
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: 'Booking Confirmed',
      body: `Booking confirmed for ${customerName} - ${vehicle}`,
      data: {
        type: 'booking',
        action: 'confirmed'
      }
    });
  }

  // Follow-up notification templates
  async notifyFollowUpReminder(
    token: string,
    customerName: string,
    entityType: string,
    entityId: string,
    priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: `Follow-up Required - ${priority === 'HIGH' ? '🚨' : '📋'}`,
      body: `Don't forget to follow up with ${customerName}`,
      data: {
        type: 'follow_up',
        entityType,
        entityId,
        priority
      }
    });
  }

  async notifyUrgentFollowUp(
    token: string,
    customerName: string,
    entityType: string,
    entityId: string,
    reason: string
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: '🚨 URGENT: Follow-up Required',
      body: `${customerName} needs immediate attention - ${reason}`,
      data: {
        type: 'urgent_follow_up',
        entityType,
        entityId,
        priority: 'HIGH'
      }
    });
  }

  async notifyDeliveryReminder(
    token: string,
    customerName: string,
    vehicle: string,
    daysUntilDelivery: number
  ): Promise<boolean> {
    let title = '';
    let body = '';

    if (daysUntilDelivery === 0) {
      title = '🚗 Delivery Today';
      body = `Today's delivery for ${customerName} - ${vehicle}`;
    } else if (daysUntilDelivery === 1) {
      title = '🚗 Delivery Tomorrow';
      body = `Tomorrow's delivery for ${customerName} - ${vehicle}`;
    } else if (daysUntilDelivery > 0) {
      title = `🚗 Delivery in ${daysUntilDelivery} Days`;
      body = `Delivery approaching for ${customerName} - ${vehicle}`;
    } else {
      title = '⚠️ Overdue Delivery';
      body = `Overdue delivery for ${customerName} - ${vehicle} (${Math.abs(daysUntilDelivery)} days late)`;
    }

    return this.sendNotification(token, {
      title,
      body,
      data: {
        type: 'delivery_reminder',
        priority: daysUntilDelivery <= 1 ? 'HIGH' : 'MEDIUM',
        daysUntilDelivery: daysUntilDelivery.toString()
      }
    });
  }

  async notifyTeamPerformance(
    token: string,
    teamName: string,
    metrics: {
      enquiries: number;
      bookings: number;
      conversions: number;
    }
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: '📊 Team Performance Update',
      body: `${teamName}: ${metrics.enquiries} enquiries, ${metrics.bookings} bookings, ${metrics.conversions}% conversion`,
      data: {
        type: 'team_performance',
        priority: 'LOW',
        metrics: JSON.stringify(metrics)
      }
    });
  }

  async notifySystemAlert(
    token: string,
    alertType: string,
    message: string,
    priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: `🔔 System Alert - ${alertType}`,
      body: message,
      data: {
        type: 'system_alert',
        alertType,
        priority
      }
    });
  }

  async notifyAssignmentUpdate(
    token: string,
    entityType: 'enquiry' | 'booking',
    entityId: string,
    action: 'assigned' | 'reassigned' | 'unassigned',
    details: string
  ): Promise<boolean> {
    return this.sendNotification(token, {
      title: `${entityType === 'enquiry' ? '📋' : '🚗'} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      body: details,
      data: {
        type: 'assignment_update',
        entityType,
        entityId,
        action,
        priority: 'MEDIUM'
      }
    });
  }
}

export default new FCMService();
