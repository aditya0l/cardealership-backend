import admin from 'firebase-admin';

// Use the same config as your deployed backend
const firebaseConfig = {
  type: "service_account",
  project_id: "car-dealership-app-9f2d5",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQApN/m9VRIgTx
D2iKK5pqH2idhMgAsUZcd0hp/+nOhyhz8ehw0q10NCCnbypFPKTyWmJ/5n6e2tAo
q52Oe15AGOBJ1v5t8JNKvVWHqlxK82mjx+M67Quu7Vj4+l4Zw23BcMAU0wvZf+Bc
ahhEhqHDPvc6ScdbPAD0pxTt8tO/bjB0z7PF0ksMedt911PZkkZEgkme7NVsKHsj
cPMxuC/zGDWQjxqMoXZ6BgTdTB6JU0hu/dUVBKfeVCZkV6w0mDuN5cM6w8BefTNE
9I1GK8wkaYeBTw0OGn7SacS+ZL1WgqGsxx4T6GgVDN1pzTfl/0RJieuJm/if1Vlf
lRCBp7lNAgMBAAECggEAE7QqxKu+STEvxqXvASegOO1Au6sYRviD8b5a3a+gNjAX
ZORFYGqUg61sam/dUTGtbkehjPwIgoO3tCKNijGle+zfUh9Lep6PVUUaFP/OPktQ
dnM40xwhPzC8fNk6kLYyb2B+0XosZS330sk6A0O9jwEn6h2TBNFqRcKN+PxHkppx
kdZ3Aj5x394nNRiABeLp3FYpz1D0g+YZjCEQilYU6LikQ/OqQ/efNGEEUgwkuLun
IE9DrlLmNdb0zjzlkg5AgDm5vSwBtbPW33ThJgsxz5dxpg523t0IEfoeF8CAmPID
Qn0fY2xJXyU2S4kxnSqU2lCqxlcmXY8N3nZtLMLoAQKBgQD91tedGmroa7DeunR7
ivh+hkFKQb0+zT8FuUF9em4sOK7Vm/0yiwqV1YPegbgBKNqpwhXp46H6Evpp/bvd
nTU0r/O3fJTkBCvYu10//fJLfsSUtz+V1sVyT0y+e20czXMkY2VpOK/UjJHLGgJ/
akKRJXnGf+gDGYN9j1c0PupJRQKBgQDRx91U/ac3JrjcTKKiRT4UT2hU6Ucu1Tyy
rwawoJVDHiQ4ghk8zgwwpH/PzGJZ4HSqt9vgvFSi4JStq9EX3yWPgc/8SIC4p0jq
5Xo++dwlz31PQ3UzXhlhqpxcnhOnZ02qoHVsQaraUca5NWvT7rK4N6EW5KzWUfj5
m0fv7E28aQKBgHLMYhDL7MOWSJRCUQG6dO2LvCVgG702R6VIBiVAZGkdbXxvoo/k
L/JZcN0FX3kux810WELBzvRw9s1OklMEkRZ16Mv3zMJeXJIVEnQpXhXki/UR9vDG
A9/Rm0yeN1eKVuODDE8M8wA2Xo0zAyQqo1ZPU4aBPCWCuWPkmrSnK3/dAoGAX2UN
pxp5scCwC63lvvjR1BaQERzLu+ZH5dFlr2g2uAC64991boscS/piDLKafths9T0K
hdXefvq1YYxiVwKoZ+vWEpk9v7qClB6qSn0AuUjzaNn6L9O4owscc5mGwnddgBvb
idEKyqCpR4udbxB6wP67CFgQqJ06JPeR7O5+IxECgYEAp2/xj/atxeMTGJXxY2gM
oOewQ6DUYuYuJGYPc6BQlBkATHJcFlxTjmUT8IZgnMH49evuneO7s3daQVU6MSGY
k0PbFy/BYrCf5NhBf8T/inFXkx952CoznWUKVvTVAmh1lkRq48VGyAbOQ8s=
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@car-dealership-app-9f2d5.iam.gserviceaccount.com",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token"
};

async function testTokenOnDeployedBackend() {
  console.log('🔧 Testing token validation on deployed backend...\n');

  try {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized');
    }

    // Get a user and generate a custom token (simulate what your Expo app might be doing)
    console.log('Step 1: Getting user and generating token...');
    const user = await admin.auth().getUserByEmail('newadvisor@test.com');
    console.log(`✅ User found: ${user.email} (${user.uid})`);

    // Generate a custom token (this is what might be happening in your Expo app)
    const customToken = await admin.auth().createCustomToken(user.uid);
    console.log(`✅ Custom token generated (length: ${customToken.length})`);

    // Test what happens when we try to verify this token (this should fail)
    console.log('\nStep 2: Testing token verification...');
    try {
      const decodedToken = await admin.auth().verifyIdToken(customToken);
      console.log('✅ Token verified successfully:', decodedToken);
    } catch (verifyError: any) {
      console.log('❌ Token verification failed (expected for custom tokens):', verifyError.message);
      console.log('\n🎯 THIS IS THE ISSUE!');
      console.log('Your Expo app is probably generating CUSTOM TOKENS instead of ID TOKENS');
      console.log('\n📱 In your Expo app, make sure you are using:');
      console.log('   const idToken = await userCredential.user.getIdToken();');
      console.log('   NOT custom tokens!');
    }

    // Test with a proper ID token approach
    console.log('\nStep 3: Explaining the correct approach...');
    console.log('✅ Your Expo app should:');
    console.log('   1. Login with signInWithEmailAndPassword()');
    console.log('   2. Get ID token with userCredential.user.getIdToken()');
    console.log('   3. Send that ID token to backend');
    console.log('   4. Backend verifies with verifyIdToken()');

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
  }
}

testTokenOnDeployedBackend();
