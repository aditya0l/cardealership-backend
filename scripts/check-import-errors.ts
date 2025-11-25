import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImportErrors() {
  console.log('🔍 Checking import errors...\n');

  try {
    // Get most recent import
    const recentImport = await prisma.bookingImport.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            name: true,
            email: true,
            dealershipId: true
          }
        }
      }
    });

    if (!recentImport) {
      console.log('❌ No imports found');
      return;
    }

    console.log(`📊 Most recent import: ${recentImport.id}`);
    console.log(`   Status: ${recentImport.status}`);
    console.log(`   Successful: ${recentImport.successfulRows || 0}`);
    console.log(`   Failed: ${recentImport.failedRows || 0}`);
    console.log(`   Admin: ${recentImport.admin.name} (${recentImport.admin.dealershipId})\n`);

    // Get import errors
    const errors = await prisma.bookingImportError.findMany({
      where: { importId: recentImport.id },
      take: 20,
      orderBy: { rowNumber: 'asc' }
    });

    console.log(`❌ Import errors found: ${errors.length}\n`);
    console.log('First 20 errors:');
    errors.forEach((error, index) => {
      console.log(`\n${index + 1}. Row ${error.rowNumber}:`);
      console.log(`   Error: ${error.errorMessage}`);
      console.log(`   Type: ${error.errorType}`);
      if (error.fieldErrors) {
        console.log(`   Field Errors: ${JSON.stringify(error.fieldErrors, null, 2)}`);
      }
    });

    // Check error summary
    if (recentImport.errorSummary) {
      console.log(`\n📋 Error Summary:`);
      console.log(JSON.stringify(recentImport.errorSummary, null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkImportErrors();

