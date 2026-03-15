# 🚀 Getting Started - Access the App

## ✅ Server Status

The development server is now **RUNNING** on:

### **🔗 Main URL**
```
http://localhost:5176/QRMENU/
```

---

## 📱 Quick Navigation Guide

### **Customer Pages:**

| Page | URL | Purpose |
|------|-----|---------|
| 🏠 Home | `http://localhost:5176/QRMENU/` | Landing page with menu demo links |
| 🍽️ Menu T1 | `http://localhost:5176/QRMENU/menu/T1` | Table 1 menu & ordering |
| 🍽️ Menu T2 | `http://localhost:5176/QRMENU/menu/T2` | Table 2 menu & ordering |
| 🍽️ Menu T3 | `http://localhost:5176/QRMENU/menu/T3` | Table 3 menu & ordering |
| 🍽️ Menu T4 | `http://localhost:5176/QRMENU/menu/T4` | Table 4 menu & ordering |
| 🍽️ Menu T5 | `http://localhost:5176/QRMENU/menu/T5` | Table 5 menu & ordering |
| 🍽️ Menu T6 | `http://localhost:5176/QRMENU/menu/T6` | Table 6 menu & ordering |

### **Admin Pages:**

| Page | URL | Purpose |
|------|-----|---------|
| 🔐 Admin Login | `http://localhost:5176/QRMENU/admin-login` | Staff sign in |
| 📊 Admin Panel | `http://localhost:5176/QRMENU/admin` | Order queue, management (protected) |
| 🚪 Admin Sign Up | `http://localhost:5176/QRMENU/admin-signup` | Create new admin account |

---

## 🧪 How to Test

### **Test 1: Place an Order**
1. Go to `http://localhost:5176/QRMENU/menu/T1`
2. Browse menu items
3. Add items to cart
4. Click "Place Order"
5. Order appears in admin queue

### **Test 2: View Orders in Admin**
1. Go to `http://localhost:5176/QRMENU/admin-login`
2. Sign in with a Clerk account
3. Should redirect to: `http://localhost:5176/QRMENU/admin`
4. See all orders from all tables in queue
5. Update order status (pending → confirmed → preparing → served)

### **Test 3: Multi-table Test**
Place orders from multiple tables:
- `http://localhost:5176/QRMENU/menu/T1` → Place order
- `http://localhost:5176/QRMENU/menu/T2` → Place order
- `http://localhost:5176/QRMENU/menu/T3` → Place order
- Go to admin panel → Should show all 3 tables with orders

---

## 🛠️ Browser Developer Tools Console

Open the browser console (F12) and use these diagnostic commands:

### **Check System Health**
```javascript
// Full system check
__clerkDiag.check()
__quotaMonitor.getStatus()
__showAppData()
```

### **Specific Diagnostics**
```javascript
// Clerk authentication
__clerkDiag.getStatus()
__clerkDiag.getConfig()

// Firebase quota
__quotaMonitor.getStatus()
__quotaMonitor.getSuggestions()

// Data management
__showAppData()
__clearAppData()    // ⚠️ Destructive - clears all cached data
```

---

## ⚠️ Troubleshooting

### "Page shows blank"
1. Check console for errors (F12)
2. Wait 3-5 seconds for app to load
3. Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### "Orders not appearing"
```javascript
// Check quota status
__quotaMonitor.getStatus()
// If quota exceeded, wait 30 seconds and try again
```

### "Can't sign in"
```javascript
// Check Clerk configuration
__clerkDiag.check()
// If shows issues, check .env.local has VITE_CLERK_PUBLISHABLE_KEY
```

### "Need to clear data"
```javascript
// Clear all cached data
__clearAppData()
// Then refresh: Ctrl+R or Cmd+R
```

---

## 📊 What's Working

✅ Real-time order syncing to Firebase  
✅ Multi-table support (T1-T6)  
✅ Clerk authentication  
✅ Admin dashboard with order queue  
✅ Order status tracking  
✅ Firebase quota protection & fallback  
✅ Automatic offline caching  
✅ Diagnostic console tools  

---

## 📝 Environment Info

**Dev Server:**
- Port: 5176 (auto-selected if 5174-5175 in use)
- Base URL: `/QRMENU/`
- Framework: React 18.3 + TypeScript
- State: Zustand with persistence

**Backend:**
- Firebase Firestore (orders, menu)
- Firebase Storage (images)
- Clerk (authentication)

**Features Enabled:**
- Real-time Firebase listeners ✅
- Query optimization ✅
- Quota error detection ✅
- Automatic retry logic ✅
- Offline fallback ✅
- Migration utilities ✅
- Comprehensive logging ✅

---

## 🎯 Next Steps

1. **Visit the home page:**
   ```
   http://localhost:5176/QRMENU/
   ```

2. **Place a test order:**
   ```
   http://localhost:5176/QRMENU/menu/T1
   ```

3. **Check admin panel:**
   ```
   http://localhost:5176/QRMENU/admin
   (requires Clerk sign-in)
   ```

4. **Monitor in console:**
   ```javascript
   __showAppData()
   __quotaMonitor.getStatus()
   ```

---

**Status**: ✅ Server running | All systems operational

If you encounter any issues, check the browser console (F12) for detailed error messages and diagnostic information.
