import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { asyncHandler, createError } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ImportStatus, Prisma } from '@prisma/client';
import { EnquiryImportService } from '../services/enquiry-import.service';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `enquiry-import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
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

const parseImportFile = async (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    return EnquiryImportService.parseCSV(filePath);
  }
  return EnquiryImportService.parseExcel(filePath);
};

export const previewEnquiryImportFile = [
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    if (!EnquiryImportService.validateFileSize(req.file.path)) {
      fs.unlinkSync(req.file.path);
      throw createError('File size exceeds maximum limit of 10MB', 400);
    }

    try {
      const preview = await parseImportFile(req.file.path);
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'File parsed successfully',
        data: preview
      });
    } catch (error: any) {
      fs.unlinkSync(req.file.path);
      throw createError(error.message || 'Failed to parse import file', 400);
    }
  })
];

export const uploadEnquiryImportFile = [
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    if (!user.dealershipId) {
      fs.unlinkSync(req.file.path);
      throw createError('User must belong to a dealership to perform imports', 403);
    }

    if (!EnquiryImportService.validateFileSize(req.file.path)) {
      fs.unlinkSync(req.file.path);
      throw createError('File size exceeds maximum limit of 10MB', 400);
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const importSettings = req.body.importSettings ? JSON.parse(req.body.importSettings) : {};

    const importRecord = await prisma.enquiryImport.create({
      data: {
        adminId: user.firebaseUid,
        filename,
        originalFilename: originalname,
        fileSize: BigInt(size),
        status: ImportStatus.PENDING,
        importSettings
      }
    });

    try {
      const parsed = await parseImportFile(filePath);

      const serializedParseErrors = JSON.parse(JSON.stringify(parsed.errors)) as Prisma.InputJsonValue;

      await prisma.enquiryImport.update({
        where: { id: importRecord.id },
        data: {
          totalRows: parsed.totalRows,
          processedRows: parsed.totalRows,
          successfulRows: parsed.validRows.length,
          failedRows: parsed.errors.length,
          errorSummary: serializedParseErrors,
          status: ImportStatus.PROCESSING,
          startedAt: new Date()
        }
      });

      const { successful, failed, errors } = await EnquiryImportService.processBatch(
        parsed.validRows,
        importRecord.id,
        user.firebaseUid,
        user.dealershipId
      );

      const combinedErrors = JSON.parse(JSON.stringify([...parsed.errors, ...errors])) as Prisma.InputJsonValue;

      await prisma.enquiryImport.update({
        where: { id: importRecord.id },
        data: {
          successfulRows: successful,
          failedRows: failed + parsed.errors.length,
          processedRows: parsed.totalRows,
          status: failed + parsed.errors.length > 0 ? ImportStatus.COMPLETED : ImportStatus.COMPLETED,
          completedAt: new Date(),
          errorSummary: combinedErrors
        }
      });

      res.status(201).json({
        success: true,
        message: 'Enquiry import processed successfully',
        data: {
          importId: importRecord.id,
          summary: {
            totalRows: parsed.totalRows,
            processedRows: parsed.totalRows,
            successfulRows: successful,
            failedRows: failed + parsed.errors.length
          }
        }
      });
    } catch (error: any) {
      await prisma.enquiryImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.FAILED,
          errorSummary: (() => {
            const existing = (importRecord.errorSummary ?? []) as Prisma.InputJsonValue;
            const normalized = Array.isArray(existing) ? existing : [];
            const next = [
              ...JSON.parse(JSON.stringify(normalized)),
              { message: error.message || 'Import failed' }
            ];
            return next as Prisma.InputJsonValue;
          })(),
          completedAt: new Date()
        }
      });
      throw createError(error.message || 'Failed to process import file', 500);
    } finally {
      fs.unlinkSync(filePath);
    }
  })
];

export const getEnquiryImports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [imports, total] = await Promise.all([
    prisma.enquiryImport.findMany({
      where: {
        adminId: user.firebaseUid
      },
      include: {
        admin: {
          select: {
            firebaseUid: true,
            name: true,
            email: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.enquiryImport.count({
      where: {
        adminId: user.firebaseUid
      }
    })
  ]);

  res.json({
    success: true,
    message: 'Enquiry imports retrieved successfully',
    data: {
      imports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getEnquiryImportById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const importRecord = await prisma.enquiryImport.findFirst({
    where: {
      id,
      adminId: user.firebaseUid
    },
    include: {
      admin: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      errors: {
        take: 100,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!importRecord) {
    throw createError('Import not found', 404);
  }

  res.json({
    success: true,
    message: 'Enquiry import retrieved successfully',
    data: { import: importRecord }
  });
});

export const downloadEnquiryImportErrors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const importRecord = await prisma.enquiryImport.findFirst({
    where: {
      id,
      adminId: user.firebaseUid
    },
    include: {
      errors: true
    }
  });

  if (!importRecord) {
    throw createError('Import not found', 404);
  }

  const rows = importRecord.errors.map(error => ({
    rowNumber: error.rowNumber,
    errorMessage: error.errorMessage,
    rawRow: JSON.stringify(error.rawRow)
  }));

  const csvContent = [
    'rowNumber,errorMessage,rawRow',
    ...rows.map(row => `${row.rowNumber},"${row.errorMessage.replace(/"/g, '""')}","${row.rawRow.replace(/"/g, '""')}"`)
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="enquiry_import_errors_${id}.csv"`);
  res.send(csvContent);
});

