/**
 * Generate self-signed certificates for HTTPS development with local network support
 * Run this once: node generate-certs.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');
const configPath = path.join(certDir, 'openssl.cnf');

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = ['localhost', '127.0.0.1'];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Check if certs already exist
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist at certs/');
  console.log('   To regenerate, delete the certs/ folder and run this script again.');
  process.exit(0);
}

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const localIPs = getLocalIPs();
console.log('🌐 Detected local IPs:', localIPs.join(', '));

// Create OpenSSL config with Subject Alternative Names (SAN)
const sanEntries = localIPs.map((ip, idx) => {
  const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(ip);
  return isIP ? `IP.${idx + 1} = ${ip}` : `DNS.${idx + 1} = ${ip}`;
}).join('\n');

const opensslConfig = `
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
${sanEntries}
`;

fs.writeFileSync(configPath, opensslConfig);

// Generate self-signed certificate with SAN support
const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -config "${configPath}" -extensions v3_req`;

console.log('🔐 Generating self-signed certificate with network support...');
exec(command, (error) => {
  if (error) {
    console.error('❌ Error generating certificate:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('  1. Install OpenSSL:');
    console.log('     Windows: choco install openssl');
    console.log('     Or download from: https://slproweb.com/products/Win32OpenSSL.html');
    console.log('  2. Or use mkcert (easier): npm install -g mkcert');
    console.log('     Then run: mkcert -install && mkcert localhost 10.208.179.58');
    process.exit(1);
  }
  
  console.log('✅ Certificate generated successfully!');
  console.log('📁 Location: certs/');
  console.log('🔒 Valid for:', localIPs.join(', '));
  console.log('\n📝 Next steps:');
  console.log('  1. Run: npm run dev');
  console.log('  2. Access via: https://10.208.179.58:5174/QRMENU/admin');
  console.log('  3. Browser will show security warning - click "Advanced" → "Proceed"');
  console.log('\n🔧 Configure Firebase & Clerk:');
  console.log('  Firebase: Add https://10.208.179.58:5174 to Authorized Domains');
  console.log('  Clerk: Add https://10.208.179.58:5174 to Allowed Origins');
});
