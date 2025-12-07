import { Request, Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest, resolveDealershipContext } from '../middlewares/auth.middleware';
import { EnquiryStatus, EnquiryCategory } from '@prisma/client';
import NotificationTriggerService from '../services/notification-trigger.service';

// Define the EnquirySource enum locally until migration is applied
enum EnquirySource {
  WALK_IN = 'WALK_IN',
  PHONE_CALL = 'PHONE_CALL',
  WEBSITE = 'WEBSITE',
  DIGITAL = 'DIGITAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  REFERRAL = 'REFERRAL',
  ADVERTISEMENT = 'ADVERTISEMENT',
  EMAIL = 'EMAIL',
  SHOWROOM_VISIT = 'SHOWROOM_VISIT',
  EVENT = 'EVENT',
  BTL_ACTIVITY = 'BTL_ACTIVITY',
  WHATSAPP = 'WHATSAPP',
  OUTBOUND_CALL = 'OUTBOUND_CALL',
  OTHER = 'OTHER'
}

// Source mapping from frontend labels to backend enum values (Task 1)
const SOURCE_MAPPING: Record<string, EnquirySource> = {
  'Showroom Walk-in': EnquirySource.SHOWROOM_VISIT,
  'Digital': EnquirySource.DIGITAL,
  'BTL Activity': EnquirySource.BTL_ACTIVITY,
  'Tele-in': EnquirySource.PHONE_CALL,
  'Referral': EnquirySource.REFERRAL
};

// Allowed source values (final list)
const ALLOWED_SOURCES = Object.values(SOURCE_MAPPING);

// Helper function to map and validate source
function mapAndValidateSource(source: string | EnquirySource): EnquirySource {
  // If already a valid enum value, use it
  if (Object.values(EnquirySource).includes(source as EnquirySource)) {
    const enumValue = source as EnquirySource;
    // Check if it's in the allowed list
    if (ALLOWED_SOURCES.includes(enumValue)) {
      return enumValue;
    }
  }
  
  // Try mapping from frontend label
  const mapped = SOURCE_MAPPING[source];
  if (mapped) {
    return mapped;
  }
  
  // If not in allowed list, throw error
  throw createError(
    `Invalid source. Allowed values: ${Object.keys(SOURCE_MAPPING).join(', ')}`,
    400
  );
}

interface CreateEnquiryRequest {
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  source?: EnquirySource;
  expectedBookingDate: string;
  caRemarks?: string;
  assignedToUserId?: string;
  category?: EnquiryCategory;
  dealerCode?: string;
  location?: string;
  nextFollowUpDate?: string;
}

interface UpdateEnquiryRequest {
  customerName?: string;
  customerContact?: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  source?: EnquirySource;
  expectedBookingDate?: string;
  caRemarks?: string;
  status?: EnquiryStatus;
  assignedToUserId?: string;
  category?: EnquiryCategory;
  dealerCode?: string;
  location?: string;
  nextFollowUpDate?: string;
}

export const createEnquiry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { 
    customerName, 
    customerContact, 
    customerEmail, 
    model, 
    variant, 
    color, 
    source, 
    expectedBookingDate, 
    caRemarks, 
    assignedToUserId,
    category,
    dealerCode,
    location,
    nextFollowUpDate
  }: CreateEnquiryRequest = req.body;

  // Validate required fields
  if (!customerName || !customerContact) {
    throw createError('Customer name and contact are required', 400);
  }

  // Task 3: EDB is mandatory
  if (!expectedBookingDate) {
    throw createError('Expected booking date (EDB) is mandatory', 400);
  }

  // Validate email format if provided
  if (customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw createError('Invalid email format', 400);
    }
  }

  // Validate phone number format (basic validation)
  const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(customerContact)) {
    throw createError('Invalid contact number format', 400);
  }

  // Validate assigned user if provided
  if (assignedToUserId) {
    const assignedUser = await prisma.user.findUnique({
      where: { firebaseUid: assignedToUserId }
    });

    if (!assignedUser) {
      throw createError('Assigned user not found', 404);
    }
    if (req.user.dealershipId && assignedUser.dealershipId && req.user.dealershipId !== assignedUser.dealershipId) {
      throw createError('Assigned user belongs to a different dealership', 403);
    }
  }

  // Map and validate source (Task 1: Source dropdown mapping)
  let mappedSource: EnquirySource | undefined;
  if (source) {
    mappedSource = mapAndValidateSource(source);
  }

  // Parse expected booking date if provided
  const parsedBookingDate = new Date(expectedBookingDate);
  if (isNaN(parsedBookingDate.getTime())) {
    throw createError('Invalid expected booking date format', 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedBookingDate < today) {
    throw createError('Expected booking date cannot be in the past', 400);
  }

  // Task 3: Follow-up date is mandatory
  if (!nextFollowUpDate) {
    throw createError('Follow-up date is mandatory', 400);
  }

  let parsedNextFollowUpDate: Date;
  parsedNextFollowUpDate = new Date(nextFollowUpDate);
  if (isNaN(parsedNextFollowUpDate.getTime())) {
    throw createError('Invalid next follow up date format', 400);
  }
  const nextFollowUpStart = new Date(parsedNextFollowUpDate);
  nextFollowUpStart.setHours(0, 0, 0, 0);
  if (nextFollowUpStart < today) {
    throw createError('Follow-up date cannot be in the past', 400);
  }

  // Validate category if provided
  if (category && !Object.values(EnquiryCategory).includes(category)) {
    throw createError('Invalid category. Must be HOT, LOST, or BOOKED', 400);
  }

  const dealershipContext = await resolveDealershipContext(
    req.user.legacyDealershipId ?? req.user.dealershipId
  );

  const resolvedDealershipId = req.user.dealershipId ?? dealershipContext.dealershipUuid;
  if (!resolvedDealershipId) {
    throw createError('Unable to determine dealership for the current user', 403);
  }

  const resolvedDealerCode = dealerCode ?? req.user.dealershipCode ?? dealershipContext.dealershipCode ?? undefined;

  // Create enquiry with proper schema fields
  const enquiryData: any = {
    customerName,
    customerContact,
    customerEmail: customerEmail ?? undefined,
    model,
    variant,
    color,
    source: (mappedSource || EnquirySource.WALK_IN) as any,
    expectedBookingDate: parsedBookingDate,
    caRemarks,
    assignedToUserId,
    createdByUserId: req.user.firebaseUid,
    category: category || EnquiryCategory.HOT,
    dealerCode: resolvedDealerCode ?? null,
    location: location || null,
    nextFollowUpDate: parsedNextFollowUpDate, // Task 3: Now mandatory
    dealershipId: resolvedDealershipId
  };

  const enquiry = await prisma.enquiry.create({
    data: enquiryData,
    include: {
      assignedTo: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      }
    }
  });
  
  // Trigger notification for new enquiry
  try {
    console.log('🔔 Attempting to send enquiry notification for:', enquiry.id);
    console.log('🔔 Enquiry details:', {
      id: enquiry.id,
      customerName: enquiry.customerName,
      category: enquiry.category,
      dealershipId: enquiry.dealershipId
    });
    await NotificationTriggerService.triggerNewEnquiryNotification(enquiry);
    console.log('✅ Enquiry notification sent successfully');
  } catch (error: any) {
    console.error('❌ Error sending new enquiry notification:', error);
    console.error('❌ Error details:', error.message, error.stack);
    // Don't fail the enquiry creation if notification fails
  }
  
  res.status(201).json({
    success: true,
    message: 'Enquiry created successfully',
    data: { enquiry }
  });
});

export const getEnquiries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as EnquiryStatus;
  const category = req.query.category as EnquiryCategory;
  const user = req.user;

  const skip = (page - 1) * limit;
  
  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (category) {
    // Validate category value
    if (!Object.values(EnquiryCategory).includes(category)) {
      throw createError('Invalid category. Must be HOT, LOST, or BOOKED', 400);
    }
    where.category = category;
  }

  // CRITICAL: Filter by dealership for multi-tenant isolation
  if (user.dealershipId) {
    where.dealershipId = user.dealershipId;
  }

  // CUSTOMER_ADVISOR can only see enquiries they created
  if (user.role.name === 'CUSTOMER_ADVISOR') {
    where.createdByUserId = user.firebaseUid;
  }

  let enquiries, total;
  try {
    [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              firebaseUid: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              firebaseUid: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              bookings: true,
              quotations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.enquiry.count({ where })
    ]);
  } catch (error: any) {
    console.error('Error fetching enquiries:', error);
    console.error('Where clause:', JSON.stringify(where, null, 2));
    throw createError(`Failed to fetch enquiries: ${error.message}`, 400);
  }

  // Return enquiries with direct fields (no parsing needed)
  const formattedEnquiries = enquiries;

  res.json({
    success: true,
    message: 'Enquiries retrieved successfully',
    data: {
      enquiries: formattedEnquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getEnquiryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      bookings: true,
      quotations: true
    }
  });

  if (!enquiry) {
    throw createError('Enquiry not found', 404);
  }

  // CUSTOMER_ADVISOR can only view enquiries they created
  if (user.role.name === 'CUSTOMER_ADVISOR' && enquiry.createdByUserId !== user.firebaseUid) {
    throw createError('You can only access enquiries you created', 403);
  }

  // Task 4: Fetch last 3-5 remarks (chronologically, not by date)
  const remarks = await prisma.remark.findMany({
    where: {
      enquiryId: id,
      isCancelled: false
    },
    orderBy: { createdAt: 'desc' },
    take: 5, // Last 5 remarks
    include: {
      user: {
        select: {
          firebaseUid: true,
          name: true,
          email: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  // Define role hierarchy for sorting (higher number = higher authority)
  const roleHierarchy: Record<string, number> = {
    'ADMIN': 5,
    'GENERAL_MANAGER': 4,
    'SALES_MANAGER': 3,
    'TEAM_LEAD': 2,
    'CUSTOMER_ADVISOR': 1
  };

  // Format remarkHistory with hierarchy sorting and proper date formatting
  const formattedRemarkHistory = remarks
    .map((remark) => {
      const roleName = remark.user.role?.name || 'CUSTOMER_ADVISOR';
      const hierarchyLevel = roleHierarchy[roleName] || 0;
      
      return {
        id: remark.id,
        remark: remark.remark,
        remarkType: remark.remarkType || 'enquiry_remark',
        createdAt: remark.createdAt.toISOString(),
        createdDate: remark.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
        createdTime: remark.createdAt.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format
        timestamp: remark.createdAt.getTime(), // Unix timestamp for sorting
        hierarchyLevel, // For sorting by hierarchy
        createdBy: {
          id: remark.user.firebaseUid,
          name: remark.user.name,
          role: {
            id: remark.user.role?.id || null,
            name: roleName
          }
        },
        cancelled: remark.isCancelled,
        cancellationReason: remark.cancellationReason || null
      };
    })
    // Sort by hierarchy (higher roles first), then by timestamp (newest first)
    .sort((a, b) => {
      // First sort by hierarchy level (descending - higher roles first)
      if (b.hierarchyLevel !== a.hierarchyLevel) {
        return b.hierarchyLevel - a.hierarchyLevel;
      }
      // Then sort by timestamp (descending - newest first)
      return b.timestamp - a.timestamp;
    });

  // Use enquiry with formatted remarkHistory
  const formattedEnquiry = {
    ...enquiry,
    remarkHistory: formattedRemarkHistory
  };

  res.json({
    success: true,
    message: 'Enquiry retrieved successfully',
    data: { enquiry: formattedEnquiry }
  });
});

export const updateEnquiry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    customerName, 
    customerContact, 
    customerEmail, 
    model, 
    variant, 
    color, 
    source, 
    expectedBookingDate, 
    caRemarks, 
    status, 
    assignedToUserId,
    category,
    dealerCode,
    location,
    nextFollowUpDate
  }: UpdateEnquiryRequest = req.body;

  // Check if enquiry exists
  const existingEnquiry = await prisma.enquiry.findUnique({
    where: { id }
  });

  if (!existingEnquiry) {
    throw createError('Enquiry not found', 404);
  }

  // 🔒 LOCK ENTRY: Prevent updates to closed enquiries (Task 10)
  if (existingEnquiry.status === EnquiryStatus.CLOSED) {
    throw createError('Cannot update closed enquiry. Entry is locked.', 403);
  }

  // Task 8: Enhanced locking - Block all updates except remarks for Booked/Lost enquiries
  if (existingEnquiry.category === EnquiryCategory.BOOKED || 
      existingEnquiry.category === EnquiryCategory.LOST) {
    // Allow only remark additions
    const allowedFields = ['caRemarks'];
    const updateFieldsObj: any = {
      customerName,
      customerContact,
      customerEmail,
      model,
      variant,
      color,
      source,
      expectedBookingDate,
      caRemarks,
      status,
      assignedToUserId,
      category,
      dealerCode,
      location,
      nextFollowUpDate
    };
    const updateKeys = Object.keys(updateFieldsObj).filter(key => updateFieldsObj[key] !== undefined);
    
    const hasOnlyRemarks = updateKeys.every(key => allowedFields.includes(key));
    
    if (!hasOnlyRemarks) {
      throw createError(
        'Cannot update booked/lost enquiry. Entry is locked. Only remarks can be added.',
        403
      );
    }
  }

  // Task 2: Block updates to vehicle details if imported from quotation CSV
  if (existingEnquiry.isImportedFromQuotation) {
    const protectedFields: string[] = [];
    if (model !== undefined) protectedFields.push('model');
    if (variant !== undefined) protectedFields.push('variant');
    if (color !== undefined) protectedFields.push('color');
    // Note: fuelType is not in UpdateEnquiryRequest yet, but will be protected when added
    
    if (protectedFields.length > 0) {
      throw createError(
        `Cannot update vehicle details imported from quotation CSV. Fields are read-only: ${protectedFields.join(', ')}`,
        403
      );
    }
  }

  const dealershipContext = await resolveDealershipContext(
    req.user.legacyDealershipId ?? req.user.dealershipId
  );

  // Build update object with direct fields
  const updateFields: any = {};
  
  // Update direct fields
  if (customerName !== undefined) updateFields.customerName = customerName;
  if (customerContact !== undefined) updateFields.customerContact = customerContact;
  if (customerEmail !== undefined) {
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        throw createError('Invalid email format', 400);
      }
      updateFields.customerEmail = customerEmail as any;
    } else {
      updateFields.customerEmail = null as any;
    }
  }
  if (model !== undefined) updateFields.model = model;
  if (variant !== undefined) updateFields.variant = variant;
  if (color !== undefined) updateFields.color = color;
  // Map and validate source (Task 1: Source dropdown mapping)
  if (source !== undefined) {
    const mappedSource = mapAndValidateSource(source);
    updateFields.source = mappedSource as any;
  }
  if (caRemarks !== undefined) updateFields.caRemarks = caRemarks;
  if (dealerCode !== undefined) updateFields.dealerCode = dealerCode;
  if (location !== undefined) updateFields.location = location ?? null;
  
  // Task 3: EDB is mandatory - validate if provided or use existing
  if (expectedBookingDate !== undefined) {
    if (!expectedBookingDate) {
      throw createError('Expected booking date (EDB) is mandatory and cannot be removed', 400);
    }
    const date = new Date(expectedBookingDate);
    if (isNaN(date.getTime())) {
      throw createError('Invalid expected booking date format', 400);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw createError('Expected booking date cannot be in the past', 400);
    }
    updateFields.expectedBookingDate = date;
  }

  // Task 3: Follow-up date is mandatory in updates too
  if (nextFollowUpDate !== undefined) {
    if (!nextFollowUpDate) {
      throw createError('Follow-up date is mandatory and cannot be removed', 400);
    }
    const parsedNextFollowUp = new Date(nextFollowUpDate);
    if (isNaN(parsedNextFollowUp.getTime())) {
      throw createError('Invalid next follow up date format', 400);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedNextFollowUp.setHours(0, 0, 0, 0);
    if (parsedNextFollowUp < today) {
      throw createError('Follow-up date cannot be in the past', 400);
    }
    updateFields.nextFollowUpDate = parsedNextFollowUp;
  }
  
  // Task 3: Ensure EDB is also set if not provided in update
  if (expectedBookingDate === undefined && !existingEnquiry.expectedBookingDate) {
    throw createError('Expected booking date (EDB) is mandatory', 400);
  }
  
  // Update other fields
  if (status !== undefined) updateFields.status = status;
  if (assignedToUserId !== undefined) {
    if (assignedToUserId) {
      const assignedUser = await prisma.user.findUnique({
        where: { firebaseUid: assignedToUserId }
      });
      if (!assignedUser) {
        throw createError('Assigned user not found', 404);
      }
      if (assignedUser.dealershipId && existingEnquiry.dealershipId && assignedUser.dealershipId !== existingEnquiry.dealershipId) {
        throw createError('Assigned user belongs to a different dealership', 403);
      }
    }
    updateFields.assignedToUserId = assignedToUserId || null;
  }
  
  // Validate and update category
  if (category !== undefined) {
    if (!Object.values(EnquiryCategory).includes(category)) {
      throw createError('Invalid category. Must be HOT, LOST, or BOOKED', 400);
    }
    updateFields.category = category;

    // 🔒 MANDATORY REASON FOR LOST (Task 10)
    if (category === EnquiryCategory.LOST && existingEnquiry.category !== EnquiryCategory.LOST) {
      // Check if lostReason is provided (can be in caRemarks or separate field)
      const lostReason = req.body.lostReason || req.body.caRemarks;
      if (!lostReason || !lostReason.trim()) {
        throw createError('Reason for lost is required. Please provide a reason when marking enquiry as lost.', 400);
      }

      // Store reason as remark
      await prisma.remark.create({
        data: {
          enquiryId: id,
          remark: `Status changed to LOST. Reason: ${lostReason.trim()}`,
          remarkType: 'ca_remarks',
          createdBy: req.user.firebaseUid
        }
      });

      // Close the enquiry
      updateFields.status = EnquiryStatus.CLOSED;
      updateFields.caRemarks = lostReason.trim();
    }
  }

  const enquiry = await prisma.enquiry.update({
    where: { id },
    data: updateFields,
    include: {
      assignedTo: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      }
    }
  });

  // 🎯 AUTO-CREATE BOOKING when category is set to BOOKED
  let booking = null;
  let stockInfo = null;
  if (category === EnquiryCategory.BOOKED) {
    // ✅ STOCK VALIDATION - Check if vehicle is in stock (quantity > 0)
    if (enquiry.variant) {
      const vehicleInStock = await prisma.vehicle.findFirst({
        where: {
          variant: enquiry.variant,
          isActive: true,
          totalStock: { gt: 0 } // Check total stock quantity > 0
        },
        select: {
          id: true,
          variant: true,
          color: true,
          zawlStock: true,
          rasStock: true,
          regionalStock: true,
          plantStock: true,
          totalStock: true,
          dealerId: true
        }
      });

      if (!vehicleInStock) {
        throw createError(
          `Vehicle variant "${enquiry.variant}" is not in stock. Cannot convert to booking.`,
          400
        );
      }

      stockInfo = vehicleInStock;
    }

    // Check if booking already exists for this enquiry
    const existingBooking = await prisma.booking.findFirst({
      where: { enquiryId: id }
    });

    if (!existingBooking) {
      // Get dealerCode from enquiry (either updated or existing)
      const finalDealerCode =
        updateFields.dealerCode ??
        existingEnquiry.dealerCode ??
        req.user.dealershipCode ??
        dealershipContext.dealershipCode ??
        null;

      // Create booking from enquiry with stock information
      booking = await prisma.booking.create({
        data: {
          customerName: enquiry.customerName,
          customerPhone: enquiry.customerContact,
          customerEmail: enquiry.customerEmail,
          variant: enquiry.variant,
          color: enquiry.color,
          dealerCode: finalDealerCode ?? undefined,
          advisorId: enquiry.createdByUserId,  // Assign to enquiry creator
          enquiryId: enquiry.id,  // Link to source enquiry
          source: 'MOBILE',  // Mark as mobile-created
          status: 'PENDING',
          bookingDate: new Date(),
          expectedDeliveryDate: enquiry.expectedBookingDate,
          stockAvailability: stockInfo ? 'VEHICLE_AVAILABLE' : undefined,  // Set stock status
          remarks: `Auto-created from enquiry: ${enquiry.id}. ${enquiry.caRemarks || ''}${stockInfo ? '\nStock validated: Vehicle available in inventory.' : ''}`,
          dealershipId: enquiry.dealershipId  // CRITICAL: Inherit dealership from enquiry
        },
        include: {
          enquiry: {
            select: {
              id: true,
              customerName: true,
              customerContact: true,
              status: true
            }
          }
        }
      });

      // Also close the enquiry
      await prisma.enquiry.update({
        where: { id },
        data: { status: EnquiryStatus.CLOSED }
      });
    }
  }

  // Trigger notifications for status changes
  try {
    if (status && status !== existingEnquiry.status) {
      await NotificationTriggerService.triggerEnquiryStatusChangeNotification(
        enquiry, 
        existingEnquiry.status, 
        status
      );
    }

    // Task 5: Trigger notifications for category changes
    if (category && category !== existingEnquiry.category) {
      // HOT → BOOKED: Notify TL
      if (category === EnquiryCategory.BOOKED && existingEnquiry.category === EnquiryCategory.HOT) {
        await NotificationTriggerService.triggerEnquiryCategoryChangeNotification(
          enquiry,
          'HOT',
          'BOOKED',
          'TL' // Notify Team Lead
        );
      }
      
      // HOT → LOST: Notify TL + SM
      if (category === EnquiryCategory.LOST && existingEnquiry.category === EnquiryCategory.HOT) {
        await NotificationTriggerService.triggerEnquiryCategoryChangeNotification(
          enquiry,
          'HOT',
          'LOST',
          'TL_SM' // Notify Team Lead + Sales Manager
        );
      }
    }

    // Trigger notification for new booking if created
    if (booking) {
      await NotificationTriggerService.triggerNewBookingNotification(booking);
    }

    // Trigger urgent notification for HOT enquiries
    if (category === 'HOT' && existingEnquiry.category !== 'HOT') {
      await NotificationTriggerService.triggerUrgentEnquiryNotification(enquiry);
    }
  } catch (error) {
    console.error('Error sending enquiry update notifications:', error);
    // Don't fail the enquiry update if notification fails
  }

  // Return the updated enquiry and booking (if created)
  res.json({
    success: true,
    message: booking 
      ? 'Enquiry updated and booking created successfully. Stock validated.' 
      : 'Enquiry updated successfully',
    data: { 
      enquiry,
      ...(booking && { booking }),
      ...(stockInfo && { stockValidation: {
        variant: stockInfo.variant,
        available: true,
        stockLocations: {
          zawl: stockInfo.zawlStock,
          ras: stockInfo.rasStock,
          regional: stockInfo.regionalStock,
          plant: stockInfo.plantStock
        }
      }})
    }
  });
});

export const deleteEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id }
  });

  if (!enquiry) {
    throw createError('Enquiry not found', 404);
  }

  await prisma.enquiry.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Enquiry deleted successfully'
  });
});

// Helper functions for dropdowns
export const getAvailableModels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // CRITICAL: Filter by dealership for multi-tenant isolation
  const where: any = { isActive: true };
  if (user.dealershipId) {
    where.dealershipId = user.dealershipId;
  }
  
  // Get unique vehicle models/variants from the Vehicle table
  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      variant: true,
      dealerType: true
    },
    distinct: ['variant']
  });

  // Group by dealer type (brand)
  const modelsByBrand: { [key: string]: string[] } = {};
  
  vehicles.forEach(vehicle => {
    if (vehicle.variant && vehicle.dealerType) {
      if (!modelsByBrand[vehicle.dealerType]) {
        modelsByBrand[vehicle.dealerType] = [];
      }
      if (!modelsByBrand[vehicle.dealerType].includes(vehicle.variant)) {
        modelsByBrand[vehicle.dealerType].push(vehicle.variant);
      }
    }
  });

  res.json({
    success: true,
    message: 'Available models retrieved successfully',
    data: { modelsByBrand }
  });
});

export const getAvailableVariants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { model } = req.query;

  let where: any = { isActive: true };
  
  // CRITICAL: Filter by dealership for multi-tenant isolation
  if (user.dealershipId) {
    where.dealershipId = user.dealershipId;
  }
  
  if (model) {
    where.variant = { contains: model as string, mode: 'insensitive' };
  }

  const variants = await prisma.vehicle.findMany({
    where,
    select: {
      variant: true,
      vcCode: true,
      trim: true,
      fuelType: true,
      transmission: true
    },
    distinct: ['variant', 'vcCode']
  });

  res.json({
    success: true,
    message: 'Available variants retrieved successfully',
    data: { variants }
  });
});

export const getAvailableColors = asyncHandler(async (req: Request, res: Response) => {
  const colors = await prisma.vehicle.findMany({
    where: { 
      isActive: true,
      color: { not: null }
    },
    select: { color: true },
    distinct: ['color']
  });

  const colorList = colors
    .filter(c => c.color)
    .map(c => c.color)
    .sort();

  res.json({
    success: true,
    message: 'Available colors retrieved successfully',
    data: { colors: colorList }
  });
});

export const getEnquirySources = asyncHandler(async (req: Request, res: Response) => {
  const sources = Object.values(EnquirySource).map(source => ({
    value: source,
    label: source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }));

  res.json({
    success: true,
    message: 'Enquiry sources retrieved successfully',
    data: { sources }
  });
});

export const getEnquiryStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }

  // Get total enquiries count
  const totalEnquiries = await prisma.enquiry.count({ where: dealershipFilter });

  // Get enquiries by status
  const enquiriesByStatus = await prisma.enquiry.groupBy({
    by: ['status'],
    where: dealershipFilter,
    _count: {
      id: true
    }
  });

  // Get enquiries by source
  const enquiriesBySource = await prisma.enquiry.groupBy({
    by: ['source'],
    where: dealershipFilter,
    _count: {
      id: true
    }
  });

  // Get recent enquiries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentEnquiries = await prisma.enquiry.count({
    where: {
      ...dealershipFilter,
      createdAt: {
        gte: thirtyDaysAgo
      }
    }
  });

  // Get most popular models
  const popularModels = await prisma.enquiry.groupBy({
    by: ['model'],
    where: {
      ...dealershipFilter,
      model: {
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
    take: 5
  });

  res.json({
    success: true,
    message: 'Enquiry statistics retrieved successfully',
    data: {
      totalEnquiries,
      enquiriesByStatus: enquiriesByStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      enquiriesBySource: enquiriesBySource.map(item => ({
        source: item.source,
        count: item._count.id
      })),
      recentEnquiries,
      popularModels: popularModels.map(item => ({
        model: item.model,
        count: item._count.id
      }))
    }
  });
});

// Get enquiries with remarks history
export const getEnquiriesWithRemarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 10, status, category, assignedToUserId, startDate, endDate } = req.query;
  const user = req.user;

  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause with dealership filtering
  const where: any = {
    dealershipId: user.dealershipId
  };

  if (status) where.status = status;
  if (category) where.category = category;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: {
        createdBy: {
          select: {
            firebaseUid: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            firebaseUid: true,
            name: true,
            email: true
          }
        },
        remarkHistory: {
          where: {
            isCancelled: false,
            createdAt: {
              gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
            }
          } as any,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firebaseUid: true,
                name: true,
                email: true,
                role: {
                  select: { 
                    id: true,
                    name: true 
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            bookings: true,
            quotations: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.enquiry.count({ where })
  ]);

  // Define role hierarchy for sorting (higher number = higher authority)
  const roleHierarchy: Record<string, number> = {
    'ADMIN': 5,
    'GENERAL_MANAGER': 4,
    'SALES_MANAGER': 3,
    'TEAM_LEAD': 2,
    'CUSTOMER_ADVISOR': 1
  };

  // Format remarks with hierarchy sorting and proper date/time formatting
  const formattedEnquiries = enquiries.map((enquiry) => {
    const formattedRemarks = enquiry.remarkHistory
      .map((remark) => {
        const roleName = remark.user.role?.name || 'CUSTOMER_ADVISOR';
        const hierarchyLevel = roleHierarchy[roleName] || 0;
        
        return {
          id: remark.id,
          remark: remark.remark,
          remarkType: remark.remarkType || 'enquiry_remark',
          createdAt: remark.createdAt.toISOString(),
          createdDate: remark.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
          createdTime: remark.createdAt.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format
          timestamp: remark.createdAt.getTime(), // Unix timestamp for sorting
          hierarchyLevel, // For sorting by hierarchy
          createdBy: {
            id: remark.user.firebaseUid,
            name: remark.user.name,
            email: remark.user.email,
            role: {
              id: remark.user.role?.id || null,
              name: roleName
            }
          },
          cancelled: remark.isCancelled,
          cancellationReason: remark.cancellationReason || null
        };
      })
      // Sort by hierarchy (higher roles first), then by timestamp (newest first)
      .sort((a, b) => {
        // First sort by hierarchy level (descending - higher roles first)
        if (b.hierarchyLevel !== a.hierarchyLevel) {
          return b.hierarchyLevel - a.hierarchyLevel;
        }
        // Then sort by timestamp (descending - newest first)
        return b.timestamp - a.timestamp;
      });

    return {
      ...enquiry,
      remarkHistory: formattedRemarks
    };
  });

  res.json({
    success: true,
    message: 'Enquiries with remarks retrieved successfully',
    data: {
      enquiries: formattedEnquiries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// Bulk download enquiries as Excel file
export const bulkDownloadEnquiries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, category, startDate, endDate, format = 'excel' } = req.query;
  const user = req.user;
  
  // Build where clause with dealership filtering
  const where: any = {
    dealershipId: user.dealershipId
  };
  
  if (status) where.status = status;
  if (category) where.category = category;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }
  
  const enquiries = await prisma.enquiry.findMany({
    where,
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
          role: {
            select: { name: true }
          }
        }
      },
      assignedTo: {
        select: {
          name: true,
          email: true,
          role: {
            select: { name: true }
          }
        }
      },
      _count: {
        select: {
          bookings: true,
          quotations: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (format === 'excel') {
    const XLSX = require('xlsx');
    
    // Prepare data for Excel
    const excelData = enquiries.map(enquiry => ({
      'Enquiry ID': enquiry.id,
      'Customer Name': enquiry.customerName,
      'Customer Contact': enquiry.customerContact,
      'Customer Email': enquiry.customerEmail || '',
      'Status': enquiry.status,
      'Category': enquiry.category,
      'Model': enquiry.model || '',
      'Variant': enquiry.variant || '',
      'Color': enquiry.color || '',
      'Source': enquiry.source,
      'Dealer Code': enquiry.dealerCode || '',
      'Location': (enquiry as any).location || '',
      'Expected Booking Date': enquiry.expectedBookingDate ? new Date(enquiry.expectedBookingDate).toLocaleDateString() : '',
      'Created By': enquiry.createdBy?.name || '',
      'Created By Email': enquiry.createdBy?.email || '',
      'Created By Role': enquiry.createdBy?.role?.name || '',
      'Assigned To': enquiry.assignedTo?.name || '',
      'Assigned To Email': enquiry.assignedTo?.email || '',
      'Assigned To Role': enquiry.assignedTo?.role?.name || '',
      'CA Remarks': enquiry.caRemarks || '',
      'Created At': new Date(enquiry.createdAt).toLocaleDateString(),
      'Updated At': new Date(enquiry.updatedAt).toLocaleDateString(),
      'Bookings Count': enquiry._count.bookings,
      'Quotations Count': enquiry._count.quotations,
      'Last Follow Up': enquiry.lastFollowUpDate ? new Date(enquiry.lastFollowUpDate).toLocaleDateString() : '',
      'Follow Up Count': enquiry.followUpCount,
      'Next Follow Up': enquiry.nextFollowUpDate ? new Date(enquiry.nextFollowUpDate).toLocaleDateString() : ''
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Enquiry ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Contact
      { wch: 25 }, // Customer Email
      { wch: 12 }, // Status
      { wch: 12 }, // Category
      { wch: 15 }, // Model
      { wch: 15 }, // Variant
      { wch: 12 }, // Color
      { wch: 15 }, // Source
      { wch: 12 }, // Dealer Code
      { wch: 18 }, // Location
      { wch: 18 }, // Expected Booking Date
      { wch: 20 }, // Created By
      { wch: 25 }, // Created By Email
      { wch: 15 }, // Created By Role
      { wch: 20 }, // Assigned To
      { wch: 25 }, // Assigned To Email
      { wch: 15 }, // Assigned To Role
      { wch: 30 }, // CA Remarks
      { wch: 12 }, // Created At
      { wch: 12 }, // Updated At
      { wch: 15 }, // Bookings Count
      { wch: 15 }, // Quotations Count
      { wch: 15 }, // Last Follow Up
      { wch: 15 }, // Follow Up Count
      { wch: 15 }  // Next Follow Up
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enquiries');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers for Excel download
    const filename = `enquiries_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } else {
    // Return JSON data
    res.json({
      success: true,
      message: 'Enquiries data retrieved successfully',
      data: {
        enquiries,
        totalCount: enquiries.length,
        filters: {
          status,
          category,
          startDate,
          endDate
        },
        exportedAt: new Date().toISOString()
      }
    });
  }
});

// Get enquiry status summary for dashboard
export const getEnquiryStatusSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Build where clause - handle null dealershipId
  const whereClause: any = {};
  if (user.dealershipId) {
    whereClause.dealershipId = user.dealershipId;
  }
  
  // Get status summary
  const statusSummary = await prisma.enquiry.groupBy({
    by: ['status'],
    where: whereClause,
    _count: true
  });
  
  // Get category summary
  const categorySummary = await prisma.enquiry.groupBy({
    by: ['category'],
    where: whereClause,
    _count: true
  });
  
  // Get recent enquiries count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEnquiries = await prisma.enquiry.count({
    where: {
      ...whereClause,
      createdAt: { gte: sevenDaysAgo }
    }
  });
  
  // Get hot enquiries needing follow-up
  const hotEnquiries = await prisma.enquiry.count({
    where: {
      ...whereClause,
      category: 'HOT',
      status: 'OPEN'
    }
  });
  
  // Get overdue follow-ups
  const today = new Date();
  const overdueFollowUps = await prisma.enquiry.count({
    where: {
      ...whereClause,
      nextFollowUpDate: { lt: today },
      status: 'OPEN'
    }
  });
  
  // Get source summary
  const sourceSummary = await prisma.enquiry.groupBy({
    by: ['source'],
    where: whereClause,
    _count: true
  });
  
  // Get advisor-wise summary
  const advisorSummary = await prisma.enquiry.groupBy({
    by: ['assignedToUserId'],
    where: { 
      ...whereClause,
      assignedToUserId: { not: null }
    },
    _count: true
  });
  
  // Get advisor names
  const advisorDetails = await Promise.all(
    advisorSummary.map(async (item) => {
      const advisor = await prisma.user.findUnique({
        where: { firebaseUid: item.assignedToUserId! },
        select: { name: true, email: true }
      });
      return {
        advisorId: item.assignedToUserId,
        advisorName: advisor?.name || 'Unknown',
        advisorEmail: advisor?.email || '',
        enquiryCount: item._count
      };
    })
  );
  
  res.json({
    success: true,
    message: 'Enquiry status summary retrieved successfully',
    data: {
      statusBreakdown: statusSummary.map(item => ({
        status: item.status,
        count: item._count
      })),
      categoryBreakdown: categorySummary.map(item => ({
        category: item.category,
        count: item._count
      })),
      sourceBreakdown: sourceSummary.map(item => ({
        source: item.source,
        count: item._count
      })),
      recentEnquiries,
      hotEnquiries,
      overdueFollowUps,
      advisorBreakdown: advisorDetails,
      totalEnquiries: statusSummary.reduce((sum, item) => sum + item._count, 0),
      summaryDate: new Date().toISOString()
    }
  });
});
