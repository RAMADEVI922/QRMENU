# Quick Test Guide - Order Sync

## 🚀 Quick Test (2 minutes)

### Step 1: Open Customer Menu on Mobile
```
https://qr-menu-19cd1.web.app/menu/T1
```
- Scan QR code or open link directly
- Browse menu and add items to cart
- Click "Confirm Order"

### Step 2: Open Waiter Panel on Desktop
```
https://qr-menu-19cd1.web.app/waiter
```
- You should see the order appear immediately
- Order will show as "Pending"

### Step 3: Confirm Order
- Click "Confirm Order" button in waiter panel
- Status changes to "Confirmed"
- Customer device will see the update in real-time

### Step 4: Mark as Served
- Click "Mark as Served" button
- Order moves to served status
- Customer can place new orders

## ✅ What Should Work Now

1. **Real-time Order Sync** - Orders appear instantly on waiter panel
2. **Status Updates** - Status changes sync between devices
3. **Notifications** - Waiter gets notified of new orders
4. **Multiple Tables** - Each table can have independent orders
5. **Add More Items** - Customers can add items to existing orders

## 🔍 Troubleshooting

### Orders Not Appearing?
1. Check browser console for errors (F12)
2. Verify internet connection
3. Clear browser cache and reload
4. Check Firebase Console for data

### Firebase Console Check
1. Go to: https://console.firebase.google.com/project/qr-menu-19cd1
2. Click "Firestore Database"
3. Look for "orders" and "notifications" collections
4. You should see documents being created

## 📱 Test URLs

### Customer Menu (Different Tables)
- Table 1: `https://qr-menu-19cd1.web.app/menu/T1`
- Table 2: `https://qr-menu-19cd1.web.app/menu/T2`
- Table 3: `https://qr-menu-19cd1.web.app/menu/T3`

### Admin/Waiter
- Waiter Panel: `https://qr-menu-19cd1.web.app/waiter`
- Admin Panel: `https://qr-menu-19cd1.web.app/admin`

## 🎯 Expected Behavior

### Before Fix
- ❌ Orders only visible on same device
- ❌ Refresh loses all orders
- ❌ Waiter can't see customer orders

### After Fix
- ✅ Orders visible across all devices
- ✅ Orders persist after refresh
- ✅ Real-time synchronization
- ✅ Waiter sees all customer orders instantly
