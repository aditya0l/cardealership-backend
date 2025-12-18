# 📱 Expo App Changes for Render Deployment

## 🎯 Quick Changes

Your backend is now live at: **`https://cardealership-backend.onrender.com`**

Update your Expo app to use this URL instead of localhost.

---

## 📋 Step-by-Step Changes

### Step 1: Update API Base URL

Find your API configuration file (usually one of these):
- `src/config/api.ts`
- `src/config/constants.ts`
- `src/utils/api.ts`
- `config/api.js`
- `constants/api.js`

**Change from:**
```javascript
// OLD - Local development
const API_BASE_URL = 'http://localhost:4000';
// OR
const API_BASE_URL = 'http://192.168.x.x:4000'; // Local network IP
```

**Change to:**
```javascript
// NEW - Render production
const API_BASE_URL = 'https://cardealership-backend.onrender.com';
```

### Step 2: Environment-Based Configuration (Recommended)

For better flexibility, use environment-based configuration:

```javascript
// src/config/api.ts or similar
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:4000'  // Local development
  : 'https://cardealership-backend.onrender.com';  // Production
```

**OR use environment variables:**

```javascript
// src/config/api.ts
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl 
  || 'https://cardealership-backend.onrender.com';
```

Then in `app.json` or `app.config.js`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://cardealership-backend.onrender.com"
    }
  }
}
```

### Step 3: Update All API Calls

Make sure all API calls use the base URL:

**Example - Before:**
```javascript
const response = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

**Example - After:**
```javascript
import { API_BASE_URL } from '../config/api';

const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### Step 4: Update Axios/Fetch Configuration

If you're using Axios:

```javascript
// src/api/client.ts or similar
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

### Step 5: Test the Connection

After making changes, test the connection:

```javascript
// Test health endpoint
const testConnection = async () => {
  try {
    const response = await fetch('https://cardealership-backend.onrender.com/api/health');
    const data = await response.json();
    console.log('✅ Backend connected:', data);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
};
```

---

## 🔍 Common File Locations

### React Native / Expo Structure

```
your-expo-app/
├── src/
│   ├── config/
│   │   └── api.ts          ← Update here
│   ├── services/
│   │   └── api.ts          ← Or here
│   └── utils/
│       └── constants.ts    ← Or here
├── app.json                 ← Add env vars here
└── package.json
```

### Typical API Config File

```typescript
// src/config/api.ts
export const API_BASE_URL = 'https://cardealership-backend.onrender.com';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
  },
  ENQUIRIES: `${API_BASE_URL}/api/enquiries`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  // ... other endpoints
};
```

---

## ✅ Checklist

- [ ] Update API base URL from localhost to Render URL
- [ ] Update all hardcoded API endpoints
- [ ] Test health endpoint connection
- [ ] Test login functionality
- [ ] Verify all API calls work
- [ ] Update any environment-specific configs

---

## 🧪 Testing

### 1. Test Health Endpoint

```bash
curl https://cardealership-backend.onrender.com/api/health
```

Expected:
```json
{
  "status": "ok",
  "message": "Backend running 🚀",
  "timestamp": "...",
  "environment": "development",
  "version": "1.0.0"
}
```

### 2. Test Login

```bash
curl -X POST https://cardealership-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin12345"}'
```

### 3. Test in Expo App

1. Open your Expo app
2. Try to login with test credentials
3. Check network requests in React Native Debugger
4. Verify API calls go to Render URL

---

## 🔧 Troubleshooting

### CORS Errors

If you get CORS errors:
- The backend already allows `*.onrender.com` domains
- Make sure you're using `https://` not `http://`
- Check that requests include proper headers

### Connection Timeout

- Render free tier spins down after 15 min inactivity
- First request after spin-down may take 10-30 seconds
- Subsequent requests are fast

### SSL/HTTPS Issues

- Always use `https://` for Render URLs
- Don't use `http://` - Render only supports HTTPS

### Network Errors

- Check internet connection
- Verify Render service is running (check dashboard)
- Try the health endpoint in browser first

---

## 📝 Example: Complete API Service File

```typescript
// src/services/api.ts
const API_BASE_URL = 'https://cardealership-backend.onrender.com';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }

  async getEnquiries() {
    const response = await fetch(`${this.baseURL}/api/enquiries`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  }

  // ... other methods
}

export default new ApiService();
```

---

## 🚀 Quick Reference

**Backend URL:** `https://cardealership-backend.onrender.com`

**Key Endpoints:**
- Health: `GET /api/health`
- Login: `POST /api/auth/login`
- Enquiries: `GET /api/enquiries`
- Bookings: `GET /api/bookings`
- Import: `POST /api/bookings/import/upload`

**Test Credentials:**
- Admin: `admin@test.com` / `admin12345`
- Team Lead: `tl@test.com` / `tl12345`
- Customer Advisor: `ca1@test.com` / `ca112345`

---

**Last Updated:** After successful Render deployment

