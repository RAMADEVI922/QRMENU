# Debugging: Orders Not Showing in Orders Queue

## 🔍 Step-by-Step Debugging Guide

### Step 1: Check Browser Console (F12)

1. Open your browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for these logs when you place an order:

**Expected Console Output:**

```
🛒 [CustomerMenu] Placing order for table: 1
🛒 [CustomerMenu] Cart items: [...]
🛒 [CustomerMenu] Cart total: 500
📦 [Store] placeOrder called with tableId: 1
📦 [Store] Current cart: [...]
📦 [Store] Creating new order: {...}
📦 [Store] Updated orders array: [...]
📦 [Store] Order placed successfully
📊 [OrdersQueue] Store subscription triggered with orders: [...]
📊 [OrdersQueue] Filtered and sorted orders: [...]
```

**If you DON'T see these logs:**
- The order placement function is not being called
- Check if "Confirm Order" button is working
- Check if cart has items

### Step 2: Verify Cart Has Items

1. Open Customer Menu
2. Add items to cart
3. Check if cart count shows in bottom bar
4. Open cart sheet
5. Verify items are listed

**If cart is empty:**
- Items are not being added to cart
- Check if "Add" button is working
- Check browser console for errors

### Step 3: Check localStorage

1. Open browser console (F12)
2. Paste this command:

```javascript
JSON.parse(localStorage.getItem('qr-menu-store-v2'))
```

3. Look for the `orders` array

**Expected Output:**
```javascript
{
  orders: [
    {
      id: "O1710432000000",
      tableId: "1",
      items: [...],
      status: "pending",
      total: 500,
      createdAt: "2024-03-14T10:00:00.000Z",
      readyAt: 1710435600000
    }
  ],
  ...
}
```

**If orders array is empty:**
- Orders are not being saved to localStorage
- Check if `placeOrder` function is being called
- Check if store persist middleware is working

### Step 4: Check Debug Info in Orders Queue

1. Go to Admin Panel
2. Click on "Orders Queue" tab
3. Look for the blue debug box at the top

**Expected:**
```
📊 Debug Info:
Total Orders in Store: 1
Displayed Orders: 1
Current Filter: all
Orders: Table 1 (pending)
```

**If Total Orders is 0:**
- Orders are not in the store
- Go back to Step 3 to check localStorage

**If Total Orders > 0 but Displayed Orders is 0:**
- Orders are being filtered out
- Check the filter buttons
- Try clicking "All Orders" button

### Step 5: Test Order Placement Flow

**Test Case 1: Single Tab**

1. Open Admin Panel in one tab
2. Go to Orders Queue
3. Open Customer Menu in same tab (new window)
4. Add items and place order
5. Check if order appears in Orders Queue

**Test Case 2: Two Tabs**

1. Open Admin Panel in Tab A
2. Go to Orders Queue
3. Open Customer Menu in Tab B
4. Add items and place order
5. Check if order appears in Tab A

**Test Case 3: Mobile**

1. Start dev server: `npm run dev`
2. Find your IP: `ipconfig` (Windows)
3. Access admin: `http://YOUR_IP:5173/QRMENU/admin`
4. Create table and scan QR code
5. Place order from mobile
6. Check if order appears on desktop

### Step 6: Check for JavaScript Errors

1. Open browser console (F12)
2. Look for red error messages
3. Common errors:

**Error: "Cannot read property 'orders' of undefined"**
- Store is not initialized
- Check if useRestaurantStore is imported correctly

**Error: "placeOrder is not a function"**
- Store method is not defined
- Check restaurantStore.ts for placeOrder method

**Error: "setDisplayedOrders is not a function"**
- State setter is not defined
- Check OrdersQueue component state initialization

### Step 7: Verify Table ID is Set

1. Open Customer Menu
2. Check the header - it should show "Table X"
3. If it shows "Table undefined" or "Table null":
   - Table ID is not being set
   - Check if URL has `?table=1` parameter
   - Check if `setCurrentTableId` is being called

### Step 8: Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Place an order
4. Look for any failed requests

**Expected:**
- No network requests (all local state)
- If you see failed requests, there might be API issues

### Step 9: Clear Cache and Reload

Sometimes localStorage can get corrupted:

```javascript
// In browser console:
localStorage.removeItem('qr-menu-store-v2')
location.reload()
```

Then try placing an order again.

### Step 10: Check Component Mounting

1. Open browser console
2. Look for these logs when Orders Queue loads:

```
📊 [OrdersQueue] Component rendered, current orders: [...]
📊 [OrdersQueue] useEffect triggered, setting up subscription
```

**If you don't see these:**
- Component is not mounting
- Check if Orders Queue tab is being rendered
- Check if AdminPanel is rendering OrdersQueue component

## 🐛 Common Issues and Solutions

### Issue 1: "No active orders" message appears

**Possible Causes:**
1. No orders have been placed yet
2. Orders are being filtered out
3. Orders are not being saved to store

**Solutions:**
- Check debug info box (Step 4)
- Try clicking different filter buttons
- Check localStorage (Step 3)
- Check console logs (Step 1)

### Issue 2: Orders appear but disappear on refresh

**Possible Causes:**
1. Orders are not being persisted to localStorage
2. Persist middleware is not configured correctly

**Solutions:**
- Check if `orders` is in persist `partialize` function
- Check localStorage (Step 3)
- Clear cache and reload (Step 9)

### Issue 3: Orders appear in one tab but not another

**Possible Causes:**
1. Zustand subscription is not working
2. Store is not syncing across tabs

**Solutions:**
- Check browser console for subscription logs
- Try refreshing the tab
- Check if both tabs are accessing same store

### Issue 4: Cart items not being added

**Possible Causes:**
1. Add button is not working
2. addToCart function is not being called

**Solutions:**
- Check console logs when clicking Add
- Check if cart count increases
- Try adding different items

### Issue 5: "Confirm Order" button not working

**Possible Causes:**
1. Button is disabled
2. placeOrder function is not being called
3. Cart is empty

**Solutions:**
- Check if button is clickable
- Check console logs when clicking button
- Verify cart has items (Step 2)

## 📋 Checklist for Debugging

- [ ] Browser console shows order placement logs
- [ ] localStorage contains orders array
- [ ] Debug info box shows correct order count
- [ ] Table ID is set correctly
- [ ] Cart has items before placing order
- [ ] No JavaScript errors in console
- [ ] Orders Queue component is mounted
- [ ] Filter buttons are working
- [ ] Orders appear in FIFO order
- [ ] Orders persist after page refresh

## 🔧 Quick Fixes

### Fix 1: Refresh Everything

```bash
# Stop dev server (Ctrl+C)
# Clear cache
npm run build

# Start dev server
npm run dev

# Clear browser cache (Ctrl+Shift+Delete)
# Clear localStorage
localStorage.removeItem('qr-menu-store-v2')
```

### Fix 2: Check Store Initialization

In browser console:
```javascript
// Check if store is initialized
useRestaurantStore.getState().orders

// Should return an array (empty or with orders)
```

### Fix 3: Manually Trigger Order

In browser console:
```javascript
// Get store
const store = useRestaurantStore.getState()

// Add item to cart
store.addToCart({
  id: '1',
  name: 'Test Item',
  description: 'Test',
  price: 100,
  category: 'Test',
  available: true
})

// Place order
store.placeOrder('1')

// Check orders
console.log(store.orders)
```

## 📞 Still Not Working?

If you've gone through all steps and orders still aren't showing:

1. **Take a screenshot** of:
   - Browser console with logs
   - Debug info box in Orders Queue
   - localStorage content

2. **Check these files:**
   - `src/store/restaurantStore.ts` - placeOrder method
   - `src/pages/CustomerMenu.tsx` - handlePlaceOrder function
   - `src/components/admin/OrdersQueue.tsx` - component logic

3. **Verify:**
   - Are you on the correct URL?
   - Is the dev server running?
   - Are you logged in to admin panel?
   - Is the table ID set correctly?

## 🎯 Expected Behavior

**When everything is working:**

1. Customer adds items to cart
2. Customer clicks "Confirm Order"
3. Toast shows "Order placed!"
4. Cart closes
5. Order appears in Orders Queue immediately
6. No page refresh needed
7. Order shows all details (table, items, time, status)
8. Order persists in localStorage
9. Order appears across all tabs/windows
10. Status can be changed

If any of these steps fail, use this guide to debug!
