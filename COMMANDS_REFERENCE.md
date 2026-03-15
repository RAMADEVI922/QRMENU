# Command Reference - HTTPS Setup

Quick reference for all commands needed to fix the HTTPS/auth issues.

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Generate certificates
node generate-certs.js

# 2. Start dev server
npm run dev

# 3. Open in browser
# https://10.208.179.58:5174/QRMENU/admin
```

---

## 📦 Installation Commands

### Install OpenSSL (Windows)

**Using Chocolatey:**
```bash
choco install openssl
```

**Manual Download:**
- Visit: https://slproweb.com/products/Win32OpenSSL.html
- Download and install "Win64 OpenSSL"

### Install mkcert (Recommended Alternative)

```bash
# Install mkcert globally
npm install -g mkcert

# Install local Certificate Authority
mkcert -install

# Generate certificates
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

---

## 🔐 Certificate Commands

### Generate Certificates (OpenSSL)

```bash
node generate-certs.js
```

### Generate Certificates (mkcert)

```bash
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

### Regenerate Certificates

```bash
# Delete old certificates
rm -rf certs/

# Generate new ones
node generate-certs.js

# Or with mkcert
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

### Check Certificate Details

```bash
# View certificate info
openssl x509 -in certs/cert.pem -text -noout
```

---

## 🖥️ Server Commands

### Start Dev Server

```bash
npm run dev
```

### Start Dev Server (Verbose)

```bash
npm run dev -- --debug
```

### Stop Dev Server

```
Ctrl+C
```

---

## 🔍 Diagnostic Commands

### Check Your Local IP

**Windows:**
```bash
ipconfig
```

Look for "IPv4 Address" under your active network adapter.

**Linux/Mac:**
```bash
ifconfig
# or
ip addr show
```

### Check if Port 5174 is in Use

**Windows:**
```bash
netstat -ano | findstr :5174
```

**Linux/Mac:**
```bash
lsof -i :5174
```

### Test HTTPS Connection

```bash
# Test from command line
curl -k https://localhost:5174/QRMENU/

# Or
curl -k https://10.208.179.58:5174/QRMENU/
```

---

## 🧹 Cleanup Commands

### Remove Certificates

```bash
# Windows
rmdir /s /q certs

# Linux/Mac
rm -rf certs/
```

### Clear Node Modules (if needed)

```bash
# Windows
rmdir /s /q node_modules
npm install

# Linux/Mac
rm -rf node_modules/
npm install
```

### Clear Browser Cache (via CLI)

**Chrome:**
```bash
# Open Chrome with cache disabled
chrome.exe --disable-application-cache --disk-cache-size=0
```

---

## 🔧 Troubleshooting Commands

### Check Node Version

```bash
node --version
# Should be v16 or higher
```

### Check npm Version

```bash
npm --version
```

### Check if OpenSSL is Installed

```bash
openssl version
```

### Check if mkcert is Installed

```bash
mkcert --version
```

### Verify Environment Variables

```bash
# Windows
echo %VITE_CLERK_PUBLISHABLE_KEY%
echo %VITE_FIREBASE_API_KEY%

# Linux/Mac
echo $VITE_CLERK_PUBLISHABLE_KEY
echo $VITE_FIREBASE_API_KEY
```

### Check Vite Config

```bash
# View current config
cat vite.config.ts

# Or on Windows
type vite.config.ts
```

---

## 🌐 Browser Commands

### Open with DevTools

**Chrome/Edge:**
```bash
# Windows
start chrome https://10.208.179.58:5174/QRMENU/admin --auto-open-devtools-for-tabs

# Linux
google-chrome https://10.208.179.58:5174/QRMENU/admin --auto-open-devtools-for-tabs
```

### Clear Browser Data (Chrome)

```
Ctrl+Shift+Delete
```

Then select:
- Cookies and other site data
- Cached images and files

### Hard Refresh

```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## 📱 Mobile Testing Commands

### Find Your Computer's IP

```bash
# Windows
ipconfig | findstr IPv4

# Linux/Mac
ifconfig | grep "inet "
```

### Test Network Connectivity

```bash
# From mobile device browser, try:
https://10.208.179.58:5174/QRMENU/admin
```

---

## 🔥 Firebase Commands

### Firebase Login

```bash
firebase login
```

### List Firebase Projects

```bash
firebase projects:list
```

### Check Current Project

```bash
firebase use
```

### Open Firebase Console

```bash
# Windows
start https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings

# Linux/Mac
open https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
```

---

## 🔐 Clerk Commands

### Open Clerk Dashboard

```bash
# Windows
start https://dashboard.clerk.com/

# Linux/Mac
open https://dashboard.clerk.com/
```

---

## 📊 Testing Commands

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Check for Linting Errors

```bash
npm run lint
```

---

## 🎯 One-Line Setup

Copy and paste this entire block:

```bash
node generate-certs.js && npm run dev
```

This will:
1. Generate certificates
2. Start the dev server with HTTPS

---

## 📝 Quick Reference URLs

### Local Development:
- **HTTPS Localhost:** `https://localhost:5174/QRMENU/admin`
- **HTTPS Network:** `https://10.208.179.58:5174/QRMENU/admin`
- **HTTP Fallback:** `http://localhost:5174/QRMENU/admin`

### Configuration:
- **Firebase Console:** https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
- **Clerk Dashboard:** https://dashboard.clerk.com/

### Documentation:
- **OpenSSL Download:** https://slproweb.com/products/Win32OpenSSL.html
- **mkcert GitHub:** https://github.com/FiloSottile/mkcert
- **Vite HTTPS Docs:** https://vitejs.dev/config/server-options.html#server-https

---

## 💡 Pro Tips

### Create Aliases (Optional)

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:https": "node generate-certs.js && vite",
    "cert:generate": "node generate-certs.js",
    "cert:clean": "rm -rf certs/",
    "cert:regenerate": "rm -rf certs/ && node generate-certs.js"
  }
}
```

Then use:
```bash
npm run dev:https
npm run cert:regenerate
```

---

## 🆘 Emergency Reset

If everything is broken, run these commands to start fresh:

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Remove certificates
rm -rf certs/

# 3. Clear node_modules
rm -rf node_modules/
npm install

# 4. Regenerate certificates
node generate-certs.js

# 5. Start fresh
npm run dev
```

---

## ✅ Verification Commands

Run these to verify everything is working:

```bash
# 1. Check certificates exist
ls certs/

# 2. Check dev server is running
curl -k https://localhost:5174/QRMENU/

# 3. Check environment variables
node -e "console.log(process.env.VITE_CLERK_PUBLISHABLE_KEY)"
```

---

## 📞 Need Help?

If commands aren't working:

1. Check you're in the project root directory
2. Verify Node.js is installed: `node --version`
3. Check npm is working: `npm --version`
4. Read the detailed guides:
   - [QUICK_FIX.md](./QUICK_FIX.md)
   - [HTTPS_SETUP_GUIDE.md](./HTTPS_SETUP_GUIDE.md)
   - [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
