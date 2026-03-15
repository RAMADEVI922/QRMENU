# Firebase & Clerk Configuration Guide

## 🔥 Firebase Authorized Domains Setup

### Step-by-Step Instructions

1. **Open Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Select Your Project**
   - Click on **qr-menu-19cd1** project

3. **Navigate to Authentication Settings**
   - In the left sidebar, click **Authentication**
   - Click the **Settings** tab at the top
   - Scroll down to **Authorized domains** section

4. **Add Your Local IP Domain**
   - Click the **Add domain** button
   - Enter: `10.208.179.58`
   - Click **Add**

5. **Verify Localhost is Already Added**
   - Check that `localhost` is in the list
   - If not, add it using the same process

### Expected Result

Your Authorized domains list should include:
- ✅ `localhost`
- ✅ `10.208.179.58`
- ✅ Your production domain (if any)

---

## 🔐 Clerk Allowed Origins Setup

### Step-by-Step Instructions

1. **Open Clerk Dashboard**
   - Navigate to: https://dashboard.clerk.com/
   - Sign in with your account

2. **Select Your Application**
   - Click on your QR Menu application
   - (The one with publishable key: `pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA`)

3. **Navigate to Settings**
   - Look for **Settings** in the left sidebar
   - Click on **Domains** or **API Keys** section
   - Find **Allowed origins** or **CORS origins**

4. **Add Development Origins**
   
   Add these three origins (one at a time):
   
   ```
   https://10.208.179.58:5174
   ```
   
   ```
   https://localhost:5174
   ```
   
   ```
   http://localhost:5174
   ```

5. **Save Changes**
   - Click **Save** or **Add** button
   - Wait for confirmation message

### Expected Result

Your Allowed origins list should include:
- ✅ `https://10.208.179.58:5174`
- ✅ `https://localhost:5174`
- ✅ `http://localhost:5174`
- ✅ Your production URL (if any)

---

## 🔍 Verification Steps

### 1. Check Firebase Configuration

Run this in your browser console (after opening your app):

```javascript
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});
```

Expected output:
```
Firebase Config: {
  apiKey: "AIzaSyDVw_vhFXStAKYWCA0lE3IMxmNDZrGwnqs",
  authDomain: "qr-menu-19cd1.firebaseapp.com",
  projectId: "qr-menu-19cd1"
}
```

### 2. Check Clerk Configuration

Run this in your browser console:

```javascript
console.log('Clerk Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
```

Expected output:
```
Clerk Key: "pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA"
```

### 3. Test Authentication

1. Open: `https://10.208.179.58:5174/QRMENU/admin`
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to sign in
5. Check for errors:
   - ❌ Should NOT see: "Suffixed cookie failed"
   - ❌ Should NOT see: "400 error from identitytoolkit"
   - ✅ Should see: "Clerk diagnostics initialized"

---

## 🚨 Common Issues & Solutions

### Issue: "Domain not authorized" in Firebase

**Symptoms:**
```
auth/unauthorized-domain: This domain (10.208.179.58) is not authorized
```

**Solution:**
1. Double-check you added `10.208.179.58` (without `https://` or port)
2. Wait 2-5 minutes for Firebase to propagate changes
3. Clear browser cache and try again

### Issue: "Origin not allowed" in Clerk

**Symptoms:**
```
Clerk: Origin https://10.208.179.58:5174 is not allowed
```

**Solution:**
1. Verify you added the FULL URL including `https://` and port `:5174`
2. Check for typos in the URL
3. Save changes and wait 1-2 minutes
4. Hard refresh browser (Ctrl+Shift+R)

### Issue: Still seeing cookie errors

**Symptoms:**
```
Suffixed cookie failed due to Cannot read properties of undefined
```

**Solution:**
1. Verify you're accessing via HTTPS (not HTTP)
2. Check URL bar shows `https://` with lock icon
3. Clear all cookies for the site:
   - DevTools → Application → Cookies → Delete all
4. Restart browser
5. Try again

---

## 📋 Configuration Checklist

Before testing, ensure:

- [ ] Certificates generated (`certs/cert.pem` and `certs/key.pem` exist)
- [ ] Dev server running with HTTPS (terminal shows `https://`)
- [ ] Firebase Authorized Domains includes `10.208.179.58`
- [ ] Firebase Authorized Domains includes `localhost`
- [ ] Clerk Allowed Origins includes `https://10.208.179.58:5174`
- [ ] Clerk Allowed Origins includes `https://localhost:5174`
- [ ] Browser accessing via `https://` (not `http://`)
- [ ] Certificate warning accepted in browser

---

## 🎯 Quick Test Script

Run this in your browser console to test everything:

```javascript
// Test 1: Check HTTPS
console.log('1. Protocol:', window.location.protocol); // Should be "https:"

// Test 2: Check Clerk
console.log('2. Clerk loaded:', typeof window.Clerk !== 'undefined');

// Test 3: Check Firebase
console.log('3. Firebase config:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Test 4: Check secure context
console.log('4. Secure context:', window.isSecureContext); // Should be true

// Test 5: Try to set a cookie
document.cookie = "test=123; Secure; SameSite=None";
console.log('5. Cookie test:', document.cookie.includes('test=123'));
```

Expected output:
```
1. Protocol: "https:"
2. Clerk loaded: true
3. Firebase config: "qr-menu-19cd1"
4. Secure context: true
5. Cookie test: true
```

---

## 📞 Need Help?

If you're still experiencing issues after following this guide:

1. Check the browser console for specific error messages
2. Verify your IP address hasn't changed (run `ipconfig` on Windows)
3. Ensure firewall isn't blocking port 5174
4. Try accessing from `https://localhost:5174` first to isolate network issues
5. Check that both Firebase and Clerk configurations were saved successfully
