# 🚀 HTTPS Setup Checklist

Follow these steps in order. Check off each item as you complete it.

---

## 📋 Pre-Setup

- [ ] You have Node.js installed
- [ ] You're in your project directory
- [ ] Your dev server is currently stopped

---

## 🔐 Step 1: Generate SSL Certificates

### Option A: Using OpenSSL (if installed)

```bash
node generate-certs.js
```

**Expected output:**
```
🌐 Detected local IPs: localhost, 127.0.0.1, 10.208.179.58
🔐 Generating self-signed certificate with network support...
✅ Certificate generated successfully!
```

### Option B: Using mkcert (recommended if OpenSSL fails)

```bash
# Install mkcert
npm install -g mkcert

# Install local CA
mkcert -install

# Generate certificates
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 10.208.179.58
```

### Verification:
- [ ] `certs/` folder exists in your project root
- [ ] `certs/cert.pem` file exists
- [ ] `certs/key.pem` file exists

---

## 🖥️ Step 2: Start Dev Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:5174/QRMENU/
➜  Network: https://10.208.179.58:5174/QRMENU/
```

### Verification:
- [ ] Terminal shows `https://` (not `http://`)
- [ ] No errors in terminal
- [ ] Server is running on port 5174

---

## 🌐 Step 3: Test in Browser

Open: `https://10.208.179.58:5174/QRMENU/admin`

### First Time:
- [ ] Browser shows "Your connection is not private" warning
- [ ] You clicked "Advanced"
- [ ] You clicked "Proceed to 10.208.179.58 (unsafe)"
- [ ] Page loads successfully

### Check Console (F12):
- [ ] No "Suffixed cookie failed" error
- [ ] No "400 error" from Firebase
- [ ] See "Clerk diagnostics initialized"
- [ ] See "Firebase initialized successfully"

---

## 🔥 Step 4: Configure Firebase

1. **Open Firebase Console:**
   - [ ] Go to: https://console.firebase.google.com/
   - [ ] Select project: **qr-menu-19cd1**

2. **Navigate to Authentication:**
   - [ ] Click **Authentication** in left sidebar
   - [ ] Click **Settings** tab
   - [ ] Scroll to **Authorized domains**

3. **Add Domain:**
   - [ ] Click **Add domain** button
   - [ ] Enter: `10.208.179.58`
   - [ ] Click **Add**
   - [ ] Verify `localhost` is also in the list

### Verification:
- [ ] `10.208.179.58` appears in Authorized domains list
- [ ] `localhost` appears in Authorized domains list

---

## 🔐 Step 5: Configure Clerk

1. **Open Clerk Dashboard:**
   - [ ] Go to: https://dashboard.clerk.com/
   - [ ] Select your QR Menu application

2. **Navigate to Settings:**
   - [ ] Click **Settings** in left sidebar
   - [ ] Find **Domains** or **API Keys** section
   - [ ] Locate **Allowed origins** or **CORS origins**

3. **Add Origins:**
   - [ ] Add: `https://10.208.179.58:5174`
   - [ ] Add: `https://localhost:5174`
   - [ ] Add: `http://localhost:5174`
   - [ ] Click **Save**

### Verification:
- [ ] All three origins appear in the list
- [ ] Changes saved successfully
- [ ] No error messages

---

## ✅ Step 6: Final Verification

### Test Authentication:
1. **Open App:**
   - [ ] Navigate to: `https://10.208.179.58:5174/QRMENU/admin`
   - [ ] Page loads without errors

2. **Check Console (F12):**
   - [ ] No "Suffixed cookie failed" error
   - [ ] No "400 error" from identitytoolkit
   - [ ] No "unauthorized-domain" error
   - [ ] See success messages from Clerk and Firebase

3. **Test Login:**
   - [ ] Click login/sign in
   - [ ] Clerk modal appears
   - [ ] Can enter credentials
   - [ ] Login completes successfully
   - [ ] No errors in console during login

### Test on Mobile (Optional):
- [ ] Phone/tablet on same WiFi network
- [ ] Open: `https://10.208.179.58:5174/QRMENU/admin`
- [ ] Accept certificate warning
- [ ] Page loads successfully
- [ ] Can log in without errors

---

## 🎉 Success!

If all items are checked, your HTTPS setup is complete!

### What You Should See:
- ✅ URL bar shows `https://10.208.179.58:5174`
- ✅ No cookie errors in console
- ✅ No Firebase auth errors
- ✅ Clerk authentication works
- ✅ Can access from network devices

---

## 🐛 If Something Didn't Work

### Certificate Generation Failed:
→ See [HTTPS_SETUP_GUIDE.md](./HTTPS_SETUP_GUIDE.md) - "Troubleshooting" section

### Still Seeing Cookie Errors:
1. Clear browser cache and cookies
2. Hard refresh: Ctrl+Shift+R
3. Verify URL shows `https://`
4. Check Clerk allowed origins

### Firebase 400 Error:
1. Verify domain added to Firebase
2. Wait 5 minutes for propagation
3. Clear cache and try again

### Need More Help:
- Read [QUICK_FIX.md](./QUICK_FIX.md) for fast reference
- Read [FIREBASE_CLERK_CONFIG.md](./FIREBASE_CLERK_CONFIG.md) for detailed config steps
- Read [HTTPS_SETUP_GUIDE.md](./HTTPS_SETUP_GUIDE.md) for comprehensive guide

---

## 📝 Notes

- Certificates are valid for 365 days
- Certificates are git-ignored (won't be committed)
- You only need to do this setup once
- If your IP changes, update Firebase/Clerk configs

---

## 🔄 Daily Workflow (After Setup)

```bash
# Just start the server - HTTPS is automatic!
npm run dev
```

That's it! Your HTTPS configuration persists across restarts.
