import prisma from '../config/db';
import FCMService from './fcm.service';

interface FollowUpConfig {
  enquiry: {
    HOT: { initialDays: number; intervalDays: number; maxFollowUps: number };
    WARM: { initialDays: number; intervalDays: number; maxFollowUps: number };
    COLD: { initialDays: number; intervalDays: number; maxFollowUps: number };
    autoCloseDays: number;
  };
  booking: {
    indicateDays: number[];
    postDeliveryDays: number[];
    intervalDays: number;
  };
}

const FOLLOWUP_CONFIG: FollowUpConfig = {
  enquiry: {
    HOT: { initialDays: 1, intervalDays: 2, maxFollowUps: 5 },
    WARM: { initialDays: 2, intervalDays: 3, maxFollowUps: 4 },
    COLD: { initialDays: 3, intervalDays: 5, maxFollowUps: 3 },
    autoCloseDays: 21
  },
  booking: {
    indicateDays: [7, 3, 1],
    postDeliveryDays: [3, 7],
    intervalDays: 3
  }
};

class FollowUpNotificationService {
  
  // Process enquiry follow-ups
  async processEnquiryFollowUps(): Promise<void> {
    console.log('🔄 Processing enquiry follow-ups...');
    
    const today = new Date();
    const enquiries = await this.getEnquiriesNeedingFollowUp(today);
    
    for (const enquiry of enquiries) {
      await this.sendEnquiryFollowUpNotification(enquiry);
      await this.updateEnquiryFollowUp(enquiry.id);
    }
    
    // Auto-close old enquiries
    await this.autoCloseOldEnquiries(today);
    
    console.log(`✅ Processed ${enquiries.length} enquiry follow-ups`);
  }
  
  // Process booking follow-ups
  async processBookingFollowUps(): Promise<void> {
    console.log('🔄 Processing booking follow-ups...');
    
    const today = new Date();
    const bookings = await this.getBookingsNeedingFollowUp(today);
    
    for (const booking of bookings) {
      await this.sendBookingFollowUpNotification(booking);
      await this.updateBookingFollowUp(booking.id);
    }
    
    console.log(`✅ Processed ${bookings.length} booking follow-ups`);
  }
  
  private async getEnquiriesNeedingFollowUp(today: Date) {
    return await prisma.enquiry.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        OR: [
          // Initial follow-up
          {
            createdAt: { 
              lte: new Date(today.getTime() - this.getInitialFollowUpDays() * 24 * 60 * 60 * 1000) 
            },
            lastFollowUpDate: null,
            followUpCount: 0
          },
          // Subsequent follow-ups
          {
            nextFollowUpDate: { lte: today },
            followUpCount: { lt: 5 }
          }
        ]
      },
      include: {
        createdBy: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } },
        assignedTo: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } }
      }
    });
  }
  
  private async getBookingsNeedingFollowUp(today: Date) {
    return await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          // Pre-delivery follow-ups
          {
            expectedDeliveryDate: {
              lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
              gte: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)
            }
          },
          // Post-delivery follow-ups
          {
            expectedDeliveryDate: { lte: today },
            status: 'PENDING'
          },
          // Regular follow-ups
          {
            nextFollowUpDate: { lte: today }
          }
        ]
      },
      include: {
        advisor: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } },
        enquiry: true
      }
    });
  }
  
  private async sendEnquiryFollowUpNotification(enquiry: any): Promise<void> {
    const config = FOLLOWUP_CONFIG.enquiry[enquiry.category as keyof typeof FOLLOWUP_CONFIG.enquiry] || FOLLOWUP_CONFIG.enquiry.COLD;
    const daysSinceCreation = Math.floor((Date.now() - enquiry.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    let title = '';
    let body = '';
    let priority = 'MEDIUM';
    
    if (enquiry.followUpCount === 0) {
      title = `${enquiry.category} Lead Follow-up Required`;
      body = `Customer ${enquiry.customerName} (${enquiry.model} ${enquiry.variant}) - Initial follow-up needed`;
      priority = enquiry.category === 'HOT' ? 'HIGH' : 'MEDIUM';
    } else {
      title = `Follow-up Reminder - Day ${daysSinceCreation}`;
      body = `Customer ${enquiry.customerName} - ${enquiry.followUpCount} follow-ups completed. Expected booking: ${enquiry.expectedBookingDate?.toLocaleDateString()}`;
      priority = daysSinceCreation > 14 ? 'HIGH' : 'MEDIUM';
    }
    
    // Send to assigned advisor or creator
    const recipient = enquiry.assignedTo || enquiry.createdBy;
    if (recipient?.fcmToken) {
      await FCMService.sendNotification(recipient.fcmToken, {
        title,
        body,
        data: {
          type: 'enquiry_followup',
          entityId: enquiry.id,
          priority,
          category: enquiry.category
        }
      });
      
      // Log notification
      await this.logNotification(recipient.firebaseUid, title, body, 'enquiry_followup', enquiry.id);
    }
  }
  
  private async sendBookingFollowUpNotification(booking: any): Promise<void> {
    const today = new Date();
    const deliveryDate = booking.expectedDeliveryDate;
    const daysUntilDelivery = deliveryDate ? Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    let title = '';
    let body = '';
    let priority = 'MEDIUM';
    
    if (daysUntilDelivery > 0) {
      // Pre-delivery notifications
      if (daysUntilDelivery === 7) {
        title = 'Delivery Approaching - 7 Days';
        body = `Booking #${booking.id.slice(-6)} for ${booking.customerName} - ${booking.model} ${booking.variant}. Delivery in 7 days.`;
        priority = 'MEDIUM';
      } else if (daysUntilDelivery === 3) {
        title = 'Delivery Preparation - 3 Days';
        body = `Booking #${booking.id.slice(-6)} for ${booking.customerName} - Final preparation needed. Delivery in 3 days.`;
        priority = 'HIGH';
      } else if (daysUntilDelivery === 1) {
        title = 'Delivery Tomorrow';
        body = `Booking #${booking.id.slice(-6)} for ${booking.customerName} - Delivery tomorrow! Contact customer.`;
        priority = 'HIGH';
      }
    } else {
      // Post-delivery notifications
      const daysOverdue = Math.abs(daysUntilDelivery);
      if (daysOverdue >= 3) {
        title = 'Overdue Delivery Alert';
        body = `Booking #${booking.id.slice(-6)} for ${booking.customerName} - Expected delivery was ${daysOverdue} days ago.`;
        priority = 'HIGH';
      }
    }
    
    if (booking.advisor?.fcmToken) {
      await FCMService.sendNotification(booking.advisor.fcmToken, {
        title,
        body,
        data: {
          type: 'booking_followup',
          entityId: booking.id,
          priority,
          deliveryDate: deliveryDate?.toISOString()
        }
      });
      
      // Log notification
      await this.logNotification(booking.advisor.firebaseUid, title, body, 'booking_followup', booking.id);
    }
  }
  
  private async updateEnquiryFollowUp(enquiryId: string): Promise<void> {
    const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry) return;
    
    const config = FOLLOWUP_CONFIG.enquiry[enquiry.category as keyof typeof FOLLOWUP_CONFIG.enquiry] || FOLLOWUP_CONFIG.enquiry.COLD;
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + (typeof config === 'object' ? config.intervalDays : config));
    
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        lastFollowUpDate: new Date(),
        followUpCount: enquiry.followUpCount + 1,
        nextFollowUpDate: nextFollowUpDate
      }
    });
  }
  
  private async updateBookingFollowUp(bookingId: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        lastFollowUpDate: new Date(),
        followUpCount: { increment: 1 },
        nextFollowUpDate: new Date(Date.now() + FOLLOWUP_CONFIG.booking.intervalDays * 24 * 60 * 60 * 1000)
      }
    });
  }
  
  private async autoCloseOldEnquiries(today: Date): Promise<void> {
    const cutoffDate = new Date(today.getTime() - FOLLOWUP_CONFIG.enquiry.autoCloseDays * 24 * 60 * 60 * 1000);
    
    await prisma.enquiry.updateMany({
      where: {
        createdAt: { lte: cutoffDate },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        followUpCount: { gte: 3 }
      },
      data: {
        status: 'CLOSED',
        caRemarks: 'Auto-closed after 21 days with no conversion'
      }
    });
  }
  
  private async logNotification(userId: string, title: string, body: string, type: string, entityId?: string): Promise<void> {
    await prisma.notificationLog.create({
      data: {
        userId,
        title,
        body,
        type,
        entityId,
        delivered: true
      }
    });
  }
  
  private getInitialFollowUpDays(): number {
    return 1; // Default initial follow-up after 1 day
  }
  
  // Process urgent follow-ups (HOT enquiries, overdue deliveries)
  async processUrgentFollowUps(): Promise<void> {
    console.log('🚨 Processing urgent follow-ups...');
    
    const today = new Date();
    
    // Get HOT enquiries that need immediate attention
    const urgentEnquiries = await prisma.enquiry.findMany({
      where: {
        category: 'HOT',
        status: 'OPEN',
        createdAt: {
          lte: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days old
        },
        OR: [
          { lastFollowUpDate: null },
          { 
            lastFollowUpDate: {
              lte: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day since last follow-up
            }
          }
        ]
      },
      include: {
        createdBy: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } },
        assignedTo: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } }
      }
    });
    
    // Get overdue bookings
    const overdueBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        expectedDeliveryDate: {
          lte: today // Past expected delivery date
        }
      },
      include: {
        advisor: { select: { fcmToken: true, name: true, role: true } }
      }
    });
    
    // Send urgent notifications
    for (const enquiry of urgentEnquiries) {
      const recipient = enquiry.assignedTo || enquiry.createdBy;
      if (recipient?.fcmToken) {
        await FCMService.sendNotification(recipient.fcmToken, {
          title: '🚨 URGENT: Hot Lead Follow-up Required',
          body: `Customer ${enquiry.customerName} (${enquiry.model}) needs immediate attention!`,
          data: {
            type: 'urgent_enquiry',
            entityId: enquiry.id,
            priority: 'HIGH'
          }
        });
        
        await this.logNotification(recipient.firebaseUid || enquiry.assignedToUserId || enquiry.createdByUserId, 'URGENT: Hot Lead Follow-up Required', `Customer ${enquiry.customerName} needs immediate attention!`, 'urgent_enquiry', enquiry.id);
      }
    }
    
    for (const booking of overdueBookings) {
      if (booking.advisor?.fcmToken) {
        const daysOverdue = booking.expectedDeliveryDate ? Math.floor((today.getTime() - booking.expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        await FCMService.sendNotification(booking.advisor.fcmToken, {
          title: '🚨 URGENT: Overdue Delivery',
          body: `Booking #${booking.id.slice(-6)} for ${booking.customerName} is ${daysOverdue} days overdue!`,
          data: {
            type: 'urgent_booking',
            entityId: booking.id,
            priority: 'HIGH'
          }
        });
        
        const advisorId = (booking.advisor as any).firebaseUid || booking.advisorId || '';
        await this.logNotification(advisorId, 'URGENT: Overdue Delivery', `Booking #${booking.id.slice(-6)} is ${daysOverdue} days overdue!`, 'urgent_booking', booking.id);
      }
    }
    
    console.log(`✅ Processed ${urgentEnquiries.length} urgent enquiries and ${overdueBookings.length} overdue bookings`);
  }
  
  // Process evening reminders
  async processEveningReminders(): Promise<void> {
    console.log('🌅 Processing evening reminders...');
    
    const today = new Date();
    
    // Get enquiries that need evening follow-up
    const eveningEnquiries = await prisma.enquiry.findMany({
      where: {
        status: 'OPEN',
        createdAt: {
          lte: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // At least 1 day old
        },
        OR: [
          { lastFollowUpDate: null },
          { 
            lastFollowUpDate: {
              lte: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        createdBy: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } },
        assignedTo: { select: { firebaseUid: true, fcmToken: true, name: true, role: true } }
      }
    });
    
    // Send evening reminders
    for (const enquiry of eveningEnquiries) {
      const recipient = enquiry.assignedTo || enquiry.createdBy;
      if (recipient?.fcmToken) {
        await FCMService.sendNotification(recipient.fcmToken, {
          title: '🌅 Evening Follow-up Reminder',
          body: `Don't forget to follow up with ${enquiry.customerName} (${enquiry.model} ${enquiry.variant})`,
          data: {
            type: 'evening_reminder',
            entityId: enquiry.id,
            priority: 'MEDIUM'
          }
        });
        
        await this.logNotification(recipient.firebaseUid || enquiry.assignedToUserId || enquiry.createdByUserId, 'Evening Follow-up Reminder', `Follow up with ${enquiry.customerName}`, 'evening_reminder', enquiry.id);
      }
    }
    
    console.log(`✅ Sent ${eveningEnquiries.length} evening reminders`);
  }
  
  // Process weekly summary
  async processWeeklySummary(): Promise<void> {
    console.log('📊 Processing weekly summary...');
    
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get weekly statistics
    const weeklyStats = await prisma.enquiry.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: oneWeekAgo }
      },
      _count: true
    });
    
    const weeklyBookings = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: oneWeekAgo }
      },
      _count: true
    });
    
    // Get all active users to send summary
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: { in: ['TEAM_LEAD', 'SALES_MANAGER', 'GENERAL_MANAGER', 'ADMIN'] }
        }
      },
      select: {
        firebaseUid: true,
        fcmToken: true,
        name: true,
        role: true
      }
    });
    
    // Create summary message
    const enquiryCount = weeklyStats.reduce((sum: number, stat: any) => sum + stat._count, 0);
    const bookingCount = weeklyBookings.reduce((sum: number, stat: any) => sum + stat._count, 0);
    
    const summaryBody = `Weekly Summary:\n📋 Enquiries: ${enquiryCount}\n🚗 Bookings: ${bookingCount}\n📈 Performance tracking available in dashboard`;
    
    // Send to management users
    for (const user of activeUsers) {
      if (user.fcmToken) {
        await FCMService.sendNotification(user.fcmToken, {
          title: '📊 Weekly Performance Summary',
          body: summaryBody,
          data: {
            type: 'weekly_summary',
            priority: 'LOW'
          }
        });
        
        await this.logNotification(user.firebaseUid || '', 'Weekly Performance Summary', summaryBody, 'weekly_summary');
      }
    }
    
    console.log(`✅ Sent weekly summary to ${activeUsers.length} management users`);
  }
}

export default new FollowUpNotificationService();
