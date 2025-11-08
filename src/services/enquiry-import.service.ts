import { parse } from 'fast-csv';
import * as Excel from 'exceljs';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { EnquiryCategory, EnquirySource, ImportStatus } from '@prisma/client';

export interface EnquiryImportRow {
  customer_name: string;
  customer_contact: string;
  customer_email?: string;
  model?: string;
  variant?: string;
  color?: string;
  source?: string;
  category?: string;
  expected_booking_date: string;
  ca_remarks?: string;
  assigned_to_user_id?: string;
  dealer_code?: string;
  location?: string;
  next_follow_up_date?: string;
}

export interface EnquiryImportValidationError {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
}

export interface EnquiryImportResult {
  totalRows: number;
  validRows: EnquiryImportRow[];
  errors: EnquiryImportValidationError[];
}

export class EnquiryImportService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static validateFileSize(filePath: string): boolean {
    const stats = fs.statSync(filePath);
    return stats.size <= this.MAX_FILE_SIZE;
  }

  static async parseCSV(filePath: string): Promise<EnquiryImportResult> {
    return new Promise((resolve, reject) => {
      const rows: EnquiryImportRow[] = [];
      const errors: EnquiryImportValidationError[] = [];
      let totalRows = 0;

      fs.createReadStream(filePath)
        .pipe(parse({ headers: true }))
        .on('data', (row: any) => {
          totalRows++;
          const validation = this.validateRow(row);
          if (validation.errors.length === 0) {
            rows.push(validation.data);
          } else {
            errors.push(
              ...validation.errors.map(error => ({
                ...error,
                rowNumber: totalRows
              }))
            );
          }
        })
        .on('end', () => {
          resolve({ totalRows, validRows: rows, errors });
        })
        .on('error', reject);
    });
  }

  static async parseExcel(filePath: string): Promise<EnquiryImportResult> {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Excel file contains no worksheets');
    }

    const rows: EnquiryImportRow[] = [];
    const errors: EnquiryImportValidationError[] = [];
    let totalRows = 0;
    let headers: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, index) => {
      if (index === 1) {
        headers = row.values as string[];
        headers.shift();
        return;
      }

      totalRows++;

      const rowData: Record<string, any> = {};
      headers.forEach((header, cellIndex) => {
        const key = header.trim().toLowerCase().replace(/\s+/g, '_');
        const cellValue = row.getCell(cellIndex + 1).text;
        rowData[key] = cellValue;
      });

      const validation = this.validateRow(rowData);
      if (validation.errors.length === 0) {
        rows.push(validation.data);
      } else {
        errors.push(
          ...validation.errors.map(error => ({
            ...error,
            rowNumber: totalRows
          }))
        );
      }
    });

    return { totalRows, validRows: rows, errors };
  }

  private static validateRow(row: any): { data: EnquiryImportRow; errors: Omit<EnquiryImportValidationError, 'rowNumber'>[] } {
    const errors: Omit<EnquiryImportValidationError, 'rowNumber'>[] = [];

    const data: EnquiryImportRow = {
      customer_name: row.customer_name || '',
      customer_contact: row.customer_contact || '',
      customer_email: row.customer_email || undefined,
      model: row.model || undefined,
      variant: row.variant || undefined,
      color: row.color || undefined,
      source: row.source || undefined,
      category: row.category || undefined,
      expected_booking_date: row.expected_booking_date || '',
      ca_remarks: row.ca_remarks || undefined,
      assigned_to_user_id: row.assigned_to_user_id || undefined,
      dealer_code: row.dealer_code || undefined,
      location: row.location || undefined,
      next_follow_up_date: row.next_follow_up_date || undefined
    };

    if (!data.customer_name || data.customer_name.trim().length < 2) {
      errors.push({
        field: 'customer_name',
        value: row.customer_name,
        message: 'Customer name is required (min 2 characters)'
      });
    } else {
      data.customer_name = data.customer_name.trim();
    }

    if (!data.customer_contact || !this.isValidPhone(data.customer_contact)) {
      errors.push({
        field: 'customer_contact',
        value: row.customer_contact,
        message: 'Customer contact must be a valid phone number'
      });
    } else {
      data.customer_contact = data.customer_contact.trim();
    }

    if (data.customer_email && !this.isValidEmail(data.customer_email)) {
      errors.push({
        field: 'customer_email',
        value: row.customer_email,
        message: 'Invalid email format'
      });
    }

    if (!data.expected_booking_date || !this.isValidDate(data.expected_booking_date)) {
      errors.push({
        field: 'expected_booking_date',
        value: row.expected_booking_date,
        message: 'Expected booking date is required and must be a valid date'
      });
    } else {
      const expectedDate = new Date(data.expected_booking_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expectedDate < today) {
        errors.push({
          field: 'expected_booking_date',
          value: row.expected_booking_date,
          message: 'Expected booking date cannot be in the past'
        });
      } else {
        data.expected_booking_date = expectedDate.toISOString();
      }
    }

    if (data.next_follow_up_date) {
      if (!this.isValidDate(data.next_follow_up_date)) {
        errors.push({
          field: 'next_follow_up_date',
          value: row.next_follow_up_date,
          message: 'Next follow up date must be a valid date'
        });
      } else {
        const followUpDate = new Date(data.next_follow_up_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        followUpDate.setHours(0, 0, 0, 0);
        if (followUpDate < today) {
          errors.push({
            field: 'next_follow_up_date',
            value: row.next_follow_up_date,
            message: 'Next follow up date cannot be before today'
          });
        } else {
          data.next_follow_up_date = followUpDate.toISOString();
        }
      }
    }

    if (data.source) {
      const normalizedSource = this.normalizeSource(data.source);
      if (!normalizedSource) {
        errors.push({
          field: 'source',
          value: row.source,
          message: `Invalid source. Allowed values: ${Object.values(EnquirySource).join(', ')}`
        });
      } else {
        data.source = normalizedSource;
      }
    }

    if (data.category) {
      const normalizedCategory = data.category.toUpperCase() as EnquiryCategory;
      if (!Object.values(EnquiryCategory).includes(normalizedCategory)) {
        errors.push({
          field: 'category',
          value: row.category,
          message: `Invalid category. Allowed values: ${Object.values(EnquiryCategory).join(', ')}`
        });
      } else {
        data.category = normalizedCategory;
      }
    }

    if (data.location) {
      data.location = data.location.trim();
    }

    return { data, errors };
  }

  static async processBatch(
    rows: EnquiryImportRow[],
    importId: string,
    createdByUserId: string,
    dealershipId?: string
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 1;

      try {
        let assignedToUserId: string | undefined;
        if (row.assigned_to_user_id) {
          const assignedUser = await prisma.user.findFirst({
            where: {
              firebaseUid: row.assigned_to_user_id,
              dealershipId,
              isActive: true
            },
            select: { firebaseUid: true }
          });

          if (!assignedUser) {
            throw new Error(`Assigned user not found or inactive: ${row.assigned_to_user_id}`);
          }
          assignedToUserId = assignedUser.firebaseUid;
        }

        const expectedBookingDate = new Date(row.expected_booking_date);
        const nextFollowUpDate = row.next_follow_up_date
          ? new Date(row.next_follow_up_date)
          : expectedBookingDate;

        await prisma.enquiry.create({
          data: {
            customerName: row.customer_name,
            customerContact: row.customer_contact,
            customerEmail: row.customer_email || null,
            model: row.model || null,
            variant: row.variant || null,
            color: row.color || null,
            source: (row.source as EnquirySource) || EnquirySource.WALK_IN,
            category: (row.category as EnquiryCategory) || EnquiryCategory.HOT,
            expectedBookingDate,
            caRemarks: row.ca_remarks || null,
            assignedToUserId,
            createdByUserId,
            dealerCode: row.dealer_code || 'DEFAULT001',
            location: row.location || null,
            nextFollowUpDate,
            dealershipId
          }
        });

        successful++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await prisma.enquiryImportError.create({
          data: {
            importId,
            rowNumber,
            rawRow: row as any,
            errorMessage,
            errorType: 'processing_error'
          }
        });

        errors.push({
          rowNumber,
          error: errorMessage
        });
      }
    }

    return { successful, failed, errors };
  }

  static normalizeSource(value: string): EnquirySource | null {
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    if (Object.values(EnquirySource).includes(normalized as EnquirySource)) {
      return normalized as EnquirySource;
    }
    return null;
  }

  private static isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    const regex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return regex.test(phone);
  }

  private static isValidDate(value: string): boolean {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
}

