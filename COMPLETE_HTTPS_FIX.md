# COMPLETE HTTPS FIX - Step by Step (Windows)

## Current Problem
- Running on: `http://10.208.179.58:5174`
- Error 1: "Suffixed cookie failed - Cannot read properties of undefined (reading 'digest')"
- Error 2: Firebase identitytoolkit 400 error
- Root cause: No HTTPS = No secure context = Clerk cookies fail

---

## STEP 1 — Install mkcert

### Option A: Using Chocolatey (Recommended)

Open PowerShell as Administrator and run:

```powershell
# Install Chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install mkcert
choco install mkcert -y
```

### Option B: Using winget

Open PowerShell (regular, not admin) and run:

```powershell
winget install FiloSottile.mkcert
```

### Option C: Manual Download

1. Download from: https://github.com/FiloSottile/mkcert/releases/latest
2. Download: `mkcert-v1.4.4-windows-amd64.exe`
3. Rename to: `mkcert.exe`
4. Move to: `C:\Windows\System32\`

### Verify Installation

```powershell
mkcert -version
```

Expected output: `v1.4.4` (or similar)

---

### Install Local Certificate Authority

Open PowerShell as Administrator:

```powershell
mkcert -install
```

Expected output:
```
Created a new local CA 💥
The local CA is now installed in the system trust store! ⚡️
```

---

### Generate Certificates for Your IP

Navigate to your project directory:

```powershell
cd C:\path\to\your\project
```

Create certs directory:

```powershell
mkdir certs
```

Generate certificates:

```powershell
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1
```

Expected output:
```
Created a new certificate valid for the following names 📜
 - "10.208.179.58"
 - "localhost"
 - "127.0.0.1"

The certificate is at "certs/cert.pem" and the key at "certs/key.pem" ✅
```

### Verify Files Created

```powershell
dir certs
```

You should see:
- `cert.pem` (certificate file)
- `key.pem` (private key file)

---

## STEP 2 — Update vite.config.ts

Replace your entire `vite.config.ts` with this:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/QRMENU/",
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 5174,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
    },
    hmr: {
      overlay: false,
      host: '10.208.179.58',  // Use your actual IP for HMR
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**Key changes:**
- `host: '0.0.0.0'` - Listens on all network interfaces
- `https: { key: ..., cert: ... }` - Always uses HTTPS (no conditional)
- `hmr.host: '10.208.179.58'` - Hot Module Replacement uses your IP

---

## STEP 3 — Update package.json

Update the `dev` script in `package.json`:

```json
{
  "scripts": {
    "gen-certs": "node generate-certs.js",
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "predeploy": "npm run build",
    "deploy": "npx gh-pages -d dist"
  }
}
```

**Change:** Added `--host 0.0.0.0` to the `dev` script.

---

## STEP 4 — Fix .env file

Your `.env.local` is already correct! No changes needed.

**Current configuration (already good):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_FIREBASE_API_KEY=AIzaSyDVw_vhFXStAKYWCA0lE3IMxmNDZrGwnqs
VITE_FIREBASE_AUTH_DOMAIN=qr-menu-19cd1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qr-menu-19cd1
# ... rest is fine
```

**Note:** Clerk and Firebase will work with HTTPS automatically. No domain changes needed in env vars.

---

## STEP 5 — Firebase Console Configuration

### Exact Steps:

1. **Open Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Select Your Project:**
   - Click on: **qr-menu-19cd1**

3. **Navigate to Authentication:**
   - Left sidebar → Click **Authentication**
   - Top tabs → Click **Settings**

4. **Scroll to Authorized Domains:**
   - Scroll down to the **Authorized domains** section

5. **Add Your IP:**
   - Click the **Add domain** button
   - Enter: `10.208.179.58` (just the IP, no https:// or port)
   - Click **Add**

6. **Verify:**
   - You should see `10.208.179.58` in the list
   - `localhost` should already be there

**Screenshot reference:**
```
Authorized domains
These domains are allowed to use Firebase Authentication.

✓ localhost
✓ 10.208.179.58
✓ qr-menu-19cd1.firebaseapp.com
✓ qr-menu-19cd1.web.app

[Add domain]
```

---

## STEP 6 — Clerk Dashboard Configuration

### Exact Steps:

1. **Open Clerk Dashboard:**
   ```
   https://dashboard.clerk.com/
   ```

2. **Select Your Application:**
   - Click on your QR Menu app (the one with key: `pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA`)

3. **Navigate to Settings:**
   - Left sidebar → Click **Configure**
   - Then click **Domains** (or **API Keys** → **Allowed origins**)

4. **Add Development Origins:**
   
   Click **Add origin** and add these one by one:
   
   ```
   https://10.208.179.58:5174
   ```
   
   ```
   https://localhost:5174
   ```
   
   ```
   http://localhost:5174
   ```

5. **Save Changes:**
   - Click **Save** or **Add** after each entry

6. **Verify:**
   Your allowed origins should include:
   ```
   ✓ https://10.208.179.58:5174
   ✓ https://localhost:5174
   ✓ http://localhost:5174
   ```

---

## STEP 7 — Browser Trust Fix

### Chrome Settings:

1. **Enable Insecure Localhost:**
   - Open Chrome
   - Navigate to: `chrome://flags/#allow-insecure-localhost`
   - Set to: **Enabled**
   - Click **Relaunch**

2. **When You First Access the Site:**
   - Navigate to: `https://10.208.179.58:5174/QRMENU/admin`
   - You'll see: "Your connection is not private"
   - Click: **Advanced**
   - Click: **Proceed to 10.208.179.58 (unsafe)**

3. **Trust the Certificate (One-Time):**
   - Click the lock icon (or "Not Secure") in the address bar
   - Click: **Certificate is not valid**
   - Click: **Details** tab
   - Click: **Export**
   - Save as: `mkcert-cert.crt`
   - Double-click the saved file
   - Click: **Install Certificate**
   - Select: **Current User**
   - Select: **Place all certificates in the following store**
   - Click: **Browse**
   - Select: **Trusted Root Certification Authorities**
   - Click: **OK** → **Next** → **Finish**
   - Restart Chrome

**Alternative (Easier):**

Since you used `mkcert -install`, the certificate should already be trusted. If Chrome still shows warnings:

1. Close all Chrome windows
2. Reopen Chrome
3. Navigate to: `https://10.208.179.58:5174/QRMENU/admin`
4. Click through the warning once (Advanced → Proceed)

---

## STEP 8 — Start Server & Verify

### Start the Dev Server:

```powershell
npm run dev
```

### Expected Terminal Output:

```
VITE v5.4.19  ready in 523 ms

➜  Local:   https://localhost:5174/QRMENU/
➜  Network: https://10.208.179.58:5174/QRMENU/
➜  press h + enter to show help
```

**Key indicators:**
- ✅ URLs show `https://` (not `http://`)
- ✅ Network URL shows your IP: `10.208.179.58`
- ✅ No errors in terminal

---

### Verify in Browser:

1. **Open the URL:**
   ```
   https://10.208.179.58:5174/QRMENU/admin
   ```

2. **Check Address Bar:**
   - Should show: `https://10.208.179.58:5174/QRMENU/admin`
   - Lock icon (may show "Not Secure" for self-signed cert, but that's OK)

3. **Open DevTools (F12):**
   - Go to **Console** tab

4. **Check for Success Messages:**
   ```
   ✅ Clerk diagnostics initialized
   ✅ Firebase initialized successfully
   ✅ useOrdersSync: Setting up real-time listener
   ```

5. **Check for NO Errors:**
   ```
   ❌ Should NOT see: "Suffixed cookie failed"
   ❌ Should NOT see: "400 error from identitytoolkit"
   ❌ Should NOT see: "auth/unauthorized-domain"
   ```

6. **Test Secure Context:**
   
   In the console, run:
   ```javascript
   console.log('Secure context:', window.isSecureContext);
   console.log('Protocol:', window.location.protocol);
   ```
   
   Expected output:
   ```
   Secure context: true
   Protocol: "https:"
   ```

7. **Test Clerk Login:**
   - Click login/sign in
   - Clerk modal should appear
   - Try logging in
   - Should work without errors

---

## FALLBACK: If mkcert Doesn't Support IP Addresses

If mkcert fails with IP addresses, use OpenSSL:

### Install OpenSSL (Windows):

```powershell
choco install openssl -y
```

Or download from: https://slproweb.com/products/Win32OpenSSL.html

### Create OpenSSL Config File:

Create `certs/openssl.cnf`:

```ini
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = 10.208.179.58

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = 10.208.179.58
IP.2 = 127.0.0.1
DNS.1 = localhost
```

### Generate Certificate with OpenSSL:

```powershell
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -config certs/openssl.cnf -extensions v3_req
```

### Place Files:

Files are already in the correct location:
- `certs/cert.pem` - Certificate
- `certs/key.pem` - Private key

---

## Complete Command Sequence (Copy & Paste)

Here's everything in order:

```powershell
# 1. Install mkcert (choose one method)
choco install mkcert -y
# OR
winget install FiloSottile.mkcert

# 2. Install local CA (run as Administrator)
mkcert -install

# 3. Navigate to your project
cd C:\path\to\your\project

# 4. Create certs directory
mkdir certs

# 5. Generate certificates
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1

# 6. Verify files
dir certs

# 7. Start dev server
npm run dev
```

---

## Troubleshooting

### Issue: "mkcert: command not found"

**Solution:**
- Close and reopen PowerShell
- Or add to PATH manually:
  ```powershell
  $env:Path += ";C:\ProgramData\chocolatey\bin"
  ```

### Issue: "ENOENT: no such file or directory, open 'certs/cert.pem'"

**Solution:**
- Verify files exist: `dir certs`
- Regenerate: `mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1`

### Issue: Still seeing HTTP in terminal

**Solution:**
- Check `vite.config.ts` has the HTTPS config (Step 2)
- Restart dev server: Ctrl+C, then `npm run dev`

### Issue: "Suffixed cookie failed" still appears

**Solution:**
1. Clear browser cache: Ctrl+Shift+Delete
2. Clear cookies for the site
3. Hard refresh: Ctrl+Shift+R
4. Verify URL shows `https://`
5. Check Clerk dashboard has correct origins

### Issue: Firebase 400 error persists

**Solution:**
1. Verify `10.208.179.58` is in Firebase Authorized Domains
2. Wait 5 minutes for changes to propagate
3. Clear browser cache
4. Try again

---

## Success Checklist

- [ ] mkcert installed and working
- [ ] `mkcert -install` completed successfully
- [ ] Certificates generated in `certs/` folder
- [ ] `vite.config.ts` updated with HTTPS config
- [ ] `package.json` dev script includes `--host 0.0.0.0`
- [ ] Firebase Authorized Domains includes `10.208.179.58`
- [ ] Clerk Allowed Origins includes `https://10.208.179.58:5174`
- [ ] Dev server starts with `https://` URLs
- [ ] Browser shows `https://` in address bar
- [ ] Console shows `window.isSecureContext === true`
- [ ] No "Suffixed cookie failed" error
- [ ] No Firebase 400 error
- [ ] Clerk login works successfully

---

## Final Verification Script

Run this in your browser console:

```javascript
// Complete verification
const checks = {
  'Protocol': window.location.protocol,
  'Secure Context': window.isSecureContext,
  'Clerk Loaded': typeof window.Clerk !== 'undefined',
  'Firebase Project': import.meta.env.VITE_FIREBASE_PROJECT_ID,
  'Clerk Key': import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...'
};

console.table(checks);

// Expected output:
// Protocol: "https:"
// Secure Context: true
// Clerk Loaded: true
// Firebase Project: "qr-menu-19cd1"
// Clerk Key: "pk_test_bWludC13b21i..."
```

---

## You're Done! 🎉

Your app should now be running on HTTPS with no cookie or auth errors.

Access your app at: `https://10.208.179.58:5174/QRMENU/admin`
