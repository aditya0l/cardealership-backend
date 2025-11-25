# 🔧 FIX: Unusual IP Address (192.0.0.2)

## 🚨 Problem

Your Mac is showing IP address `192.0.0.2`, which is in a **reserved IP range** and won't work for local network access from your mobile device.

This usually happens when:
- You're on a **mobile hotspot** or **tethering**
- Your network uses **IPv6-only** with NAT64/CLAT translation
- You're on a **VPN** or virtual network

---

## ✅ Solution Options

### Option 1: Use Your Computer Name (Easiest)

Instead of an IP address, use your computer's network name:

1. **Find your computer name:**
   ```bash
   hostname
   scutil --get ComputerName
   ```

2. **In your Expo app, use:**
   ```typescript
   // Replace YOUR-COMPUTER-NAME with actual name
   const API_BASE_URL = 'http://YOUR-COMPUTER-NAME.local:4000/api';
   
   // Example:
   const API_BASE_URL = 'http://MacBook-Pro.local:4000/api';
   ```

### Option 2: Use IPv6 Address

If your network supports IPv6, you can use the IPv6 address:

1. **Find your IPv6 address:**
   ```bash
   ifconfig en0 | grep "inet6" | grep -v "::1" | grep -v "fe80"
   ```

2. **In your Expo app, use IPv6:**
   ```typescript
   // Wrap IPv6 in brackets
   const API_BASE_URL = 'http://[YOUR_IPv6_ADDRESS]:4000/api';
   ```

**⚠️ Note:** Some mobile devices/networks don't support IPv6 well.

### Option 3: Use ngrok (Recommended for Testing)

This creates a public URL that tunnels to your local server:

1. **Install ngrok:**
   ```bash
   brew install ngrok
   # Or download from https://ngrok.com
   ```

2. **Start tunnel:**
   ```bash
   ngrok http 4000
   ```

3. **Use the ngrok URL in your Expo app:**
   ```typescript
   // Use the https URL from ngrok (e.g., https://abc123.ngrok.io)
   const API_BASE_URL = 'https://YOUR-NGROK-URL.ngrok.io/api';
   ```

**✅ Pros:** Works from anywhere, no network configuration needed  
**❌ Cons:** Requires internet, free tier has limitations

### Option 4: Check System Settings for Actual IP

1. Open **System Settings** → **Network**
2. Click **Wi-Fi**
3. Look for the **IP Address** field
4. This might show a different IP than what terminal shows

### Option 5: Connect to a Proper WiFi Network

If you're on a mobile hotspot, try connecting to a regular WiFi network:

1. Connect to a **regular WiFi network** (home, office, etc.)
2. Run `node get-local-ip.js` again
3. You should see a proper IP like `192.168.x.x`

---

## 🧪 Quick Test

Before updating your app, test if the server is accessible:

```bash
# Test if server responds on the unusual IP
curl http://192.0.0.2:4000/api/health

# Test with computer name (if it resolves)
curl http://YOUR-COMPUTER-NAME.local:4000/api/health

# Test with IPv6 (if available)
curl http://[YOUR_IPv6]:4000/api/health
```

---

## 💡 Recommended Approach

**For development/testing:**
1. Use **ngrok** (Option 3) - easiest and most reliable
2. Or use **computer name** (Option 1) - works if both devices on same network

**For production:**
- Deploy backend to a proper hosting service (Render, AWS, etc.)
- Use the production URL in your Expo app

---

## 🔍 Why This Happens

The `192.0.0.2` IP is part of a **NAT64/CLAT** configuration, which is used when:
- Your network is **IPv6-only**
- Your Mac is translating IPv4 to IPv6
- You're on a **mobile hotspot** or **tethering**

This IP won't work for local network access because it's a **virtual interface** for translation.

---

## ✅ Once You Fix It

Update your Expo app's API configuration:

```typescript
// src/api/client.ts or similar file
const API_BASE_URL = 'http://YOUR-FIXED-IP:4000/api';
// OR
const API_BASE_URL = 'http://YOUR-COMPUTER-NAME.local:4000/api';
// OR (ngrok)
const API_BASE_URL = 'https://YOUR-NGROK-URL.ngrok.io/api';
```

Then restart your Expo app and try logging in again! 🎉

