import { Request, Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { EnquiryStatus, EnquiryCategory } from '@prisma/client';

// Define the EnquirySource enum locally until migration is applied
enum EnquirySource {
  WALK_IN = 'WALK_IN',
  PHONE_CALL = 'PHONE_CALL',
  WEBSITE = 'WEBSITE',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  REFERRAL = 'REFERRAL',
  ADVERTISEMENT = 'ADVERTISEMENT',
  EMAIL = 'EMAIL',
  SHOWROOM_VISIT = 'SHOWROOM_VISIT',
  EVENT = 'EVENT',
  OTHER = 'OTHER'
}

interface CreateEnquiryRequest {
  customerName: string;
  customerContact: string;
  customerEmail: string;
  model?: string;
  variant?: string;
  color?: string;
  source?: EnquirySource;
  expectedBookingDate?: string;
  caRemarks?: string;
  assignedToUserId?: string;
  category?: EnquiryCategory;
  dealerCode?: string;
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
    dealerCode
  }: CreateEnquiryRequest = req.body;

  // Validate required fields
  if (!customerName || !customerContact || !customerEmail) {
    throw createError('Customer name, contact, and email are required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    throw createError('Invalid email format', 400);
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
  }

  // Parse expected booking date if provided
  let parsedBookingDate: Date | undefined;
  if (expectedBookingDate) {
    parsedBookingDate = new Date(expectedBookingDate);
    if (isNaN(parsedBookingDate.getTime())) {
      throw createError('Invalid expected booking date format', 400);
    }
  }

  // Validate category if provided
  if (category && !Object.values(EnquiryCategory).includes(category)) {
    throw createError('Invalid category. Must be HOT, LOST, or BOOKED', 400);
  }

  // Create enquiry with proper schema fields
  const enquiry = await prisma.enquiry.create({
    data: {
      customerName,
      customerContact,
      customerEmail,
      model,
      variant,
      color,
      source: source || EnquirySource.WALK_IN,
      expectedBookingDate: parsedBookingDate,
      caRemarks,
      assignedToUserId,
      createdByUserId: req.user.firebaseUid,
      category: category || EnquiryCategory.HOT,  // Default to HOT
      dealerCode: dealerCode || 'DEFAULT001',  // Default dealer if not provided
      dealershipId: req.user.dealershipId  // CRITICAL: Assign to user's dealership
    },
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

  const [enquiries, total] = await Promise.all([
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

  // Use enquiry directly as it has all fields already
  const formattedEnquiry = enquiry;

  res.json({
    success: true,
    message: 'Enquiry retrieved successfully',
    data: { enquiry: formattedEnquiry }
  });
});

export const updateEnquiry = asyncHandler(async (req: Request, res: Response) => {
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
    category
  }: UpdateEnquiryRequest = req.body;

  // Check if enquiry exists
  const existingEnquiry = await prisma.enquiry.findUnique({
    where: { id }
  });

  if (!existingEnquiry) {
    throw createError('Enquiry not found', 404);
  }

  // Build update object with direct fields
  const updateFields: any = {};
  
  // Update direct fields
  if (customerName !== undefined) updateFields.customerName = customerName;
  if (customerContact !== undefined) updateFields.customerContact = customerContact;
  if (customerEmail !== undefined) updateFields.customerEmail = customerEmail;
  if (model !== undefined) updateFields.model = model;
  if (variant !== undefined) updateFields.variant = variant;
  if (color !== undefined) updateFields.color = color;
  if (source !== undefined) updateFields.source = source;
  if (caRemarks !== undefined) updateFields.caRemarks = caRemarks;
  
  // Parse expected booking date if provided
  if (expectedBookingDate) {
    const date = new Date(expectedBookingDate);
    if (isNaN(date.getTime())) {
      throw createError('Invalid expected booking date format', 400);
    }
    updateFields.expectedBookingDate = date;
  }
  
  // Update other fields
  if (status !== undefined) updateFields.status = status;
  if (assignedToUserId !== undefined) updateFields.assignedToUserId = assignedToUserId;
  
  // Validate and update category
  if (category !== undefined) {
    if (!Object.values(EnquiryCategory).includes(category)) {
      throw createError('Invalid category. Must be HOT, LOST, or BOOKED', 400);
    }
    updateFields.category = category;
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
          `Vehicle variant "${enquiry.variant}" is not in stock. Cannot convert to booking. Please check stock availability or create with back-order status.`,
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
      const finalDealerCode = updateFields.dealerCode || existingEnquiry.dealerCode || 'DEFAULT001';

      // Create booking from enquiry with stock information
      booking = await prisma.booking.create({
        data: {
          customerName: enquiry.customerName,
          customerPhone: enquiry.customerContact,
          customerEmail: enquiry.customerEmail,
          variant: enquiry.variant,
          color: enquiry.color,
          dealerCode: finalDealerCode,
          advisorId: enquiry.createdByUserId,  // Assign to enquiry creator
          enquiryId: enquiry.id,  // Link to source enquiry
          source: 'MOBILE',  // Mark as mobile-created
          status: 'PENDING',
          bookingDate: new Date(),
          expectedDeliveryDate: enquiry.expectedBookingDate,
          stockAvailability: stockInfo ? 'VEHICLE_AVAILABLE' : undefined,  // Set stock status
          backOrderStatus: false,  // Not a back order since stock is available
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

  res.json({
    success: true,
    message: 'Enquiries with remarks retrieved successfully',
    data: {
      enquiries,
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
      'Customer Email': enquiry.customerEmail,
      'Status': enquiry.status,
      'Category': enquiry.category,
      'Model': enquiry.model || '',
      'Variant': enquiry.variant || '',
      'Color': enquiry.color || '',
      'Source': enquiry.source,
      'Dealer Code': enquiry.dealerCode || '',
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
  
  // Get status summary
  const statusSummary = await prisma.enquiry.groupBy({
    by: ['status'],
    where: { dealershipId: user.dealershipId },
    _count: true,
    orderBy: { _count: { status: 'desc' } }
  });
  
  // Get category summary
  const categorySummary = await prisma.enquiry.groupBy({
    by: ['category'],
    where: { dealershipId: user.dealershipId },
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  
  // Get recent enquiries count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEnquiries = await prisma.enquiry.count({
    where: {
      dealershipId: user.dealershipId,
      createdAt: { gte: sevenDaysAgo }
    }
  });
  
  // Get hot enquiries needing follow-up
  const hotEnquiries = await prisma.enquiry.count({
    where: {
      dealershipId: user.dealershipId,
      category: 'HOT',
      status: 'OPEN'
    }
  });
  
  // Get overdue follow-ups
  const today = new Date();
  const overdueFollowUps = await prisma.enquiry.count({
    where: {
      dealershipId: user.dealershipId,
      nextFollowUpDate: { lt: today },
      status: 'OPEN'
    }
  });
  
  // Get source summary
  const sourceSummary = await prisma.enquiry.groupBy({
    by: ['source'],
    where: { dealershipId: user.dealershipId },
    _count: true,
    orderBy: { _count: { source: 'desc' } }
  });
  
  // Get advisor-wise summary
  const advisorSummary = await prisma.enquiry.groupBy({
    by: ['assignedToUserId'],
    where: { 
      dealershipId: user.dealershipId,
      assignedToUserId: { not: null }
    },
    _count: true,
    orderBy: { _count: { assignedToUserId: 'desc' } }
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
