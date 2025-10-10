import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

/**
 * Get revenue chart data for the last 12 months
 */
export const getRevenueChartData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    // Calculate revenue from bookings for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo
        },
        status: {
          in: ['CONFIRMED', 'DELIVERED']
        }
      },
      select: {
        createdAt: true,
        // We don't have price in bookings, so we'll count bookings per month
      }
    });

    // Group by month
    const monthlyData = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
      monthlyData.set(monthKey, 0);
    }

    // Count bookings per month (using average vehicle price estimate)
    const avgVehiclePrice = 1200000; // Average 12 lakh per vehicle
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
      const currentCount = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, currentCount + avgVehiclePrice);
    });

    const chartData = Array.from(monthlyData.entries()).map(([month, revenue]) => ({
      month,
      revenue
    }));

    res.json({
      success: true,
      message: 'Revenue chart data retrieved successfully',
      data: chartData
    });

  } catch (error: any) {
    console.error('Error fetching revenue chart data:', error);
    throw createError('Failed to fetch revenue chart data', 500);
  }
});

/**
 * Get sales performance by advisor
 */
export const getSalesPerformance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    // Get booking counts by advisor
    const advisorPerformance = await prisma.booking.groupBy({
      by: ['advisorId'],
      where: {
        advisorId: {
          not: null
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get advisor details
    const advisorIds = advisorPerformance.map(p => p.advisorId).filter(Boolean) as string[];
    
    const advisors = await prisma.user.findMany({
      where: {
        firebaseUid: {
          in: advisorIds
        }
      },
      select: {
        firebaseUid: true,
        name: true,
        email: true
      }
    });

    const advisorMap = new Map(advisors.map(a => [a.firebaseUid, a]));

    const performanceData = advisorPerformance.map(perf => ({
      employeeName: advisorMap.get(perf.advisorId || '')?.name || 'Unknown',
      employeeEmail: advisorMap.get(perf.advisorId || '')?.email || '',
      sales: perf._count.id,
      revenue: perf._count.id * 1200000 // Estimated average vehicle price
    }));

    res.json({
      success: true,
      message: 'Sales performance retrieved successfully',
      data: performanceData
    });

  } catch (error: any) {
    console.error('Error fetching sales performance:', error);
    throw createError('Failed to fetch sales performance', 500);
  }
});

/**
 * Get recent activities across all entities
 */
export const getRecentActivities = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const limit = parseInt(req.query.limit as string) || 10;
  
  try {
    // Fetch recent items from each entity
    const [recentBookings, recentEnquiries, recentQuotations] = await Promise.all([
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          variant: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.enquiry.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          variant: true,
          category: true,
          createdAt: true
        }
      }),
      prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          enquiry: {
            select: {
              customerName: true,
              variant: true
            }
          }
        }
      })
    ]);

    // Combine and format activities
    const activities: any[] = [];

    recentBookings.forEach(booking => {
      activities.push({
        id: booking.id,
        type: 'booking',
        message: `New booking: ${booking.variant} for ${booking.customerName} - ${booking.status}`,
        timestamp: booking.createdAt.toISOString()
      });
    });

    recentEnquiries.forEach(enquiry => {
      activities.push({
        id: enquiry.id,
        type: 'enquiry',
        message: `New enquiry: ${enquiry.variant || 'Vehicle'} from ${enquiry.customerName} - ${enquiry.category}`,
        timestamp: enquiry.createdAt.toISOString()
      });
    });

    recentQuotations.forEach(quotation => {
      activities.push({
        id: quotation.id,
        type: 'quotation',
        message: `Quotation ${quotation.status}: ${quotation.enquiry?.variant || 'Vehicle'} for ${quotation.enquiry?.customerName || 'Customer'}`,
        timestamp: quotation.createdAt.toISOString()
      });
    });

    // Sort by timestamp descending and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      message: 'Recent activities retrieved successfully',
      data: limitedActivities
    });

  } catch (error: any) {
    console.error('Error fetching recent activities:', error);
    throw createError('Failed to fetch recent activities', 500);
  }
});

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    // Fetch all stats in parallel
    const [
      totalBookings,
      totalEnquiries,
      totalQuotations,
      totalUsers,
      totalVehicles,
      enquiryStats,
      quotationStats
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.enquiry.count(),
      prisma.quotation.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.vehicle.count({ where: { isActive: true } }),
      
      // Enquiry stats by category and status
      prisma.enquiry.groupBy({
        by: ['category', 'status'],
        _count: true
      }),
      
      // Quotation stats by status
      prisma.quotation.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    // Process enquiry stats
    const enquiryByCategory = {
      HOT: 0,
      LOST: 0,
      BOOKED: 0
    };
    
    const enquiryByStatus = {
      OPEN: 0,
      CLOSED: 0
    };

    enquiryStats.forEach(stat => {
      if (stat.category) {
        enquiryByCategory[stat.category] = (enquiryByCategory[stat.category] || 0) + stat._count;
      }
      if (stat.status === 'OPEN') {
        enquiryByStatus.OPEN += stat._count;
      } else {
        enquiryByStatus.CLOSED += stat._count;
      }
    });

    // Process quotation stats
    const quotationByStatus = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SENT_TO_CUSTOMER: 0
    };

    quotationStats.forEach(stat => {
      if (stat.status) {
        quotationByStatus[stat.status] = stat._count;
      }
    });

    const stats = {
      totalEmployees: totalUsers,
      activeEnquiries: enquiryByStatus.OPEN,
      pendingQuotations: quotationByStatus.PENDING,
      totalBookings,
      stockCount: totalVehicles,
      revenue: totalBookings * 1200000, // Estimated revenue
      enquiryStats: {
        total: totalEnquiries,
        byCategory: enquiryByCategory,
        byStatus: enquiryByStatus
      },
      quotationStats: {
        total: totalQuotations,
        byStatus: quotationByStatus
      }
    };

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    throw createError('Failed to fetch dashboard statistics', 500);
  }
});

