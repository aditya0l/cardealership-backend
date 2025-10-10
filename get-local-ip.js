#!/usr/bin/env node

const { networkInterfaces } = require('os');

// Get local IP address for network access
const getLocalIPAddress = () => {
  const interfaces = networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }
  }
  return ips;
};

const ips = getLocalIPAddress();
const port = process.env.PORT || 4000;

console.log('\n🌐 Local Network Access Information');
console.log('=====================================');
console.log(`📡 Server Port: ${port}`);
console.log('🔗 Access URLs:');
ips.forEach(ip => {
  console.log(`   http://${ip}:${port}`);
});
console.log('\n📱 For mobile devices:');
console.log('   1. Connect to the same WiFi network');
console.log('   2. Use one of the URLs above');
console.log('   3. Test with: curl http://' + (ips[0] || 'localhost') + ':' + port + '/api/health');
console.log('\n💡 If no IPs shown, check your network connection');
console.log('=====================================\n');
