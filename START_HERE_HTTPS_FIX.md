# 🚨 START HERE - Fix Cookie & Auth Errors

## Your Problem

You're seeing these errors:
```
❌ Suffixed cookie failed due to Cannot read properties of undefined (reading 'digest')
❌ Failed to load resource: 400 () from identitytoolkit.googleapis.com
```

**Root Cause:** Your app is running on HTTP instead of HTTPS.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Generate Certificates (1 minute)

```bash
node generate-certs.js
```

**If that fails**, use mkcert instead:
```bash
npm install -g mkcert
mkcert -install
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

### Step 2: Start Server (30 seconds)

```bash
npm run dev
```

### Step 3: Configure Firebase (2 minutes)

1. Go to: https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Enter: `10.208.179.58`
5. Click **Add**

### Step 4: Configure Clerk (2 minutes)

1. Go to: https://dashboard.clerk.com/
2. Select your app
3. Go to **Settings** → **Domains**
4. Add: `https://10.208.179.58:5174`
5. Add: `https://localhost:5174`
6. Save

### Step 5: Test (30 seconds)

Open: `https://10.208.179.58:5174/QRMENU/admin`

- Accept certificate warning
- Try logging in
- Check console - no more errors!

---

## 📚 Need More Help?

Choose the guide that fits your needs:

### 🎯 [QUICK_FIX.md](./QUICK_FIX.md)
**Best for:** Fast reference, minimal reading
**Contains:** Just the commands and URLs you need

### ✅ [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
**Best for:** Step-by-step with checkboxes
**Contains:** Interactive checklist to track progress

### 📖 [HTTPS_SETUP_GUIDE.md](./HTTPS_SETUP_GUIDE.md)
**Best for:** Comprehensive understanding
**Contains:** Full explanation, troubleshooting, verification

### 🔧 [FIREBASE_CLERK_CONFIG.md](./FIREBASE_CLERK_CONFIG.md)
**Best for:** Configuration details
**Contains:** Detailed Firebase & Clerk setup with screenshots instructions

### 💻 [COMMANDS_REFERENCE.md](./COMMANDS_REFERENCE.md)
**Best for:** Command lookup
**Contains:** All commands organized by category

### 📊 [HTTPS_FIX_SUMMARY.md](./HTTPS_FIX_SUMMARY.md)
**Best for:** Understanding what was changed
**Contains:** Complete overview of the fix and changes made

---

## 🎯 What You'll Achieve

After following the quick fix:

✅ No more cookie errors  
✅ No more Firebase 400 errors  
✅ Clerk authentication works  
✅ Can access from mobile devices  
✅ Secure HTTPS connection  

---

## 🆘 Common Issues

### "OpenSSL not found"
→ Use mkcert instead (see Step 1 alternative)

### Still seeing errors
→ Read [HTTPS_SETUP_GUIDE.md](./HTTPS_SETUP_GUIDE.md) troubleshooting section

### Need to understand what changed
→ Read [HTTPS_FIX_SUMMARY.md](./HTTPS_FIX_SUMMARY.md)

---

## 🚀 Ready? Start Now!

```bash
# Copy and paste this:
node generate-certs.js && npm run dev
```

Then configure Firebase and Clerk (links above).

**You'll be up and running in 5 minutes!** 🎉
