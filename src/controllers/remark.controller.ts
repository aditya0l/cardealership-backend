import { Request, Response } from 'express';
import prisma from '../config/db';
import { asyncHandler } from '../middlewares/error.middleware';
import { createError } from '../middlewares/error.middleware';

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

  // Update entity's last remark for quick access
  const timestamp = new Date().toISOString();
  const formattedRemark = `[${timestamp}] ${user.role.name}: ${remark.trim()}`;

  if (entityType === 'enquiry') {
    await prisma.enquiry.update({
      where: { id: entityId },
      data: {
        caRemarks: formattedRemark,
        updatedAt: new Date()
      }
    });
  } else {
    // Update appropriate role-specific remarks field
    const updateData: any = { updatedAt: new Date() };
    
    switch (remarkType) {
      case 'ca_remarks':
      case 'advisor_remarks':
        updateData.advisorRemarks = formattedRemark;
        break;
      case 'tl_remarks':
        updateData.teamLeadRemarks = formattedRemark;
        break;
      case 'sm_remarks':
        updateData.salesManagerRemarks = formattedRemark;
        break;
      case 'gm_remarks':
        updateData.generalManagerRemarks = formattedRemark;
        break;
      case 'admin_remarks':
        updateData.adminRemarks = formattedRemark;
        break;
      default:
        updateData.remarks = formattedRemark;
    }

    await prisma.booking.update({
      where: { id: entityId },
      data: updateData
    });
  }

  res.status(201).json({
    success: true,
    message: 'Remark added successfully',
    data: newRemark
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
