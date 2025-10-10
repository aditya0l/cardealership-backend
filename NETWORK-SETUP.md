# 🌐 Network Access Setup Guide

This guide explains how to set up the Car Dealership Backend for access from other devices on your local network.

## 🚀 Quick Setup

### 1. Start the Server
```bash
npm run dev
```

The server will automatically:
- Bind to all network interfaces (0.0.0.0)
- Display your local IP address
- Allow CORS requests from local network devices

### 2. Find Your Local IP
```bash
npm run local-ip
```

This will show you the URLs that other devices can use to access your API.

### 3. Test Network Access
From any device on the same network:
```bash
curl http://YOUR_LOCAL_IP:4000/api/health
```

## 📱 Mobile Device Access

### For Mobile Apps (React Native, Flutter, etc.)
Use the network IP address instead of localhost:
```javascript
const API_BASE_URL = 'http://10.69.245.247:4000'; // Replace with your IP
```

### For Web Apps
Update your frontend configuration:
```javascript
const API_BASE_URL = 'http://10.69.245.247:4000'; // Replace with your IP
```

## 🔧 Configuration Details

### Server Binding
The server now binds to `0.0.0.0:4000` instead of `localhost:4000`, making it accessible from:
- Localhost: `http://localhost:4000`
- Network IP: `http://YOUR_LOCAL_IP:4000`

### CORS Configuration
The server automatically allows requests from:
- `localhost` and `127.0.0.1`
- Local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- All common development ports

### Environment Variables
The server uses the following environment variables:
```env
PORT=4000
NODE_ENV=development
```

## 🛠 Troubleshooting

### Server Not Accessible from Other Devices

1. **Check Firewall**: Ensure your computer's firewall allows connections on port 4000
2. **Check Network**: Ensure all devices are on the same WiFi network
3. **Check IP**: Run `npm run local-ip` to get the correct IP address
4. **Test Locally**: First test with `curl http://localhost:4000/api/health`

### CORS Errors

If you get CORS errors:
1. Check that the requesting device's IP matches the local network pattern
2. Ensure the request includes proper headers
3. Check the server logs for CORS rejection messages

### Port Already in Use

If port 4000 is already in use:
1. Change the PORT in your `.env` file
2. Restart the server
3. Update all client applications with the new port

## 📋 Testing Checklist

- [ ] Server starts without errors
- [ ] `curl http://localhost:4000/api/health` works
- [ ] `curl http://YOUR_IP:4000/api/health` works
- [ ] Mobile device can access the API
- [ ] Web app can make requests to the API
- [ ] CORS headers are properly set

## 🔒 Security Notes

⚠️ **Important**: This setup is for development only. In production:
- Use proper domain names instead of IP addresses
- Configure specific CORS origins
- Use HTTPS instead of HTTP
- Implement proper authentication and authorization

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your network configuration
3. Test with the provided curl commands
4. Ensure all devices are on the same network
