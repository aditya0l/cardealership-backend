import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { 
  filterReadableFields, 
  filterWritableFields, 
  canPerformAction,
  hasFieldPermission
} from '../middlewares/rbac.middleware';
import { BookingStatus, RoleName, BookingSource } from '@prisma/client';

interface CreateBookingRequest {
  // Customer Information
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  optyId?: string;
  
  // Vehicle Information
  variant?: string;
  vcCode?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  
  // Booking Details
  bookingDate?: Date;
  expectedDeliveryDate?: Date;
  
  // Dealer Information
  dealerCode: string;
  zone?: string;
  region?: string;
  division?: string;
  
  // Employee/Advisor
  empName?: string;
  employeeLogin?: string;
  advisorId?: string; // Add this field
  
  // Finance Information
  financeRequired?: boolean;
  financerName?: string;
  
  // Stock Information
  stockAvailability?: string;
  backOrderStatus?: boolean;
  
  // System Fields
  remarks?: string;
  enquiryId?: string;
}

export const createBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Check if user can create bookings
  if (!canPerformAction(user.role.name, 'create', 'booking')) {
    throw createError('Insufficient permissions to create bookings', 403);
  }

  // Filter the request body based on user's role permissions
  const filteredData = filterWritableFields(req.body as CreateBookingRequest, user.role.name);
  
  // Validate required fields
  if (!filteredData.customerName || !filteredData.dealerCode) {
    throw createError('Customer name and dealer code are required', 400);
  }

  // For Customer Advisors, set them as the advisor automatically
  if (user.role.name === RoleName.CUSTOMER_ADVISOR) {
    filteredData.advisorId = user.firebaseUid;
    filteredData.empName = user.name;
  }

  // Clean up empty strings - remove them from the data (Prisma doesn't accept empty strings for optional fields)
  Object.keys(filteredData).forEach(key => {
    const value = (filteredData as any)[key];
    if (value === '' || (typeof value === 'string' && value.trim() === '')) {
      delete (filteredData as any)[key];
    }
  });

  // Convert date fields from strings to Date objects (only fields in CreateBookingRequest)
  const dateFields: Array<keyof CreateBookingRequest> = ['bookingDate', 'expectedDeliveryDate'];
  for (const field of dateFields) {
    const fieldValue = (filteredData as any)[field];
    if (fieldValue && typeof fieldValue === 'string') {
      try {
        // Convert string to Date object
        const dateValue = new Date(fieldValue);
        if (isNaN(dateValue.getTime())) {
          throw new Error('Invalid date');
        }
        (filteredData as any)[field] = dateValue;
      } catch (error) {
        throw createError(`Invalid date format for ${field}. Use ISO-8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`, 400);
      }
    }
  }

  // Set default values
  const bookingData = {
    ...filteredData,
    source: BookingSource.MANUAL,
    status: BookingStatus.PENDING,
    dealershipId: req.user.dealershipId  // CRITICAL: Assign to user's dealership
  };

  try {
    const booking = await prisma.booking.create({
      data: bookingData as any, // Type assertion to handle complex Prisma types
      include: {
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        }
      }
    });

    // Filter response based on user's read permissions
    const filteredBooking = filterReadableFields(booking, user.role.name);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking: filteredBooking }
    });

  } catch (error: any) {
    console.error('Error creating booking:', error);
    throw createError('Failed to create booking', 500);
  }
});

export const getBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Check if user can read bookings
  if (!canPerformAction(user.role.name, 'read', 'booking')) {
    throw createError('Insufficient permissions to view bookings', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as BookingStatus;

  const skip = (page - 1) * limit;
  
  let where: any = {};
  
  // Apply filters based on query parameters
  if (status) {
    where.status = status;
  }

  // CRITICAL: Filter by dealership for multi-tenant isolation
  if (user.dealershipId) {
    where.dealershipId = user.dealershipId;
  }

  // Customer Advisors can only see their own bookings
  if (user.role.name === RoleName.CUSTOMER_ADVISOR) {
    where.advisorId = user.firebaseUid;
  }

  try {
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          enquiry: {
            select: {
              id: true,
              customerName: true,
              customerContact: true,
              customerEmail: true,
              status: true
            }
          },
          advisor: {
            select: {
              firebaseUid: true,
              name: true,
              email: true,
              role: true
            }
          }
          // Removed: dealer: false (was causing issues)
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.booking.count({ where })
    ]);

    // Filter each booking based on user's read permissions
    let filteredBookings;
    try {
      filteredBookings = bookings.map(booking => 
        filterReadableFields(booking, user.role.name)
      );
    } catch (filterError) {
      console.error('Error filtering bookings:', filterError);
      // If filtering fails, return bookings as-is for ADMIN, empty for others
      filteredBookings = user.role.name === RoleName.ADMIN ? bookings : [];
    }

    res.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings: filteredBookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    console.error('Error details:', error.message, error.stack);
    throw createError('Failed to fetch bookings', 500);
  }
});

export const getBookingById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can read bookings
  if (!canPerformAction(user.role.name, 'read', 'booking')) {
    throw createError('Insufficient permissions to view booking', 403);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        enquiry: {
          include: {
            assignedTo: {
              select: {
                firebaseUid: true,
                name: true,
                email: true,
                role: true
              }
            },
            createdBy: {
              select: {
                firebaseUid: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        dealer: false,
        auditLogs: {
          include: {
            user: {
              select: {
                firebaseUid: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Customer Advisors can only access their own bookings
    if (user.role.name === RoleName.CUSTOMER_ADVISOR && booking.advisorId !== user.firebaseUid) {
      throw createError('You can only access bookings assigned to you', 403);
    }

    // Filter booking data based on user's read permissions
    const filteredBooking = filterReadableFields(booking, user.role.name);

    res.json({
      success: true,
      message: 'Booking retrieved successfully',
      data: { booking: filteredBooking }
    });

  } catch (error: any) {
    console.error('Error fetching booking:', error);
    if (error.message.includes('Insufficient permissions') || error.message.includes('only access bookings')) {
      throw error;
    }
    throw createError('Failed to fetch booking', 500);
  }
});

export const updateBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can update bookings
  if (!canPerformAction(user.role.name, 'update', 'booking')) {
    throw createError('Insufficient permissions to update bookings', 403);
  }

  try {
    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { advisorId: true, status: true }
    });

    if (!existingBooking) {
      throw createError('Booking not found', 404);
    }

    // Customer Advisors can only update their own bookings
    if (user.role.name === RoleName.CUSTOMER_ADVISOR && existingBooking.advisorId !== user.firebaseUid) {
      throw createError('You can only update bookings assigned to you', 403);
    }

    // Filter the request body based on user's role permissions
    const filteredUpdateData = filterWritableFields(req.body, user.role.name);

    if (Object.keys(filteredUpdateData).length === 0) {
      throw createError('No valid fields to update based on your permissions', 400);
    }

    // Clean up empty strings - remove them from the data
    Object.keys(filteredUpdateData).forEach(key => {
      const value = (filteredUpdateData as any)[key];
      if (value === '' || (typeof value === 'string' && value.trim() === '')) {
        delete (filteredUpdateData as any)[key];
      }
    });

    // Convert date fields from strings to Date objects
    const dateFields = ['bookingDate', 'expectedDeliveryDate', 'fileLoginDate', 'approvalDate', 'rtoDate'];
    for (const field of dateFields) {
      const fieldValue = (filteredUpdateData as any)[field];
      if (fieldValue && typeof fieldValue === 'string') {
        try {
          const dateValue = new Date(fieldValue);
          if (isNaN(dateValue.getTime())) {
            throw new Error('Invalid date');
          }
          (filteredUpdateData as any)[field] = dateValue;
        } catch (error) {
          throw createError(`Invalid date format for ${field}. Use ISO-8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`, 400);
        }
      }
    }

    // Create audit log entry for the changes
    const oldBooking = await prisma.booking.findUnique({ where: { id } });
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: filteredUpdateData,
      include: {
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        },
        dealer: false
      }
    });

    // Create audit log
    await prisma.bookingAuditLog.create({
      data: {
        bookingId: id,
        changedBy: user.firebaseUid,
        action: 'UPDATE',
        oldValue: oldBooking ? JSON.parse(JSON.stringify(oldBooking)) : {} as any,
        newValue: JSON.parse(JSON.stringify(updatedBooking)),
        changeReason: 'Booking updated via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Filter response based on user's read permissions
    const filteredBooking = filterReadableFields(updatedBooking, user.role.name);

    res.json({
      success: true,
      message: 'Booking updated successfully', 
      data: { booking: filteredBooking }
    });

  } catch (error: any) {
    console.error('Error updating booking:', error);
    if (error.message.includes('Insufficient permissions') || error.message.includes('only update bookings')) {
      throw error;
    }
    throw createError('Failed to update booking', 500);
  }
});

export const deleteBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can delete bookings (usually only Admin)
  if (!canPerformAction(user.role.name, 'delete', 'booking')) {
    throw createError('Insufficient permissions to delete bookings', 403);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Create audit log before deletion
    await prisma.bookingAuditLog.create({
      data: {
        bookingId: id,
        changedBy: user.firebaseUid,
        action: 'DELETE',
        oldValue: booking,
        newValue: {} as any, // Empty object instead of null for JSON type
        changeReason: 'Booking deleted via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await prisma.booking.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting booking:', error);
    if (error.message.includes('Insufficient permissions')) {
      throw error;
    }
    throw createError('Failed to delete booking', 500);
  }
});

export const getAdvisorBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Only Customer Advisors can use this endpoint
  if (user.role.name !== RoleName.CUSTOMER_ADVISOR) {
    throw createError('This endpoint is only available to Customer Advisors', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as BookingStatus;
  const timeline = req.query.timeline as string;

  const skip = (page - 1) * limit;
  
  let where: any = { advisorId: user.firebaseUid };
  
  if (status) {
    where.status = status;
  }

  // Timeline filtering logic
  if (timeline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch(timeline) {
      case 'today':
        // Bookings with any action date = today
        // (file login, approval, or RTO scheduled for today)
        where.OR = [
          {
            fileLoginDate: {
              gte: today,
              lt: tomorrow
            }
          },
          {
            approvalDate: {
              gte: today,
              lt: tomorrow
            }
          },
          {
            rtoDate: {
              gte: today,
              lt: tomorrow
            }
          }
        ];
        break;

      case 'delivery_today':
        // Expected delivery = today
        // Exclude already delivered or cancelled bookings
        where.expectedDeliveryDate = {
          gte: today,
          lt: tomorrow
        };
        where.status = {
          notIn: [BookingStatus.DELIVERED, BookingStatus.CANCELLED]
        };
        break;

      case 'pending_update':
        // Status is pending/assigned and created >24h ago
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        where.status = { 
          in: [BookingStatus.PENDING, BookingStatus.ASSIGNED] 
        };
        where.createdAt = { lt: yesterday };
        break;

      case 'overdue':
        // Expected delivery date has passed
        // Exclude already delivered or cancelled bookings
        where.expectedDeliveryDate = { lt: today };
        where.status = { 
          notIn: [BookingStatus.DELIVERED, BookingStatus.CANCELLED] 
        };
        break;

      default:
        throw createError(`Invalid timeline filter. Valid values: today, delivery_today, pending_update, overdue`, 400);
    }
  }

  try {
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          enquiry: {
            select: {
              id: true,
              customerName: true,
              customerContact: true,
              customerEmail: true,
              status: true
            }
          }
          // Removed: dealer: false (was causing issues)
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.booking.count({ where })
    ]);

    // Filter each booking based on advisor's read permissions
    let filteredBookings;
    try {
      filteredBookings = bookings.map(booking => 
        filterReadableFields(booking, user.role.name)
      );
    } catch (filterError) {
      console.error('Error filtering advisor bookings:', filterError);
      filteredBookings = bookings; // Return as-is if filtering fails
    }

    res.json({
      success: true,
      message: timeline 
        ? `Bookings for timeline '${timeline}' retrieved successfully`
        : 'Your bookings retrieved successfully',
      data: {
        bookings: filteredBookings,
        timeline: timeline || 'all',
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching advisor bookings:', error);
    console.error('Error details:', error.message, error.stack);
    if (error.message.includes('Invalid timeline')) {
      throw error;
    }
    throw createError('Failed to fetch your bookings', 500);
  }
});

export const addBookingRemark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { remark } = req.body;
  const user = req.user;
  
  // Check if user can add remarks (General Manager, Sales Manager, Team Lead can add remarks)
  if (!hasFieldPermission(user.role.name, 'remarks', 'write')) {
    throw createError('Insufficient permissions to add remarks', 403);
  }

  if (!remark || typeof remark !== 'string' || remark.trim().length === 0) {
    throw createError('Remark is required and must be a non-empty string', 400);
  }

  try {
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { remarks: true, advisorId: true }
    });

    if (!existingBooking) {
      throw createError('Booking not found', 404);
    }

    // For Customer Advisors, check if they own the booking
    if (user.role.name === RoleName.CUSTOMER_ADVISOR && existingBooking.advisorId !== user.firebaseUid) {
      throw createError('You can only add remarks to bookings assigned to you', 403);
    }

    // Append new remark to existing remarks
    const timestamp = new Date().toISOString();
    const newRemarkText = `[${timestamp}] ${user.name} (${user.role.name}): ${remark.trim()}`;
    const updatedRemarks = existingBooking.remarks 
      ? `${existingBooking.remarks}\n\n${newRemarkText}`
      : newRemarkText;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { remarks: updatedRemarks },
      include: {
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        }
      }
    });

    // Create audit log
    await prisma.bookingAuditLog.create({
      data: {
        bookingId: id,
        changedBy: user.firebaseUid,
        action: 'ADD_REMARK',
        oldValue: { remarks: existingBooking.remarks },
        newValue: { remarks: updatedRemarks, newRemark: remark },
        changeReason: 'Remark added',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Filter response based on user's read permissions
    const filteredBooking = filterReadableFields(updatedBooking, user.role.name);

    res.json({
      success: true,
      message: 'Remark added successfully',
      data: { booking: filteredBooking }
    });

  } catch (error: any) {
    console.error('Error adding remark:', error);
    if (error.message.includes('Insufficient permissions') || error.message.includes('only add remarks')) {
      throw error;
    }
    throw createError('Failed to add remark', 500);
  }
});

export const getBookingAuditLog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can read audit logs (Admin, General Manager, Sales Manager, Team Lead)
  if (!hasFieldPermission(user.role.name, 'auditLogs', 'read')) {
    throw createError('Insufficient permissions to view audit logs', 403);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { advisorId: true }
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    const auditLogs = await prisma.bookingAuditLog.findMany({
      where: { bookingId: id },
      include: {
        user: {
          select: {
            firebaseUid: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: { auditLogs }
    });

  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    if (error.message.includes('Insufficient permissions')) {
      throw error;
    }
    throw createError('Failed to fetch audit logs', 500);
  }
});

/**
 * Update booking status and advisor-editable fields
 * PUT /api/bookings/:id/update-status
 * 
 * Allows advisors to update:
 * - status, financeRequired, financerName, fileLoginDate, approvalDate
 * - stockAvailability, expectedDeliveryDate, backOrderStatus, rtoDate
 * 
 * Role-specific remarks:
 * - advisorRemarks (Customer Advisor)
 * - teamLeadRemarks (Team Lead)
 * - salesManagerRemarks (Sales Manager)
 * - generalManagerRemarks (General Manager)
 * - adminRemarks (Admin)
 * 
 * Each role can only update their own remarks field
 * Tracks updated_by and updated_at for audit
 */
export const updateBookingStatusAndFields = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can update bookings
  if (!canPerformAction(user.role.name, 'update', 'booking')) {
    throw createError('Insufficient permissions to update bookings', 403);
  }

  try {
    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { 
        advisorId: true, 
        status: true,
        financeRequired: true,
        financerName: true,
        fileLoginDate: true,
        approvalDate: true,
        stockAvailability: true,
        expectedDeliveryDate: true,
        backOrderStatus: true,
        rtoDate: true,
        remarks: true,
        advisorRemarks: true,
        teamLeadRemarks: true,
        salesManagerRemarks: true,
        generalManagerRemarks: true,
        adminRemarks: true
      }
    });

    if (!existingBooking) {
      throw createError('Booking not found', 404);
    }

    // Customer Advisors can only update their own bookings
    if (user.role.name === RoleName.CUSTOMER_ADVISOR && existingBooking.advisorId !== user.firebaseUid) {
      throw createError('You can only update bookings assigned to you', 403);
    }

    // Validate and prepare update data
    const allowedFields = [
      'status',
      'financeRequired',
      'financerName',
      'fileLoginDate',
      'approvalDate',
      'stockAvailability',
      'expectedDeliveryDate',
      'backOrderStatus',
      'rtoDate',
      // Role-specific remarks fields
      'remarks',
      'advisorRemarks',
      'teamLeadRemarks',
      'salesManagerRemarks',
      'generalManagerRemarks',
      'adminRemarks'
    ];

    // Filter request body to only allowed fields
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Check if user has permission to update this field
        if (!hasFieldPermission(user.role.name, field, 'write')) {
          throw createError(`You don't have permission to update field: ${field}`, 403);
        }
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw createError('No valid fields to update', 400);
    }

    // Validate enum values
    if (updateData.status && !Object.values(BookingStatus).includes(updateData.status)) {
      throw createError('Invalid booking status', 400);
    }

    // Validate stockAvailability enum if provided
    if (updateData.stockAvailability) {
      const validStockValues = ['VNA', 'VEHICLE_AVAILABLE'];
      if (!validStockValues.includes(updateData.stockAvailability)) {
        throw createError('Invalid stock availability. Must be "VNA" or "VEHICLE_AVAILABLE"', 400);
      }
    }

    // Validate boolean fields
    if (updateData.financeRequired !== undefined && typeof updateData.financeRequired !== 'boolean') {
      throw createError('financeRequired must be a boolean', 400);
    }
    if (updateData.backOrderStatus !== undefined && typeof updateData.backOrderStatus !== 'boolean') {
      throw createError('backOrderStatus must be a boolean', 400);
    }

    // Validate date fields (convert to Date objects if they're strings)
    const dateFields = ['fileLoginDate', 'approvalDate', 'expectedDeliveryDate', 'rtoDate'];
    for (const field of dateFields) {
      if (updateData[field]) {
        try {
          updateData[field] = new Date(updateData[field]);
          if (isNaN(updateData[field].getTime())) {
            throw new Error('Invalid date');
          }
        } catch (error) {
          throw createError(`Invalid date format for ${field}. Use ISO-8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`, 400);
        }
      }
    }

    // Get full old booking for audit log
    const oldBooking = await prisma.booking.findUnique({ where: { id } });
    
    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        },
        advisor: {
          select: {
            firebaseUid: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create audit log with updated_by information
    await prisma.bookingAuditLog.create({
      data: {
        bookingId: id,
        changedBy: user.firebaseUid,  // This is the updated_by user
        action: 'UPDATE_STATUS',
        oldValue: oldBooking ? JSON.parse(JSON.stringify(oldBooking)) : {} as any,
        newValue: JSON.parse(JSON.stringify(updatedBooking)),
        changeReason: `Status update by ${user.role.name}: ${user.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Filter response based on user's read permissions
    const filteredBooking = filterReadableFields(updatedBooking, user.role.name);

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: { 
        booking: filteredBooking,
        updatedBy: {
          userId: user.firebaseUid,
          userName: user.name,
          userRole: user.role.name
        },
        updatedAt: updatedBooking.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error updating booking status:', error);
    if (error.message.includes('Insufficient permissions') || 
        error.message.includes('only update bookings') ||
        error.message.includes('Invalid')) {
      throw error;
    }
    throw createError('Failed to update booking', 500);
  }
});

// Get bookings with remarks history
export const getBookingsWithRemarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 10, status, advisorId, startDate, endDate } = req.query;
  const user = req.user;

  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause with dealership filtering
  const where: any = {
    dealershipId: user.dealershipId
  };

  if (status) where.status = status;
  if (advisorId) where.advisorId = advisorId;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        advisor: {
          select: {
            firebaseUid: true,
            name: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        },
        enquiry: {
          select: {
            id: true,
            customerName: true,
            status: true
          }
        },
        remarkHistory: {
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
          take: 5 // Latest 5 remarks
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.booking.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Bookings with remarks retrieved successfully',
    data: {
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// Bulk download bookings as Excel file
export const bulkDownloadBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, category, startDate, endDate, format = 'excel' } = req.query;
  const user = req.user;
  
  // Build where clause with dealership filtering
  const where: any = {
    dealershipId: user.dealershipId
  };
  
  if (status) where.status = status;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }
  
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      enquiry: {
        select: {
          id: true,
          customerName: true,
          customerContact: true,
          customerEmail: true,
          status: true,
          category: true,
          source: true
        }
      },
      advisor: {
        select: {
          name: true,
          email: true,
          role: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (format === 'excel') {
    const XLSX = require('xlsx');
    
    // Prepare data for Excel
    const excelData = bookings.map(booking => ({
      'Booking ID': booking.id,
      'Customer Name': booking.customerName,
      'Customer Phone': booking.customerPhone || '',
      'Customer Email': booking.customerEmail || '',
      'Status': booking.status,
      'Variant': booking.variant || '',
      'Color': booking.color || '',
      'Dealer Code': booking.dealerCode,
      'Advisor': booking.advisor?.name || '',
      'Advisor Email': booking.advisor?.email || '',
      'Advisor Role': booking.advisor?.role?.name || '',
      'Booking Date': booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : '',
      'Expected Delivery': booking.expectedDeliveryDate ? new Date(booking.expectedDeliveryDate).toLocaleDateString() : '',
      'Finance Required': booking.financeRequired ? 'Yes' : 'No',
      'Financer Name': booking.financerName || '',
      'File Login Date': booking.fileLoginDate ? new Date(booking.fileLoginDate).toLocaleDateString() : '',
      'Approval Date': booking.approvalDate ? new Date(booking.approvalDate).toLocaleDateString() : '',
      'RTO Date': booking.rtoDate ? new Date(booking.rtoDate).toLocaleDateString() : '',
      'Stock Availability': booking.stockAvailability || '',
      'Back Order': booking.backOrderStatus ? 'Yes' : 'No',
      'Source': booking.source,
      'Created At': new Date(booking.createdAt).toLocaleDateString(),
      'Updated At': new Date(booking.updatedAt).toLocaleDateString(),
      'Enquiry ID': booking.enquiryId || '',
      'Enquiry Category': booking.enquiry?.category || '',
      'Enquiry Source': booking.enquiry?.source || '',
      'Remarks': booking.remarks || '',
      'Advisor Remarks': booking.advisorRemarks || '',
      'Team Lead Remarks': booking.teamLeadRemarks || '',
      'Sales Manager Remarks': booking.salesManagerRemarks || '',
      'General Manager Remarks': booking.generalManagerRemarks || '',
      'Admin Remarks': booking.adminRemarks || ''
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Booking ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 25 }, // Customer Email
      { wch: 12 }, // Status
      { wch: 15 }, // Variant
      { wch: 12 }, // Color
      { wch: 12 }, // Dealer Code
      { wch: 20 }, // Advisor
      { wch: 25 }, // Advisor Email
      { wch: 15 }, // Advisor Role
      { wch: 12 }, // Booking Date
      { wch: 15 }, // Expected Delivery
      { wch: 15 }, // Finance Required
      { wch: 20 }, // Financer Name
      { wch: 15 }, // File Login Date
      { wch: 15 }, // Approval Date
      { wch: 12 }, // RTO Date
      { wch: 18 }, // Stock Availability
      { wch: 12 }, // Back Order
      { wch: 15 }, // Source
      { wch: 12 }, // Created At
      { wch: 12 }, // Updated At
      { wch: 15 }, // Enquiry ID
      { wch: 15 }, // Enquiry Category
      { wch: 15 }, // Enquiry Source
      { wch: 30 }, // Remarks
      { wch: 30 }, // Advisor Remarks
      { wch: 30 }, // Team Lead Remarks
      { wch: 30 }, // Sales Manager Remarks
      { wch: 30 }, // General Manager Remarks
      { wch: 30 }  // Admin Remarks
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers for Excel download
    const filename = `bookings_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } else {
    // Return JSON data
    res.json({
      success: true,
      message: 'Bookings data retrieved successfully',
      data: {
        bookings,
        totalCount: bookings.length,
        filters: {
          status,
          startDate,
          endDate
        },
        exportedAt: new Date().toISOString()
      }
    });
  }
});

// Get booking status summary for dashboard
export const getBookingStatusSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Get status summary
  const statusSummary = await prisma.booking.groupBy({
    by: ['status'],
    where: { dealershipId: user.dealershipId },
    _count: true,
    orderBy: { _count: { status: 'desc' } }
  });
  
  // Get recent bookings count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentBookings = await prisma.booking.count({
    where: {
      dealershipId: user.dealershipId,
      createdAt: { gte: sevenDaysAgo }
    }
  });
  
  // Get pending bookings (need attention)
  const pendingBookings = await prisma.booking.count({
    where: {
      dealershipId: user.dealershipId,
      status: { in: ['PENDING', 'ASSIGNED'] }
    }
  });
  
  // Get overdue deliveries
  const today = new Date();
  const overdueDeliveries = await prisma.booking.count({
    where: {
      dealershipId: user.dealershipId,
      expectedDeliveryDate: { lt: today },
      status: { notIn: ['DELIVERED', 'CANCELLED'] }
    }
  });
  
  // Get advisor-wise summary
  const advisorSummary = await prisma.booking.groupBy({
    by: ['advisorId'],
    where: { dealershipId: user.dealershipId },
    _count: true,
    orderBy: { _count: { advisorId: 'desc' } }
  });
  
  // Get advisor names
  const advisorDetails = await Promise.all(
    advisorSummary.map(async (item) => {
      const advisor = await prisma.user.findUnique({
        where: { firebaseUid: item.advisorId || '' },
        select: { name: true, email: true }
      });
      return {
        advisorId: item.advisorId,
        advisorName: advisor?.name || 'Unknown',
        advisorEmail: advisor?.email || '',
        bookingCount: item._count
      };
    })
  );
  
  res.json({
    success: true,
    message: 'Booking status summary retrieved successfully',
    data: {
      statusBreakdown: statusSummary.map(item => ({
        status: item.status,
        count: item._count
      })),
      recentBookings,
      pendingBookings,
      overdueDeliveries,
      advisorBreakdown: advisorDetails,
      totalBookings: statusSummary.reduce((sum, item) => sum + item._count, 0),
      summaryDate: new Date().toISOString()
    }
  });
});
