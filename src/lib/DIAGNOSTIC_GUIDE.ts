/**
 * Order Flow Diagnostic Guide
 * 
 * Use this guide to troubleshoot orders appearing in the Order Queue from all tables
 * 
 * ============ STEP 1: VERIFY QR CODE GENERATION ============
 * Go to Admin > Tables and look at QR codes
 * They should show URLs like:
 * - http://localhost:5173/QRMENU/table-session?table=1
 * - http://localhost:5173/QRMENU/table-session?table=2
 * - http://localhost:5173/QRMENU/table-session?table=3
 * - http://localhost:5173/QRMENU/table-session?table=4
 * 
 * Each `table` parameter should be a different number


 * ============ STEP 2: CHECK SESSIONSELECTION PAGE ============
 * When you scan a QR code, you should be taken to SessionSelection page
 * The URL should contain the table parameter: /table-session?table=1
 * The page should display: "Your Table: Table 1" (or 2, 3, 4)
 *
 * In browser console, check logs:
 * - Look for: "SessionSelection: User selected table X"


 * ============ STEP 3: VERIFY MENU PAGE RECEIVES CORRECT TABLE ID ============
 * When you click "Active Time" or "Idle Time", you navigate to /menu/T1 (or T2, T3, T4)
 * 
 * In browser console, check logs:
 * - Look for: "CustomerMenu: Setting current table to T1"
 * - Or: "🛒 ConfirmOrderButton: Placing order for table T1"


 * ============ STEP 4: PLACE AN ORDER ============
 * Add items to cart and click "Confirm Order"
 *
 * In browser console, you should see:
 * 🛒 ConfirmOrderButton: Placing order for table T1
 * 🛒 ConfirmOrderButton: Cart items: [list of items]
 * 📦 Store: placeOrder called for table T1
 * 📦 Store: Cart has X items
 * 📦 Store: Creating new order O[timestamp] with X items
 * 📦 Store: Total orders after placement: X (should be 1 for first order)
 * 📦 Store: Order placed successfully
 *
 * The tableId logged should match the table you're ordering from (T1, T2, T3, or T4)


 * ============ STEP 5: CHECK FIREBASE SYNC ============
 * Orders should be synced to Firebase automatically
 *
 * In browser console, look for:
 * 💾 useOrdersSync: Syncing X orders to Firebase
 *   📤 Syncing order O[timestamp] from Table T1


 * ============ STEP 6: VERIFY ORDER APPEARS IN QUEUE ============
 * Go to Admin > Orders Queue
 *
 * All orders from any table should appear here
 * In the Orders Queue browser console, look for:
 * 📊 OrdersQueue: Orders updated X orders
 *   - Table T1: Y items, Status: pending
 *   - Table T2: Y items, Status: pending
 *   - etc.
 *
 * 📊 OrdersQueue: Displaying X orders after filter: all


 * ============ DEBUG COMMANDS ============
 * Open browser console and run these commands:

 * 1. See all orders currently in the store (paste in browser console):
 * useRestaurantStore.getState().orders

 * 2. See orders broken down by table (paste in browser console):
 * const ordersByTable = {};
 * useRestaurantStore.getState().orders.forEach(order => {
 *   if (!ordersByTable[order.tableId]) ordersByTable[order.tableId] = [];
 *   ordersByTable[order.tableId].push(order);
 * });
 * console.log('📋 Orders by table:', ordersByTable);

 * 3. Check localStorage (paste in browser console):
 * __debugOrders.debug();

 * 4. Clear all app data if needed (paste in browser console):
 * __debugOrders.clear();

 * ============ EXPECTED LOGS BY TABLE ============
 * 
 * For Table 1:
 * - QR code URL: /table-session?table=1
 * - Menu URL: /menu/T1
 * - Order created with tableId: "T1"
 *
 * For Table 2:
 * - QR code URL: /table-session?table=2
 * - Menu URL: /menu/T2
 * - Order created with tableId: "T2"
 *
 * For Table 3:
 * - QR code URL: /table-session?table=3
 * - Menu URL: /menu/T3
 * - Order created with tableId: "T3"
 *
 * For Table 4:
 * - QR code URL: /table-session?table=4
 * - Menu URL: /menu/T4
 * - Order created with tableId: "T4"
 */

export const diagnosticGuide = `
🔍 ORDER FLOW DIAGNOSTIC GUIDE

Follow these steps to verify orders are being created and synced correctly:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Place an order from each table
4. Check the console logs for the patterns described above
5. Go to Admin > Orders Queue and verify all orders appear

If orders don't appear:
- Check that tableId matches the table number (T1, T2, T3, T4)
- Look for Firebase errors (quota exceeded, etc.)
- Run __debugOrders.clear() and try again
- Check localStorage doesn't have stale order data
`;
