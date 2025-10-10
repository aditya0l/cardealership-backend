import { auth } from './src/config/firebase';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'admin@cardealership.com';
  
  // Check database
  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });
  
  console.log('Database user:', {
    firebaseUid: dbUser?.firebaseUid,
    email: dbUser?.email,
    role: dbUser?.role.name
  });
  
  // Check Firebase
  try {
    const firebaseUser = await auth.getUserByEmail(email);
    console.log('Firebase user:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email
    });
    
    if (dbUser && dbUser.firebaseUid !== firebaseUser.uid) {
      console.log('\n❌ UID MISMATCH!');
      console.log('Fixing...');
      
      await prisma.user.update({
        where: { email },
        data: { firebaseUid: firebaseUser.uid }
      });
      
      console.log('✅ Fixed! UID updated to:', firebaseUser.uid);
    } else {
      console.log('\n✅ UIDs match!');
    }
  } catch (error: any) {
    console.log('Firebase error:', error.message);
  }
  
  await prisma.$disconnect();
}

checkUser();
