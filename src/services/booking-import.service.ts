import { parse } from 'fast-csv';
import * as Excel from 'exceljs';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { RoleName } from '@prisma/client';
import { BookingStatus, BookingSource, ImportStatus, Prisma } from '@prisma/client';

export interface BookingImportRow {
  // Universal Dealer Fields
  zone?: string;
  region?: string;
  dealer_code: string;
  dealer_name?: string;
  
  // Customer Information
  opty_id?: string; // Opportunity ID
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  
  // Vehicle Information
  variant?: string; // Variant/PL
  vc_code?: string; // Vehicle Configuration Code
  color?: string;
  fuel_type?: string;
  transmission?: string; // AMT/MT/DCA
  
  // Booking Details
  booking_date?: string;
  status?: string;
  expected_delivery_date?: string;
  
  // Employee/Division
  division?: string;
  emp_name?: string;
  employee_login?: string;
  advisor_id?: string; // Direct Firebase UID for advisor assignment
  
  // Finance Information
  finance_required?: string | boolean;
  financer_name?: string;
  file_login_date?: string;
  approval_date?: string;
  
  // Stock & Delivery
  stock_availability?: string; // VNA/Vehicle Available
  back_order_status?: string | boolean;
  rto_date?: string;
  
  // Additional
  remarks?: string;
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  validRows: BookingImportRow[];
  errors: ImportValidationError[];
}

export class BookingImportService {
  private static readonly BATCH_SIZE = 500;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Parse CSV file
  static async parseCSV(filePath: string): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const rows: BookingImportRow[] = [];
      const errors: ImportValidationError[] = [];
      let totalRows = 0;

      fs.createReadStream(filePath)
        .pipe(parse({ headers: true }))
        .on('data', (row: any) => {
          totalRows++;
          try {
            const validatedRow = this.validateRow(row, totalRows);
            if (validatedRow.errors.length === 0) {
              rows.push(validatedRow.data);
            } else {
              errors.push(...validatedRow.errors.map(error => ({
                ...error,
                rowNumber: totalRows
              })));
            }
          } catch (error) {
            errors.push({
              rowNumber: totalRows,
              field: 'general',
              value: JSON.stringify(row),
              message: `Row processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        })
        .on('end', () => {
          resolve({ totalRows, validRows: rows, errors });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Parse Excel file
  static async parseExcel(filePath: string): Promise<ImportResult> {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    if (!worksheet) {
      throw new Error('Excel file contains no worksheets');
    }

    const rows: BookingImportRow[] = [];
    const errors: ImportValidationError[] = [];
    let totalRows = 0;
    let headers: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers
        headers = row.values as string[];
        headers.shift(); // Remove first empty element
        return;
      }

      totalRows++;
      try {
        const rowData: any = {};
        headers.forEach((header, index) => {
          const cellValue = row.getCell(index + 1).value;
          rowData[header.trim().toLowerCase().replace(/\s+/g, '_')] = cellValue?.toString() || '';
        });

        const validatedRow = this.validateRow(rowData, totalRows);
        if (validatedRow.errors.length === 0) {
          rows.push(validatedRow.data);
        } else {
          errors.push(...validatedRow.errors.map(error => ({
            ...error,
            rowNumber: totalRows
          })));
        }
      } catch (error) {
        errors.push({
          rowNumber: totalRows,
          field: 'general',
          value: JSON.stringify(row.values),
          message: `Row processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });

    return { totalRows, validRows: rows, errors };
  }

  // Validate individual row
  private static validateRow(row: any, rowNumber: number): { data: BookingImportRow; errors: Omit<ImportValidationError, 'rowNumber'>[] } {
    const errors: Omit<ImportValidationError, 'rowNumber'>[] = [];
    const data: BookingImportRow = {
      // Universal Dealer Fields
      zone: row.zone || undefined,
      region: row.region || undefined,
      dealer_code: '',
      dealer_name: row.dealer_name || undefined,
      
      // Customer Information
      opty_id: row.opty_id || undefined,
      customer_name: '',
      customer_phone: row.customer_phone || undefined,
      customer_email: row.customer_email || undefined,
      
      // Vehicle Information
      variant: row.variant || undefined,
      vc_code: row.vc_code || undefined,
      color: row.color || undefined,
      fuel_type: row.fuel_type || undefined,
      transmission: row.transmission || undefined,
      
      // Booking Details
      booking_date: row.booking_date || undefined,
      status: row.status || 'PENDING',
      expected_delivery_date: row.expected_delivery_date || undefined,
      
      // Employee/Division
      division: row.division || undefined,
      emp_name: row.emp_name || undefined,
      employee_login: row.employee_login || undefined,
      
      // Finance Information
      finance_required: row.finance_required || undefined,
      financer_name: row.financer_name || undefined,
      file_login_date: row.file_login_date || undefined,
      approval_date: row.approval_date || undefined,
      
      // Stock & Delivery
      stock_availability: row.stock_availability || undefined,
      back_order_status: row.back_order_status || undefined,
      rto_date: row.rto_date || undefined,
      
      // Additional
      remarks: row.remarks || undefined
    };

    // Required field validations
    if (!row.customer_name || row.customer_name.trim().length === 0) {
      errors.push({
        field: 'customer_name',
        value: row.customer_name,
        message: 'Customer name is required'
      });
    } else if (row.customer_name.trim().length < 2 || row.customer_name.trim().length > 255) {
      errors.push({
        field: 'customer_name',
        value: row.customer_name,
        message: 'Customer name must be between 2 and 255 characters'
      });
    } else {
      data.customer_name = row.customer_name.trim();
    }

    if (!row.dealer_code || row.dealer_code.trim().length === 0) {
      errors.push({
        field: 'dealer_code',
        value: row.dealer_code,
        message: 'Dealer code is required'
      });
    } else {
      data.dealer_code = row.dealer_code.trim();
    }

    // Email validation
    if (row.customer_email && !this.isValidEmail(row.customer_email)) {
      errors.push({
        field: 'customer_email',
        value: row.customer_email,
        message: 'Invalid email format'
      });
    }

    // Phone validation (accept international format)
    if (row.customer_phone && !this.isValidPhone(row.customer_phone)) {
      errors.push({
        field: 'customer_phone',
        value: row.customer_phone,
        message: 'Invalid phone format (use international format with country code: +91xxxxxxxxxx)'
      });
    }

    // Date validations
    const dateFields = ['booking_date', 'expected_delivery_date', 'file_login_date', 'approval_date', 'rto_date'];
    dateFields.forEach(field => {
      if (row[field] && !this.isValidDate(row[field])) {
        errors.push({
          field: field,
          value: row[field],
          message: 'Invalid date format (use ISO 8601 or DD-MM-YYYY format)'
        });
      }
    });

    // Status validation
    if (row.status && !Object.values(BookingStatus).includes(row.status as BookingStatus)) {
      errors.push({
        field: 'status',
        value: row.status,
        message: `Invalid status. Allowed values: ${Object.values(BookingStatus).join(', ')}`
      });
    }

    // Boolean field validation
    if (row.finance_required && typeof row.finance_required === 'string') {
      const boolValue = row.finance_required.toLowerCase();
      if (!['true', 'false', 'yes', 'no', '1', '0'].includes(boolValue)) {
        errors.push({
          field: 'finance_required',
          value: row.finance_required,
          message: 'Finance required must be true/false or yes/no'
        });
      }
    }

    if (row.back_order_status && typeof row.back_order_status === 'string') {
      const boolValue = row.back_order_status.toLowerCase();
      if (!['true', 'false', 'yes', 'no', '1', '0'].includes(boolValue)) {
        errors.push({
          field: 'back_order_status',
          value: row.back_order_status,
          message: 'Back order status must be true/false or yes/no'
        });
      }
    }

    return { data, errors };
  }

  // Process import batch
  static async processBatch(
    rows: BookingImportRow[],
    importId: string,
    startIndex: number,
    adminDealershipId?: string
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startIndex + i + 1;

      try {
        // Look up or create dealer
        let dealer = await prisma.dealer.findUnique({
          where: { dealerCode: row.dealer_code }
        });

        if (!dealer) {
          // Auto-create dealer from the row data
          dealer = await prisma.dealer.create({
            data: {
              dealerCode: row.dealer_code,
              dealerName: row.dealer_name || `Dealer ${row.dealer_code}`,
              zone: row.zone,
              region: row.region,
              dealerType: this.getDealerTypeFromCode(row.dealer_code),
              isActive: true
            }
          });
        }

        // Look up advisor if employee_login or advisor_id provided
        let advisorId = undefined;
        
        // If advisor_id is directly provided (Firebase UID), use it
        if (row.advisor_id) {
          advisorId = row.advisor_id;
        } 
        // Otherwise, look up by employee_login
        else if (row.employee_login) {
          const advisor = await prisma.user.findFirst({
            where: { 
              OR: [
                { email: { contains: row.employee_login, mode: 'insensitive' } },
                { name: { contains: row.emp_name || '', mode: 'insensitive' } }
              ],
              role: { name: RoleName.CUSTOMER_ADVISOR }
            }
          });
          
          if (advisor) {
            advisorId = advisor.firebaseUid;
          }
        }

        // Convert boolean fields
        const financeRequired = this.convertToBoolean(row.finance_required);
        const backOrderStatus = this.convertToBoolean(row.back_order_status);

        // Create booking with universal format
        await prisma.booking.create({
          data: {
            // Universal Dealer Fields
            zone: row.zone,
            region: row.region,
            dealerCode: row.dealer_code,
            dealerId: dealer.id,
            dealershipId: adminDealershipId, // CRITICAL: Set dealership for multi-tenant isolation
            
            // Customer Information
            optyId: row.opty_id,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            customerEmail: row.customer_email,
            
            // Vehicle Information
            variant: row.variant,
            vcCode: row.vc_code,
            color: row.color,
            fuelType: row.fuel_type,
            transmission: row.transmission,
            
            // Booking Details
            bookingDate: row.booking_date ? new Date(row.booking_date) : null,
            status: (row.status as BookingStatus) || BookingStatus.PENDING,
            expectedDeliveryDate: row.expected_delivery_date ? new Date(row.expected_delivery_date) : null,
            
            // Employee/Division
            division: row.division,
            empName: row.emp_name,
            employeeLogin: row.employee_login,
            advisorId,
            
            // Finance Information
            financeRequired,
            financerName: row.financer_name,
            fileLoginDate: row.file_login_date ? new Date(row.file_login_date) : null,
            approvalDate: row.approval_date ? new Date(row.approval_date) : null,
            
            // Stock & Delivery
            stockAvailability: row.stock_availability as any,  // Will be validated by Prisma enum
            backOrderStatus,
            rtoDate: row.rto_date ? new Date(row.rto_date) : null,
            
            // System Fields
            source: BookingSource.BULK_IMPORT,
            remarks: row.remarks,
            metadata: {
              imported_from: 'universal_dealer_format',
              original_row: row as any
            }
          }
        });

        successful++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log error to database
        await prisma.bookingImportError.create({
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
          error: errorMessage,
          data: row
        });
      }
    }

    return { successful, failed, errors };
  }

  // Helper methods
  private static getDealerTypeFromCode(dealerCode: string): string {
    const code = dealerCode.toUpperCase();
    if (code.includes('TATA') || code.startsWith('3') || code.startsWith('5')) return 'TATA';
    if (code.includes('MARUTI') || code.startsWith('2')) return 'MARUTI';
    if (code.includes('HYUNDAI') || code.startsWith('4')) return 'HYUNDAI';
    if (code.includes('HONDA')) return 'HONDA';
    if (code.includes('TOYOTA')) return 'TOYOTA';
    return 'OTHER';
  }

  private static convertToBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (['true', 'yes', '1', 'y'].includes(lowerValue)) return true;
      if (['false', 'no', '0', 'n'].includes(lowerValue)) return false;
    }
    return undefined;
  }

  // Utility methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Accept international format with country code
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  private static isValidDate(dateString: string): boolean {
    // Try ISO 8601 format first
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return true;
    }

    // Try DD-MM-YYYY format
    const ddmmyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateString.match(ddmmyyyyRegex);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.getDate() === parseInt(day) && 
             date.getMonth() === parseInt(month) - 1 && 
             date.getFullYear() === parseInt(year);
    }

    return false;
  }

  // File type detection
  static getFileType(filename: string): 'csv' | 'xlsx' | 'unsupported' {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.csv') return 'csv';
    if (ext === '.xlsx' || ext === '.xls') return 'xlsx';
    return 'unsupported';
  }

  // File size validation
  static validateFileSize(filePath: string): boolean {
    const stats = fs.statSync(filePath);
    return stats.size <= this.MAX_FILE_SIZE;
  }
}

export default BookingImportService;
