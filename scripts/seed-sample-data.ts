import prisma from '../src/config/db';

async function seedSampleData() {
  console.log('🌱 Seeding sample data...\n');

  // 1. Create Models
  console.log('📋 Creating models...');
  
  const models = await Promise.all([
    prisma.model.upsert({
      where: { brand_modelName: { brand: 'Tata', modelName: 'Nexon' } },
      update: {},
      create: {
        brand: 'Tata',
        modelName: 'Nexon',
        segment: 'Compact SUV',
        description: 'Tata Nexon - Compact SUV with turbocharged engines',
        basePrice: 800000
      }
    }),
    prisma.model.upsert({
      where: { brand_modelName: { brand: 'Tata', modelName: 'Harrier' } },
      update: {},
      create: {
        brand: 'Tata',
        modelName: 'Harrier',
        segment: 'Mid-size SUV',
        description: 'Tata Harrier - Premium mid-size SUV',
        basePrice: 1500000
      }
    }),
    prisma.model.upsert({
      where: { brand_modelName: { brand: 'Tata', modelName: 'Safari' } },
      update: {},
      create: {
        brand: 'Tata',
        modelName: 'Safari',
        segment: 'Full-size SUV',
        description: 'Tata Safari - Flagship 7-seater SUV',
        basePrice: 1600000
      }
    })
  ]);

  console.log(`✅ Created ${models.length} models\n`);

  // 2. Update existing vehicles with stock quantities
  console.log('📦 Updating vehicle stock quantities...');
  
  const vehicles = await prisma.vehicle.findMany();
  
  for (const vehicle of vehicles) {
    // Assign random stock quantities for demo
    const zawlStock = Math.floor(Math.random() * 10) + 5; // 5-14 units
    const rasStock = Math.floor(Math.random() * 8) + 2;   // 2-9 units
    const regionalStock = Math.floor(Math.random() * 5);  // 0-4 units
    const plantStock = Math.floor(Math.random() * 15);    // 0-14 units
    const totalStock = zawlStock + rasStock + regionalStock + plantStock;

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        zawlStock,
        rasStock,
        regionalStock,
        plantStock,
        totalStock,
        modelId: models[0].id // Link to Nexon model for now
      }
    });

    console.log(`✅ ${vehicle.variant}: Total stock = ${totalStock} (ZAWL:${zawlStock} RAS:${rasStock} Regional:${regionalStock} Plant:${plantStock})`);
  }

  console.log('\n🎉 Sample data seeded successfully!');
  
  // Summary
  const stats = {
    models: await prisma.model.count(),
    vehicles: await prisma.vehicle.count(),
    vehiclesInStock: await prisma.vehicle.count({ where: { totalStock: { gt: 0 } } }),
    totalStockUnits: await prisma.vehicle.aggregate({
      _sum: { totalStock: true }
    })
  };

  console.log('\n📊 Database Summary:');
  console.log(`  Models: ${stats.models}`);
  console.log(`  Vehicles: ${stats.vehicles}`);
  console.log(`  Vehicles in Stock: ${stats.vehiclesInStock}`);
  console.log(`  Total Stock Units: ${stats.totalStockUnits._sum.totalStock || 0}`);
}

seedSampleData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

