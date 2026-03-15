/**
 * Multi-Table Order Diagnostic Tool
 * Use this to trace where orders from T1, T3, T4 are being lost
 */

import { useRestaurantStore } from '@/store/restaurantStore';

export function diagnoseTableIssuies() {
  const store = useRestaurantStore.getState();
  
  console.log('=== 🔍 MULTI-TABLE DIAGNOSTIC ===\n');
  
  // 1. Check currentTableId
  console.log('1️⃣ Current Table ID:');
  console.log(`   Value: "${store.currentTableId}"`);
  console.log(`   Expected: Should match the table you\'re currently on (T1, T2, T3, or T4)`);
  
  // 2. Check all orders in store by table
  console.log('\n2️⃣ Orders in Zustand Store by Table:');
  const byTable: Record<string, any[]> = {};
  store.orders.forEach(order => {
    if (!byTable[order.tableId]) byTable[order.tableId] = [];
    byTable[order.tableId].push(order);
  });
  
  if (Object.keys(byTable).length === 0) {
    console.log('   ❌ NO ORDERS FOUND IN STORE');
  } else {
    Object.entries(byTable).forEach(([table, orders]) => {
      console.log(`   Table ${table}: ${orders.length} order(s)`);
      orders.forEach(order => {
        console.log(`     - Order ${order.id}: ${order.items.length} items, Status: ${order.status}`);
      });
    });
  }
  
  // 3. Check localStorage
  console.log('\n3️⃣ LocalStorage Data:');
  const stored = localStorage.getItem('qr-menu-store-v2');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const storedOrders = parsed.state?.orders || [];
      console.log(`   Stored orders: ${storedOrders.length}`);
      
      const storedByTable: Record<string, number> = {};
      storedOrders.forEach((o: any) => {
        storedByTable[o.tableId] = (storedByTable[o.tableId] || 0) + 1;
      });
      
      Object.entries(storedByTable).forEach(([table, count]) => {
        console.log(`   Table ${table}: ${count} order(s)`);
      });
      
      console.log(`   Stored currentTableId: "${parsed.state?.currentTableId}"`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('   ❌ Failed to parse localStorage:', e);
    }
  } else {
    console.log('   ❌ No data in localStorage');
  }
  
  // 4. Check cart
  console.log('\n4️⃣ Shopping Cart:');
  if (store.cart.length === 0) {
    console.log('   ✅ Cart is empty');
  } else {
    console.log(`   ❌ Cart has ${store.cart.length} items (should be empty after order)`);
    store.cart.forEach(item => {
      console.log(`     - ${item.quantity}x ${item.name}`);
    });
  }
  
  // 5. Recommendations
  console.log('\n5️⃣ Next Steps:');
  console.log('   a) Place an order from Table T1');
  console.log('   b) Check the console logs for the table number during order placement');
  console.log('   c) Run this diagnostic again');
  console.log('   d) If T1 orders still don\'t appear, clear data and try again:');
  console.log('      __debugOrders.clear()');
  
  console.log('\n=== END DIAGNOSTIC ===\n');
}

export function testTableFlow(tableId: string) {
  console.log(`\n🧪 Testing flow for ${tableId}:`);
  
  const store = useRestaurantStore.getState();
  
  // 1. Verify URL parameter
  console.log(`1. URL parameter received: ${tableId}`);
  
  // 2. Set current table
  console.log(`2. Setting currentTableId to: ${tableId}`);
  store.setCurrentTableId(tableId);
  
  // 3. Verify it was set
  setTimeout(() => {
    const updated = useRestaurantStore.getState();
    console.log(`3. Verified currentTableId is now: ${updated.currentTableId}`);
    
    if (updated.currentTableId === tableId) {
      console.log(`   ✅ Table ID set correctly`);
    } else {
      console.log(`   ❌ Table ID NOT set! Expected ${tableId}, got ${updated.currentTableId}`);
    }
  }, 0);
}

// Make available in window for browser console
if (typeof window !== 'undefined') {
  (window as any).__diagnostic = {
    tableIssues: diagnoseTableIssuies,
    testFlow: testTableFlow,
  };
  // eslint-disable-next-line no-console
  console.log('🧪 Diagnostic tools available: __diagnostic.tableIssues(), __diagnostic.testFlow("T1")');
}
