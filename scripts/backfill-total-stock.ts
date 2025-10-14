import prisma from '../src/config/db';

async function backfillTotalStock() {
  console.log('🔧 Starting total stock backfill...\n');

  // Get all vehicles
  const vehicles = await prisma.vehicle.findMany();

  console.log(`Found ${vehicles.length} vehicles\n`);

  let updated = 0;

  for (const vehicle of vehicles) {
    // Calculate totalStock from all locations
    const totalStock = vehicle.zawlStock + vehicle.rasStock + vehicle.regionalStock + vehicle.plantStock;

    // Only update if totalStock is different
    if (vehicle.totalStock !== totalStock) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { totalStock }
      });

      console.log(`✅ ${vehicle.variant || 'Vehicle'} (${vehicle.id}): ${vehicle.totalStock} → ${totalStock}`);
      updated++;
    }
  }

  console.log(`\n🎉 Backfill complete! ${updated} vehicles updated.`);
  
  // Show summary
  const totalVehicles = await prisma.vehicle.count();
  const inStock = await prisma.vehicle.count({
    where: { totalStock: { gt: 0 } }
  });
  const outOfStock = await prisma.vehicle.count({
    where: { totalStock: 0 }
  });

  console.log('\n📊 Stock Summary:');
  console.log(`  Total Vehicles: ${totalVehicles}`);
  console.log(`  In Stock: ${inStock}`);
  console.log(`  Out of Stock: ${outOfStock}`);
}

backfillTotalStock()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

