import { Request, Response } from 'express';
import prisma from '../config/db';
import { asyncHandler } from '../middlewares/error.middleware';
import { createError } from '../middlewares/error.middleware';
import { RoleName, EnquiryStatus, BookingStatus } from '@prisma/client';
import { getTeamMemberIds } from '../services/team.service';

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

// Remark types based on user role
const REMARK_TYPES = {
  CUSTOMER_ADVISOR: ['ca_remarks', 'follow_up'],
  TEAM_LEAD: ['ca_remarks', 'tl_remarks', 'follow_up', 'escalation'],
  SALES_MANAGER: ['ca_remarks', 'tl_remarks', 'sm_remarks', 'follow_up', 'escalation'],
  GENERAL_MANAGER: ['ca_remarks', 'tl_remarks', 'sm_remarks', 'gm_remarks', 'follow_up', 'escalation'],
  ADMIN: ['ca_remarks', 'tl_remarks', 'sm_remarks', 'gm_remarks', 'admin_remarks', 'follow_up', 'escalation']
};

const formatRemarkSnapshot = (roleName: string, remarkText: string, createdAt: Date): string => {
  return `[${createdAt.toISOString()}] ${roleName}: ${remarkText}`;
};

const updateEntityRemarkSnapshot = async (
  entityType: 'enquiry' | 'booking',
  entityId: string,
  remarkType?: string
) => {
  if (entityType === 'enquiry') {
    const latestRemark = await prisma.remark.findFirst({
      where: {
        entityType: 'enquiry',
        entityId,
        isCancelled: false
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            role: { select: { name: true } }
          }
        }
      }
    });

    await prisma.enquiry.update({
      where: { id: entityId },
      data: {
        caRemarks: latestRemark
          ? formatRemarkSnapshot(latestRemark.user.role.name, latestRemark.remark, latestRemark.createdAt)
          : null
      }
    });
    return;
  }

  // Booking snapshot update
  const remarkFieldMap: Record<string, keyof any> = {
    ca_remarks: 'advisorRemarks',
    advisor_remarks: 'advisorRemarks',
    follow_up: 'advisorRemarks',
    tl_remarks: 'teamLeadRemarks',
    sm_remarks: 'salesManagerRemarks',
    gm_remarks: 'generalManagerRemarks',
    admin_remarks: 'adminRemarks',
    escalation: 'remarks',
    status_update: 'remarks'
  };

  const typesToUpdate = remarkType ? [remarkType] : Object.keys(remarkFieldMap);
  const updateData: Record<string, string | null> = {};

  for (const type of typesToUpdate) {
    const fieldName = remarkFieldMap[type] || 'remarks';
    const latestRemark = await prisma.remark.findFirst({
      where: {
        entityType: 'booking',
        entityId,
        remarkType: type,
        isCancelled: false
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            role: { select: { name: true } }
          }
        }
      }
    });

    updateData[fieldName] = latestRemark
      ? formatRemarkSnapshot(latestRemark.user.role.name, latestRemark.remark, latestRemark.createdAt)
      : null;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.booking.update({
      where: { id: entityId },
      data: updateData
    });
  }
};

// Add remark to enquiry or booking
export const addRemark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.params;
  const { remark, remarkType = 'ca_remarks' } = req.body;
  const user = req.user;

  if (!remark || !remark.trim()) {
    throw createError('Remark text is required', 400);
  }

  if (!['enquiry', 'booking'].includes(entityType)) {
    throw createError('Entity type must be either "enquiry" or "booking"', 400);
  }

  // Validate remark type based on user role
  const allowedTypes = REMARK_TYPES[user.role.name as keyof typeof REMARK_TYPES] || ['ca_remarks'];
  if (!allowedTypes.includes(remarkType)) {
    throw createError(`Invalid remark type for your role. Allowed types: ${allowedTypes.join(', ')}`, 400);
  }

  // Verify entity exists and user has access
  let entity;
  if (entityType === 'enquiry') {
    entity = await prisma.enquiry.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  } else {
    entity = await prisma.booking.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  }

  if (!entity) {
    throw createError(`${entityType} not found or access denied`, 404);
  }

  // Create remark
  const newRemark = await prisma.remark.create({
    data: {
      entityType,
      entityId,
      remark: remark.trim(),
      remarkType,
      createdBy: user.firebaseUid
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: {
            select: { name: true }
          }
        }
      }
    }
  });

  await updateEntityRemarkSnapshot(entityType as 'enquiry' | 'booking', entityId, remarkType);

  res.status(201).json({
    success: true,
    message: 'Remark added successfully',
    data: newRemark
  });
});

export const cancelRemark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { remarkId } = req.params;
  const { reason } = req.body as { reason?: string };
  const user = req.user;

  if (!reason || !reason.trim()) {
    throw createError('Cancellation reason is required', 400);
  }

  const remark = await prisma.remark.findUnique({
    where: { id: remarkId }
  });

  if (!remark) {
    throw createError('Remark not found', 404);
  }

  if (remark.isCancelled) {
    throw createError('Remark has already been cancelled', 400);
  }

  let entityDealershipId: string | null = null;
  if (remark.entityType === 'enquiry') {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: remark.entityId },
      select: { dealershipId: true }
    });
    if (!enquiry) {
      throw createError('Associated enquiry not found', 404);
    }
    entityDealershipId = enquiry.dealershipId || null;
  } else if (remark.entityType === 'booking') {
    const booking = await prisma.booking.findUnique({
      where: { id: remark.entityId },
      select: { dealershipId: true }
    });
    if (!booking) {
      throw createError('Associated booking not found', 404);
    }
    entityDealershipId = booking.dealershipId || null;
  } else {
    throw createError('Invalid remark entity type', 400);
  }

  if (user.dealershipId && entityDealershipId && user.dealershipId !== entityDealershipId) {
    throw createError('You do not have access to cancel remarks for this dealership', 403);
  }

  const userRole = user.role.name as RoleName;
  const privilegedRoles = new Set<RoleName>([
    RoleName.ADMIN,
    RoleName.GENERAL_MANAGER,
    RoleName.SALES_MANAGER,
    RoleName.TEAM_LEAD
  ]);

  if (remark.createdBy !== user.firebaseUid) {
    if (!privilegedRoles.has(userRole)) {
      throw createError('You are not allowed to cancel this remark', 403);
    }

    if (userRole !== RoleName.ADMIN) {
      const manageableIds = await getTeamMemberIds(user.firebaseUid, true);
      if (!manageableIds.includes(remark.createdBy)) {
        throw createError('You are not allowed to cancel this remark', 403);
      }
    }
  }

  const updatedRemark = await prisma.remark.update({
    where: { id: remarkId },
    data: {
      isCancelled: true,
      cancellationReason: reason.trim(),
      cancelledAt: new Date(),
      cancelledBy: user.firebaseUid
    }
  });

  await updateEntityRemarkSnapshot(
    remark.entityType as 'enquiry' | 'booking',
    remark.entityId,
    remark.remarkType
  );

  res.json({
    success: true,
    message: 'Remark cancelled successfully',
    data: updatedRemark
  });
});

// Get remarks history for enquiry or booking
export const getRemarksHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.params;
  const { startDate, endDate, remarkType, page = 1, limit = 50 } = req.query;
  const user = req.user;

  if (!['enquiry', 'booking'].includes(entityType)) {
    throw createError('Entity type must be either "enquiry" or "booking"', 400);
  }

  // Verify entity exists and user has access
  let entity;
  if (entityType === 'enquiry') {
    entity = await prisma.enquiry.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  } else {
    entity = await prisma.booking.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  }

  if (!entity) {
    throw createError(`${entityType} not found or access denied`, 404);
  }

  const where: any = {
    entityType,
    entityId
  };

  // Date filter
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  // Remark type filter
  if (remarkType) {
    where.remarkType = remarkType;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [remarks, total] = await Promise.all([
    prisma.remark.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.remark.count({ where })
  ]);

  // Group by date for better organization
  const remarksByDate = remarks.reduce((acc, remark) => {
    const date = remark.createdAt.toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(remark);
    return acc;
  }, {} as Record<string, typeof remarks>);

  res.json({
    success: true,
    message: 'Remarks history retrieved successfully',
    data: {
      remarks,
      remarksByDate,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// Update enquiry/booking status with remark
export const updateStatusWithRemark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.params;
  const { status, remark } = req.body;
  const user = req.user;

  if (!['enquiry', 'booking'].includes(entityType)) {
    throw createError('Entity type must be either "enquiry" or "booking"', 400);
  }

  // Verify entity exists and user has access
  let entity;
  if (entityType === 'enquiry') {
    entity = await prisma.enquiry.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      },
      select: { id: true, status: true }
    });
  } else {
    entity = await prisma.booking.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      },
      select: { id: true, status: true }
    });
  }

  if (!entity) {
    throw createError(`${entityType} not found or access denied`, 404);
  }

  const oldStatus = entity.status;

  // Update entity status
  let updatedEntity;
  if (entityType === 'enquiry') {
    updatedEntity = await prisma.enquiry.update({
      where: { id: entityId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  } else {
    updatedEntity = await prisma.booking.update({
      where: { id: entityId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  // Create remark entry for status change
  const statusRemark = remark || `Status changed from ${oldStatus} to ${status}`;
  const newRemark = await prisma.remark.create({
    data: {
      entityType,
      entityId,
      remark: statusRemark,
      remarkType: 'status_update',
      createdBy: user.firebaseUid
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: {
            select: { name: true }
          }
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Status updated successfully',
    data: {
      entity: updatedEntity,
      remark: newRemark
    }
  });
});

// Get team enquiries/bookings with remarks for TL
export const getTeamEntitiesWithRemarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType } = req.params;
  const { status, category, startDate, endDate, page = 1, limit = 50 } = req.query;
  const user = req.user;

  if (!['enquiry', 'booking'].includes(entityType)) {
    throw createError('Entity type must be either "enquiry" or "booking"', 400);
  }

  let where: any = {
    dealershipId: user.dealershipId
  };

  // TL can see entities from their team members
  if (user.role.name === 'TEAM_LEAD') {
    // Get team members under this TL
    const teamMembers = await prisma.user.findMany({
      where: {
        managerId: user.firebaseUid,
        isActive: true
      },
      select: { firebaseUid: true }
    });

    const teamMemberIds = teamMembers.map(member => member.firebaseUid);

    if (entityType === 'enquiry') {
      where.OR = [
        { createdByUserId: user.firebaseUid }, // TL's own enquiries
        { createdByUserId: { in: teamMemberIds } }, // Team members' enquiries
        { assignedToUserId: user.firebaseUid }, // Assigned to TL
        { assignedToUserId: { in: teamMemberIds } } // Assigned to team members
      ];
    } else {
      where.OR = [
        { advisorId: user.firebaseUid }, // TL's own bookings
        { advisorId: { in: teamMemberIds } } // Team members' bookings
      ];
    }
  }

  // Apply filters
  if (status) where.status = status;
  if (category && entityType === 'enquiry') where.category = category;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  let entities;
  if (entityType === 'enquiry') {
    entities = await prisma.enquiry.findMany({
      where,
      include: {
        createdBy: { select: { name: true, email: true, role: { select: { name: true } } } },
        assignedTo: { select: { name: true, email: true, role: { select: { name: true } } } },
        remarkHistory: {
          include: {
            user: { select: { name: true, email: true, role: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Latest 5 remarks
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: Number(limit)
    });
  } else {
    entities = await prisma.booking.findMany({
      where,
      include: {
        advisor: { select: { name: true, email: true, role: { select: { name: true } } } },
        enquiry: { select: { id: true, customerName: true, status: true } },
        remarkHistory: {
          include: {
            user: { select: { name: true, email: true, role: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Latest 5 remarks
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: Number(limit)
    });
  }

  const total = entityType === 'enquiry' 
    ? await prisma.enquiry.count({ where })
    : await prisma.booking.count({ where });

  res.json({
    success: true,
    message: `${entityType}s retrieved successfully`,
    data: {
      entities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
});

export const getPendingUpdatesSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let teamMemberIds: string[] = [];
  if (user.role.name !== RoleName.ADMIN) {
    teamMemberIds = await getTeamMemberIds(user.firebaseUid, false);
  }

  const enquiryWhere: any = {
    dealershipId: user.dealershipId,
    status: EnquiryStatus.OPEN
  };

  const bookingWhere: any = {
    dealershipId: user.dealershipId,
    status: {
      notIn: [BookingStatus.CANCELLED, BookingStatus.DELIVERED]
    }
  };

  const setScopedFilters = () => {
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
  };

  setScopedFilters();

  enquiryWhere.AND = [
    {
      OR: [
        { nextFollowUpDate: null },
        { nextFollowUpDate: { lte: endOfDay } }
      ]
    }
  ];

  bookingWhere.AND = [
    {
      OR: [
        { nextFollowUpDate: null },
        { nextFollowUpDate: { lte: endOfDay } }
      ]
    }
  ];

  const [enquiries, bookings] = await Promise.all([
    prisma.enquiry.findMany({
      where: enquiryWhere,
      select: { id: true }
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      select: { id: true }
    })
  ]);

  const enquiryIds = enquiries.map(e => e.id);
  const bookingIds = bookings.map(b => b.id);

  const [completedEnquiries, completedBookings] = await Promise.all([
    enquiryIds.length
      ? prisma.remark.findMany({
          where: {
            entityType: 'enquiry',
            entityId: { in: enquiryIds },
            createdBy: user.firebaseUid,
            isCancelled: false,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          select: { entityId: true }
        })
      : [],
    bookingIds.length
      ? prisma.remark.findMany({
          where: {
            entityType: 'booking',
            entityId: { in: bookingIds },
            createdBy: user.firebaseUid,
            isCancelled: false,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          select: { entityId: true }
        })
      : []
  ]);

  const completedEnquiryIdSet = new Set(completedEnquiries.map(item => item.entityId));
  const completedBookingIdSet = new Set(completedBookings.map(item => item.entityId));

  const pendingEnquiryIds = enquiryIds.filter(id => !completedEnquiryIdSet.has(id));
  const pendingBookingIds = bookingIds.filter(id => !completedBookingIdSet.has(id));

  res.json({
    success: true,
    message: 'Pending updates summary retrieved successfully',
    data: {
      date: startOfDay.toISOString(),
      enquiriesPendingCount: pendingEnquiryIds.length,
      bookingsPendingCount: pendingBookingIds.length,
      pendingEnquiryIds,
      pendingBookingIds
    }
  });
});

// Get remark statistics
export const getRemarkStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.params;
  const user = req.user;

  if (!['enquiry', 'booking'].includes(entityType)) {
    throw createError('Entity type must be either "enquiry" or "booking"', 400);
  }

  // Verify entity exists and user has access
  let entity;
  if (entityType === 'enquiry') {
    entity = await prisma.enquiry.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  } else {
    entity = await prisma.booking.findFirst({
      where: {
        id: entityId,
        dealershipId: user.dealershipId
      }
    });
  }

  if (!entity) {
    throw createError(`${entityType} not found or access denied`, 404);
  }

  const [totalRemarks, typeStats, recentRemarks] = await Promise.all([
    prisma.remark.count({
      where: { entityType, entityId }
    }),
    prisma.remark.groupBy({
      by: ['remarkType'],
      where: { entityType, entityId },
      _count: true,
      orderBy: { _count: { remarkType: 'desc' } }
    }),
    prisma.remark.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { name: true, role: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  res.json({
    success: true,
    message: 'Remark statistics retrieved successfully',
    data: {
      totalRemarks,
      typeBreakdown: typeStats.map(stat => ({
        type: stat.remarkType,
        count: stat._count
      })),
      recentRemarks
    }
  });
});
