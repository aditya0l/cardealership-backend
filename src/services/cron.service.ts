import cron from 'node-cron';
import FollowUpNotificationService from './followup-notification.service';

class CronService {
  private isInitialized = false;
  
  constructor() {
    this.setupCronJobs();
  }
  
  private setupCronJobs(): void {
    if (this.isInitialized) {
      console.log('⚠️ Cron jobs already initialized');
      return;
    }
    
    console.log('🕐 Setting up cron jobs for follow-up notifications...');
    
    // Daily follow-up processing at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Starting daily follow-up processing at 9 AM...');
      try {
        await FollowUpNotificationService.processEnquiryFollowUps();
        await FollowUpNotificationService.processBookingFollowUps();
        console.log('✅ Daily follow-up processing completed at 9 AM');
      } catch (error) {
        console.error('❌ Error in daily follow-up processing:', error);
      }
    });
    
    // Hourly check for urgent follow-ups (HOT enquiries, overdue deliveries)
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Starting hourly urgent follow-up check...');
      try {
        await FollowUpNotificationService.processUrgentFollowUps();
        console.log('✅ Hourly urgent follow-up check completed');
      } catch (error) {
        console.error('❌ Error in hourly urgent follow-up check:', error);
      }
    });
    
    // Evening reminder at 6 PM for pending follow-ups
    cron.schedule('0 18 * * *', async () => {
      console.log('🔄 Starting evening follow-up reminders at 6 PM...');
      try {
        await FollowUpNotificationService.processEveningReminders();
        console.log('✅ Evening follow-up reminders completed at 6 PM');
      } catch (error) {
        console.error('❌ Error in evening follow-up reminders:', error);
      }
    });
    
    // Weekly summary on Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
      console.log('🔄 Starting weekly follow-up summary on Monday...');
      try {
        await FollowUpNotificationService.processWeeklySummary();
        console.log('✅ Weekly follow-up summary completed');
      } catch (error) {
        console.error('❌ Error in weekly follow-up summary:', error);
      }
    });
    
    this.isInitialized = true;
    console.log('✅ Cron jobs initialized successfully');
    console.log('📅 Scheduled jobs:');
    console.log('  - Daily follow-ups: 9:00 AM IST');
    console.log('  - Hourly urgent checks: Every hour');
    console.log('  - Evening reminders: 6:00 PM IST');
    console.log('  - Weekly summary: Monday 10:00 AM IST');
  }
  
  // Manual trigger methods for testing
  async triggerDailyFollowUps(): Promise<void> {
    console.log('🔄 Manually triggering daily follow-ups...');
    try {
      await FollowUpNotificationService.processEnquiryFollowUps();
      await FollowUpNotificationService.processBookingFollowUps();
      console.log('✅ Manual daily follow-ups completed');
    } catch (error) {
      console.error('❌ Error in manual daily follow-ups:', error);
    }
  }
  
  async triggerUrgentFollowUps(): Promise<void> {
    console.log('🔄 Manually triggering urgent follow-ups...');
    try {
      await FollowUpNotificationService.processUrgentFollowUps();
      console.log('✅ Manual urgent follow-ups completed');
    } catch (error) {
      console.error('❌ Error in manual urgent follow-ups:', error);
    }
  }
  
  // Get cron job status
  getStatus(): object {
    return {
      initialized: this.isInitialized,
      jobs: [
        {
          name: 'Daily Follow-ups',
          schedule: '0 9 * * *',
          timezone: 'Asia/Kolkata',
          description: 'Process enquiry and booking follow-ups daily at 9 AM'
        },
        {
          name: 'Hourly Urgent Checks',
          schedule: '0 * * * *',
          timezone: 'Asia/Kolkata',
          description: 'Check for urgent follow-ups every hour'
        },
        {
          name: 'Evening Reminders',
          schedule: '0 18 * * *',
          timezone: 'Asia/Kolkata',
          description: 'Send evening reminders at 6 PM'
        },
        {
          name: 'Weekly Summary',
          schedule: '0 10 * * 1',
          timezone: 'Asia/Kolkata',
          description: 'Send weekly summary on Monday at 10 AM'
        }
      ]
    };
  }
}

export default new CronService();
