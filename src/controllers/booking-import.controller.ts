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

    // Get admin's dealership ID for multi-tenant isolation
    const admin = await prisma.user.findUnique({
      where: { firebaseUid: user.firebaseUid },
      select: { dealershipId: true }
    });
    
    if (!admin?.dealershipId) {
      fs.unlinkSync(filePath); // Clean up
      throw createError('Admin must be assigned to a dealership to import bookings', 400);
    }

    // Create import record
    const importRecord = await prisma.bookingImport.create({
      data: {
        adminId: user.firebaseUid,
        filename,
        originalFilename: originalname,
        fileSize: BigInt(size),
        status: ImportStatus.PROCESSING,
        importSettings,
        startedAt: new Date()
      }
    });

    try {
      // Parse file synchronously
      let parseResult;
      if (fileType === 'csv') {
        parseResult = await BookingImportService.parseCSV(filePath);
      } else if (fileType === 'xlsx') {
        parseResult = await BookingImportService.parseExcel(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Update import with parsing results
      await prisma.bookingImport.update({
        where: { id: importRecord.id },
        data: {
          totalRows: parseResult.totalRows,
          processedRows: parseResult.totalRows
        }
      });

      // Log parsing errors
      if (parseResult.errors.length > 0) {
        await prisma.bookingImportError.createMany({
          data: parseResult.errors.map(error => ({
            importId: importRecord.id,
            rowNumber: error.rowNumber,
            rawRow: error.value as any,
            errorMessage: error.message,
            errorType: 'validation_error',
            fieldErrors: { field: error.field, value: error.value } as any
          }))
        });
      }

      // Process valid rows in batches
      const validRows = parseResult.validRows;
      let totalSuccessful = 0;
      let totalFailed = parseResult.errors.length;

      for (let i = 0; i < validRows.length; i += 500) {
        const batch = validRows.slice(i, i + 500);
        const batchResult = await BookingImportService.processBatch(
          batch,
      importRecord.id,
          i,
          admin.dealershipId
        );
        
        totalSuccessful += batchResult.successful;
        totalFailed += batchResult.failed;

        // Update progress
        await prisma.bookingImport.update({
          where: { id: importRecord.id },
          data: {
            processedRows: i + batch.length,
            successfulRows: totalSuccessful,
            failedRows: totalFailed
          }
        });
      }

      // Generate error summary
      const errors = await prisma.bookingImportError.findMany({
        where: { importId: importRecord.id },
        select: {
          errorType: true,
          fieldErrors: true
        }
      });

      const errorSummary: any = {
        total_errors: totalFailed,
        error_types: {} as any,
        field_errors: {} as any
      };

      errors.forEach(error => {
        const errorType = error.errorType || 'processing_error';
        errorSummary.error_types[errorType] = (errorSummary.error_types[errorType] || 0) + 1;
      });

      // Complete import
      await prisma.bookingImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.COMPLETED,
          completedAt: new Date(),
          totalRows: parseResult.totalRows,
          processedRows: validRows.length,
          successfulRows: totalSuccessful,
          failedRows: totalFailed,
          errorSummary: errorSummary as any
        }
      });

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

    res.status(201).json({
      success: true,
        message: 'File uploaded and processed successfully',
      data: {
        importId: importRecord.id,
        filename: originalname,
        fileSize: size,
          status: ImportStatus.COMPLETED,
          totalRows: parseResult.totalRows,
          successfulRows: totalSuccessful,
          failedRows: totalFailed,
          errors: []
        }
      });
    } catch (error: any) {
      // Update import status to failed
      await prisma.bookingImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.FAILED,
          completedAt: new Date()
      }
    });

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.error('Import processing error:', error);
      throw createError(
        error.message || 'Failed to process import file',
        500
      );
    }
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
      metadata: metadata || {},
      dealershipId: user.dealershipId  // CRITICAL: Assign to user's dealership
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

// 🆕 Bulk assign multiple bookings to an advisor
export const bulkAssignAdvisor = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { bookingIds, advisorId, reason } = req.body;

  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw createError('Booking IDs array is required', 400);
  }

  if (!advisorId) {
    throw createError('Advisor ID is required', 400);
  }

  // Validate advisor
  const advisor = await prisma.user.findFirst({
    where: {
      firebaseUid: advisorId,
      role: { name: RoleName.CUSTOMER_ADVISOR }
    },
    include: { role: true }
  });

  if (!advisor) {
    throw createError('Advisor not found or not a Customer Advisor', 404);
  }

  // Get existing bookings to validate and create audit logs
  const existingBookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } }
  });

  if (existingBookings.length !== bookingIds.length) {
    throw createError('Some bookings were not found', 404);
  }

  // Bulk update bookings
  const updateResult = await prisma.booking.updateMany({
    where: { id: { in: bookingIds } },
    data: {
      advisorId,
      status: BookingStatus.IN_PROGRESS
    }
  });

  // Create audit logs for each booking
  const auditLogPromises = existingBookings.map(booking =>
    BookingImportProcessor.createAuditLog(
      booking.id,
      user.firebaseUid,
      'advisor_assigned',
      { advisorId: booking.advisorId },
      { advisorId },
      reason || `Bulk assigned to ${advisor.name}`,
      req.ip,
      req.get('User-Agent')
    )
  );

  await Promise.all(auditLogPromises);

  res.json({
    success: true,
    message: `Successfully assigned ${updateResult.count} booking(s) to ${advisor.name}`,
    data: {
      assignedCount: updateResult.count,
      advisorId,
      advisorName: advisor.name,
      bookingIds
    }
  });
});

// 🆕 Unassign advisor from booking
export const unassignAdvisor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;
  const { reason } = req.body;

  // Get existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });

  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }

  if (!existingBooking.advisorId) {
    throw createError('Booking is already unassigned', 400);
  }

  // Update booking
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      advisorId: null,
      status: BookingStatus.PENDING
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
    'advisor_unassigned',
    { advisorId: existingBooking.advisorId },
    { advisorId: null },
    reason || 'Advisor unassigned',
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    message: 'Advisor unassigned successfully',
    data: { booking }
  });
});

// 🆕 Auto-assign bookings using different strategies
export const autoAssignBookings = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { bookingIds, strategy = 'ROUND_ROBIN', dealershipId } = req.body;

  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw createError('Booking IDs array is required', 400);
  }

  const validStrategies = ['ROUND_ROBIN', 'LEAST_LOAD', 'RANDOM'];
  if (!validStrategies.includes(strategy)) {
    throw createError(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`, 400);
  }

  // Get all active advisors in the dealership
  const where: any = {
    role: { name: RoleName.CUSTOMER_ADVISOR },
    isActive: true
  };

  if (dealershipId) {
    where.dealershipId = dealershipId;
  }

  const advisors = await prisma.user.findMany({
    where,
    select: {
      firebaseUid: true,
      name: true,
      email: true,
      _count: {
        select: {
          advisorBookings: {
            where: {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.IN_PROGRESS, BookingStatus.CONFIRMED]
              }
            }
          }
        }
      }
    }
  });

  if (advisors.length === 0) {
    throw createError('No active advisors available for assignment', 400);
  }

  // Get bookings to assign
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } }
  });

  if (bookings.length === 0) {
    throw createError('No bookings found', 404);
  }

  // Assignment logic based on strategy
  let assignments: { bookingId: string; advisorId: string; advisorName: string }[] = [];

  switch (strategy) {
    case 'ROUND_ROBIN':
      // Distribute evenly across all advisors
      bookings.forEach((booking, index) => {
        const advisor = advisors[index % advisors.length];
        assignments.push({
          bookingId: booking.id,
          advisorId: advisor.firebaseUid,
          advisorName: advisor.name
        });
      });
      break;

    case 'LEAST_LOAD':
      // Sort advisors by current booking count (ascending)
      const sortedAdvisors = [...advisors].sort((a, b) => 
        a._count.advisorBookings - b._count.advisorBookings
      );
      
      bookings.forEach((booking) => {
        // Assign to advisor with least bookings
        const advisor = sortedAdvisors[0];
        assignments.push({
          bookingId: booking.id,
          advisorId: advisor.firebaseUid,
          advisorName: advisor.name
        });
        
        // Increment count and re-sort
        advisor._count.advisorBookings++;
        sortedAdvisors.sort((a, b) => 
          a._count.advisorBookings - b._count.advisorBookings
        );
      });
      break;

    case 'RANDOM':
      // Random assignment
      bookings.forEach((booking) => {
        const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];
        assignments.push({
          bookingId: booking.id,
          advisorId: randomAdvisor.firebaseUid,
          advisorName: randomAdvisor.name
        });
      });
      break;
  }

  // Execute assignments
  const updatePromises = assignments.map(assignment =>
    prisma.booking.update({
      where: { id: assignment.bookingId },
      data: {
        advisorId: assignment.advisorId,
        status: BookingStatus.IN_PROGRESS
      }
    })
  );

  await Promise.all(updatePromises);

  // Create audit logs
  const auditLogPromises = assignments.map(assignment =>
    BookingImportProcessor.createAuditLog(
      assignment.bookingId,
      user.firebaseUid,
      'advisor_auto_assigned',
      { advisorId: null },
      { advisorId: assignment.advisorId },
      `Auto-assigned using ${strategy} strategy`,
      req.ip,
      req.get('User-Agent')
    )
  );

  await Promise.all(auditLogPromises);

  // Group by advisor for summary
  const summary = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.advisorId]) {
      acc[assignment.advisorId] = {
        advisorName: assignment.advisorName,
        count: 0
      };
    }
    acc[assignment.advisorId].count++;
    return acc;
  }, {} as Record<string, { advisorName: string; count: number }>);

  res.json({
    success: true,
    message: `Successfully auto-assigned ${bookings.length} booking(s) using ${strategy} strategy`,
    data: {
      strategy,
      totalAssigned: bookings.length,
      summary: Object.entries(summary).map(([advisorId, data]) => ({
        advisorId,
        advisorName: data.advisorName,
        assignedCount: data.count
      })),
      assignments
    }
  });
});

// 🆕 Generate Excel template with advisor IDs pre-filled
export const generateExcelTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { includeAdvisors = true, sampleRows = 5 } = req.query;

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bookings Template');

  // Define columns
  const columns = [
    { header: 'Customer Name *', key: 'customer_name', width: 25 },
    { header: 'Customer Phone *', key: 'customer_phone', width: 20 },
    { header: 'Customer Email', key: 'customer_email', width: 30 },
    { header: 'Variant *', key: 'variant', width: 30 },
    { header: 'VC Code', key: 'vc_code', width: 15 },
    { header: 'Color', key: 'color', width: 20 },
    { header: 'Fuel Type', key: 'fuel_type', width: 15 },
    { header: 'Transmission', key: 'transmission', width: 15 },
  ];

  // Add advisor_id column if requested
  if (includeAdvisors === 'true') {
    columns.push({ header: 'Advisor ID (Firebase UID)', key: 'advisor_id', width: 35 });
    columns.push({ header: 'Advisor Email', key: 'advisor_email', width: 30 });
  }

  columns.push(
    { header: 'Booking Date (YYYY-MM-DD)', key: 'booking_date', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Finance Required (Yes/No)', key: 'finance_required', width: 20 },
    { header: 'Remarks', key: 'remarks', width: 40 }
  );

  worksheet.columns = columns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Get advisors if requested
  let advisors: any[] = [];
  if (includeAdvisors === 'true') {
    advisors = await prisma.user.findMany({
      where: {
        role: { name: RoleName.CUSTOMER_ADVISOR },
        isActive: true,
        dealershipId: user.dealershipId // Only advisors from same dealership
      },
      select: {
        firebaseUid: true,
        email: true,
        name: true,
        employeeId: true
      }
    });
  }

  // Add sample rows
  const sampleRowCount = Math.min(parseInt(sampleRows as string) || 5, 10);
  const sampleData = [
    { name: 'John Doe', phone: '+91 9876543210', email: 'john@example.com', variant: 'Tata Nexon XZ+', color: 'Pearl White', fuel: 'Petrol', transmission: 'Manual' },
    { name: 'Jane Smith', phone: '+91 9876543211', email: 'jane@example.com', variant: 'Tata Safari XZ', color: 'Royale Blue', fuel: 'Diesel', transmission: 'Automatic' },
    { name: 'Bob Johnson', phone: '+91 9876543212', email: 'bob@example.com', variant: 'Tata Harrier XZ Plus', color: 'Daytona Grey', fuel: 'Diesel', transmission: 'Automatic' },
    { name: 'Alice Williams', phone: '+91 9876543213', email: 'alice@example.com', variant: 'Tata Punch Adventure', color: 'Flame Red', fuel: 'Petrol', transmission: 'AMT' },
    { name: 'Charlie Brown', phone: '+91 9876543214', email: 'charlie@example.com', variant: 'Tata Altroz XT', color: 'Mystic Gold', fuel: 'Petrol', transmission: 'Manual' },
  ];

  for (let i = 0; i < sampleRowCount; i++) {
    const sample = sampleData[i % sampleData.length];
    const row: any = {
      customer_name: sample.name,
      customer_phone: sample.phone,
      customer_email: sample.email,
      variant: sample.variant,
      vc_code: '',
      color: sample.color,
      fuel_type: sample.fuel,
      transmission: sample.transmission,
      booking_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      finance_required: i % 2 === 0 ? 'Yes' : 'No',
      remarks: 'Sample booking for testing'
    };

    // Assign advisor in round-robin fashion
    if (includeAdvisors === 'true' && advisors.length > 0) {
      const advisor = advisors[i % advisors.length];
      row.advisor_id = advisor.firebaseUid;
      row.advisor_email = advisor.email;
    }

    worksheet.addRow(row);
  }

  // Add alternating row colors
  worksheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }
  });

  // Add data validation for status column
  const statusCol = worksheet.getColumn('status');
  statusCol.eachCell({ includeEmpty: true }, (cell: any, rowNumber: number) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"PENDING,IN_PROGRESS,CONFIRMED,DELIVERED,CANCELLED"']
      };
    }
  });

  // Add auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  // Add instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Description', key: 'description', width: 60 }
  ];

  const instructions = [
    { field: 'Customer Name', required: 'Yes', description: 'Full name of the customer' },
    { field: 'Customer Phone', required: 'Yes', description: 'Phone number with country code (e.g., +91 9876543210)' },
    { field: 'Customer Email', required: 'No', description: 'Customer email address' },
    { field: 'Variant', required: 'Yes', description: 'Vehicle variant (e.g., Tata Nexon XZ+)' },
    { field: 'VC Code', required: 'No', description: 'Vehicle catalog code' },
    { field: 'Color', required: 'No', description: 'Vehicle color preference' },
    { field: 'Fuel Type', required: 'No', description: 'Petrol, Diesel, Electric, CNG' },
    { field: 'Transmission', required: 'No', description: 'Manual, Automatic, AMT' },
    { field: 'Advisor ID', required: 'No', description: 'Firebase UID of the advisor to assign (leave empty for unassigned)' },
    { field: 'Advisor Email', required: 'No', description: 'For reference only - actual assignment uses Advisor ID' },
    { field: 'Booking Date', required: 'No', description: 'Booking date in YYYY-MM-DD format' },
    { field: 'Status', required: 'No', description: 'PENDING, IN_PROGRESS, CONFIRMED, DELIVERED, CANCELLED' },
    { field: 'Finance Required', required: 'No', description: 'Yes or No' },
    { field: 'Remarks', required: 'No', description: 'Any additional notes' }
  ];

  instructionsSheet.getRow(1).font = { bold: true };
  instructions.forEach(inst => instructionsSheet.addRow(inst));

  // Add advisor list sheet if advisors are included
  if (includeAdvisors === 'true' && advisors.length > 0) {
    const advisorSheet = workbook.addWorksheet('Advisor List');
    advisorSheet.columns = [
      { header: 'Advisor Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Firebase UID (Use this for Advisor ID)', key: 'firebaseUid', width: 35 }
    ];

    advisorSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    advisorSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };

    advisors.forEach(advisor => {
      advisorSheet.addRow({
        name: advisor.name,
        email: advisor.email,
        employeeId: advisor.employeeId,
        firebaseUid: advisor.firebaseUid
      });
    });
  }

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=booking-template-${Date.now()}.xlsx`);
  res.send(buffer);
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

