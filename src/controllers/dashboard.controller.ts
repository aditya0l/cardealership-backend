import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName, EnquiryStatus, BookingStatus } from '@prisma/client';
import { getTeamMemberIds } from '../services/team.service';

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
  
  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }
  
  try {
    // Fetch recent items from each entity with dealership filtering
    const [recentBookings, recentEnquiries, recentQuotations] = await Promise.all([
      prisma.booking.findMany({
        where: dealershipFilter,
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
        where: dealershipFilter,
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
        where: dealershipFilter,
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
  
  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }
  
  // Build user filter (users in same dealership)
  const userFilter: any = { isActive: true };
  if (user.dealershipId) {
    userFilter.dealershipId = user.dealershipId;
  }
  
  // Build vehicle filter (vehicles in same dealership)
  const vehicleFilter: any = { isActive: true };
  if (user.dealershipId) {
    vehicleFilter.dealershipId = user.dealershipId;
  }
  
  try {
    // Fetch all stats in parallel with dealership filtering
    const [
      totalBookings,
      totalEnquiries,
      totalQuotations,
      totalUsers,
      totalVehicles,
      enquiryStats,
      quotationStats
    ] = await Promise.all([
      prisma.booking.count({ where: dealershipFilter }),
      prisma.enquiry.count({ where: dealershipFilter }),
      prisma.quotation.count({ where: dealershipFilter }),
      prisma.user.count({ where: userFilter }),
      prisma.vehicle.count({ where: vehicleFilter }),
      
      // Enquiry stats by category and status
      prisma.enquiry.groupBy({
        by: ['category', 'status'],
        where: dealershipFilter,
        _count: true
      }),
      
      // Quotation stats by status
      prisma.quotation.groupBy({
        by: ['status'],
        where: dealershipFilter,
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
      if (stat.category && stat.category in enquiryByCategory) {
        enquiryByCategory[stat.category as keyof typeof enquiryByCategory] = (enquiryByCategory[stat.category as keyof typeof enquiryByCategory] || 0) + stat._count;
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

export const getTodaysBookingPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let teamMemberIds: string[] = [];
  if (user.role.name !== RoleName.ADMIN) {
    teamMemberIds = await getTeamMemberIds(user.firebaseUid, false);
  }

  // Build where clause - handle null dealershipId
  const enquiryWhere: any = {
    status: EnquiryStatus.OPEN,
    expectedBookingDate: {
      gte: startOfDay,
      lte: endOfDay
    }
  };
  if (user.dealershipId) {
    enquiryWhere.dealershipId = user.dealershipId;
  }

  const bookingWhere: any = {
    status: {
      notIn: [BookingStatus.CANCELLED, BookingStatus.DELIVERED]
    },
    expectedDeliveryDate: {
      gte: startOfDay,
      lte: endOfDay
    }
  };
  if (user.dealershipId) {
    bookingWhere.dealershipId = user.dealershipId;
  }

  switch (user.role.name as RoleName) {
    case RoleName.CUSTOMER_ADVISOR:
      enquiryWhere.OR = [
        { createdByUserId: user.firebaseUid },
        { assignedToUserId: user.firebaseUid }
      ];
      bookingWhere.OR = [
        { advisorId: user.firebaseUid }
      ];
      break;
    case RoleName.TEAM_LEAD: {
      const relevantIds = Array.from(new Set([user.firebaseUid, ...teamMemberIds]));
      enquiryWhere.OR = [
        { createdByUserId: { in: relevantIds } },
        { assignedToUserId: { in: relevantIds } }
      ];
      bookingWhere.OR = [
        { advisorId: { in: relevantIds } }
      ];
      break;
    }
    case RoleName.SALES_MANAGER:
    case RoleName.GENERAL_MANAGER: {
      const relevantIds = Array.from(new Set([user.firebaseUid, ...teamMemberIds]));
      enquiryWhere.OR = [
        { createdByUserId: { in: relevantIds } },
        { assignedToUserId: { in: relevantIds } }
      ];
      bookingWhere.OR = [
        { advisorId: { in: relevantIds } }
      ];
      break;
    }
    case RoleName.ADMIN:
      break;
    default:
      enquiryWhere.OR = [
        { createdByUserId: user.firebaseUid }
      ];
      bookingWhere.OR = [
        { advisorId: user.firebaseUid }
      ];
  }

  let enquiries, bookings;
  try {
    [enquiries, bookings] = await Promise.all([
    prisma.enquiry.findMany({
      where: enquiryWhere,
      select: {
        id: true,
        customerName: true,
        customerContact: true,
        model: true,
        variant: true,
        expectedBookingDate: true,
        assignedToUserId: true,
        createdByUserId: true
      },
      orderBy: { expectedBookingDate: 'asc' }
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        variant: true,
        expectedDeliveryDate: true,
        advisorId: true,
        stockAvailability: true,
        chassisNumber: true,
        allocationOrderNumber: true
      },
      orderBy: { expectedDeliveryDate: 'asc' }
    })
  ]);
  } catch (error: any) {
    console.error('Error fetching booking plan:', error);
    console.error('Enquiry where:', JSON.stringify(enquiryWhere, null, 2));
    console.error('Booking where:', JSON.stringify(bookingWhere, null, 2));
    throw createError(`Failed to fetch booking plan: ${error.message}`, 400);
  }

  res.json({
    success: true,
    message: "Today's booking plan retrieved successfully",
    data: {
      date: startOfDay.toISOString(),
      enquiriesDueToday: enquiries.length,
      bookingsDueToday: bookings.length,
      enquiries,
      bookings
    }
  });
});

/**
 * Get Team Leader Dashboard Metrics (Module 5)
 */
export const getTeamLeaderDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only Team Leads can access this endpoint
  if (user.role.name !== RoleName.TEAM_LEAD) {
    throw createError('Access denied. Team Lead only.', 403);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Get team members (CAs under this TL)
  const teamMembers = await prisma.user.findMany({
    where: {
      managerId: user.firebaseUid,
      isActive: true
    },
    select: {
      firebaseUid: true,
      name: true,
      email: true,
      role: {
        select: { name: true }
      }
    }
  });

  const teamMemberIds = teamMembers.map(m => m.firebaseUid);
  
  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }

  try {
    // 1. Team Size
    const teamSize = teamMembers.length;

    // 2. Total Hot Inquiry Count (sum of all active HOT leads under the team)
    const totalHotInquiryCount = await prisma.enquiry.count({
      where: {
        ...dealershipFilter,
        status: EnquiryStatus.OPEN,
        category: 'HOT',
        OR: [
          { createdByUserId: { in: teamMemberIds } },
          { assignedToUserId: { in: teamMemberIds } }
        ]
      }
    });

    // 3. Pending CA on Update (CAs who have missed updates today)
    const casWithPendingEnquiries = await prisma.enquiry.findMany({
      where: {
        ...dealershipFilter,
        status: EnquiryStatus.OPEN,
        AND: [
          {
            OR: [
              { nextFollowUpDate: null },
              { nextFollowUpDate: { lte: endOfDay } }
            ]
          },
          {
            OR: [
              { createdByUserId: { in: teamMemberIds } },
              { assignedToUserId: { in: teamMemberIds } }
            ]
          }
        ]
      },
      select: {
        createdByUserId: true,
        assignedToUserId: true,
        id: true
      }
    });

    // Check which CAs have updated today
    const enquiryIds = casWithPendingEnquiries.map(e => e.id);
    const updatedToday = await prisma.remark.findMany({
      where: {
        enquiryId: { in: enquiryIds },
        createdAt: { gte: today },
        createdBy: { in: teamMemberIds }
      },
      select: { enquiryId: true, createdBy: true }
    });

    const updatedEnquiryIds = new Set(updatedToday.map(r => r.enquiryId).filter(Boolean));
    const pendingCAs = new Set<string>();
    
    casWithPendingEnquiries.forEach(enquiry => {
      const caId = enquiry.assignedToUserId || enquiry.createdByUserId;
      if (caId && teamMemberIds.includes(caId) && !updatedEnquiryIds.has(enquiry.id)) {
        pendingCAs.add(caId);
      }
    });

    const pendingCAOnUpdate = pendingCAs.size;

    // 4. Pending Enquiries To Update (total number of specific enquiries pending action)
    const pendingEnquiriesToUpdate = await prisma.enquiry.count({
      where: {
        ...dealershipFilter,
        status: EnquiryStatus.OPEN,
        AND: [
          {
            OR: [
              { createdByUserId: { in: teamMemberIds } },
              { assignedToUserId: { in: teamMemberIds } }
            ]
          },
          {
            OR: [
              { nextFollowUpDate: null },
              { nextFollowUpDate: { lte: endOfDay } }
            ]
          }
        ],
        NOT: {
          remarkHistory: {
            some: {
              createdAt: { gte: today },
              createdBy: { in: teamMemberIds }
            }
          }
        }
      }
    });

    // 5. Today's Booking Plan (sum of all EDB == Today across the team)
    const todaysBookingPlan = await prisma.enquiry.count({
      where: {
        ...dealershipFilter,
        status: EnquiryStatus.OPEN,
        expectedBookingDate: {
          gte: today,
          lte: endOfDay
        },
        OR: [
          { createdByUserId: { in: teamMemberIds } },
          { assignedToUserId: { in: teamMemberIds } }
        ]
      }
    });

    res.json({
      success: true,
      message: 'Team Leader dashboard retrieved successfully',
      data: {
        teamSize,
        totalHotInquiryCount,
        pendingCAOnUpdate,
        pendingEnquiriesToUpdate,
        todaysBookingPlan
      }
    });
  } catch (error: any) {
    console.error('Error fetching Team Leader dashboard:', error);
    throw createError('Failed to fetch Team Leader dashboard', 500);
  }
});

/**
 * Get Bookings Funnel Math (Task 15)
 * Actual Live = (Carry Forward + New This Month) - (Delivered + Lost)
 */
export const getBookingsFunnel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }

  try {
    // Carry Forward (bookings created before this month, not delivered/cancelled)
    const carryForward = await prisma.booking.count({
      where: {
        ...dealershipFilter,
        createdAt: { lt: startOfMonth },
        status: { notIn: ['DELIVERED', 'CANCELLED'] }
      }
    });

    // New This Month (bookings created this month)
    const newThisMonth = await prisma.booking.count({
      where: {
        ...dealershipFilter,
        createdAt: { gte: startOfMonth }
      }
    });

    // Delivered This Month
    const delivered = await prisma.booking.count({
      where: {
        ...dealershipFilter,
        status: 'DELIVERED',
        updatedAt: { gte: startOfMonth }
      }
    });

    // Lost (Cancelled) This Month
    const lost = await prisma.booking.count({
      where: {
        ...dealershipFilter,
        status: 'CANCELLED',
        updatedAt: { gte: startOfMonth }
      }
    });

    // Actual Live = (Carry Forward + New This Month) - (Delivered + Lost)
    const actualLive = (carryForward + newThisMonth) - (delivered + lost);

    res.json({
      success: true,
      message: 'Bookings funnel retrieved successfully',
      data: {
        carryForward,
        newThisMonth,
        delivered,
        lost,
        actualLive
      }
    });
  } catch (error: any) {
    console.error('Error fetching bookings funnel:', error);
    throw createError('Failed to fetch bookings funnel', 500);
  }
});

