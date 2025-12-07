import { parse } from 'fast-csv';
import * as Excel from 'exceljs';
import fs from 'fs';
import prisma from '../config/db';
import { EnquirySource, EnquiryCategory, EnquiryStatus } from '@prisma/client';

export interface QuotationImportRow {
  // CSV columns: Active VC, Model, FUEL, Variant, Color, Transmissions
  model: string;
  variant: string;
  fuel: string; // Maps to fuelType
  color: string;
  // Optional fields that might be in CSV
  active_vc?: string;
  transmissions?: string;
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  validRows: QuotationImportRow[];
  errors: ImportValidationError[];
}

export class QuotationImportService {
  private static readonly BATCH_SIZE = 500;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Get file type from extension
  static getFileType(filePath: string): 'csv' | 'xlsx' {
    const ext = filePath.toLowerCase().split('.').pop();
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    return 'csv';
  }

  // Parse CSV file
  static async parseCSV(filePath: string): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const rows: QuotationImportRow[] = [];
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

    const rows: QuotationImportRow[] = [];
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
          // Normalize header names (case-insensitive, handle spaces/underscores)
          const normalizedHeader = header.trim().toLowerCase().replace(/\s+/g, '_');
          rowData[normalizedHeader] = cellValue?.toString() || '';
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
  private static validateRow(row: any, rowNumber: number): { data: QuotationImportRow; errors: Omit<ImportValidationError, 'rowNumber'>[] } {
    const errors: Omit<ImportValidationError, 'rowNumber'>[] = [];
    
    // Normalize column names (handle case variations and spaces)
    const normalizeKey = (key: string): string => {
      return key.trim().toLowerCase().replace(/\s+/g, '_');
    };

    const normalizedRow: any = {};
    Object.keys(row).forEach(key => {
      normalizedRow[normalizeKey(key)] = row[key];
    });

    // Extract required fields (case-insensitive matching)
    const model = normalizedRow['model']?.toString().trim() || '';
    const variant = normalizedRow['variant']?.toString().trim() || '';
    const fuel = normalizedRow['fuel']?.toString().trim() || '';
    const color = normalizedRow['color']?.toString().trim() || normalizedRow['colour']?.toString().trim() || '';

    // Validate required fields
    if (!model) {
      errors.push({
        field: 'model',
        value: model,
        message: 'Model is required'
      });
    }

    if (!variant) {
      errors.push({
        field: 'variant',
        value: variant,
        message: 'Variant is required'
      });
    }

    if (!fuel) {
      errors.push({
        field: 'fuel',
        value: fuel,
        message: 'Fuel type is required'
      });
    }

    if (!color) {
      errors.push({
        field: 'color',
        value: color,
        message: 'Color is required'
      });
    }

    // Return validated data
    const data: QuotationImportRow = {
      model,
      variant,
      fuel,
      color,
      active_vc: normalizedRow['active_vc']?.toString().trim(),
      transmissions: normalizedRow['transmissions']?.toString().trim()
    };

    return { data, errors };
  }

  // Process batch of rows to create enquiries
  static async processBatch(
    rows: QuotationImportRow[],
    createdByUserId: string,
    dealershipId: string
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        // Create enquiry from quotation row
        // Note: Customer info is not in quotation CSV, so we'll use placeholder or require it
        // For now, we'll create enquiries with minimal required fields
        await prisma.enquiry.create({
          data: {
            customerName: `Quotation Import - ${row.model}`, // Placeholder - should be updated later
            customerContact: '+919999999999', // Placeholder
            model: row.model,
            variant: row.variant,
            fuelType: row.fuel,
            color: row.color,
            source: EnquirySource.DIGITAL, // Default source for imported quotations
            category: EnquiryCategory.HOT,
            status: EnquiryStatus.OPEN,
            createdByUserId,
            dealershipId,
            isImportedFromQuotation: true,
            quotationImportedAt: new Date(),
            // Set default dates (will be required by Task 3)
            expectedBookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
          }
        });
        successful++;
      } catch (error: any) {
        console.error(`Failed to create enquiry from row:`, error);
        failed++;
      }
    }

    return { successful, failed };
  }
}

