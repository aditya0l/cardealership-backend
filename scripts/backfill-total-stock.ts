import prisma from '../src/config/db';

async function backfillTotalStock() {
  console.log('🔧 Starting total stock backfill...\n');

  try {
    // Get all vehicles with raw query to handle schema mismatch
    const vehicles = await prisma.$queryRaw`
      SELECT id, variant, zawl_stock, ras_stock, regional_stock, plant_stock, total_stock
      FROM "Vehicle"
    ` as Array<{
      id: string;
      variant: string | null;
      zawl_stock: number | boolean;
      ras_stock: number | boolean;
      regional_stock: number | boolean;
      plant_stock: number | boolean;
      total_stock: number | boolean;
    }>;

    console.log(`Found ${vehicles.length} vehicles\n`);

    let updated = 0;

    for (const vehicle of vehicles) {
      // Convert boolean to number if needed (for old schema compatibility)
      const zawlStock = typeof vehicle.zawl_stock === 'boolean' ? (vehicle.zawl_stock ? 1 : 0) : vehicle.zawl_stock;
      const rasStock = typeof vehicle.ras_stock === 'boolean' ? (vehicle.ras_stock ? 1 : 0) : vehicle.ras_stock;
      const regionalStock = typeof vehicle.regional_stock === 'boolean' ? (vehicle.regional_stock ? 1 : 0) : vehicle.regional_stock;
      const plantStock = typeof vehicle.plant_stock === 'boolean' ? (vehicle.plant_stock ? 1 : 0) : vehicle.plant_stock;
      const currentTotalStock = typeof vehicle.total_stock === 'boolean' ? (vehicle.total_stock ? 1 : 0) : vehicle.total_stock;

      // Calculate totalStock from all locations
      const totalStock = zawlStock + rasStock + regionalStock + plantStock;

      // Only update if totalStock is different
      if (currentTotalStock !== totalStock) {
        await prisma.$executeRaw`
          UPDATE "Vehicle" 
          SET total_stock = ${totalStock}
          WHERE id = ${vehicle.id}
        `;

        console.log(`✅ ${vehicle.variant || 'Vehicle'} (${vehicle.id}): ${currentTotalStock} → ${totalStock}`);
        updated++;
      }
    }

    console.log(`\n🎉 Backfill complete! ${updated} vehicles updated.`);
    
    // Show summary using raw query
    const summary = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN total_stock > 0 THEN 1 END) as in_stock,
        COUNT(CASE WHEN total_stock = 0 THEN 1 END) as out_of_stock
      FROM "Vehicle"
    ` as Array<{
      total_vehicles: bigint;
      in_stock: bigint;
      out_of_stock: bigint;
    }>;

    const stats = summary[0];
    console.log('\n📊 Stock Summary:');
    console.log(`  Total Vehicles: ${stats.total_vehicles}`);
    console.log(`  In Stock: ${stats.in_stock}`);
    console.log(`  Out of Stock: ${stats.out_of_stock}`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  }
}

backfillTotalStock()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

