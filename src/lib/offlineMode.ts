/**
 * Offline Mode - Makes the app work without Firebase
 * Orders are saved to localStorage instead of Firebase
 * Perfect for testing when Firebase emulator is not available
 */

import { Order } from '@/store/restaurantStore';

const OFFLINE_ORDERS_KEY = 'qr-menu-offline-orders';
const OFFLINE_MODE_KEY = 'qr-menu-offline-mode';

export function enableOfflineMode() {
  localStorage.setItem(OFFLINE_MODE_KEY, 'true');
  console.log('🔌 Offline Mode ENABLED - Orders will be saved locally (no Firebase needed)');
}

export function disableOfflineMode() {
  localStorage.removeItem(OFFLINE_MODE_KEY);
  console.log('🔌 Offline Mode DISABLED');
}

export function isOfflineModeEnabled(): boolean {
  return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
}

export function getOfflineOrders(): Order[] {
  try {
    const data = localStorage.getItem(OFFLINE_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load offline orders:', error);
    return [];
  }
}

export function saveOfflineOrder(order: Order) {
  try {
    const orders = getOfflineOrders();
    const existingIndex = orders.findIndex(o => o.id === order.id);
    
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.push(order);
    }
    
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
    console.log(`💾 Order ${order.id} saved to offline storage`);
  } catch (error) {
    console.error('Failed to save offline order:', error);
  }
}

export function updateOfflineOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'preparing' | 'served') {
  try {
    const orders = getOfflineOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      order.status = status;
      localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
      console.log(`📝 Order ${orderId} status updated to: ${status}`);
    }
  } catch (error) {
    console.error('Failed to update offline order status:', error);
  }
}

export function clearOfflineOrders() {
  localStorage.removeItem(OFFLINE_ORDERS_KEY);
  console.log('🗑️ Offline orders cleared');
}

// Make available globally for testing
if (typeof window !== 'undefined') {
  (window as any).__offlineMode = {
    enable: enableOfflineMode,
    disable: disableOfflineMode,
    isEnabled: isOfflineModeEnabled,
    getOrders: getOfflineOrders,
    saveOrder: saveOfflineOrder,
    updateStatus: updateOfflineOrderStatus,
    clear: clearOfflineOrders,
  };
  console.log('📌 Offline Mode available: __offlineMode.enable()');
}
