# Booking Module Enhancement - Implementation Plan

## 📋 Project Overview
Implement bulk booking import functionality for car dealership backend with admin web portal and mobile advisor support.

## 🏗️ Database Schema Design

### Enhanced Booking Model
```sql
-- Updated booking table with standalone capability
CREATE TABLE bookings (
  id VARCHAR(30) PRIMARY KEY DEFAULT (gen_cuid()),
  external_id VARCHAR(255) UNIQUE,
  dealer_id VARCHAR(30),
  car_variant_id VARCHAR(30),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  advisor_id VARCHAR(30) NULL,
  booking_date TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  metadata JSONB,
  enquiry_id VARCHAR(30) NULL, -- Made optional for standalone bookings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Import tracking table
CREATE TABLE booking_imports (
  id VARCHAR(30) PRIMARY KEY DEFAULT (gen_cuid()),
  admin_id VARCHAR(30) NOT NULL,
  filename VARCHAR(512) NOT NULL,
  original_filename VARCHAR(512),
  file_size BIGINT,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'PENDING',
  import_settings JSONB,
  error_summary JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Import error tracking
CREATE TABLE booking_import_errors (
  id VARCHAR(30) PRIMARY KEY DEFAULT (gen_cuid()),
  import_id VARCHAR(30) NOT NULL,
  row_number INTEGER NOT NULL,
  raw_row JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_type VARCHAR(50),
  field_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for all booking changes
CREATE TABLE booking_audit_logs (
  id VARCHAR(30) PRIMARY KEY DEFAULT (gen_cuid()),
  booking_id VARCHAR(30) NOT NULL,
  changed_by VARCHAR(30) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_reason VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dealer reference table
CREATE TABLE dealers (
  id VARCHAR(30) PRIMARY KEY DEFAULT (gen_cuid()),
  dealer_code VARCHAR(50) UNIQUE NOT NULL,
  dealer_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Enhanced Status Enum
```typescript
enum BookingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED', 
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  WAITLISTED = 'WAITLISTED',
  RESCHEDULED = 'RESCHEDULED'
}

enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

enum BookingSource {
  MANUAL = 'manual',
  BULK_IMPORT = 'bulk_import',
  API = 'api',
  MOBILE = 'mobile'
}
```

## 🛠️ Implementation Architecture

### Background Job Queue
- **Library**: Bull (Redis-based)
- **Rationale**: Mature, reliable, good dashboard, TypeScript support
- **Alternative**: If Redis unavailable, use Agenda (MongoDB-based)

### File Processing Libraries
```json
{
  "multer": "^1.4.5-lts.1",
  "fast-csv": "^4.3.6", 
  "exceljs": "^4.4.0",
  "bull": "^4.12.2",
  "ioredis": "^5.3.2"
}
```

### CSV/XLSX Specification
**Required Columns:**
- `customer_name` (required)
- `customer_phone` (recommended)
- `customer_email` (optional)
- `dealer_code` (required)
- `booking_date` (ISO 8601 format)

**Optional Columns:**
- `external_id` (for deduplication)
- `car_variant` (model/variant info)
- `advisor_email` (for auto-assignment)
- `status` (defaults to PENDING)
- `notes` (additional metadata)

**Validation Rules:**
- Customer name: 2-255 characters
- Phone: Valid international format (+country code)
- Email: Valid email format if provided
- Date: ISO 8601 or DD-MM-YYYY format
- Dealer code: Must exist in dealers table

## 🔗 New API Endpoints

### Admin Import Endpoints
```typescript
// Bulk import management
POST   /api/admin/bookings/import           // Upload CSV/XLSX
GET    /api/admin/bookings/imports          // List import history
GET    /api/admin/bookings/imports/:id      // Get import status
POST   /api/admin/bookings/imports/:id/retry // Retry failed import
DELETE /api/admin/bookings/imports/:id      // Cancel import
GET    /api/admin/bookings/imports/:id/errors // Download error CSV

// Single booking management  
POST   /api/admin/bookings                  // Create single booking
PATCH  /api/admin/bookings/:id/assign       // Assign advisor
GET    /api/admin/bookings/stats            // Import statistics

// Import preview and validation
POST   /api/admin/bookings/preview          // Preview first 100 rows
POST   /api/admin/bookings/validate         // Dry run validation
```

### Advisor Mobile Endpoints
```typescript
// Advisor-specific booking management
GET    /api/advisor/bookings                // List assigned bookings
PATCH  /api/advisor/bookings/:id/status     // Update booking status
GET    /api/advisor/bookings/:id/history    // View audit history
POST   /api/advisor/bookings/:id/notes      // Add status notes
```

### Enhanced General Endpoints
```typescript
// Enhanced general booking endpoints
GET    /api/bookings                        // List with advanced filtering
GET    /api/bookings/:id/audit             // View audit trail
PATCH  /api/bookings/:id/reschedule        // Reschedule booking
```

## ⚙️ Business Logic Design

### Import Processing Flow
1. **File Upload**: Validate file type, size, and format
2. **Preview Generation**: Parse first 100 rows, detect headers
3. **Validation**: Column mapping, data type validation, business rules
4. **Queue Job**: Enqueue background processing job
5. **Batch Processing**: Process in chunks of 500 records
6. **Error Handling**: Log errors, continue processing valid records
7. **Completion**: Update status, generate error report

### Advisor Assignment Strategies
```typescript
enum AssignmentStrategy {
  MANUAL = 'manual',           // Admin assigns manually
  ROUND_ROBIN = 'round_robin', // Equal distribution
  LEAST_LOADED = 'least_loaded', // Advisor with fewest active bookings
  DEALER_BASED = 'dealer_based'  // Assign based on dealer territory
}
```

### Status Transition Rules
```typescript
const ALLOWED_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'RESCHEDULED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: ['PENDING'], // Allow reactivation
  NO_SHOW: ['RESCHEDULED', 'CANCELLED'],
  WAITLISTED: ['PENDING', 'CANCELLED'],
  RESCHEDULED: ['PENDING', 'ASSIGNED']
};
```

## 🧪 Testing Strategy

### Unit Tests
- CSV parsing and validation logic
- Business rule validation
- Status transition validation
- Assignment algorithm testing

### Integration Tests  
- File upload endpoints
- Import job processing
- API authentication and authorization
- Database constraint validation

### End-to-End Tests
- Complete import workflow
- Admin dashboard interactions
- Mobile app status updates
- Error handling scenarios

### Test Fixtures
```
fixtures/
├── sample_valid_bookings.csv
├── sample_invalid_bookings.csv  
├── sample_large_import.csv (1000+ rows)
├── sample_mixed_errors.xlsx
└── test_data.sql
```

## 🔒 Security & Validation

### File Upload Security
- File type validation (CSV/XLSX only)
- File size limits (max 10MB)
- Virus scanning (optional)
- Secure file storage with cleanup

### Data Validation
- SQL injection prevention
- XSS protection for user inputs  
- Rate limiting on import endpoints
- Input sanitization and validation

### Authorization
- Admin-only access for bulk imports
- Advisor role can only update assigned bookings
- Audit trail for all admin actions
- IP-based access logging

## 📊 Monitoring & Analytics

### Import Metrics
- Success/failure rates
- Processing time statistics
- Error type distribution
- Peak usage patterns

### Business Metrics
- Booking conversion rates
- Advisor performance tracking
- Dealer activity monitoring
- Status transition analytics

## 🚀 Rollout Plan

### Phase 1: Core Import (Week 1-2)
- Database migrations
- Basic import job processing
- Admin API endpoints
- Simple CSV import

### Phase 2: Enhanced Features (Week 3)
- Excel support
- Preview and validation
- Error reporting
- Basic audit logging

### Phase 3: Mobile Integration (Week 4)
- Advisor mobile endpoints
- Status update notifications
- Advanced filtering
- Performance optimization

### Phase 4: Production Ready (Week 5)
- Comprehensive testing
- Security audit
- Performance testing
- Documentation and training

## ⚡ Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Partial indexes for status-based queries
- Connection pooling configuration
- Query optimization for large datasets

### Background Processing
- Job concurrency limits
- Memory usage monitoring
- Failed job retry strategies
- Job queue monitoring dashboard

### API Performance
- Response caching for static data
- Pagination for large result sets
- Database query optimization
- Rate limiting implementation

This implementation plan provides a comprehensive roadmap for adding bulk booking import functionality while maintaining system reliability and user experience.
