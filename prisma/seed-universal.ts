import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize roles first
const initializeRoles = async () => {
  const roles = [
    { name: RoleName.ADMIN },
    { name: RoleName.GENERAL_MANAGER },
    { name: RoleName.SALES_MANAGER },
    { name: RoleName.TEAM_LEAD },
    { name: RoleName.CUSTOMER_ADVISOR }
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData
    });
  }
  console.log('✅ Initialized system roles');
};

// Sample dealers for universal format
const universalDealers = [
  { dealerCode: 'TATA001', dealerName: 'Tata Motors Downtown', zone: 'North', region: 'North 1', dealerType: 'TATA' },
  { dealerCode: 'MARUTI001', dealerName: 'Maruti Premium Motors', zone: 'West', region: 'West 1', dealerType: 'MARUTI' },
  { dealerCode: 'HYUNDAI001', dealerName: 'Hyundai Elite Showroom', zone: 'South', region: 'South 1', dealerType: 'HYUNDAI' },
  { dealerCode: 'HONDA001', dealerName: 'Honda Auto Center', zone: 'East', region: 'East 1', dealerType: 'HONDA' },
  { dealerCode: 'TOYOTA001', dealerName: 'Toyota Premium Plaza', zone: 'Central', region: 'Central 1', dealerType: 'TOYOTA' }
];

// Universal vehicle inventory
const universalVehicles = [
  { variant: 'Tata Harrier EV Adventure', fuelType: 'ELECTRIC', exShowroomPrice: 2500000, dealerType: 'TATA' },
  { variant: 'Maruti Swift VXI', fuelType: 'PETROL', exShowroomPrice: 800000, dealerType: 'MARUTI' },
  { variant: 'Hyundai Creta SX', fuelType: 'DIESEL', exShowroomPrice: 1500000, dealerType: 'HYUNDAI' },
  { variant: 'Honda City ZX', fuelType: 'PETROL', exShowroomPrice: 1200000, dealerType: 'HONDA' },
  { variant: 'Toyota Camry Hybrid', fuelType: 'HYBRID', exShowroomPrice: 4500000, dealerType: 'TOYOTA' }
];

// Sample users
const sampleUsers = [
  { name: 'John Smith', email: 'john.admin@dealership.com', role: 'ADMIN' },
  { name: 'Sarah Johnson', email: 'sarah.manager@dealership.com', role: 'GENERAL_MANAGER' },
  { name: 'Mike Wilson', email: 'mike.manager@dealership.com', role: 'SALES_MANAGER' },
  { name: 'Emily Davis', email: 'emily.lead@dealership.com', role: 'TEAM_LEAD' },
  { name: 'Robert Brown', email: 'robert.lead@dealership.com', role: 'TEAM_LEAD' },
  { name: 'Jessica Garcia', email: 'jessica.advisor@dealership.com', role: 'CUSTOMER_ADVISOR' },
  { name: 'David Miller', email: 'david.advisor@dealership.com', role: 'CUSTOMER_ADVISOR' },
  { name: 'Lisa Anderson', email: 'lisa.advisor@dealership.com', role: 'CUSTOMER_ADVISOR' },
  { name: 'James Taylor', email: 'james.advisor@dealership.com', role: 'CUSTOMER_ADVISOR' },
  { name: 'Maria Rodriguez', email: 'maria.advisor@dealership.com', role: 'CUSTOMER_ADVISOR' }
];

// Sample bookings with universal format
const sampleBookings = [
  { 
    customerName: 'Rajesh Kumar', 
    customerPhone: '+919876543210',
    variant: 'Tata Harrier EV Adventure',
    zone: 'North',
    region: 'North 1'
  },
  { 
    customerName: 'Priya Sharma', 
    customerPhone: '+919876543211',
    variant: 'Maruti Swift VXI',
    zone: 'West',
    region: 'West 1'
  },
  { 
    customerName: 'Amit Patel', 
    customerPhone: '+919876543212',
    variant: 'Hyundai Creta SX',
    zone: 'South',
    region: 'South 1'
  },
  { 
    customerName: 'Sneha Singh', 
    customerPhone: '+919876543213',
    variant: 'Honda City ZX',
    zone: 'East',
    region: 'East 1'
  },
  { 
    customerName: 'Vikram Reddy', 
    customerPhone: '+919876543214',
    variant: 'Toyota Camry Hybrid',
    zone: 'Central',
    region: 'Central 1'
  }
];

async function main() {
  console.log('🌱 Starting universal dealership database seeding...');

  try {
    // Initialize roles first
    await initializeRoles();
    
    // Clear existing data in reverse order of dependencies
    console.log('🧹 Cleaning existing data...');
    await prisma.bookingAuditLog.deleteMany();
    await prisma.bookingImportError.deleteMany();
    await prisma.bookingImport.deleteMany();
    await prisma.quotation.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.enquiry.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.dealer.deleteMany();
    await prisma.user.deleteMany();

    console.log('🏢 Creating universal dealers...');
    const dealers: any[] = [];
    for (const dealerData of universalDealers) {
      const dealer = await prisma.dealer.create({
        data: dealerData
      });
      dealers.push(dealer);
      console.log(`✅ Created dealer: ${dealer.dealerName} (${dealer.dealerType})`);
    }

    console.log('👥 Creating sample users...');
    const users: any[] = [];
    
    for (const userData of sampleUsers) {
      // Get the role first
      const role = await prisma.role.findUnique({
        where: { name: userData.role as any }
      });

      if (!role) {
        console.error(`Role ${userData.role} not found. Make sure roles are initialized.`);
        continue;
      }

      // Create a unique Firebase UID for demo purposes
      const firebaseUid = `demo_${userData.email.replace('@', '_').replace('.', '_')}`;

      const user = await prisma.user.create({
        data: {
          firebaseUid,
          name: userData.name,
          email: userData.email,
          roleId: role.id
        },
        include: { role: true }
      });

      users.push(user);
      console.log(`✅ Created user: ${user.name} (${user.role.name})`);
    }

    console.log('🚗 Creating universal vehicle inventory...');
    const vehicles: any[] = [];
    for (const vehicleData of universalVehicles) {
      const vehicle = await prisma.vehicle.create({
        data: {
          ...vehicleData,
          finalBillingPrice: vehicleData.exShowroomPrice * 0.95,
          onRoadPrice: vehicleData.exShowroomPrice * 1.15,
          transmission: 'MT',
          isActive: true
        }
      });
      vehicles.push(vehicle);
      console.log(`✅ Added vehicle: ${vehicle.variant} - ₹${vehicle.exShowroomPrice?.toLocaleString()}`);
    }

    console.log('📋 Creating sample enquiries...');
    const enquiries: any[] = [];
    const enquiryData = [
      'Looking for an electric vehicle',
      'Need a family car under 15 lakhs',
      'Interested in luxury sedan',
      'Compact car for city driving',
      'Hybrid vehicle for fuel efficiency'
    ];

    for (let i = 0; i < enquiryData.length; i++) {
      const admin = users.find(u => u.role.name === 'ADMIN');
      const advisor = users.find(u => u.role.name === 'CUSTOMER_ADVISOR');
      
      if (!admin || !advisor) continue;

      const enquiry = await prisma.enquiry.create({
        data: {
          customerName: `Customer ${i + 1}`,
          customerContact: `+9198765432${i.toString().padStart(2, '0')}`,
          customerEmail: `customer${i + 1}@example.com`,
          model: ['Tata Harrier', 'Maruti Swift', 'Hyundai Creta', 'Honda City', 'Toyota Camry'][i],
          variant: ['EV Adventure', 'VXI', 'SX', 'ZX', 'Hybrid'][i],
          color: ['White', 'Black', 'Silver', 'Red', 'Blue'][i],
          source: 'WALK_IN',
          caRemarks: enquiryData[i],
          status: ['OPEN', 'IN_PROGRESS', 'CLOSED'][Math.floor(Math.random() * 3)] as any,
          assignedToUserId: advisor.firebaseUid,
          createdByUserId: admin.firebaseUid
        }
      });

      enquiries.push(enquiry);
      console.log(`✅ Created enquiry: "${enquiry.customerName}" (${enquiry.status})`);
    }

    console.log('📅 Creating sample bookings with universal format...');
    const bookings: any[] = [];
    
    for (let i = 0; i < sampleBookings.length; i++) {
      const bookingData = sampleBookings[i];
      const dealer = dealers[i % dealers.length];
      const advisor = users.find(u => u.role.name === 'CUSTOMER_ADVISOR');
      
      const booking = await prisma.booking.create({
        data: {
          // Universal Dealer Fields
          zone: bookingData.zone,
          region: bookingData.region,
          dealerCode: dealer.dealerCode,
          dealerId: dealer.id,
          
          // Customer Information
          optyId: `UNI-${Date.now()}-${i}`,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          
          // Vehicle Information
          variant: bookingData.variant,
          fuelType: universalVehicles[i].fuelType,
          
          // Booking Details
          bookingDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString(), // Staggered dates
          status: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'][Math.floor(Math.random() * 3)] as any,
          
          // Employee/Division
          advisorId: advisor?.firebaseUid,
          empName: advisor?.name,
          
          // System Fields
          source: 'MANUAL',
          remarks: `Universal format booking for ${bookingData.variant}`
        }
      });

      console.log(`✅ Created booking: ${booking.customerName} for ${booking.variant} (${booking.status})`);
      bookings.push(booking);
    }

    console.log('💰 Creating sample quotations...');
    for (let i = 0; i < Math.min(enquiries.length, 3); i++) {
      const enquiry = enquiries[i];
      const vehicle = vehicles[i];
      
      const quotation = await prisma.quotation.create({
        data: {
          enquiryId: enquiry.id,
          amount: vehicle.exShowroomPrice || 1000000,
          status: ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any
        }
      });

      console.log(`✅ Created quotation: ₹${quotation.amount.toLocaleString()} for "${enquiry.customerName}" (${quotation.status})`);
    }

    console.log('\n🎉 Universal dealership database seeding completed successfully!\n');

    console.log('📊 Summary:');
    console.log(`   🏢 Dealers: ${dealers.length} (Multi-brand: Tata, Maruti, Hyundai, Honda, Toyota)`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🚗 Vehicles: ${vehicles.length}`);
    console.log(`   📋 Enquiries: ${enquiries.length}`);
    console.log(`   📅 Bookings: ${bookings.length}`);

    console.log('\n🚀 Your universal dealership system is ready!\n');

    console.log('💡 Key Features:');
    console.log('   ✅ Multi-brand dealer support (Tata, Maruti, Hyundai, Honda, Toyota)');
    console.log('   ✅ Universal booking format with zone/region tracking');
    console.log('   ✅ Complete customer and vehicle information');
    console.log('   ✅ Finance and delivery management');
    console.log('   ✅ Employee and division assignments');
    console.log('   ✅ Comprehensive pricing and inventory');

    console.log('\n🔗 Next Steps:');
    console.log('   1. Visit http://localhost:5555 to view database (Prisma Studio)');
    console.log('   2. Upload dealership CSV/Excel files using universal format');
    console.log('   3. Test import endpoints with multi-brand data');
    console.log('   4. Configure mobile app for advisor status updates');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
