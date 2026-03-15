# Quick Fix for Cookie & Auth Errors

## Run These Commands (In Order)

### 1. Generate Certificates
```bash
node generate-certs.js
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Access Your App
```
https://10.208.179.58:5174/QRMENU/admin
```

Click "Advanced" → "Proceed" when you see the security warning.

---

## Configure Firebase (One-Time Setup)

1. Go to: https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Enter: `10.208.179.58`
5. Click **Add**

---

## Configure Clerk (One-Time Setup)

1. Go to: https://dashboard.clerk.com/
2. Select your app
3. Go to **Settings** → **Domains** (or **API Keys**)
4. Add these to **Allowed origins**:
   ```
   https://10.208.179.58:5174
   https://localhost:5174
   ```
5. Save

---

## ✅ Done!

Your app should now work without cookie or auth errors.

**Test it:**
- Open: `https://10.208.179.58:5174/QRMENU/admin`
- Try logging in with Clerk
- Check console - no more errors!

---

## Alternative: Use mkcert (If OpenSSL Fails)

```bash
# Install mkcert
npm install -g mkcert

# Install local CA
mkcert -install

# Generate certificates
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58

# Start server
npm run dev
```
