# HTTPS Setup Guide for Local Network Development

This guide helps you fix the Clerk cookie and Firebase Auth errors by enabling HTTPS for local development.

## 🔍 Problem Summary

- **Error 1**: "Suffixed cookie failed due to Cannot read properties of undefined (reading 'digest')"
- **Error 2**: "Failed to load resource: 400 ()" from Firebase Auth
- **Root Cause**: Running on HTTP (`http://10.208.179.58:5174`) instead of HTTPS
- **Impact**: Clerk requires secure context for cookies, Firebase Auth rejects insecure requests

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Generate SSL Certificates

Run this command in your project root:

```bash
node generate-certs.js
```

This will:
- Auto-detect your local IP addresses (including 10.208.179.58)
- Generate self-signed certificates in `certs/` folder
- Create certificates valid for localhost AND your network IP

**Alternative (if OpenSSL not installed):**

Install mkcert (easier, trusted by browser):
```bash
# Install mkcert
npm install -g mkcert

# Create and install local CA
mkcert -install

# Generate certificates for your IPs
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 10.208.179.58
```

### Step 2: Start Dev Server

```bash
npm run dev
```

Your app will now run on:
- `https://localhost:5174/QRMENU/admin`
- `https://10.208.179.58:5174/QRMENU/admin`

**Browser Warning**: You'll see "Your connection is not private" - this is expected for self-signed certificates.
- Click **Advanced**
- Click **Proceed to 10.208.179.58 (unsafe)**

### Step 3: Configure Firebase & Clerk

#### A. Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **qr-menu-19cd1**
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add these domains:
   ```
   10.208.179.58
   localhost
   ```
6. Click **Add**

#### B. Clerk Allowed Origins

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Settings** → **Domains** (or **API Keys** → **Allowed origins**)
4. Add these origins:
   ```
   https://10.208.179.58:5174
   https://localhost:5174
   http://localhost:5174
   ```
5. Save changes

---

## 🔧 Configuration Details

### Vite Config (Already Updated)

Your `vite.config.ts` is configured to use HTTPS when certificates exist:

```typescript
server: {
  host: true,
  port: 5174,
  https: fs.existsSync('./certs/cert.pem') ? {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
  } : undefined,
}
```

### Environment Variables

Your `.env.local` is already configured correctly:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_FIREBASE_API_KEY=AIzaSyDVw_vhFXStAKYWCA0lE3IMxmNDZrGwnqs
VITE_FIREBASE_PROJECT_ID=qr-menu-19cd1
# ... other Firebase config
```

No changes needed to `.env.local`.

---

## 📱 Testing on Mobile Devices

Once HTTPS is enabled, you can test on phones/tablets on the same network:

1. Find your computer's IP: `10.208.179.58` (already detected)
2. On your mobile device, navigate to: `https://10.208.179.58:5174/QRMENU/admin`
3. Accept the certificate warning
4. Clerk authentication should now work properly

---

## 🐛 Troubleshooting

### Issue: "OpenSSL not found"

**Solution 1 - Install OpenSSL:**
- Windows: Download from https://slproweb.com/products/Win32OpenSSL.html
- Or use Chocolatey: `choco install openssl`

**Solution 2 - Use mkcert (Recommended):**
```bash
npm install -g mkcert
mkcert -install
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

### Issue: "Certificate not trusted" on mobile

Self-signed certificates won't be trusted on mobile devices. Options:

1. **Accept the warning** each time (click "Advanced" → "Proceed")
2. **Use mkcert** and install the CA certificate on your mobile device:
   - After running `mkcert -install`, find the CA certificate
   - Transfer it to your phone and install it in Settings → Security

### Issue: Still getting cookie errors

1. **Clear browser cache and cookies**
2. **Verify HTTPS is active**: Check URL shows `https://` with lock icon
3. **Check Clerk dashboard**: Ensure `https://10.208.179.58:5174` is in allowed origins
4. **Restart dev server**: Stop and run `npm run dev` again

### Issue: Firebase 400 error persists

1. **Check Firebase Authorized Domains**: Must include `10.208.179.58`
2. **Wait 5 minutes**: Firebase changes can take time to propagate
3. **Check Firebase project**: Ensure you're using the correct project (qr-menu-19cd1)

---

## 🔒 Security Notes

- Self-signed certificates are **only for development**
- Never commit certificates to git (already in `.gitignore`)
- For production, use proper SSL certificates from Let's Encrypt or your hosting provider
- The `certs/` folder is git-ignored by default

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Certificates generated in `certs/` folder
- [ ] Dev server starts with HTTPS (check terminal output)
- [ ] Browser shows `https://` in URL bar
- [ ] No "Suffixed cookie failed" error in console
- [ ] No Firebase 400 error in console
- [ ] Clerk login works without errors
- [ ] Can access from mobile device on same network

---

## 📚 Additional Resources

- [Vite HTTPS Documentation](https://vitejs.dev/config/server-options.html#server-https)
- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Clerk Development Setup](https://clerk.com/docs/quickstarts/setup-clerk)
- [Firebase Authorized Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices)

---

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. Check the browser console for specific error messages
2. Verify all configuration steps were completed
3. Try accessing via `https://localhost:5174` first to isolate network issues
4. Check that your firewall isn't blocking port 5174
