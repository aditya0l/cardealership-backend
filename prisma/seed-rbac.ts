import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with RBAC roles...');

  // Define all roles that should exist
  const roles = [
    { name: RoleName.ADMIN },
    { name: RoleName.GENERAL_MANAGER },
    { name: RoleName.SALES_MANAGER },
    { name: RoleName.TEAM_LEAD },
    { name: RoleName.CUSTOMER_ADVISOR }
  ];

  // Create roles if they don't exist
  for (const role of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: role.name }
    });

    if (!existingRole) {
      const createdRole = await prisma.role.create({
        data: role
      });
      console.log(`✅ Created role: ${createdRole.name}`);
    } else {
      console.log(`⏭️  Role already exists: ${existingRole.name}`);
    }
  }

  // Create a default admin user if none exists
  const adminRole = await prisma.role.findUnique({
    where: { name: RoleName.ADMIN }
  });

  if (adminRole) {
    const adminUser = await prisma.user.findFirst({
      where: { roleId: adminRole.id }
    });

    if (!adminUser) {
      console.log('🔧 Creating default admin user...');
      console.log('Note: You will need to create this user in Firebase Auth manually or use the API endpoint');
      console.log('Default admin email: admin@dealership.com');
      console.log('You can create this user via: POST /api/auth/users/create-with-credentials');
    }
  }

  console.log('✅ RBAC roles seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding RBAC roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
