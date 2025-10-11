# Car Dealership Backend

A production-ready backend API for a Car Dealership Management System built with Node.js, Express, TypeScript, and PostgreSQL.

## 🛠 Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Auth with role-based access control
- **Notifications**: Firebase Cloud Messaging (FCM) via Admin SDK
- **AI Chatbot**: OpenAI API integration
- **File Processing**: Multer for uploads, ExcelJS/CSV parsing
- **Job Queue**: Bull Queue for background processing
- **Security**: Helmet, CORS, Firebase security rules, Field-level RBAC

## 🏗 Architecture

```
/src
├── app.ts                 # Express application setup
├── server.ts             # Server entry point
├── config/
│   ├── db.ts            # Prisma client configuration
│   ├── env.ts           # Environment variables
│   └── firebase.ts      # Firebase Admin SDK configuration
├── routes/              # API route definitions
├── controllers/         # Business logic controllers
│   ├── booking-import.controller.ts  # Bulk import functionality
│   └── ...
├── middlewares/         # Authentication & error handling
│   └── rbac.middleware.ts # Field-level permissions
├── services/           # External service integrations
│   ├── booking-import.service.ts     # File parsing
│   ├── booking-import-processor.service.ts # Background processing
│   ├── queue.service.ts              # Job queue management
│   └── ...
└── utils/              # Helper utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd dealership-admin-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Update the `.env` file with your actual values:
   ```env
   PORT=4000
   DATABASE_URL=postgresql://username:password@localhost:5432/dealership_db
   OPENAI_API_KEY=sk-your_openai_api_key
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   ```

4. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run generate
   
   # Run database migrations
   npm run migrate
   
   # Seed roles and permissions (RBAC)
   npx tsx prisma/seed-rbac.ts
   
   # Seed universal dealership sample data
   npx tsx prisma/seed-universal.ts
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` and be accessible from other devices on your network.

### 🌐 Network Access

The server is configured to accept connections from other devices on your local network:

- **Local access**: `http://localhost:4000`
- **Network access**: `http://YOUR_LOCAL_IP:4000`

To find your local IP address:
```bash
npm run local-ip
```

For detailed network setup instructions, see [NETWORK-SETUP.md](./NETWORK-SETUP.md).

## 📊 Database Schema

### Core Models

- **Role**: User roles (ADMIN, GENERAL_MANAGER, SALES_MANAGER, TEAM_LEAD, CUSTOMER_ADVISOR)
- **User**: System users linked to Firebase Auth UIDs with role-based permissions
- **Enquiry**: Customer enquiries with assignment and status tracking
- **Booking**: Universal vehicle bookings supporting all dealership formats
- **Quotation**: Price quotations for enquiries
- **Stock**: Vehicle inventory management
- **Dealer**: Multi-brand dealer information (Tata, Maruti, Hyundai, Honda, Toyota, etc.)
- **Vehicle**: Universal vehicle catalog with pricing and availability
- **BookingImport**: Bulk import tracking and management
- **BookingAuditLog**: Complete audit trail for all booking changes

### New Enums

- **BookingStatus**: PENDING, ASSIGNED, IN_PROGRESS, CONFIRMED, DELIVERED, CANCELLED, NO_SHOW, WAITLISTED, RESCHEDULED, BACK_ORDER, APPROVED, REJECTED
- **ImportStatus**: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- **BookingSource**: MANUAL, BULK_IMPORT, API, MOBILE

### Relationships

- Users have one Role with hierarchical permissions
- Enquiries can be assigned to Users and created by Users
- Bookings belong to Enquiries and are assigned to Customer Advisors
- Bookings belong to Dealers and support universal format
- Quotations belong to Enquiries
- Audit logs track all booking changes with complete history
- Field-level permissions control data access by role

## 🔐 Authentication & Authorization

### Enhanced RBAC System

The system now implements **field-level Role-Based Access Control (RBAC)** with granular permissions:

#### Role Hierarchy & Permissions

| Role | Full Access | Field Permissions | Special Access |
|------|-------------|-------------------|----------------|
| **ADMIN** | All resources | Read/Write all fields | User management, system config |
| **GENERAL_MANAGER** | Read all | Can add remarks | View audit logs, import oversight |
| **SALES_MANAGER** | Read all | Can add remarks | View audit logs, team management |
| **TEAM_LEAD** | Read all | Can add remarks | View audit logs, advisor assignments |
| **CUSTOMER_ADVISOR** | Own bookings only | Limited field access | Mobile app, status updates |

#### Field-Level Permissions for Customer Advisors

- **Full Access**: Customer contact info, booking status, finance details, advisor fields
- **Read Only**: Vehicle info, dealer info, stock status, system fields
- **Context-Based**: Can only modify bookings assigned to them
- **Audit Trail**: All changes logged with user, timestamp, and reason

### Firebase Authentication

- Users authenticate via Firebase Auth on client-side
- Firebase ID tokens are verified server-side
- Include Firebase ID token in requests: `Authorization: Bearer <firebase_id_token>`
- Custom claims store user roles for authorization
- Protected routes require valid Firebase authentication

## 📡 API Endpoints

### Health Check
```
GET /api/health - Server health status
```

### Authentication & User Management
```
POST /api/auth/sync                    - Sync Firebase user to database
GET  /api/auth/profile                 - Get user profile (protected)
POST /api/auth/users                   - Create user in system (Admin only)
GET  /api/auth/users                   - List all users (Admin/Manager)
PUT  /api/auth/users/:uid/role         - Update user role (Admin only)
PUT  /api/auth/users/:uid/deactivate   - Deactivate user (Admin only)
PUT  /api/auth/users/:uid/activate     - Activate user (Admin only)
```

### 🚀 Bulk Booking Import (NEW)
```
POST /api/bookings/import/upload       - Upload Excel/CSV file (Admin/GM)
POST /api/bookings/import/preview      - Preview import data (Admin/GM)
GET  /api/bookings/imports             - Get import history (Admin/GM)
GET  /api/bookings/imports/:id         - Get specific import details (Admin/GM)
GET  /api/bookings/imports/:id/errors  - Download import errors CSV (Admin/GM)
```

### 📱 Mobile App - Advisor Endpoints (NEW)
```
GET  /api/bookings/advisor/my-bookings - Get advisor's assigned bookings
PATCH /api/bookings/:id/status         - Update booking status (Advisor)
POST /api/bookings/:id/remarks         - Add remarks to booking
```

### Enhanced Bookings
```
GET    /api/bookings                   - List bookings (enhanced filtering)
POST   /api/bookings                   - Create booking (universal format)
GET    /api/bookings/:id               - Get booking details (full audit)
PUT    /api/bookings/:id               - Update booking (field-level RBAC)
DELETE /api/bookings/:id               - Delete booking (Admin only)
PATCH  /api/bookings/:id/assign        - Assign advisor to booking (Manager+)
GET    /api/bookings/:id/audit         - Get booking audit history (Manager+)
```

### Enhanced Enquiries (NEW)
```
GET    /api/enquiries              - List enquiries (paginated, filtered)
POST   /api/enquiries              - Create enhanced enquiry
GET    /api/enquiries/:id          - Get enquiry details (with bookings/quotations)
PUT    /api/enquiries/:id          - Update enquiry (Team Lead+)
DELETE /api/enquiries/:id          - Delete enquiry (Manager+)

# Dropdown/Helper Endpoints (NEW)
GET    /api/enquiries/models       - Get available vehicle models by brand
GET    /api/enquiries/variants     - Get available variants (filterable)
GET    /api/enquiries/colors       - Get available colors
GET    /api/enquiries/sources      - Get enquiry source options
```

**Enhanced Enquiry Fields:**
- **Customer Details**: Name, contact, email with validation
- **Vehicle Preferences**: Model, variant, color selection
- **Enquiry Source**: Walk-in, phone, website, social media, referral, etc.
- **Expected Booking Date**: Customer's preferred timeline
- **CA Remarks**: Customer advisor notes
- **Assignment**: Assign to specific team members
- **Status Tracking**: Open, In-Progress, Closed
- **Related Records**: Link to bookings and quotations

### Quotations
```
GET    /api/quotations     - List quotations (paginated)
POST   /api/quotations     - Create quotation (Team Lead+)
GET    /api/quotations/:id - Get quotation details
PUT    /api/quotations/:id - Update quotation (Team Lead+)
DELETE /api/quotations/:id - Delete quotation (Manager+)
```

### Stock
```
GET    /api/stock     - List stock items (paginated)
POST   /api/stock     - Create stock item (Manager+)
GET    /api/stock/:id - Get stock details
PUT    /api/stock/:id - Update stock (Manager+)
DELETE /api/stock/:id - Delete stock (Admin only)
```

## 🌍 Universal Dealership Format

### 🎤 Multi-Brand Support

The system now supports **any automotive dealership brand** with a universal data format:

- **Tata Motors**: Electric vehicles, SUVs, commercial vehicles
- **Maruti Suzuki**: Hatchbacks, sedans, compact SUVs
- **Hyundai**: Premium vehicles, electric models
- **Honda**: Sedans, compact cars, hybrids
- **Toyota**: Luxury vehicles, hybrids, SUVs
- **And any other automotive brand**

### 📋 Universal CSV Format

```csv
zone,region,dealer_code,dealer_name,opty_id,customer_name,customer_phone,customer_email,variant,vc_code,color,fuel_type,transmission,booking_date,division,emp_name,employee_login,finance_required,financer_name,file_login_date,approval_date,stock_availability,status,expected_delivery_date,back_order_status,rto_date,remarks
```

### 🛠️ Auto-Detection Features

- **Brand Detection**: Automatically identifies dealer type from dealer codes
- **Format Adaptation**: Handles different CSV/Excel column variations
- **Dealer Creation**: Creates dealer records automatically from import data
- **Validation**: Comprehensive data validation with detailed error reporting
- **Progress Tracking**: Real-time import status with job queue processing

### 📈 Enhanced Filtering

```bash
# Filter by dealer type
GET /api/bookings?dealer_type=TATA
GET /api/bookings?dealer_type=MARUTI

# Filter by region/zone
GET /api/bookings?zone=North
GET /api/bookings?region=North-3

# Filter by vehicle specifications
GET /api/bookings?fuel_type=ELECTRIC
GET /api/bookings?transmission=MT

# Filter by booking attributes
GET /api/bookings?finance_required=true
GET /api/bookings?status=CONFIRMED
GET /api/bookings?source=BULK_IMPORT
```

## 🔧 Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run start    # Start production server
npm run migrate  # Run database migrations
npm run generate # Generate Prisma client
npm run studio   # Open Prisma Studio
npm run test     # Run test suite
```

## 🛡 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Firebase Auth**: Secure token-based authentication
- **Field-Level RBAC**: Granular permissions by role and field
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Centralized error handling with appropriate HTTP status codes
- **Audit Logging**: Complete audit trail for all booking operations
- **File Upload Security**: Secure file handling with type and size validation

## 📱 Integrations

### Firebase Cloud Messaging (FCM)
- Send push notifications to mobile apps
- Notification templates for common scenarios
- Batch notification support

### OpenAI Chatbot
- AI-powered assistance for dealership staff
- Contextual responses for automotive industry
- Conversation history management

### 📊 Background Processing
- **Bull Queue**: Redis-based job queue for import processing
- **File Processing**: Excel/CSV parsing with validation
- **Error Handling**: Comprehensive error collection and reporting

## 🧪 Testing the API

### 🛠 Testing Tools Included

The project includes several comprehensive testing utilities to help you test all endpoints and role-based permissions:

#### 📋 **Test User Creation Scripts**
```bash
# Method 1: Shell script (Quick setup)
chmod +x create-test-users.sh
./create-test-users.sh

# Method 2: Node.js script (With Firebase integration)
node setup-test-users.js
```

#### 🎯 **Test Users by Role**
| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **ADMIN** | admin@dealership.com | Admin123! | Full system access |
| **GENERAL_MANAGER** | generalmanager@dealership.com | Manager123! | Management oversight, remarks |
| **SALES_MANAGER** | salesmanager@dealership.com | Sales123! | Sales operations, bulk imports |
| **TEAM_LEAD** | teamlead@dealership.com | Lead123! | Team coordination, assignments |
| **CUSTOMER_ADVISOR** | advisor@dealership.com | Advisor123! | Own bookings only, customer interactions |

#### 🔧 **Testing Utilities**
1. **`firebase-token-helper.html`**: Web interface for generating Firebase tokens for each role
2. **`test-api.html`**: Browser-based API testing interface
3. **`Car-Dealership-API.postman_collection.json`**: Complete Postman collection with all endpoints
4. **`create-test-users.sh`**: Shell script to create test users via API
5. **`setup-test-users.js`**: Node.js script for Firebase user creation

### 🚀 Quick Testing Setup

#### Step 1: Start the Server
```bash
npm run dev
```

#### Step 2: Create Test Users
```bash
# Option A: Using shell script
./create-test-users.sh

# Option B: Using Node.js (with Firebase Admin)
node setup-test-users.js
```

#### Step 3: Choose Your Testing Method

**🌐 Browser Testing (Easiest)**
1. Open `test-api.html` in your browser
2. Test basic endpoints without authentication
3. Add Firebase token for protected endpoints

**📬 Postman Testing (Recommended)**
1. Import `Car-Dealership-API.postman_collection.json`
2. Set environment variables:
   - `baseUrl`: http://localhost:4000
   - `firebaseToken`: Get from Firebase Auth
3. Test all endpoints with different role permissions

**🔧 Token Generation**
1. Open `firebase-token-helper.html`
2. Sign in with test user credentials
3. Copy JWT tokens for Postman testing

### 📝 Manual Testing Examples

### 📝 Manual Testing Examples

#### 1. Health Check (No Auth Required)
```bash
# Local access
curl http://localhost:4000/api/health

# Network access (replace with your IP)
curl http://10.69.245.247:4000/api/health
```
**Expected Response:**
```json
{"status": "ok", "message": "Backend running 🚀", "timestamp": "..."}
```

#### 2. Enhanced Enquiry Creation
```bash
curl -X POST http://localhost:4000/api/enquiries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerName": "Amit Sharma",
    "customerContact": "+919876543210",
    "customerEmail": "amit@example.com",
    "model": "Harrier",
    "variant": "XZ Plus",
    "color": "White",
    "source": "WEBSITE",
    "expectedBookingDate": "2024-12-15",
    "caRemarks": "Customer interested in electric variant"
  }'
```

#### 3. Get Vehicle Models by Brand
```bash
curl -X GET http://localhost:4000/api/enquiries/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "modelsByBrand": {
      "TATA": ["Harrier", "Safari", "Nexon"],
      "MARUTI": ["Swift", "Baleno", "Brezza"]
    }
  }
}
```

#### 4. Test User Creation (Admin)
```bash
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@dealership.com",
    "password": "Test123!",
    "roleName": "CUSTOMER_ADVISOR"
  }'
```

#### 5. Bulk Import Testing (Admin/Manager)
```bash
# Upload Excel/CSV file
curl -X POST http://localhost:4000/api/bookings/import/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@fixtures/tata_bookings_sample.xlsx"

# Check import status
curl -X GET http://localhost:4000/api/bookings/imports \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 6. Mobile App - Advisor Testing
```bash
# Get advisor's assigned bookings
curl -X GET http://localhost:4000/api/bookings/advisor/my-bookings \
  -H "Authorization: Bearer YOUR_ADVISOR_TOKEN"

# Update booking status (advisor's own booking)
curl -X PATCH http://localhost:4000/api/bookings/BOOKING_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADVISOR_TOKEN" \
  -d '{"status": "IN_PROGRESS", "notes": "Customer contacted"}'
```

#### 7. Enhanced Filtering Tests
```bash
# Filter by dealer type
curl "http://localhost:4000/api/bookings?dealer_type=TATA" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by multiple parameters
curl "http://localhost:4000/api/bookings?zone=North&status=CONFIRMED&fuel_type=ELECTRIC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 📦 Postman Collection Features

The included Postman collection (`Car-Dealership-API.postman_collection.json`) provides:

✅ **Complete API Coverage**: All endpoints organized by feature
✅ **Environment Variables**: Easy token and URL management
✅ **Role-Based Testing**: Separate requests for different user roles
✅ **Sample Data**: Realistic test data for all operations
✅ **Error Scenarios**: Tests for validation and permission errors

#### **Collection Structure:**
- 🔍 **Health & Info**: Server status checks
- 🔐 **Authentication**: User management and auth flows
- 📊 **Bookings**: CRUD operations and filtering
- 📱 **Mobile - Advisor**: Advisor-specific endpoints
- 📋 **Bulk Import**: File upload and processing
- 📈 **Admin Operations**: System management

#### **Quick Postman Setup:**
1. **Import Collection**: Import the JSON file into Postman
2. **Set Variables**:
   ```
   baseUrl: http://localhost:4000
   firebaseToken: <your-jwt-token>
   ```
3. **Test Different Roles**: Switch tokens to test role permissions
4. **Run Collection**: Execute all tests or specific folders

### 🔧 Development Testing Workflow

1. **Start Development Server**: `npm run dev`
2. **Check Server Health**: Use browser or curl to test `/api/health`
3. **Create Test Users**: Run `./create-test-users.sh`
4. **Generate Tokens**: Use `firebase-token-helper.html` to get JWT tokens
5. **Test APIs**: Use Postman collection or `test-api.html`
6. **Test Role Permissions**: Switch between different user tokens
7. **Test Bulk Import**: Upload sample Excel/CSV files
8. **Verify Data**: Check Prisma Studio at http://localhost:5555

## 🚀 Production Deployment

### Prerequisites
1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Set up PostgreSQL database and run migrations
3. **Redis**: Set up Redis for job queue processing
4. **Firebase**: Configure Firebase Admin SDK credentials
5. **File Storage**: Configure secure file upload directory with proper permissions

### Deployment Steps
1. **Seed Data**: Run RBAC and sample data seeding scripts
   ```bash
   npx tsx prisma/seed-rbac.ts
   npx tsx prisma/seed-universal.ts
   ```
2. **Build**: Run `npm run build` to compile TypeScript
3. **Start**: Use `npm start` to run the production server
4. **Process Manager**: Consider using PM2 for production process management
5. **Testing**: Verify all endpoints using the included testing tools

### 📦 Project Files Overview

#### **Core Application**
- `src/`: Main application source code
- `prisma/`: Database schema and migrations
- `dist/`: Compiled TypeScript output
- `fixtures/`: Sample data files for testing

#### **Testing & Development Tools**
- `create-test-users.sh`: Quick test user creation script
- `setup-test-users.js`: Advanced Firebase user setup
- `firebase-token-helper.html`: Token generation interface
- `test-api.html`: Browser-based API testing
- `Car-Dealership-API.postman_collection.json`: Complete Postman collection

#### **Configuration**
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `jest.config.json`: Testing configuration
- `nodemon.json`: Development server configuration

## 📊 Key Features Implemented

✅ **Universal Dealership Support**: Works with any automotive brand (Tata, Maruti, Hyundai, Honda, Toyota, etc.)
✅ **Bulk Import System**: Excel/CSV import with validation and error reporting
✅ **Field-Level RBAC**: Granular permissions by role and field
✅ **Mobile App APIs**: Dedicated endpoints for advisor mobile applications
✅ **Audit Trail System**: Complete history tracking for all booking operations
✅ **Background Processing**: Async job queue for import processing
✅ **Enhanced Filtering**: Multi-dimensional booking filtering and search
✅ **Multi-Brand Dashboard**: Unified view across all dealership types

## 📝 Next Steps (Phase 2)

- [x] Add comprehensive field-level RBAC system
- [x] Implement bulk booking import functionality  
- [x] Add mobile app APIs for advisors
- [x] Create universal dealership format support
- [x] Add audit logging and history tracking
- [ ] Add comprehensive unit and integration tests
- [ ] Implement API rate limiting
- [ ] Add API documentation with Swagger/OpenAPI
- [ ] Set up logging with Winston
- [ ] Add monitoring and health checks
- [ ] Implement caching with Redis
- [ ] Set up CI/CD pipeline
- [ ] Add real-time notifications for status updates

## 🤝 Contributing

1. Follow TypeScript best practices
2. Implement proper error handling
3. Add input validation for all endpoints
4. Update this README for any new features
5. Ensure backward compatibility

## 📄 License

ISC License - see package.json for details.
# Force redeploy Sat Oct 11 12:26:22 IST 2025
