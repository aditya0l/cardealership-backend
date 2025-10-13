import { PrismaClient, DealershipType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDealerships() {
  console.log('🌱 Seeding dealerships and catalogs...\n');

  // Create sample dealership
  const dealership = await prisma.dealership.upsert({
    where: { code: 'TATA-MUM-001' },
    update: {},
    create: {
      name: 'Mumbai Tata Motors',
      code: 'TATA-MUM-001',
      type: DealershipType.TATA,
      email: 'contact@mumbaitata.com',
      phone: '+91-22-12345678',
      address: '123 Mumbai Highway',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstNumber: '27AABCT1234A1Z5',
      panNumber: 'AABCT1234A',
      brands: ['TATA'],
      isActive: true,
      onboardingCompleted: true
    }
  });

  console.log('✅ Dealership created:', dealership.name);

  // Add TATA Nexon to catalog
  const nexonCatalog = await prisma.vehicleCatalog.upsert({
    where: {
      dealershipId_brand_model: {
        dealershipId: dealership.id,
        brand: 'TATA',
        model: 'Nexon'
      }
    },
    update: {},
    create: {
      dealershipId: dealership.id,
      brand: 'TATA',
      model: 'Nexon',
      isActive: true,
      variants: [
        {
          name: 'XZ+ Lux Petrol AT',
          vcCode: 'NXN-XZ-LUX-P-AT',
          fuelTypes: ['Petrol'],
          transmissions: ['Automatic'],
          colors: [
            { name: 'Flame Red', code: 'FR', additionalCost: 0, isAvailable: true },
            { name: 'Daytona Grey', code: 'DG', additionalCost: 5000, isAvailable: true },
            { name: 'Pure White', code: 'PW', additionalCost: 0, isAvailable: true }
          ],
          exShowroomPrice: 1149000,
          rtoCharges: 85000,
          insurance: 45000,
          accessories: 15000,
          onRoadPrice: 1294000,
          isAvailable: true
        },
        {
          name: 'XZ+ Diesel MT',
          vcCode: 'NXN-XZ-D-MT',
          fuelTypes: ['Diesel'],
          transmissions: ['Manual'],
          colors: [
            { name: 'Flame Red', code: 'FR', additionalCost: 0, isAvailable: true },
            { name: 'Daytona Grey', code: 'DG', additionalCost: 5000, isAvailable: true }
          ],
          exShowroomPrice: 1099000,
          rtoCharges: 85000,
          insurance: 45000,
          accessories: 15000,
          onRoadPrice: 1244000,
          isAvailable: true
        },
        {
          name: 'XZ+ EV',
          vcCode: 'NXN-XZ-EV',
          fuelTypes: ['Electric'],
          transmissions: ['Automatic'],
          colors: [
            { name: 'Daytona Grey', code: 'DG', additionalCost: 0, isAvailable: true },
            { name: 'Jet Blue', code: 'JB', additionalCost: 5000, isAvailable: true }
          ],
          exShowroomPrice: 1399000,
          rtoCharges: 65000,
          insurance: 55000,
          accessories: 20000,
          onRoadPrice: 1539000,
          isAvailable: true
        }
      ]
    }
  });

  console.log('✅ Nexon catalog created with 3 variants');

  // Add TATA Harrier to catalog
  const harrierCatalog = await prisma.vehicleCatalog.upsert({
    where: {
      dealershipId_brand_model: {
        dealershipId: dealership.id,
        brand: 'TATA',
        model: 'Harrier'
      }
    },
    update: {},
    create: {
      dealershipId: dealership.id,
      brand: 'TATA',
      model: 'Harrier',
      isActive: true,
      variants: [
        {
          name: 'XZ+ Diesel AT',
          vcCode: 'HAR-XZ-D-AT',
          fuelTypes: ['Diesel'],
          transmissions: ['Automatic'],
          colors: [
            { name: 'Orcus White', code: 'OW', additionalCost: 0, isAvailable: true },
            { name: 'Calypso Red', code: 'CR', additionalCost: 10000, isAvailable: true }
          ],
          exShowroomPrice: 1799000,
          rtoCharges: 120000,
          insurance: 65000,
          accessories: 25000,
          onRoadPrice: 2009000,
          isAvailable: true
        }
      ]
    }
  });

  console.log('✅ Harrier catalog created with 1 variant');

  console.log('\n🎉 Dealership seeding complete!');
  console.log(`   Dealership: ${dealership.name} (${dealership.code})`);
  console.log(`   Catalog entries: 2 models, 4 variants`);
}

seedDealerships()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

