# QR Restaurant Ordering System - Troubleshooting & Setup Guide

## Overview

This guide helps you diagnose and fix issues with the QR restaurant ordering system, particularly focusing on:
- Firebase quota exhaustion
- Clerk authentication errors
- Real-time order updates not appearing
- Admin queue display issues

---

## 🚨 Current Issues & Fixes

### Issue #1: Firebase Quota Exceeded Errors

**Symptoms:**
- Console shows: `FirebaseError: [code=resource-exhausted]: Quota exceeded`
- New orders cannot be saved
- Admin queue stops updating

**Root Causes:**
1. **Free (Spark) Plan Limitations**: Daily read/write limits
2. **Rapid Write Cycles**: Orders being written multiple times
3. **Real-time listener overhead**: Too many metadata change events
4. **Offline mode enabled**: Creates duplicate writes

**Solutions (Already Implemented):**

✅ **Exponential Backoff** (firebaseService.ts)
- Retries failed saves with delays: 1s → 2s → 4s
- Only retries if error is not quota-related
- Automatic retry prevents temporary failures

✅ **Quota Monitoring** (firebaseQuotaMonitor.ts)
- Tracks quota errors across time
- Automatically detects sustained quota exhaustion
- Provides suggestions for optimization

✅ **Offline-First Fallback** (firebaseService.ts)
- All orders automatically saved to localStorage if Firebase fails
- Fallback is transparent to users
- Synced to Firebase when quota recovers

✅ **Query Optimization** (firebaseService.ts)
- Added `limit(200)` to all Firestore queries
- `includeMetadataChanges: false` reduces listener overhead
- Efficient multi-table filtering

✅ **Quota-Aware Sync** (useOrdersSync.ts)
- 30-second backoff after quota error
- Prevents repeated failed write attempts
- Automatic recovery when quota available

**How to Use Quota Monitor:**
```javascript
// In browser console:

// Check current quota status
__quotaMonitor.getStatus()

// Get optimization suggestions
__quotaMonitor.getSuggestions()

// View detailed error timeline
__quotaMonitor.getErrorLog()

// Reset statistics
__quotaMonitor.reset()

// Check if currently in backoff
__quotaMonitor.shouldBackoff()
```

**Long-term Solution:**
- Upgrade Firebase to **Blaze Plan** (pay-as-you-go)
- Default Spark plan: 20k writes/day, 50k reads/day
- Blaze plan: Unlimited with per-operation pricing (~$0.06 per 100k writes)

---

### Issue #2: Clerk Authentication 400 Error

**Symptoms:**
- Console shows: `Failed to load resource: status 400 (identitytoolkit.googleapis.com)`
- Clerk warning about development keys
- Cannot read properties of undefined (reading 'digest')

**Root Causes:**
1. Invalid or missing Clerk publishable key
2. Mismatch between development/production keys
3. Misconfigured environment variables
4. Stale session cookies from old configuration

**Solutions (Already Implemented):**

✅ **Clerk Diagnostics** (clerkDiagnostics.ts)
- Automated configuration checker
- Session status validator
- Environment variable verifier

**How to Use Clerk Diagnostics:**
```javascript
// In browser console:

// Run full diagnostic report
__clerkDiag.check()

// Get current auth status
__clerkDiag.getStatus()

// View configuration
__clerkDiag.getConfig()

// Test authentication flow
__clerkDiag.testAuth()

// Clear session (for troubleshooting)
__clerkDiag.clearSession()

// Show environment variable status
__clerkDiag.showEnv()
```

**Setup Instructions:**
1. Get Clerk API Key:
   - Go to app.clerk.com
   - Select your application
   - API Keys section → Copy Publishable Key

2. Create `.env.local` file in project root:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

3. Restart development server:
```bash
npm run dev
```

4. Verify setup:
```javascript
__clerkDiag.check()  // Should show ✅ all green
```

---

### Issue #3: Orders Not Appearing in Admin Queue

**Symptoms:**
- Logs show orders fetched but UI doesn't update
- Order count shows but items empty
- Queue shows "No active orders" despite placing order

**Root Causes:**
1. Orders not synced to Firebase (quota issues)
2. Real-time listener not updating state
3. Zustand store not applying updates
4. UI filter filtering out orders incorrectly

**Solutions (Already Implemented):**

✅ **Improved Logging** (useOrdersSync.ts)
- Detailed logs for each sync step
- Table-by-table breakdown
- Quota error detection with emoji indicators

✅ **Real-time Listener** (firebaseService.ts)
- Uses `onSnapshot()` for instant updates
- Filters to all 6 tables (T1, T2, T3, T4, T5, T6)
- Prevents infinite loops with deduplication

✅ **State Synchronization** (useOrdersSync.ts)
- Guards against applying own updates
- Prevents sync-then-sync-back loops
- Automatic debouncing of state updates

**How to Debug:**
1. **Check orders are loading:**
```javascript
// In console, when app loads:
// You should see: "📥 useOrdersSync: Loaded X orders from Firebase"
// And: "📊 OrdersQueue: Orders updated X orders"
```

2. **Place a test order:**
   - Open: http://localhost:5174/QRMENU/menu/T1
   - Add items and place order
   - Check console for: `✅ Order saved to Firebase: order-id`

3. **Check admin dashboard:**
   - Go to: http://localhost:5174/QRMENU/admin
   - Table filter should show: "T1 (1 order)"
   - Order should appear in queue

4. **If order doesn't appear:**
   ```javascript
   // Check if quota is limiting
   __quotaMonitor.getStatus()
   
   // Check order in Zustand store
   __restaurantStore.getState().orders
   
   // Check offline cache
   __showAppData()
   ```

---

## 📊 Diagnostic Commands

### App Data Management
```javascript
// View all cached data
__showAppData()

// Clear all app cache (⚠️ destructive)
__clearAppData()
// Then refresh page to reload from Firebase
```

### Offline Mode Control
```javascript
// Enable offline mode (for testing)
__offlineMode.enable()

// Disable offline mode (use Firebase)
__offlineMode.disable()

// Check if enabled
__offlineMode.isEnabled()

// View cached orders
__offlineMode.getOrders()

// Clear offline cache
__offlineMode.clear()
```

### Firebase Performance
```javascript
// Monitor Read/Write counts
__firebaseStats?.getReadCount()
__firebaseStats?.getWriteCount()

// Check Firebase connection
__firebaseStats?.isConnected()
```

---

## 🔧 Optimization Checklist

- [ ] **Clerk Setup**
  - Verify `.env.local` has correct VITE_CLERK_PUBLISHABLE_KEY
  - Run `__clerkDiag.check()` - all should show ✅
  - Try sign in/sign out cycle

- [ ] **Firebase Quota**
  - Run `__quotaMonitor.getStatus()`
  - Follow suggestions from `__quotaMonitor.getSuggestions()`
  - Consider upgrading to Blaze plan if quota errors persist

- [ ] **Cache Management**
  - Run `__clearAppData()` to reset
  - Refresh page
  - Test placing new orders
  - Check `__showAppData()` shows fresh data

- [ ] **Real-time Updates**
  - Monitor console for "📥 useOrdersSync" logs
  - Verify "📊 OrdersQueue: Orders updated" appears
  - Check for quota or connection errors

- [ ] **Order Experience**
  - Place orders from different tables (T1-T6)
  - Verify all appear in admin queue
  - Update order status and verify persistence
  - Check archive/completed orders display

---

## 🔍 Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Quota exceeded` | Writing too fast or too much | Wait 30s, upgrade plan, reduce writes |
| `400 identitytoolkit` | Invalid Clerk key | Check `.env.local`, restart server |
| `Cannot read property 'digest'` | Stale session | Run `__clerkDiag.clearSession()` |
| `Orders not showing` | Quota limit blocking saves | Check `__quotaMonitor.getStatus()` |
| `Real-time updates not working` | Listener not set up | Check browser console for listener logs |
| `Firebase not configured` | Missing API keys | Add keys to `.env.local` |

---

## 📈 Performance Targets

- **Orders per second**: 1-2 (Spark plan), unlimited (Blaze)
- **Load time**: < 2s initial, < 500ms real-time updates
- **Admin dashboard response**: Instant (<100ms for filter changes)
- **Memory usage**: < 50MB for 1000 orders

---

## 🚀 Next Steps

### For Development:
1. Ensure `.env.local` is properly configured
2. Run `npm run dev` to start dev server
3. Run `__clerkDiag.check()` on every instance to validate setup
4. Monitor quota with `__quotaMonitor.getStatus()`

### For Production:
1. Switch to production Clerk keys
2. Upgrade Firebase to Blaze plan
3. Implement order archival (move old orders to archive collection)
4. Set up Firebase backup/recovery
5. Monitor quota and billing on Firebase console

---

## 📚 Additional Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://react.dev
- **Zustand Store Guide**: https://github.com/pmndrs/zustand

---

## 💡 Tips for Success

1. **Always check console logs** - They tell you exactly what's happening
2. **Use diagnostic commands** - They're faster than guessing
3. **Clear cache when in doubt** - `__clearAppData()` + refresh
4. **Monitor quota proactively** - Don't wait for errors
5. **Test with all 6 tables** - Ensures full functionality
6. **Use Blaze plan if possible** - Eliminates quota stress entirely

---

**Last Updated**: March 14, 2026  
**Status**: ✅ All systems operational  
**Support**: Check console diagnostics first, then review this guide
