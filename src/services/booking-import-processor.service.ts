import { Job } from 'bull';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { BookingImportJobData, bookingImportQueue } from './queue.service';
import BookingImportService from './booking-import.service';
import { ImportStatus } from '@prisma/client';

export class BookingImportProcessor {
  private static readonly BATCH_SIZE = 500;

  // Initialize job processor
  static initialize() {
    bookingImportQueue.process(this.processImportJob.bind(this));
    console.log('✅ Booking import queue processor initialized');
  }

  // Main job processor
  static async processImportJob(job: any) {
    const { importId, filePath, adminId, importSettings } = job.data;
    
    console.log(`Processing import job ${job.id} for import ${importId}`);

    try {
      // Update import status to processing
      await prisma.bookingImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.PROCESSING,
          startedAt: new Date()
        }
      });

      // Update job progress
      await job.updateProgress(10);

      // Parse file based on type
      const fileType = BookingImportService.getFileType(filePath);
      let parseResult;

      if (fileType === 'csv') {
        parseResult = await BookingImportService.parseCSV(filePath);
      } else if (fileType === 'xlsx') {
        parseResult = await BookingImportService.parseExcel(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      await job.updateProgress(30);

      // Log parsing errors
      if (parseResult.errors.length > 0) {
        await this.logParsingErrors(importId, parseResult.errors);
      }

      await job.updateProgress(40);

      // Process valid rows in batches
      const validRows = parseResult.validRows;
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = parseResult.errors.length;

      for (let i = 0; i < validRows.length; i += this.BATCH_SIZE) {
        const batch = validRows.slice(i, i + this.BATCH_SIZE);
        const batchResult = await BookingImportService.processBatch(batch, importId, i);
        
        totalProcessed += batch.length;
        totalSuccessful += batchResult.successful;
        totalFailed += batchResult.failed;

        // Update progress
        const progressPercent = 40 + Math.floor((totalProcessed / validRows.length) * 50);
        await job.updateProgress(progressPercent);

        // Update import progress in database
        await prisma.bookingImport.update({
          where: { id: importId },
          data: {
            processedRows: totalProcessed,
            successfulRows: totalSuccessful,
            failedRows: totalFailed
          }
        });
      }

      // Generate error summary
      const errorSummary = await this.generateErrorSummary(importId);

      // Complete import
      await prisma.bookingImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.COMPLETED,
          completedAt: new Date(),
          totalRows: parseResult.totalRows,
          processedRows: validRows.length,
          successfulRows: totalSuccessful,
          failedRows: totalFailed,
          errorSummary
        }
      });

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await job.updateProgress(100);

      return {
        importId,
        totalRows: parseResult.totalRows,
        successful: totalSuccessful,
        failed: totalFailed,
        status: 'completed'
      };

    } catch (error) {
      console.error(`Import job ${job.id} failed:`, error);

      // Mark import as failed
      await prisma.bookingImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.FAILED,
          completedAt: new Date(),
          errorSummary: {
            general_error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }
      });

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }

  // Log parsing errors to database
  private static async logParsingErrors(importId: string, errors: any[]) {
    const errorRecords = errors.map(error => ({
      importId,
      rowNumber: error.rowNumber,
      rawRow: { [error.field]: error.value },
      errorMessage: error.message,
      errorType: 'validation_error',
      fieldErrors: { [error.field]: error.message }
    }));

    // Insert errors in batches
    for (let i = 0; i < errorRecords.length; i += 100) {
      const batch = errorRecords.slice(i, i + 100);
      await prisma.bookingImportError.createMany({
        data: batch
      });
    }
  }

  // Generate error summary for reporting
  private static async generateErrorSummary(importId: string) {
    const errors = await prisma.bookingImportError.findMany({
      where: { importId }
    });

    const summary: any = {
      total_errors: errors.length,
      error_types: {},
      field_errors: {}
    };

    errors.forEach(error => {
      // Count by error type
      if (error.errorType) {
        summary.error_types[error.errorType] = (summary.error_types[error.errorType] || 0) + 1;
      }

      // Count by field if field errors exist
      if (error.fieldErrors) {
        const fieldErrors = error.fieldErrors as any;
        Object.keys(fieldErrors).forEach(field => {
          summary.field_errors[field] = (summary.field_errors[field] || 0) + 1;
        });
      }
    });

    return summary;
  }

  // Create audit log for booking operations
  static async createAuditLog(
    bookingId: string,
    changedBy: string,
    action: string,
    oldValue?: any,
    newValue?: any,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await prisma.bookingAuditLog.create({
      data: {
        bookingId,
        changedBy,
        action,
        oldValue,
        newValue,
        changeReason,
        ipAddress,
        userAgent
      }
    });
  }

  // Add job to queue
  static async addImportJob(
    importId: string,
    filePath: string,
    adminId: string,
    importSettings: any
  ) {
    const job = await bookingImportQueue.add({
      importId,
      filePath,
      adminId,
      importSettings
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return job.id;
  }

  // Get job status
  static async getJobStatus(jobId: string) {
    const job = await bookingImportQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      progress: job.progress || 0,
      data: job.data,
      opts: job.opts,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace
    };
  }

  // Cancel job
  static async cancelJob(jobId: string) {
    const job = await bookingImportQueue.getJob(jobId);
    if (job) {
      if (job.remove) {
        await job.remove();
      }
      return true;
    }
    return false;
  }

  // Get queue statistics
  static async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      bookingImportQueue.getWaiting(),
      bookingImportQueue.getActive(),
      bookingImportQueue.getCompleted(),
      bookingImportQueue.getFailed(),
      bookingImportQueue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }
}

export default BookingImportProcessor;
