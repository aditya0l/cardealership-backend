# 🔥 Firebase Setup Guide for Car Dealership API

## Step 1: Firebase Console Setup

### Create Firebase Project (if you haven't already)
1. Go to https://console.firebase.google.com/
2. Click "Create a project" or select existing project
3. Enable Authentication

### Enable Authentication Methods
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Click **Save**

## Step 2: Get Firebase Credentials

### Get Service Account Credentials
1. Go to **Project Settings** (gear icon)
2. Click **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Extract these values:
   - `project_id`
   - `private_key` 
   - `client_email`

### Get Database URL
1. Go to **Realtime Database** (or create one)
2. Copy the database URL (https://your-project-default-rtdb.firebaseio.com/)

## Step 3: Environment Configuration

Create `.env` file in project root with:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration  
DATABASE_URL="postgresql://username:password@localhost:5432/dealership_db"

# Firebase Configuration
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com/"
```

## Step 4: Create Test Users

### Option A: Firebase Console (Manual)
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Create these users:

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@dealership.com | Admin123! |
| GENERAL_MANAGER | manager@dealership.com | Manager123! |
| SALES_MANAGER | sales@dealership.com | Sales123! |
| TEAM_LEAD | teamlead@dealership.com | Lead123! |
| CUSTOMER_ADVISOR | advisor@dealership.com | Advisor123! |

### Option B: Using API (Requires Admin Token)
Run the setup script after creating the first admin user.

## Step 5: Get JWT Tokens for Postman

### Method 1: Firebase Console
1. Use Firebase Auth REST API to sign in
2. Get ID tokens from response

### Method 2: Browser Console (Recommended)
1. Open browser console on any website
2. Run this code:

```javascript
// Install Firebase SDK first or use CDN
const auth = firebase.auth();

async function getToken(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const token = await result.user.getIdToken();
    console.log(`Token for ${email}:`);
    console.log(token);
    return token;
  } catch (error) {
    console.error(`Error for ${email}:`, error);
  }
}

// Get tokens for all users
getToken('admin@dealership.com', 'Admin123!');
getToken('manager@dealership.com', 'Manager123!');
getToken('sales@dealership.com', 'Sales123!');
getToken('teamlead@dealership.com', 'Lead123!');
getToken('advisor@dealership.com', 'Advisor123!');
```

## Step 6: Test in Postman

1. Copy JWT tokens from console
2. Set in Postman environment variables:
   - `adminToken`
   - `managerToken` 
   - `salesToken`
   - `teamleadToken`
   - `advisorToken`

3. Test endpoints with different role tokens

## Next Steps

Once you have Firebase configured:
1. Restart your server: `npm start`
2. Test authentication endpoints
3. Create users via API
4. Test role-based permissions
