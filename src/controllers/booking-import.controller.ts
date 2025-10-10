import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { BookingStatus, BookingSource, ImportStatus, RoleName } from '@prisma/client';
import BookingImportService from '../services/booking-import.service';
import BookingImportProcessor from '../services/booking-import-processor.service';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Enhanced booking interfaces
interface CreateBookingRequest {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicle: string;
  carVariantId?: string;
  dealerId?: string;
  advisorId?: string;
  bookingDate?: string;
  enquiryId?: string;
  metadata?: any;
}

interface UpdateBookingRequest {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicle?: string;
  status?: BookingStatus;
  advisorId?: string;
  bookingDate?: string;
  metadata?: any;
}

interface AssignAdvisorRequest {
  advisorId: string;
  reason?: string;
}

interface UpdateStatusRequest {
  status: BookingStatus;
  reason?: string;
  notes?: string;
}

// =============================================================================
// ADMIN ENDPOINTS - Bulk Import Management
// =============================================================================

export const uploadImportFile = [
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const importSettings = req.body.importSettings ? JSON.parse(req.body.importSettings) : {};

    // Validate file type and size
    const fileType = BookingImportService.getFileType(originalname);
    if (fileType === 'unsupported') {
      fs.unlinkSync(filePath); // Clean up
      throw createError('Unsupported file type. Only CSV and Excel files are allowed.', 400);
    }

    if (!BookingImportService.validateFileSize(filePath)) {
      fs.unlinkSync(filePath); // Clean up
      throw createError('File size exceeds maximum limit of 10MB', 400);
    }

    // Create import record
    const importRecord = await prisma.bookingImport.create({
      data: {
        adminId: user.firebaseUid,
        filename,
        originalFilename: originalname,
        fileSize: BigInt(size),
        status: ImportStatus.PENDING,
        importSettings
      }
    });

    // Queue processing job
    const jobId = await BookingImportProcessor.addImportJob(
      importRecord.id,
      filePath,
      user.firebaseUid,
      importSettings
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully and queued for processing',
      data: {
        importId: importRecord.id,
        jobId,
        filename: originalname,
        fileSize: size,
        status: importRecord.status
      }
    });
  })
];

export const previewImportFile = [
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { originalname, path: filePath } = req.file;

    try {
      const fileType = BookingImportService.getFileType(originalname);
      let parseResult;

      if (fileType === 'csv') {
        parseResult = await BookingImportService.parseCSV(filePath);
      } else if (fileType === 'xlsx') {
        parseResult = await BookingImportService.parseExcel(filePath);
      } else {
        throw createError('Unsupported file type', 400);
      }

      // Return first 100 rows for preview
      const preview = {
        totalRows: parseResult.totalRows,
        previewRows: parseResult.validRows.slice(0, 100),
        errors: parseResult.errors.slice(0, 50), // Show first 50 errors
        hasMoreErrors: parseResult.errors.length > 50,
        summary: {
          validRows: parseResult.validRows.length,
          errorRows: parseResult.errors.length,
          successRate: parseResult.totalRows > 0 ? 
            Math.round((parseResult.validRows.length / parseResult.totalRows) * 100) : 0
        }
      };

      res.json({
        success: true,
        message: 'File preview generated successfully',
        data: preview
      });

    } finally {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  })
];

export const getImportHistory = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as ImportStatus;

  const skip = (page - 1) * limit;
  const where: any = {};

  // Filter by status if provided
  if (status) {
    where.status = status;
  }

  // Admins can see all imports, others only their own
  if (user.role.name !== 'ADMIN') {
    where.adminId = user.firebaseUid;
  }

  const [imports, total] = await Promise.all([
    prisma.bookingImport.findMany({
      where,
      skip,
      take: limit,
      include: {
        admin: {
          select: {
            firebaseUid: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bookingImport.count({ where })
  ]);

  // Convert BigInt to Number for JSON serialization
  const serializedImports = imports.map(imp => ({
    ...imp,
    fileSize: imp.fileSize ? Number(imp.fileSize) : 0
  }));

  res.json({
    success: true,
    message: 'Import history retrieved successfully',
    data: {
      imports: serializedImports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getImportById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;

  const where: any = { id };
  if (user.role.name !== 'ADMIN') {
    where.adminId = user.firebaseUid;
  }

  const importRecord = await prisma.bookingImport.findFirst({
    where,
    include: {
      admin: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      errors: {
        take: 100, // Limit errors for performance
        orderBy: { rowNumber: 'asc' }
      }
    }
  });

  if (!importRecord) {
    throw createError('Import record not found', 404);
  }

  // Convert BigInt to Number for JSON serialization
  const serializedImport = {
    ...importRecord,
    fileSize: importRecord.fileSize ? Number(importRecord.fileSize) : 0
  };

  res.json({
    success: true,
    message: 'Import details retrieved successfully',
    data: { import: serializedImport }
  });
});

export const downloadImportErrors = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;

  const where: any = { id };
  if (user.role.name !== 'ADMIN') {
    where.adminId = user.firebaseUid;
  }

  const importRecord = await prisma.bookingImport.findFirst({
    where,
    include: {
      errors: {
        orderBy: { rowNumber: 'asc' }
      }
    }
  });

  if (!importRecord) {
    throw createError('Import record not found', 404);
  }

  if (importRecord.errors.length === 0) {
    throw createError('No errors found for this import', 404);
  }

  // Generate CSV content
  const csvHeader = 'Row Number,Error Type,Error Message,Raw Data\n';
  const csvRows = importRecord.errors.map(error => {
    const rawData = JSON.stringify(error.rawRow).replace(/"/g, '""');
    const errorMessage = error.errorMessage.replace(/"/g, '""');
    return `${error.rowNumber},"${error.errorType || 'unknown'}","${errorMessage}","${rawData}"`;
  }).join('\n');

  const csvContent = csvHeader + csvRows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="import-${id}-errors.csv"`);
  res.send(csvContent);
});

// =============================================================================
// ADMIN ENDPOINTS - Single Booking Management
// =============================================================================

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const {
    customerName,
    customerPhone,
    customerEmail,
    vehicle,
    carVariantId,
    dealerId,
    advisorId,
    bookingDate,
    enquiryId,
    metadata
  }: CreateBookingRequest = req.body;

  if (!customerName || !vehicle) {
    throw createError('Customer name and vehicle are required', 400);
  }

  // Validate enquiry exists if provided
  if (enquiryId) {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId }
    });
    if (!enquiry) {
      throw createError('Enquiry not found', 404);
    }
  }

  // Validate dealer exists if provided
  if (dealerId) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId }
    });
    if (!dealer) {
      throw createError('Dealer not found', 404);
    }
  }

  // Validate advisor exists if provided
  if (advisorId) {
    const advisor = await prisma.user.findFirst({
      where: {
        firebaseUid: advisorId,
        role: { name: RoleName.CUSTOMER_ADVISOR }
      }
    });
    if (!advisor) {
      throw createError('Advisor not found', 404);
    }
  }

  const booking = await prisma.booking.create({
    data: {
      // Customer Information
      customerName,
      customerEmail,
      
      // Universal Dealer Fields (required)
      dealerCode: dealerId ? `DEALER_${dealerId.slice(-3)}` : 'MANUAL', // Generate dealer code
      
      // System Fields
      dealerId,
      advisorId,
      bookingDate: bookingDate ? new Date(bookingDate) : null,
      enquiryId,
      source: BookingSource.MANUAL,
      metadata: metadata || {}
    },
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
  await BookingImportProcessor.createAuditLog(
    booking.id,
    user.firebaseUid,
    'created',
    undefined,
    booking,
    'Manual creation by admin',
    req.ip,
    req.get('User-Agent')
  );

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: { booking }
  });
});

export const assignAdvisor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;
  const { advisorId, reason }: AssignAdvisorRequest = req.body;

  if (!advisorId) {
    throw createError('Advisor ID is required', 400);
  }

  // Get existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });

  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }

  // Validate advisor
  const advisor = await prisma.user.findFirst({
    where: {
      firebaseUid: advisorId,
      role: { name: RoleName.CUSTOMER_ADVISOR }
    }
  });

  if (!advisor) {
    throw createError('Advisor not found', 404);
  }

  // Update booking
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      advisorId,
      status: BookingStatus.IN_PROGRESS
    },
    include: {
      enquiry: {
        select: {
          id: true,
          customerName: true,
        }
      }
    }
  });

  // Create audit log
  await BookingImportProcessor.createAuditLog(
    booking.id,
    user.firebaseUid,
    'advisor_assigned',
    { advisorId: existingBooking.advisorId },
    { advisorId },
    reason,
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    message: 'Advisor assigned successfully',
    data: { booking }
  });
});

// =============================================================================
// ADVISOR ENDPOINTS - Mobile App Support
// =============================================================================

export const getAdvisorBookings = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as BookingStatus;

  const skip = (page - 1) * limit;
  const where: any = { advisorId: user.firebaseUid };
  
  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      include: {
        dealer: {
          select: {
            id: true,
            dealerName: true,
            dealerCode: true,
            location: true
          }
        },
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.booking.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Advisor bookings retrieved successfully',
    data: {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;
  const { status, reason, notes }: UpdateStatusRequest = req.body;

  if (!status) {
    throw createError('Status is required', 400);
  }

  // Get existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });

  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }

  // Check if advisor owns this booking or is admin/manager
  if (user.role.name === RoleName.CUSTOMER_ADVISOR && existingBooking.advisorId !== user.firebaseUid) {
    throw createError('You can only update bookings assigned to you', 403);
  }

  // Update booking
  const updatedData: any = { status };
  if (notes) {
    updatedData.metadata = {
      ...existingBooking.metadata as any,
      notes: Array.isArray((existingBooking.metadata as any)?.notes) 
        ? [...(existingBooking.metadata as any).notes, { date: new Date(), note: notes, by: user.name }]
        : [{ date: new Date(), note: notes, by: user.name }]
    };
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: updatedData,
    include: {
      enquiry: {
        select: {
          id: true,
          customerName: true,
        }
      },
      dealer: {
        select: {
          id: true,
          dealerName: true,
          dealerCode: true
        }
      }
    }
  });

  // Create audit log
  await BookingImportProcessor.createAuditLog(
    booking.id,
    user.firebaseUid,
    'status_updated',
    { status: existingBooking.status },
    { status },
    reason,
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    message: 'Booking status updated successfully',
    data: { booking }
  });
});

// =============================================================================
// GENERAL ENDPOINTS - Enhanced functionality
// =============================================================================

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as BookingStatus;
  const advisorId = req.query.advisorId as string;
  const dealerId = req.query.dealerId as string;
  const source = req.query.source as BookingSource;

  const skip = (page - 1) * limit;
  const where: any = {};
  
  if (status) where.status = status;
  if (advisorId) where.advisorId = advisorId;
  if (dealerId) where.dealerId = dealerId;
  if (source) where.source = source;

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
        dealer: {
          select: {
            id: true,
            dealerName: true,
            dealerCode: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.booking.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Bookings retrieved successfully',
    data: {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      enquiry: {
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
      },
      dealer: {
        select: {
          id: true,
          dealerName: true,
          dealerCode: true,
          location: true
        }
      }
    }
  });

  if (!booking) {
    throw createError('Booking not found', 404);
  }

  res.json({
    success: true,
    message: 'Booking retrieved successfully',
    data: { booking }
  });
});

export const getBookingAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id }
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
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    message: 'Booking audit log retrieved successfully',
    data: { auditLogs }
  });
});

export const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;
  const updateData: UpdateBookingRequest = req.body;

  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });

  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      ...updateData,
      bookingDate: updateData.bookingDate ? new Date(updateData.bookingDate) : undefined
    },
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
      dealer: {
        select: {
          id: true,
          dealerName: true,
          dealerCode: true
        }
      }
    }
  });

  // Create audit log
  await BookingImportProcessor.createAuditLog(
    booking.id,
    user.firebaseUid,
    'updated',
    existingBooking,
    updateData,
    'Manual update',
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    message: 'Booking updated successfully',
    data: { booking }
  });
});

export const deleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;

  const booking = await prisma.booking.findUnique({
    where: { id }
  });

  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Create audit log before deletion
  await BookingImportProcessor.createAuditLog(
    booking.id,
    user.firebaseUid,
    'deleted',
    booking,
    undefined,
    'Manual deletion',
    req.ip,
    req.get('User-Agent')
  );

  await prisma.booking.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Booking deleted successfully'
  });
});

// Export multer upload middleware for use in routes
export { upload };

