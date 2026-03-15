/**
 * Debug utilities to help diagnose issues with order sync
 */

export function clearAllAppData() {
  // Clear localStorage
  localStorage.removeItem('qr-menu-store-v2');
  console.log('✅ Cleared localStorage: qr-menu-store-v2');
  
  // Note: Firebase data should be cleared separately via Firebase Console
  console.log('📌 Note: Firebase data should be cleared via Firebase Console');
}

export function getStoredOrders() {
  const stored = localStorage.getItem('qr-menu-store-v2');
  if (!stored) {
    console.log('No stored orders found');
    return null;
  }
  
  try {
    const data = JSON.parse(stored);
    console.log('📋 Stored orders:', data.state?.orders || []);
    return data.state?.orders || [];
  } catch (e) {
    console.error('Failed to parse stored orders:', e);
    return null;
  }
}

export function debugOrderStatus() {
  const orders = getStoredOrders();
  if (!orders || orders.length === 0) {
    console.log('No orders to debug');
    return;
  }
  
  console.log('=== Order Status Debug ===');
  orders.forEach((order: any) => {
    console.log(`Order ${order.id}:`, {
      tableId: order.tableId,
      status: order.status,
      items: order.items?.length || 0,
      createdAt: order.createdAt,
    });
  });
}

export function fixOrderStatuses() {
  const stored = localStorage.getItem('qr-menu-store-v2');
  if (!stored) {
    console.log('No stored data to fix');
    return;
  }
  
  try {
    const data = JSON.parse(stored);
    if (data.state?.orders) {
      // Mark all "served" orders as "pending" if they were just created
      data.state.orders = data.state.orders.map((order: any) => {
        // Only fix orders created in the last 5 minutes
        const createdTime = new Date(order.createdAt).getTime();
        const now = Date.now();
        if (now - createdTime < 5 * 60 * 1000 && order.status === 'served') {
          console.log(`Fixing order ${order.id}: served → pending`);
          return { ...order, status: 'pending' };
        }
        return order;
      });
      
      localStorage.setItem('qr-menu-store-v2', JSON.stringify(data));
      console.log('✅ Fixed order statuses in localStorage');
    }
  } catch (e) {
    console.error('Failed to fix order statuses:', e);
  }
}

// Make functions available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).__debugOrders = {
    clear: clearAllAppData,
    get: getStoredOrders,
    debug: debugOrderStatus,
    fix: fixOrderStatuses,
  };
  console.log('🐛 Debug commands available: __debugOrders.clear(), __debugOrders.get(), __debugOrders.debug(), __debugOrders.fix()');
}
