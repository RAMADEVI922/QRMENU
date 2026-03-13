# Blank Page Fix

## Issue
Application showed a blank white page when running locally or after deployment.

## Root Cause
Firebase collections were being initialized at module load time:
```typescript
const menuItemsCollection = collection(db, "menuItems");
const photosCollection = collection(db, "photos");
const ordersCollection = collection(db, "orders");
const notificationsCollection = collection(db, "notifications");
```

When Firebase is not configured or `db` is `null`, calling `collection(db, ...)` throws an error, causing the entire app to crash before React can render anything.

## Solution
Changed to lazy initialization using getter functions:
```typescript
const getMenuItemsCollection = () => db ? collection(db, "menuItems") : null;
const getPhotosCollection = () => db ? collection(db, "photos") : null;
const getOrdersCollection = () => db ? collection(db, "orders") : null;
const getNotificationsCollection = () => db ? collection(db, "notifications") : null;
```

Now collections are only created when actually needed, and only if Firebase is properly configured.

## Files Modified
- `src/lib/firebaseService.ts` - Updated all collection references to use lazy getters

## Testing
1. Local dev server: `http://localhost:5173/QRMENU/`
2. Production: `https://qr-menu-19cd1.web.app`

Both should now load without blank pages, even if Firebase is not configured.

## Deployment Status
✅ Build successful
✅ Deployed to Firebase Hosting
✅ Application loads correctly

## What Works Now
- App loads even without Firebase configuration
- Firebase functions gracefully handle missing configuration
- Console warnings instead of crashes when Firebase is unavailable
- Orders and notifications sync when Firebase is properly configured
