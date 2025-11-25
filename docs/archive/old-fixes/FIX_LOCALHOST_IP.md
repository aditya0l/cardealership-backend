# 🔧 FIX: Network Error - Localhost Not Working

## 🚨 Problem

Your Expo app is trying to connect to `http://localhost:4000`, but **this doesn't work on mobile devices**. Mobile devices can't access `localhost` because that refers to the device itself, not your computer.

**Error you're seeing:**
```
ERR_NETWORK: Failed to connect to localhost/127.0.0.1:4000
```

## ✅ Solution

You need to **replace `localhost` with your computer's local IP address** in your Expo app.

---

## 🔍 Step 1: Find Your Local IP Address

Run one of these commands on your Mac:

```bash
# Method 1: Using ipconfig (most reliable on Mac)
ipconfig getifaddr en0

# Method 2: Using ifconfig
ifconfig en0 | grep "inet " | awk '{print $2}'

# Method 3: Check all network interfaces
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**You're looking for an IP like:**
- `192.168.1.x` (most common home WiFi)
- `192.168.0.x`
- `10.0.0.x`
- `172.16.x.x` to `172.31.x.x`

**NOT:**
- `127.0.0.1` (localhost)
- `192.0.0.x` (this is a reserved range)

---

## 📱 Step 2: Update Your Expo App

Find where your API base URL is configured (usually in `src/api/client.ts` or similar):

### **Find this line:**
```typescript
const API_BASE_URL = 'http://localhost:4000/api';
```

### **Replace with:**
```typescript
// Replace 192.168.1.xxx with YOUR actual local IP from Step 1
const API_BASE_URL = 'http://192.168.1.xxx:4000/api';
```

### **Example:**
If your local IP is `192.168.1.105`:
```typescript
const API_BASE_URL = 'http://192.168.1.105:4000/api';
```

---

## ✅ Step 3: Verify Backend is Accessible

**Test from your computer first:**
```bash
# Replace 192.168.1.xxx with your actual IP
curl http://192.168.1.xxx:4000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Backend running 🚀"
}
```

If this works, your backend is accessible on the network! ✅

---

## 📱 Step 4: Test from Mobile Device

1. Make sure your phone and computer are on the **same WiFi network**
2. Update the API URL in your Expo app
3. Restart the Expo app
4. Try logging in again

---

## 🔍 Quick IP Finder Script

Run this in your backend directory:

```bash
# Mac
ipconfig getifaddr en0 || ipconfig getifaddr en1

# Or use this command
ifconfig | grep -E "inet 192\.|inet 10\." | awk '{print $2}' | head -1
```

---

## ⚠️ Common Issues

### 1. **IP Address Changes**
If your IP changes (switching WiFi networks), you'll need to update it in your app again.

**Solution:** Consider using environment variables or a config file.

### 2. **Firewall Blocking**
Your Mac's firewall might be blocking connections.

**Fix:**
- System Settings → Network → Firewall
- Make sure port 4000 is allowed

### 3. **Different WiFi Networks**
Make sure your computer and phone are on the **same WiFi network**.

---

## 🎯 Quick Checklist

- [ ] Found my local IP address (192.168.x.x format)
- [ ] Updated API_BASE_URL in Expo app
- [ ] Backend is running on port 4000
- [ ] Computer and phone on same WiFi
- [ ] Tested with curl from computer ✅
- [ ] Restarted Expo app
- [ ] Tried login again

---

## 💡 Pro Tip: Dynamic IP Detection

You can use this code to automatically detect your IP (advanced):

```typescript
// In your Expo app API config
const getLocalIP = async () => {
  // For development, you can detect automatically
  // Or use a config file that's easy to update
  return '192.168.1.xxx'; // Update this manually for now
};

const API_BASE_URL = `http://${await getLocalIP()}:4000/api`;
```

Or create a simple config file:

```typescript
// config/api.ts
export const API_CONFIG = {
  // Update this when your IP changes
  BASE_URL: 'http://192.168.1.xxx:4000/api',
};
```

---

**Once you update the IP address, your login should work!** 🎉

