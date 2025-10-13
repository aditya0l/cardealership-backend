# Admin Authentication Quick Start Guide

## 🚀 Testing Admin Login After Security Fix

This guide helps you test admin authentication after removing the test-user bypass.

## Prerequisites

- Backend server running
- Frontend dashboard running
- Firebase project configured
- Database connected

## Method 1: Use Existing Test Admin (Fastest)

If you've previously run the setup scripts, these users should exist:

### Default Admin Credentials
```
Email: admin@cardealership.com
Password: Admin123!
```

### Default General Manager Credentials
```
Email: gm@cardealership.com
Password: GeneralManager123!
```

### Steps to Test
1. Open admin panel: `http://localhost:5173` (or your frontend URL)
2. Enter email: `admin@cardealership.com`
3. Enter password: `Admin123!`
4. Click Login
5. You should be authenticated and see the admin dashboard

## Method 2: Create New Admin User

If the default admin doesn't exist, create one using the provided script:

### Using TypeScript Script (Recommended)
```bash
cd car-dealership-backend
npx ts-node create-test-admin.ts
```

This creates:
- Firebase user with UID: `demo_admin_cardealership_com`
- Database entry with ADMIN role
- Email: `admin@cardealership.com`
- Password: `Admin123!`

### Using JavaScript Script
```bash
cd car-dealership-backend
node setup-test-users.js
```

### Using Database-Only Script
If Firebase user exists but database entry is missing:
```bash
cd car-dealership-backend
npx ts-node add-admin-to-db.ts
```

## Method 3: Create Custom Admin User

### Step 1: Create Firebase User
```bash
cd car-dealership-backend
npx ts-node -e "
import { auth } from './src/config/firebase';

async function createUser() {
  const user = await auth.createUser({
    email: 'myadmin@example.com',
    password: 'MySecurePassword123!',
    displayName: 'My Admin',
    emailVerified: true
  });
  console.log('Created Firebase user:', user.uid);
}
createUser();
"
```

### Step 2: Add to Database
```sql
-- Get the admin role ID first
SELECT id FROM roles WHERE name = 'ADMIN';

-- Insert user (replace values)
INSERT INTO users (firebase_uid, email, name, role_id, is_active)
VALUES (
  'firebase-uid-from-step-1',
  'myadmin@example.com', 
  'My Admin',
  'admin-role-id-from-query',
  true
);
```

## Verifying Authentication Flow

### Backend Logs to Watch For
When logging in, you should see:
```
🔑 [API CLIENT] Using Firebase token for: /auth/profile
```

### Frontend Console Logs
```
🔐 [AUTH] ========== LOGIN START ==========
📡 [AUTH] Step 1: Calling Firebase signInWithEmailAndPassword...
✅ [AUTH] Step 1 SUCCESS: Firebase authenticated
✅ [AUTH] Firebase UID: demo_admin_cardealership_com
📡 [AUTH] Step 3 (OPTIONAL): Trying to fetch backend profile...
✅ [AUTH] Step 3 SUCCESS: Backend profile fetched: admin@cardealership.com Role: ADMIN
🎉 [AUTH] ========== LOGIN SUCCESS - RETURNING TRUE ==========
```

### Backend Authentication Logs
```
Verifying Firebase token...
✅ Token valid for UID: demo_admin_cardealership_com
✅ User found in database: admin@cardealership.com
✅ User role: ADMIN
```

## Troubleshooting

### Error: "Firebase ID token required"
- **Cause**: No authentication token sent
- **Fix**: Make sure you're logged in to Firebase
- **Check**: Frontend console for token generation

### Error: "Invalid or expired Firebase token"
- **Cause**: Token expired or invalid
- **Fix**: Refresh the page to get new token
- **Check**: Make sure Firebase is initialized

### Error: "User not found in system"
- **Cause**: User exists in Firebase but not in database
- **Fix**: Run `npx ts-node add-admin-to-db.ts`
- **Or**: Manually add user to database (see Method 3, Step 2)

### Error: "Insufficient permissions"
- **Cause**: User exists but doesn't have ADMIN role
- **Fix**: Update user role in database:
```sql
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN')
WHERE email = 'your-email@example.com';
```

### Error: "User account is deactivated"
- **Cause**: User's `isActive` flag is false
- **Fix**: Activate user:
```sql
UPDATE users SET is_active = true WHERE email = 'your-email@example.com';
```

## Authentication Architecture

### What Changed?
❌ **BEFORE**: `Bearer test-user` bypassed all security
✅ **AFTER**: Proper Firebase token verification

### Current Flow
1. **Frontend**: User enters credentials
2. **Firebase**: Authenticates user, returns ID token
3. **Frontend**: Gets fresh token with `currentUser.getIdToken()`
4. **Frontend**: Sends token in header: `Authorization: Bearer {token}`
5. **Backend**: Verifies token with Firebase Admin SDK
6. **Backend**: Looks up user in database by `firebaseUid`
7. **Backend**: Checks user role and active status
8. **Backend**: Returns user data if authorized

### Security Benefits
- ✅ No bypass or backdoor access
- ✅ All requests authenticated via Firebase
- ✅ Tokens expire and auto-refresh
- ✅ Full audit trail in Firebase
- ✅ Role-based access control enforced

## Testing Checklist

- [ ] Admin can login with email/password
- [ ] Backend verifies Firebase token
- [ ] User profile fetched from database
- [ ] Admin role correctly assigned
- [ ] Dashboard accessible after login
- [ ] API requests include Firebase token
- [ ] Unauthorized users blocked
- [ ] Token refresh works automatically

## Next Steps

1. **Test all admin functions** to ensure they work
2. **Create additional admin users** if needed
3. **Update production credentials** to be secure
4. **Remove any test credentials** before production deploy
5. **Set up proper Firebase security rules**

## Additional Resources

- `/car-dealership-backend/AUTHENTICATION_SECURITY_FIX.md` - Security fix details
- `/car-dealership-backend/FIREBASE-SETUP.md` - Firebase configuration
- `/car-dealership-backend/create-test-admin.ts` - Admin creation script
- `/car-dealership-backend/CREATE_FIREBASE_USERS_GUIDE.md` - User creation guide

## Support

If you encounter issues:
1. Check backend logs for authentication errors
2. Check frontend console for token generation
3. Verify Firebase user exists: Firebase Console → Authentication
4. Verify database entry exists: Check `users` table
5. Verify role assignment: Check user's `role_id` matches ADMIN role

---

**Remember**: No more test-user bypass! All authentication must go through Firebase. 🔒

