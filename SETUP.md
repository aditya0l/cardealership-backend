# Car Dealership Backend Setup Guide 🚗

## Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory with:

```env
# Environment Configuration
NODE_ENV=development
PORT=4000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/car_dealership_db"

# Firebase Configuration (Required for Authentication)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_firebase_private_key_here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/

# OpenAI Configuration (Optional - for chatbot features)
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run generate

# Run database migrations
npm run migrate

# Seed the database with fake data
npm run seed
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🎯 What the Seed Data Includes

### Users (10 total)
- **1 Admin**: John Smith
- **2 Managers**: Sarah Johnson, Mike Wilson  
- **2 Team Leads**: Emily Davis, Robert Brown
- **5 Advisors**: Jessica, David, Lisa, James, Maria

### Stock Inventory (25 vehicles)
- **Economy Cars**: Toyota Camry, Honda Civic, Nissan Altima, etc.
- **SUVs**: Toyota RAV4, Honda CR-V, Mazda CX-5, etc.
- **Luxury**: BMW 3 Series, Mercedes C-Class, Audi A4, etc.
- **Trucks**: Ford F-150, Chevrolet Silverado, Toyota Tacoma, etc.
- **Electric/Hybrid**: Tesla Model 3, Toyota Prius, Nissan Leaf, etc.

### Sample Data
- **10 Enquiries**: Various customer inquiries with realistic scenarios
- **8 Bookings**: Customer bookings linked to enquiries
- **6 Quotations**: Price quotes with realistic amounts

## 🧪 Testing the API

After seeding, test these endpoints:

```bash
# Health check
GET http://localhost:4000/api/health

# View stock
GET http://localhost:4000/api/stock

# View enquiries
GET http://localhost:4000/api/enquiries

# View bookings
GET http://localhost:4000/api/bookings

# View quotations
GET http://localhost:4000/api/quotations
```

## 🔄 Useful Commands

```bash
# Reset database and reseed
npm run db:reset

# Just reseed without reset
npm run db:seed

# Open Prisma Studio (database GUI)
npm run studio

# View logs in development
npm run dev
```

## 🔑 Authentication Notes

- The seeded users have demo Firebase UIDs
- For testing with real authentication, use the test endpoint:
  ```bash
  POST /api/auth/test-user
  ```
- Or set up proper Firebase authentication in your frontend

## 📊 Database Structure

- **Users** → **Enquiries** (created/assigned)
- **Enquiries** → **Bookings** (one-to-many)
- **Enquiries** → **Quotations** (one-to-many)
- **Stock** (independent inventory)

## 🚀 Next Steps

1. Set up your `.env` file
2. Run the setup commands
3. Test the endpoints
4. Start building your frontend!

Your backend is now ready with realistic fake data for development and testing! 🎉
