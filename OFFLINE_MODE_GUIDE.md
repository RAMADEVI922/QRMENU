# Offline Mode Guide

## What is Offline Mode?

Offline Mode allows your QR restaurant app to work completely **without Firebase** or the Firebase emulator. Orders are saved locally to browser storage and persist across refreshes.

## Current Status

✅ **Offline Mode is ENABLED by default** - Perfect for local testing and development!

Orders are saved to localStorage and will appear immediately in:
- Order Summary page
- Admin → Orders Queue

## How It Works

1. **Orders are stored locally** - No Firebase needed
2. **Multi-table works** - All tables (T1, T2, T3, T4) visible in Order Queue
3. **Data persists** - Survives browser refresh
4. **Real-time updates** - Admin queue updates instantly

## Testing the App

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Test Placing Orders
- Scan QR code for **Table 1**
- Select items and **Place Order**
- Order appears in Order Queue immediately ✅

### 3. Test Multiple Tables
```
# Terminal 1: Dev server running
npm run dev

# Terminal 2 (optional browser windows):
# Table 1: http://localhost:5174/QRMENU/menu/T1
# Table 2: http://localhost:5174/QRMENU/menu/T2
# Table 3: http://localhost:5174/QRMENU/menu/T3
# Table 4: http://localhost:5174/QRMENU/menu/T4

# Admin: http://localhost:5174/QRMENU/admin
```

All orders should appear in Admin Queue.

## Console Tools

Available in browser console (F12):

```javascript
// Check offline mode status
__offlineMode.isEnabled()  // Returns: true/false

// Get all stored orders
__offlineMode.getOrders()  // Shows orders with details

// Enable/Disable offline mode
__offlineMode.enable()     // Turn on (default)
__offlineMode.disable()    // Turn off

// Clear all orders
__offlineMode.clear()      // Removes all orders from storage

// Debug
__debugOrders.get()        // Alternative way to view orders
```

## When Firebase Emulator is Ready

Once you have the Firebase emulator running:

```javascript
__offlineMode.disable()
```

Then refresh the page. The app will sync with Firebase instead of using localStorage.

To switch back to offline:
```javascript
__offlineMode.enable()
```

## Data Structure

Orders in offline storage:

```json
{
  "id": "order-123",
  "tableId": "T1",
  "items": [
    { "id": "item-1", "name": "Biryani", "quantity": 2, "price": 250 }
  ],
  "status": "completed",
  "total": 500,
  "createdAt": "2026-03-14T14:57:00Z",
  "paymentMethod": "card"
}
```

## Clearing All Data

To reset and start fresh:

```javascript
// Clear all orders
__offlineMode.clear()

// Or clear Zustand store
__debugOrders.clear()

// Then refresh the page
```

## Troubleshooting

### Orders not appearing in Order Queue?
1. Open Dev Tools (F12 → Console)
2. Run: `__offlineMode.getOrders()`
3. If empty, place a new order
4. Should appear immediately

### Orders disappeared after refresh?
- Check if offline mode is still enabled: `__offlineMode.isEnabled()`
- Check localStorage: `__offlineMode.getOrders()`

### Want to switch to real Firebase?
1. Start emulator: `npx firebase emulators:start --project qr-menu-19cd1`
2. Disable offline mode: `__offlineMode.disable()`
3. Refresh page
4. Watch console for Firebase connection messages

## What You CAN'T Do in Offline Mode

- ❌ Sync across different browsers/tabs
- ❌ Persist orders after clearing browser storage
- ❌ Use real Firebase features (analytics, etc)

## What You CAN Do

- ✅ Test all UI features
- ✅ Test order placement & queue management
- ✅ Test multi-table routing
- ✅ Test admin dashboard
- ✅ Develop locally without internet
- ✅ No quota limits!

## Perfect For

- 🎯 Local development
- 🎯 Feature testing
- 🎯 Demo/presentation (single browser)
- 🎯 Unit testing
- 🎯 When Firebase is unavailable

---

**Need the Firebase emulator?** See [FIREBASE_EMULATOR_SETUP.md](./FIREBASE_EMULATOR_SETUP.md)
