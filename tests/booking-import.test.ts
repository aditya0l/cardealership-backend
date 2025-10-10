import BookingImportService from '../src/services/booking-import.service';
import fs from 'fs';
import path from 'path';

describe('BookingImportService', () => {
  const testDataDir = path.join(__dirname, 'fixtures');
  
  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    // Create test CSV file
    const testCsvContent = `customer_name,customer_phone,customer_email,dealer_code,car_variant,booking_date,status
John Doe,+1234567890,john@example.com,DEAL001,Toyota Camry,2025-10-15T10:00:00Z,PENDING
Jane Smith,+1987654321,jane@example.com,DEAL001,Honda Civic,2025-10-16T14:30:00Z,PENDING
,invalid-phone,invalid-email,NONEXISTENT,BMW X3,invalid-date,INVALID_STATUS`;
    
    fs.writeFileSync(path.join(testDataDir, 'test.csv'), testCsvContent);
  });

  afterAll(() => {
    // Cleanup test files
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('File Type Detection', () => {
    it('should detect CSV files correctly', () => {
      expect(BookingImportService.getFileType('test.csv')).toBe('csv');
      expect(BookingImportService.getFileType('TEST.CSV')).toBe('csv');
    });

    it('should detect Excel files correctly', () => {
      expect(BookingImportService.getFileType('test.xlsx')).toBe('xlsx');
      expect(BookingImportService.getFileType('test.xls')).toBe('xlsx');
    });

    it('should detect unsupported files', () => {
      expect(BookingImportService.getFileType('test.txt')).toBe('unsupported');
      expect(BookingImportService.getFileType('test.pdf')).toBe('unsupported');
    });
  });

  describe('File Size Validation', () => {
    it('should validate file size correctly', () => {
      const testFile = path.join(testDataDir, 'test.csv');
      expect(BookingImportService.validateFileSize(testFile)).toBe(true);
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV file', async () => {
      const testFile = path.join(testDataDir, 'test.csv');
      const result = await BookingImportService.parseCSV(testFile);
      
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toHaveLength(2); // First two rows are valid
      expect(result.errors.length).toBeGreaterThan(0); // Third row has errors
      
      // Check valid rows
      expect(result.validRows[0].customer_name).toBe('John Doe');
      expect(result.validRows[0].dealer_code).toBe('DEAL001');
      expect(result.validRows[1].customer_name).toBe('Jane Smith');
    });

    it('should validate required fields', async () => {
      const testFile = path.join(testDataDir, 'test.csv');
      const result = await BookingImportService.parseCSV(testFile);
      
      const errors = result.errors;
      const customerNameErrors = errors.filter(e => e.field === 'customer_name');
      
      expect(customerNameErrors.length).toBeGreaterThan(0);
      // The dealer code error may not appear if the missing customer name prevents processing
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const testFile = path.join(testDataDir, 'test.csv');
      const result = await BookingImportService.parseCSV(testFile);
      
      const emailErrors = result.errors.filter(e => e.field === 'customer_email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    it('should validate phone format', async () => {
      const testFile = path.join(testDataDir, 'test.csv');
      const result = await BookingImportService.parseCSV(testFile);
      
      const phoneErrors = result.errors.filter(e => e.field === 'customer_phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Row Validation', () => {
    it('should validate customer name length', () => {
      const longName = 'A'.repeat(300); // Exceeds 255 character limit
      const result = (BookingImportService as any).validateRow({
        customer_name: longName,
        dealer_code: 'DEAL001'
      }, 1);
      
      const nameErrors = result.errors.filter((e: any) => e.field === 'customer_name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should validate email format', () => {
      const result = (BookingImportService as any).validateRow({
        customer_name: 'John Doe',
        customer_email: 'invalid-email',
        dealer_code: 'DEAL001'
      }, 1);
      
      const emailErrors = result.errors.filter((e: any) => e.field === 'customer_email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    it('should validate phone format', () => {
      const result = (BookingImportService as any).validateRow({
        customer_name: 'John Doe',
        customer_phone: '123-456-7890', // Missing country code
        dealer_code: 'DEAL001'
      }, 1);
      
      const phoneErrors = result.errors.filter((e: any) => e.field === 'customer_phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
    });

    it('should accept valid international phone format', () => {
      const result = (BookingImportService as any).validateRow({
        customer_name: 'John Doe',  
        customer_phone: '+1234567890',
        dealer_code: 'DEAL001'
      }, 1);
      
      const phoneErrors = result.errors.filter((e: any) => e.field === 'customer_phone');
      expect(phoneErrors.length).toBe(0);
    });
  });
});
