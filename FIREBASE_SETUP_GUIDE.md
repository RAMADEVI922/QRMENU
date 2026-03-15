# Firebase Setup Guide - Fix 400 Error

## Problem
Getting `identitytoolkit.googleapis.com 400` error when trying to authenticate.

## Solution

### Step 1: Enable Firebase Authentication

1. Go to https://console.firebase.google.com
2. Select project: `qr-menu-19cd1`
3. Go to **Authentication** (left sidebar)
4. Click **Get Started**
5. Enable **Email/Password** authentication:
   - Click **Email/Password**
   - Toggle **Enable**
   - Click **Save**

### Step 2: Add Authorized Domains

1. In Firebase Console, go to **Authentication**
2. Click **Settings** tab
3. Scroll to **Authorized domains**
4. Click **Add domain**
5. Add these domains:
   - `localhost:5175`
   - `localhost:5174`
   - `10.208.179.58:5175`
   - `10.208.179.58:5174`
   - `ramadevi922.github.io`

### Step 3: Verify Firebase Configuration

Your `.env.local` should have:
```env
VITE_FIREBASE_API_KEY=AIzaSyDVw_vhFXStAKYWCA0lE3IMxmNDZrGwnqs
VITE_FIREBASE_AUTH_DOMAIN=qr-menu-19cd1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qr-menu-19cd1
VITE_FIREBASE_STORAGE_BUCKET=qr-menu-19cd1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=650478848908
VITE_FIREBASE_APP_ID=1:650478848908:web:add3a3598af1b82e9f64a9
VITE_FIREBASE_MEASUREMENT_ID=G-ZVKX512TRH
```

### Step 4: Verify Firestore Rules

1. Go to **Firestore Database**
2. Click **Rules** tab
3. Update rules to allow reads/writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{document=**} {
      allow read, write: if true;
    }
    match /menuItems/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

4. Click **Publish**

### Step 5: Test Authentication

1. Start dev server: `npm run dev`
2. Go to http://localhost:5175/QRMENU/admin-login
3. Sign in with Clerk
4. Check browser console - should see no 400 errors
5. Orders should load from Firebase

## If Still Getting 400 Error

### Check 1: Firebase Project ID
```bash
# Verify project ID matches
echo "Project ID in .env.local: qr-menu-19cd1"
# Go to Firebase Console and verify it matches
```

### Check 2: API Key
```bash
# Verify API key is correct
# Go to Firebase Console → Project Settings → API Keys
# Copy the Web API Key and update .env.local
```

### Check 3: Authentication Method
- Make sure Email/Password is enabled in Firebase Console
- Not using Clerk for Firebase auth (Clerk handles admin auth separately)

### Check 4: CORS Settings
1. Go to Firebase Console
2. Project Settings → General
3. Scroll to "Web API Key" section
4. Click on the key
5. Ensure it's not restricted to specific domains

## Expected Result

✅ No 400 errors in console
✅ Clerk authentication works
✅ Orders load from Firebase
✅ Real-time updates work
✅ Admin panel fully functional

## Support

- Firebase Docs: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com
- Clerk Docs: https://clerk.com/docs
