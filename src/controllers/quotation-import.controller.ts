import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';
import { QuotationImportService } from '../services/quotation-import.service';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'quotation-imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `quotation-import-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// Upload and process quotation CSV file
export const uploadQuotationImportFile = [
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;

    // Only ADMIN can import quotations
    if (user.role.name !== RoleName.ADMIN) {
      throw createError('Only admins can import quotation files', 403);
    }

    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { originalname, filename, path: filePath, size } = req.file;

    // Validate file type
    const fileType = QuotationImportService.getFileType(filePath);
    if (fileType !== 'csv' && fileType !== 'xlsx') {
      fs.unlinkSync(filePath); // Clean up
      throw createError('Unsupported file type. Only CSV and Excel files are allowed.', 400);
    }

    try {
      // Parse file based on type
      let parseResult;
      if (fileType === 'csv') {
        parseResult = await QuotationImportService.parseCSV(filePath);
      } else if (fileType === 'xlsx') {
        parseResult = await QuotationImportService.parseExcel(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Get admin's dealership ID
      const admin = await prisma.user.findUnique({
        where: { firebaseUid: user.firebaseUid },
        select: { dealershipId: true }
      });

      if (!admin?.dealershipId) {
        throw createError('Admin must be assigned to a dealership to import quotations', 400);
      }

      // Process valid rows in batches
      const validRows = parseResult.validRows;
      let totalSuccessful = 0;
      let totalFailed = parseResult.errors.length;

      for (let i = 0; i < validRows.length; i += QuotationImportService['BATCH_SIZE']) {
        const batch = validRows.slice(i, i + QuotationImportService['BATCH_SIZE']);
        const batchResult = await QuotationImportService.processBatch(
          batch,
          user.firebaseUid,
          admin.dealershipId
        );

        totalSuccessful += batchResult.successful;
        totalFailed += batchResult.failed;
      }

      res.status(201).json({
        success: true,
        message: 'Quotation file uploaded and processed successfully',
        data: {
          summary: {
            totalRows: parseResult.totalRows,
            processedRows: validRows.length,
            successfulRows: totalSuccessful,
            failedRows: totalFailed
          },
          errors: parseResult.errors.slice(0, 10) // Return first 10 errors
        }
      });

    } catch (error: any) {
      console.error('Error processing quotation import file:', error);
      fs.unlinkSync(filePath); // Clean up
      throw createError(`Failed to process quotation import file: ${error.message}`, 500);
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  })
];

