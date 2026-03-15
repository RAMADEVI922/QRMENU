/**
 * MULTI-TABLE ORDER ISSUE - TESTING & TROUBLESHOOTING GUIDE
 * 
 * Problem: Only Table T2 orders appear in Order Queue
 * Tables T1, T3, T4 orders are missing
 * 
 * STEP 1: CLEAR ALL DATA
 * Open browser console (F12) and run:
 * __debugOrders.clear()
 * Then refresh the page
 *
 * STEP 2: TEST TABLE T1
 * 1. Go to Admin Panel → Tables
 * 2. Click the QR code for Table 1
 * 3. Click "Active Time" → You should see URL: /menu/T1 in address bar
 * 4. Watch CONSOLE for these logs:
 * 
 * 🏠 CustomerMenu: Received tableId from URL: T1
 * 🏠 CustomerMenu: Setting currentTableId to: T1
 * 🏠 CustomerMenu: ✅ currentTableId successfully set to: T1
 *
 * 5. If you see ⚠️ WARNING, there's a mismatch!
 * 6. Add 2-3 items to cart
 * 7. Click "Confirm Order"
 * 8. Watch for these logs:
 *
 * 🛒 ConfirmOrderButton: ========== ORDER PLACEMENT ==========
 * 🛒 ConfirmOrderButton: Placing order for table T1
 * 🛒 ConfirmOrderButton: Cart items: [list]
 * 📦 Store: Creating new order O[timestamp]
 * 📦 Store: Order object: { tableId: "T1", ... }
 * 📦 Store: ✅ Order created successfully
 * 🛒 ConfirmOrderButton: ========== ORDER PLACEMENT COMPLETE ==========
 *
 * CRITICAL: Check that tableId says "T1", not "T2"!
 *
 * STEP 3: REPEAT FOR TABLE T3 & T4
 * 1. Scan T3 QR code
 * 2. Same process - watch for T3 in logs
 * 3. Repeat for T4
 *
 * STEP 4: RUN DIAGNOSTIC
 * In console, run:
 * __diagnostic.tableIssues()
 *
 * This will show:
 * - Current table ID in app
 * - All orders by table in store
 * - All orders by table in localStorage
 * - Expected vs actual values
 *
 * STEP 5: CHECK ORDER QUEUE
 * Go to Admin → Orders Queue
 * You should see orders from all 4 tables
 * If not, check the console logs above
 *
 * EXPECTED OUTPUT
 * Console should show something like:
 *
 * 🏠 CustomerMenu: ✅ currentTableId successfully set to: T1
 * 🛒 ConfirmOrderButton: Placing order for table T1
 * 📦 Store: Order object: { tableId: "T1", ... }
 * 📦 Store: Creating new order O123456
 * 📦 Store: Items in order: [1x Pizza, 1x Coke]
 * 📦 Store: All current orders by table:
 *   📦 Table T1: 1 order(s)
 * 💾 useOrdersSync: Syncing 1 orders to Firebase
 *   📤 Table T1: 1 order(s)
 *   📤 Syncing order O123456 from Table T1
 *
 * TROUBLESHOOTING
 *
 * PROBLEM 1: currentTableId says T2 even though I'm on T1
 * SOLUTION: 
 *   a) Run: __debugOrders.clear()
 *   b) Close browser completely (not just tab)
 *   c) Reopen and try again
 *   This clears localStorage cache
 *
 * PROBLEM 2: Order says tableId: "T1" but doesn't appear in queue
 * SOLUTION:
 *   a) Firebase quota exceeded - wait a minute
 *   b) Run diagnostic to verify order is in store:
 *      __diagnostic.tableIssues()
 *   c) Manual refresh might trigger sync
 *
 * PROBLEM 3: Different tables show different behavior
 * SOLUTION:
 *   This suggests a localStorage issue with persistence
 *   Run: __debugOrders.clear() and test fresh
 *
 * DEBUG COMMANDS
 *
 * See all stored data:
 * __debugOrders.get()
 *
 * See stored order status:
 * __debugOrders.debug()
 *
 * Clear everything:
 * __debugOrders.clear()
 *
 * See table issue diagnostic:
 * __diagnostic.tableIssues()
 *
 * Test a specific table:
 * __diagnostic.testFlow("T1")
 *
 * WHAT TO REPORT IF IT FAILS
 * 1. Paste the entire console output for one table
 * 2. Look for any ⚠️ or ❌ messages
 * 3. Check if "tableId" in logs matches your current table
 * 4. Share the diagnostic output: __diagnostic.tableIssues()
 */

export const multiTableTestingGuide = `
Multi-table testing guide - see comments in this file for detailed instructions
`;
