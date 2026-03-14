# Clerk Authentication Fix

## Problem
You're getting a **400 Bad Request** error when signing up/logging in because Clerk doesn't recognize your domain.

## Root Cause
Your app uses **Clerk** for admin authentication. Clerk rejects requests from unwhitelisted domains.

## Solution (5 Minutes)

### Step 1: Open Clerk Dashboard
Go to: https://dashboard.clerk.com

### Step 2: Add Your Domains
1. Click **Settings** → **Domains**
2. Click **Add Domain**
3. Add these domains (one at a time):
   - `ramadevi922.github.io`
   - `10.208.179.58:5178`
   - `localhost:5173`

### Step 3: Add Redirect URLs
1. Click **Settings** → **Redirect URLs**
2. Click **Add URL**
3. Add these URLs (copy-paste exactly):

```
https://ramadevi922.github.io/QRMENU/
https://ramadevi922.github.io/QRMENU/admin-login
https://ramadevi922.github.io/QRMENU/admin-signup
https://ramadevi922.github.io/QRMENU/admin
http://localhost:5173/QRMENU/
http://localhost:5173/QRMENU/admin-login
http://localhost:5173/QRMENU/admin-signup
http://localhost:5173/QRMENU/admin
http://10.208.179.58:5178/QRMENU/
http://10.208.179.58:5178/QRMENU/admin-login
http://10.208.179.58:5178/QRMENU/admin-signup
http://10.208.179.58:5178/QRMENU/admin
```

### Step 4: Test Locally
```bash
cd pro/QR-menu-org
npm run dev
# Visit http://localhost:5173/QRMENU/admin-login
# Try signing up
```

### Step 5: Test on Your Network
```bash
# Visit http://10.208.179.58:5178/QRMENU/admin-login
# Try signing up
```

### Step 6: Deploy
```bash
git add .
git commit -m "Fix: Configure Clerk for all domains"
git push origin main
# Wait 2-3 minutes for deployment
# Visit https://ramadevi922.github.io/QRMENU/admin-login
```

## Why This Works

Clerk's security requires:
1. Your domain to be whitelisted
2. Redirect URLs to be whitelisted
3. Requests to come from allowed origins

Without these, Clerk rejects requests with a 400 error.

## Troubleshooting

### Still Getting 400 Error?

1. **Clear browser cache**: `Ctrl+Shift+Delete` → Clear all data → Reload
2. **Check Clerk logs**: https://dashboard.clerk.com → Logs → Look for errors
3. **Verify domains**: https://dashboard.clerk.com → Settings → Domains → Check all are listed
4. **Verify URLs**: https://dashboard.clerk.com → Settings → Redirect URLs → Check all are listed

### Getting Cookie Error?

Same as 400 error - usually caused by domain not being whitelisted.

### Getting Redirect Error?

1. Go to https://dashboard.clerk.com
2. Settings → Redirect URLs
3. Verify the exact URL is listed
4. Make sure there are no extra spaces or typos

## Your Current Setup

- **Clerk Key**: `pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA` (test key)
- **Firebase**: Configured and working
- **Routing**: Configured with base path `/QRMENU/`
- **Build**: GitHub Actions configured with fallback env vars
- **Code**: No errors

Everything is set up correctly except for the Clerk domain whitelist. Once you add your domains to Clerk, it will work.

## Architecture

Your app uses a hybrid authentication system:

```
Admin Panel
    ↓
Clerk (Authentication)
    ↓
Firebase (Data Storage)
    ↓
Customer Menu (Public)
```

- **Clerk** handles admin login/signup
- **Firebase** stores menu items, orders, and tables
- **Customer Menu** is public (no authentication needed)

## Environment Variables

Your `.env.local` has:

```env
# Clerk - for admin authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bWludC13b21iYXQtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA

# Firebase - for data storage
VITE_FIREBASE_API_KEY=AIzaSyDVw_vhFXStAKYWCA0lE3IMxmNDZrGwnqs
VITE_FIREBASE_AUTH_DOMAIN=qr-menu-19cd1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qr-menu-19cd1
VITE_FIREBASE_STORAGE_BUCKET=qr-menu-19cd1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=650478848908
VITE_FIREBASE_APP_ID=1:650478848908:web:add3a3598af1b82e9f64a9
VITE_FIREBASE_MEASUREMENT_ID=G-ZVKX512TRH
```

All variables are correctly set. No changes needed here.

## Key Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Clerk initialization |
| `src/pages/AdminLogin.tsx` | Admin login page |
| `src/pages/AdminSignUp.tsx` | Admin signup page |
| `src/components/ProtectedRoute.tsx` | Route protection |
| `src/lib/firebase.ts` | Firebase initialization |
| `.env.local` | Environment variables |
| `vite.config.ts` | Build configuration |
| `.github/workflows/deploy.yml` | CI/CD configuration |

## Testing

After configuring Clerk, test these flows:

1. **Admin Signup**
   - Go to http://localhost:5173/QRMENU/admin-signup
   - Sign up with test email
   - Should redirect to admin panel

2. **Admin Login**
   - Go to http://localhost:5173/QRMENU/admin-login
   - Sign in with test email
   - Should redirect to admin panel

3. **Admin Panel**
   - Should see Orders Queue, Menu Management, Table Management
   - Should be able to interact with all features

4. **Customer Flow**
   - Scan QR code or go to http://localhost:5173/QRMENU/
   - Select table
   - Browse menu
   - Place order
   - Admin should see order in real-time

## Support

- **Clerk Docs**: https://clerk.com/docs
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Firebase Docs**: https://firebase.google.com/docs
- **Vite Docs**: https://vitejs.dev
