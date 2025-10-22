import prisma from '../config/db';
import FCMService from './fcm.service';

interface NotificationRecipient {
  firebaseUid: string;
  fcmToken: string | null;
  name: string;
  role: { name: string };
  dealershipId: string | null;
}

class NotificationTriggerService {
  
  // Send notification to user
  private async sendNotificationToUser(
    userId: string, 
    title: string, 
    body: string, 
    type: string, 
    entityId?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid: userId },
        select: { fcmToken: true, name: true }
      });

      if (user?.fcmToken) {
        const success = await FCMService.sendNotification(user.fcmToken, {
          title,
          body,
          data: {
            type,
            entityId: entityId || '',
            priority
          }
        });

        // Log notification regardless of FCM success
        await prisma.notificationLog.create({
          data: {
            userId,
            title,
            body,
            type,
            entityId,
            delivered: success
          }
        });
      }
    } catch (error) {
      console.error('Error sending notification to user:', error);
      // Don't throw error to prevent crashing the main application
    }
  }

  // Send notification to multiple users
  private async sendNotificationToUsers(
    userIds: string[], 
    title: string, 
    body: string, 
    type: string, 
    entityId?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<void> {
    console.log('🔔 sendNotificationToUsers called for', userIds.length, 'users');
    for (const userId of userIds) {
      console.log('🔔 Sending notification to user:', userId);
      await this.sendNotificationToUser(userId, title, body, type, entityId, priority);
    }
  }

  // Get management users (Team Lead, Sales Manager, General Manager, Admin)
  private async getManagementUsers(dealershipId: string): Promise<NotificationRecipient[]> {
    const users = await prisma.user.findMany({
      where: {
        dealershipId,
        isActive: true,
        role: {
          name: { in: ['TEAM_LEAD', 'SALES_MANAGER', 'GENERAL_MANAGER', 'ADMIN'] }
        }
      },
      select: {
        firebaseUid: true,
        fcmToken: true,
        name: true,
        role: { select: { name: true } },
        dealershipId: true
      }
    });
    return users as NotificationRecipient[];
  }

  // Get team members for a Team Lead
  private async getTeamMembers(teamLeadId: string): Promise<NotificationRecipient[]> {
    const users = await prisma.user.findMany({
      where: {
        managerId: teamLeadId,
        isActive: true
      },
      select: {
        firebaseUid: true,
        fcmToken: true,
        name: true,
        role: { select: { name: true } },
        dealershipId: true
      }
    });
    return users as NotificationRecipient[];
  }

  // Trigger notification for new enquiry
  async triggerNewEnquiryNotification(enquiry: any): Promise<void> {
    const { id, customerName, model, variant, category, createdByUserId, dealershipId } = enquiry;
    
    console.log('🔔 triggerNewEnquiryNotification called with:', {
      id, customerName, model, variant, category, dealershipId
    });
    
    if (!dealershipId) {
      console.warn('❌ No dealershipId found for enquiry notification:', id);
      return;
    }
    
    const title = `New ${category} Enquiry - ${customerName}`;
    const body = `${model} ${variant} - ${customerName}`;
    
    console.log('🔔 Notification content:', { title, body });
    
    // Notify management
    const managementUsers = await this.getManagementUsers(dealershipId);
    console.log('🔔 Management users found:', managementUsers.length);
    console.log('🔔 Management users:', managementUsers.map(u => ({ name: u.name, fcmToken: !!u.fcmToken })));
    
    const managementUserIds = managementUsers.map(u => u.firebaseUid);
    
    await this.sendNotificationToUsers(
      managementUserIds,
      title,
      body,
      'new_enquiry',
      id,
      category === 'HOT' ? 'HIGH' : 'MEDIUM'
    );
    
    console.log('✅ Enquiry notification sent to', managementUserIds.length, 'users');
  }

  // Trigger notification for enquiry status change
  async triggerEnquiryStatusChangeNotification(enquiry: any, oldStatus: string, newStatus: string): Promise<void> {
    const { id, customerName, model, variant, createdByUserId, assignedToUserId, dealershipId } = enquiry;
    
    const title = `Enquiry Status Updated - ${customerName}`;
    const body = `${model} ${variant} - Status changed from ${oldStatus} to ${newStatus}`;
    
    // Notify creator and assigned advisor
    const notifyUserIds = [createdByUserId];
    if (assignedToUserId && assignedToUserId !== createdByUserId) {
      notifyUserIds.push(assignedToUserId);
    }
    
    await this.sendNotificationToUsers(
      notifyUserIds,
      title,
      body,
      'enquiry_status_change',
      id,
      'MEDIUM'
    );

    // Notify management if status is significant
    if (['CLOSED', 'CONVERTED'].includes(newStatus) && dealershipId) {
      const managementUsers = await this.getManagementUsers(dealershipId);
      const managementUserIds = managementUsers.map(u => u.firebaseUid);
      
      await this.sendNotificationToUsers(
        managementUserIds,
        `Enquiry ${newStatus} - ${customerName}`,
        `${model} ${variant} - ${newStatus}`,
        'enquiry_status_change',
        id,
        'MEDIUM'
      );
    }
  }

  // Trigger notification for new booking
  async triggerNewBookingNotification(booking: any): Promise<void> {
    const { id, customerName, model, variant, advisorId, dealershipId } = booking;
    
    if (!dealershipId) {
      console.warn('No dealershipId found for booking notification:', id);
      return;
    }
    
    const title = `New Booking - ${customerName}`;
    const body = `${model} ${variant} - Booking #${id.slice(-6)}`;
    
    // Notify assigned advisor
    if (advisorId) {
      await this.sendNotificationToUser(
        advisorId,
        title,
        body,
        'new_booking',
        id,
        'HIGH'
      );
    }

    // Notify management
    const managementUsers = await this.getManagementUsers(dealershipId);
    const managementUserIds = managementUsers.map(u => u.firebaseUid);
    
    await this.sendNotificationToUsers(
      managementUserIds,
      title,
      body,
      'new_booking',
      id,
      'HIGH'
    );
  }

  // Trigger notification for booking status change
  async triggerBookingStatusChangeNotification(booking: any, oldStatus: string, newStatus: string): Promise<void> {
    const { id, customerName, model, variant, advisorId, dealershipId } = booking;
    
    const title = `Booking Status Updated - ${customerName}`;
    const body = `${model} ${variant} - Status changed from ${oldStatus} to ${newStatus}`;
    
    // Notify assigned advisor
    if (advisorId) {
      await this.sendNotificationToUser(
        advisorId,
        title,
        body,
        'booking_status_change',
        id,
        'MEDIUM'
      );
    }

    // Notify management for significant status changes
    if (['CONFIRMED', 'DELIVERED', 'CANCELLED'].includes(newStatus) && dealershipId) {
      const managementUsers = await this.getManagementUsers(dealershipId);
      const managementUserIds = managementUsers.map(u => u.firebaseUid);
      
      await this.sendNotificationToUsers(
        managementUserIds,
        `Booking ${newStatus} - ${customerName}`,
        `${model} ${variant} - ${newStatus}`,
        'booking_status_change',
        id,
        'HIGH'
      );
    }
  }

  // Trigger notification for booking assignment
  async triggerBookingAssignmentNotification(booking: any, assignedToUserId: string): Promise<void> {
    const { id, customerName, model, variant } = booking;
    
    const title = `Booking Assigned - ${customerName}`;
    const body = `${model} ${variant} - Booking #${id.slice(-6)} assigned to you`;
    
    await this.sendNotificationToUser(
      assignedToUserId,
      title,
      body,
      'booking_assignment',
      id,
      'HIGH'
    );
  }

  // Trigger notification for enquiry assignment
  async triggerEnquiryAssignmentNotification(enquiry: any, assignedToUserId: string): Promise<void> {
    const { id, customerName, model, variant, category } = enquiry;
    
    const title = `${category} Enquiry Assigned - ${customerName}`;
    const body = `${model} ${variant} - Enquiry assigned to you`;
    
    await this.sendNotificationToUser(
      assignedToUserId,
      title,
      body,
      'enquiry_assignment',
      id,
      category === 'HOT' ? 'HIGH' : 'MEDIUM'
    );
  }

  // Trigger notification for overdue delivery
  async triggerOverdueDeliveryNotification(booking: any): Promise<void> {
    const { id, customerName, model, variant, advisorId, dealershipId } = booking;
    
    if (!dealershipId) {
      console.warn('No dealershipId found for overdue delivery notification:', id);
      return;
    }
    
    const title = `🚨 Overdue Delivery - ${customerName}`;
    const body = `${model} ${variant} - Booking #${id.slice(-6)} is overdue!`;
    
    // Notify assigned advisor
    if (advisorId) {
      await this.sendNotificationToUser(
        advisorId,
        title,
        body,
        'overdue_delivery',
        id,
        'HIGH'
      );
    }

    // Notify management
    const managementUsers = await this.getManagementUsers(dealershipId);
    const managementUserIds = managementUsers.map(u => u.firebaseUid);
    
    await this.sendNotificationToUsers(
      managementUserIds,
      title,
      body,
      'overdue_delivery',
      id,
      'HIGH'
    );
  }

  // Trigger notification for urgent enquiry
  async triggerUrgentEnquiryNotification(enquiry: any): Promise<void> {
    const { id, customerName, model, variant, createdByUserId, dealershipId } = enquiry;
    
    const title = `🚨 URGENT: Hot Lead - ${customerName}`;
    const body = `${model} ${variant} - Requires immediate attention!`;
    
    // Notify creator
    await this.sendNotificationToUser(
      createdByUserId,
      title,
      body,
      'urgent_enquiry',
      id,
      'HIGH'
    );

    // Notify management
    if (dealershipId) {
      const managementUsers = await this.getManagementUsers(dealershipId);
      const managementUserIds = managementUsers.map(u => u.firebaseUid);
      
      await this.sendNotificationToUsers(
        managementUserIds,
        title,
        body,
        'urgent_enquiry',
        id,
        'HIGH'
      );
    }
  }
}

export default new NotificationTriggerService();
