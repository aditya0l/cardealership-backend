#!/usr/bin/env ts-node

/**
 * Migrate data from local database to Render database
 * 
 * Usage:
 *   RENDER_DATABASE_URL="postgresql://..." npm run migrate:local-to-render
 * 
 * Or set RENDER_DATABASE_URL in .env file
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Local database (from DATABASE_URL in .env)
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Render database (from RENDER_DATABASE_URL or command line)
const renderDatabaseUrl = process.env.RENDER_DATABASE_URL || process.argv[2];

if (!renderDatabaseUrl) {
  console.error('❌ RENDER_DATABASE_URL is required!');
  console.error('\nUsage:');
  console.error('  RENDER_DATABASE_URL="postgresql://..." npm run migrate:local-to-render');
  console.error('  Or set RENDER_DATABASE_URL in .env file');
  process.exit(1);
}

const renderPrisma = new PrismaClient({
  datasources: {
    db: {
      url: renderDatabaseUrl,
    },
  },
});

async function migrateData() {
  console.log('🚀 Starting data migration from local to Render database...\n');
  console.log('📊 Local DB:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  console.log('☁️  Render DB:', renderDatabaseUrl.substring(0, 50) + '...\n');

  try {
    // Step 1: Test connections
    console.log('🔌 Step 1: Testing database connections...');
    await localPrisma.$connect();
    console.log('✅ Local database connected');
    
    await renderPrisma.$connect();
    console.log('✅ Render database connected\n');

    // Step 2: Check current data
    console.log('📊 Step 2: Checking current data...');
    const localUsers = await localPrisma.user.count();
    const localRoles = await localPrisma.role.count();
    const localDealers = await localPrisma.dealer.count();
    const localEnquiries = await localPrisma.enquiry.count();
    const localBookings = await localPrisma.booking.count();
    
    console.log(`   Local DB: ${localUsers} users, ${localRoles} roles, ${localDealers} dealers, ${localEnquiries} enquiries, ${localBookings} bookings`);
    
    const renderUsers = await renderPrisma.user.count();
    const renderRoles = await renderPrisma.role.count();
    const renderDealers = await renderPrisma.dealer.count();
    const renderEnquiries = await renderPrisma.enquiry.count();
    const renderBookings = await renderPrisma.booking.count();
    
    console.log(`   Render DB: ${renderUsers} users, ${renderRoles} roles, ${renderDealers} dealers, ${renderEnquiries} enquiries, ${renderBookings} bookings\n`);

    // Step 3: Migrate Roles (must be first due to foreign keys)
    console.log('📦 Step 3: Migrating Roles...');
    const roles = await localPrisma.role.findMany();
    for (const role of roles) {
      await renderPrisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: {
          id: role.id,
          name: role.name,
        },
      });
    }
    console.log(`✅ Migrated ${roles.length} roles\n`);

    // Step 4: Migrate Dealers
    console.log('📦 Step 4: Migrating Dealers...');
    const dealers = await localPrisma.dealer.findMany();
    for (const dealer of dealers) {
      await renderPrisma.dealer.upsert({
        where: { id: dealer.id },
        update: {
          name: dealer.name,
          brand: dealer.brand,
          address: dealer.address,
          city: dealer.city,
          state: dealer.state,
          pincode: dealer.pincode,
          phone: dealer.phone,
          email: dealer.email,
          isActive: dealer.isActive,
        },
        create: dealer,
      });
    }
    console.log(`✅ Migrated ${dealers.length} dealers\n`);

    // Step 5: Migrate Users
    console.log('📦 Step 5: Migrating Users...');
    const users = await localPrisma.user.findMany({
      include: {
        role: true,
      },
    });
    for (const user of users) {
      await renderPrisma.user.upsert({
        where: { firebaseUid: user.firebaseUid },
        update: {
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          dealershipId: user.dealershipId,
          managerId: user.managerId,
          isActive: user.isActive,
          fcmToken: user.fcmToken,
          deviceType: user.deviceType,
          lastTokenUpdated: user.lastTokenUpdated,
        },
        create: {
          firebaseUid: user.firebaseUid,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          dealershipId: user.dealershipId,
          managerId: user.managerId,
          isActive: user.isActive,
          fcmToken: user.fcmToken,
          deviceType: user.deviceType,
          lastTokenUpdated: user.lastTokenUpdated,
        },
      });
    }
    console.log(`✅ Migrated ${users.length} users\n`);

    // Step 6: Migrate Models (if any)
    console.log('📦 Step 6: Migrating Models...');
    const models = await localPrisma.model.findMany();
    for (const model of models) {
      await renderPrisma.model.upsert({
        where: { id: model.id },
        update: {
          name: model.name,
          brand: model.brand,
          category: model.category,
        },
        create: model,
      });
    }
    console.log(`✅ Migrated ${models.length} models\n`);

    // Step 7: Migrate Vehicles (if any)
    console.log('📦 Step 7: Migrating Vehicles...');
    const vehicles = await localPrisma.vehicle.findMany();
    for (const vehicle of vehicles) {
      await renderPrisma.vehicle.upsert({
        where: { id: vehicle.id },
        update: {
          modelId: vehicle.modelId,
          variant: vehicle.variant,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          color: vehicle.color,
          exShowroomPrice: vehicle.exShowroomPrice,
          onRoadPrice: vehicle.onRoadPrice,
          stockAvailability: vehicle.stockAvailability,
          dealerId: vehicle.dealerId,
        },
        create: vehicle,
      });
    }
    console.log(`✅ Migrated ${vehicles.length} vehicles\n`);

    // Step 8: Migrate Enquiries
    console.log('📦 Step 8: Migrating Enquiries...');
    const enquiries = await localPrisma.enquiry.findMany();
    for (const enquiry of enquiries) {
      await renderPrisma.enquiry.upsert({
        where: { id: enquiry.id },
        update: {
          customerName: enquiry.customerName,
          customerPhone: enquiry.customerPhone,
          customerEmail: enquiry.customerEmail,
          source: enquiry.source,
          model: enquiry.model,
          variant: enquiry.variant,
          color: enquiry.color,
          fuelType: enquiry.fuelType,
          status: enquiry.status,
          category: enquiry.category,
          assignedToId: enquiry.assignedToId,
          createdById: enquiry.createdById,
          expectedBookingDate: enquiry.expectedBookingDate,
          nextFollowUpDate: enquiry.nextFollowUpDate,
          caRemarks: enquiry.caRemarks,
          isImportedFromQuotation: enquiry.isImportedFromQuotation,
          quotationImportedAt: enquiry.quotationImportedAt,
          dealerId: enquiry.dealerId,
        },
        create: enquiry,
      });
    }
    console.log(`✅ Migrated ${enquiries.length} enquiries\n`);

    // Step 9: Migrate Bookings
    console.log('📦 Step 9: Migrating Bookings...');
    const bookings = await localPrisma.booking.findMany();
    for (const booking of bookings) {
      await renderPrisma.booking.upsert({
        where: { id: booking.id },
        update: {
          enquiryId: booking.enquiryId,
          advisorId: booking.advisorId,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail,
          model: booking.model,
          variant: booking.variant,
          color: booking.color,
          fuelType: booking.fuelType,
          transmission: booking.transmission,
          exShowroomPrice: booking.exShowroomPrice,
          onRoadPrice: booking.onRoadPrice,
          bookingDate: booking.bookingDate,
          deliveryDate: booking.deliveryDate,
          status: booking.status,
          stockAvailability: booking.stockAvailability,
          dealerId: booking.dealerId,
        },
        create: booking,
      });
    }
    console.log(`✅ Migrated ${bookings.length} bookings\n`);

    // Step 10: Migrate Remarks
    console.log('📦 Step 10: Migrating Remarks...');
    const remarks = await localPrisma.remark.findMany();
    for (const remark of remarks) {
      await renderPrisma.remark.upsert({
        where: { id: remark.id },
        update: {
          enquiryId: remark.enquiryId,
          bookingId: remark.bookingId,
          content: remark.content,
          authorId: remark.authorId,
          cancelledById: remark.cancelledById,
          cancellationReason: remark.cancellationReason,
          isEditable: remark.isEditable,
          createdAt: remark.createdAt,
        },
        create: remark,
      });
    }
    console.log(`✅ Migrated ${remarks.length} remarks\n`);

    // Final summary
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Final counts on Render DB:');
    const finalUsers = await renderPrisma.user.count();
    const finalRoles = await renderPrisma.role.count();
    const finalDealers = await renderPrisma.dealer.count();
    const finalEnquiries = await renderPrisma.enquiry.count();
    const finalBookings = await renderPrisma.booking.count();
    console.log(`   ${finalUsers} users, ${finalRoles} roles, ${finalDealers} dealers, ${finalEnquiries} enquiries, ${finalBookings} bookings`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await renderPrisma.$disconnect();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n🎉 All done! Your local data has been migrated to Render.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

