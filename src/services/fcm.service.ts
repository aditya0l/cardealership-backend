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
}

export default new FCMService();
