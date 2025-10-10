import { auth } from './src/config/firebase';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixGM() {
  const email = 'gm@cardealership.com';
  const firebaseUser = await auth.getUserByEmail(email);
  const dbUser = await prisma.user.findUnique({ where: { email } });
  
  if (dbUser && dbUser.firebaseUid !== firebaseUser.uid) {
    await prisma.user.update({
      where: { email },
      data: { firebaseUid: firebaseUser.uid }
    });
    console.log('✅ Fixed GM user UID');
  }
  await prisma.$disconnect();
}
fixGM();
