# Firebase Emulator Setup Guide

## Problem
Your Firebase project is currently hitting **quota limits** on the free (Spark) plan, which prevents orders from being saved. This blocks the entire order management system.

## Solution
Use **Firebase Emulator Suite** for local development:
- ✅ **Unlimited** read/write quota
- ✅ **100% free** (runs locally)
- ✅ **No internet** required
- ✅ **Fast** development & testing
- ✅ **Same API** as real Firebase (code is production-ready)

---

## Quick Setup (3 Steps)

### Step 1: Install Firebase Tools
```bash
npm install -g firebase-tools
```

### Step 2: Start the Emulator
```bash
firebase emulator:start
```

You should see output like:
```
✔  Emulator Hub started at http://localhost:4400
✔  Authentication emulator started at http://localhost:9099
✔  Firestore emulator started at http://localhost:8080
✔  Storage emulator started at http://localhost:9199
```

**Keep this terminal open!** The emulator runs in the foreground.

### Step 3: Start Your App
In a **new terminal**, run:
```bash
npm run dev
```

The app will automatically connect to the emulator (via `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local`).

---

## Verification

1. Open your app in the browser
2. Check the console (F12 → Console tab)
3. You should see: **🔥 Connected to Firebase Emulator Suite (local development mode)**
4. Scan a QR code and place an order
5. Check order appears in **Admin → Orders Queue**

---

## Common Issues

### "Cannot connect to emulator"
- ❌ Make sure `firebase emulator:start` is running in another terminal
- ❌ Check that port 8080 is not blocked by another app

### "Emulator is already connected"
- This is normal on hot reload - you can ignore it

### "I want to use real Firebase again"
- Edit `.env.local` and set: `VITE_USE_FIREBASE_EMULATOR=false`
- Restart your dev server

---

## How It Works

When `VITE_USE_FIREBASE_EMULATOR=true`:

1. **src/lib/firebase.ts** detects the emulator flag
2. Calls `connectFirestoreEmulator()`, `connectAuthEmulator()`, `connectStorageEmulator()`
3. All reads/writes go to `localhost:8080` instead of the cloud
4. **No quota charges**, unlimited usage

The code is identical to production - you're just pointing at a local database instead of the cloud.

---

## Switching Between Emulator and Production

### To use the emulator:
```
VITE_USE_FIREBASE_EMULATOR=true
```

### To use production Firebase:
```
VITE_USE_FIREBASE_EMULATOR=false
```

Then restart `npm run dev`.

---

## Data Persistence

Firebase Emulator data persists in `~/.firebase/emulators/firestore_export/` by default.

- To **keep data** between restarts: data persists automatically
- To **clear all data**: Delete the export folder or use `firebase emulator:start --clear-on-exit`

---

## Production Deployment

When deploying to production:

1. Make sure `.env.local` is **not** included in your build
2. Production environment variables should have `VITE_USE_FIREBASE_EMULATOR=false` or unset
3. Firebase will use real credentials from `VITE_FIREBASE_*` env vars
4. No code changes needed - same codebase works everywhere!

---

## More Info
- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Docs](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
