# 🚀 Quick Reference: Console Commands

## For Immediate Diagnosis

```javascript
// Check everything in one command
__clerkDiag.check()
__quotaMonitor.getStatus()
__showAppData()
```

---

## 🚨 Quota Management

```javascript
// Get current quota status
__quotaMonitor.getStatus()

// Get helpful suggestions to fix quota
__quotaMonitor.getSuggestions()

// View detailed error timeline
__quotaMonitor.getErrorLog()

// Check if quota backoff is active
__quotaMonitor.shouldBackoff()

// Reset quota statistics (start fresh)
__quotaMonitor.reset()
```

---

## 🔐 Clerk Authentication

```javascript
// Run full Clerk diagnostics
__clerkDiag.check()

// Check auth status
__clerkDiag.getStatus()

// View Clerk configuration
__clerkDiag.getConfig()

// Test authentication flow
__clerkDiag.testAuth()

// View environment variables (safe)
__clerkDiag.showEnv()

// ⚠️ Clear session (use only if stuck)
__clerkDiag.clearSession()
```

---

## 💾 Data & Cache

```javascript
// View all cached data
__showAppData()

// ⚠️ Clear ALL app data (destructive!)
__clearAppData()
// Then: location.reload()
```

---

## 🔄 Offline Mode

```javascript
// Enable offline mode (for testing)
__offlineMode.enable()

// Disable offline mode
__offlineMode.disable()

// Check if offline mode is active
__offlineMode.isEnabled()

// View offline cached orders
__offlineMode.getOrders()

// Clear offline cache
__offlineMode.clear()
```

---

## 🧪 Testing Workflow

### Test 1: When App Loads
```javascript
// You should see logs like:
// "📥 useOrdersSync: Loaded X orders from Firebase"
// "📊 OrdersQueue: Orders updated X orders"
```

### Test 2: Place Order from T1
```javascript
// 1. Go to: http://localhost:5174/QRMENU/menu/T1
// 2. Add items and place order
// 3. In console check: __showAppData()
// Should show order in T1
```

### Test 3: View Admin Queue
```javascript
// 1. Go to: http://localhost:5174/QRMENU/admin
// 2. Should show order from Table 1
// 3. Verify can change status
// 4. Check: __quotaMonitor.getStatus()
// Should show no recent errors
```

### Test 4: Test All 6 Tables
```javascript
// Place orders from T1...T6
// Admin queue should show all tables
// Each table should appear as: "T1 (X orders)"
```

---

## 🆘 Common Scenarios

### Scenario 1: "Orders not showing up"
```javascript
// Step 1: Check quota
__quotaMonitor.getStatus()
// If limited, wait 30+ seconds and try again

// Step 2: Check data
__showAppData()
// If empty, data not saving to Firebase

// Step 3: Check Clerk
__clerkDiag.check()
// If auth issues, may prevent Firebase access
```

### Scenario 2: "Getting 400 errors"
```javascript
// Run diagnostics
__clerkDiag.check()

// If shows ❌ on keys:
// 1. Check .env.local has VITE_CLERK_PUBLISHABLE_KEY
// 2. Restart npm run dev
// 3. Run __clerkDiag.check() again

// If still failing:
// Run: __clerkDiag.clearSession()
```

### Scenario 3: "Still quota errors after 30 seconds"
```javascript
// Check error frequency
__quotaMonitor.getErrorLog()

// If many errors in short time:
// Solution: Upgrade Firebase to Blaze plan

// Temporary workaround:
// 1. Enable offline: __offlineMode.enable()
// 2. Place orders (they save to localStorage)
// 3. Wait for quota to recover
// 4. Disable offline: __offlineMode.disable()
// 5. Orders sync to Firebase automatically
```

### Scenario 4: "Lost my data"
```javascript
// Don't panic! Check offline cache first
__offlineMode.getOrders()

// If orders there, re-enable offline mode:
__offlineMode.enable()

// If nothing there, clear cache helps sometimes:
__clearAppData()
// Then test with a new order
```

---

## 📈 Monitoring

### During Development
```javascript
// Open console and keep visible
// You'll see logs like:
// "💾 useOrdersSync: Syncing X orders"
// "📊 Firebase orders updated: X orders from tables: T1, T2, T3"
// These indicate everything working
```

### Look for Warning Signs
```javascript
// 🚨 Repeated quota errors → Upgrade plan
// ❌ Auth 400 errors → Check Clerk config
// ⚠️ Orders not syncing → Check quota/connection
// 🔴 Real-time listener errors → Restart app
```

### Healthy System Signs
```javascript
// ✅ No quota errors in __quotaMonitor.getErrorLog()
// ✅ Orders appear instantly in queue
// ✅ Real-time listener shows updates
// ✅ Status changes persist
// ✅ New tables work automatically
```

---

## ⚡ Pro Tips

1. **Always check quota first** - Most issues trace back to quota
2. **Clerk diagnostics are your friend** - Run before blaming code
3. **Enable console logging** - Don't close console during testing
4. **Test with real data** - Place actual orders, don't just refresh
5. **Offline mode for testing** - Safe way to test without quota stress

---

## 🪛 Troubleshooting Decision Tree

```
Issue?
├─ Can't see orders
│  └─ Check: __quotaMonitor.getStatus()
│     ├─ Quota limited → Wait 30s
│     └─ No quota errors → Check: __showAppData()
│
├─ Getting 400 errors
│  └─ Check: __clerkDiag.check()
│     ├─ Shows ❌ → Fix env vars
│     └─ Shows ✅ → Clear session
│
├─ Single table broken
│  └─ Check table ID spelling (T1, T2, T3, ...)
│     └─ Admin panel filters by status
│
├─ Confusion about what's saved
│  └─ Run: __showAppData()
│     Tells you exactly what's cached
│
└─ Lost trust in the data
   └─ Run: __clearAppData()
      Then: location.reload()
      Start fresh test
```

---

## 📞 When to Escalate

If after running all these commands you still have issues:
1. Screenshot the console output of:
   - `__quotaMonitor.getStatus()`
   - `__clerkDiag.check()`
   - `__showAppData()`
2. Note the exact error message
3. Describe what you were doing when it happened
4. Provide that info when asking for help

---

**Last Updated**: March 14, 2026  
**Version**: 1.0  
**Status**: All systems operational ✅
