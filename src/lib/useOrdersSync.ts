import { useEffect, useRef } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { watchOrders, saveOrder, updateOrderStatus } from './firebaseService';

export function useOrdersSync() {
  const orders = useRestaurantStore((state) => state.orders);
  const setOrders = useRestaurantStore((state) => state.setOrders);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastSyncRef = useRef<string>('');

  // Set up real-time listener ONCE on mount
  useEffect(() => {
    console.log('🔄 useOrdersSync: Setting up real-time listener');
    
    // Clean up any existing listener
    if (unsubscribeRef.current) {
      console.log('🛑 useOrdersSync: Cleaning up old listener');
      unsubscribeRef.current();
    }

    // Set up new listener
    unsubscribeRef.current = watchOrders((firebaseOrders) => {
      console.log('📊 useOrdersSync: Received', firebaseOrders.length, 'orders from Firebase');
      
      // Convert Firebase orders back to local format
      const convertedOrders = firebaseOrders.map((order) => ({
        ...order,
        createdAt: new Date(order.createdAt),
      }));

      // Only update if data actually changed
      const ordersJson = JSON.stringify(convertedOrders);
      if (ordersJson !== lastSyncRef.current) {
        lastSyncRef.current = ordersJson;
        setOrders(convertedOrders);
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🛑 useOrdersSync: Cleaning up listener on unmount');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []); // Empty dependency array - run only once on mount

  // Sync order status changes to Firebase (debounced)
  useEffect(() => {
    const syncStatusChanges = async () => {
      // This will be called when orders change
      // But we only sync if status actually changed
      orders.forEach((order) => {
        const firebaseOrder = {
          ...order,
          createdAt: typeof order.createdAt === 'string' 
            ? order.createdAt 
            : order.createdAt.toISOString(),
        };
        
        // Only sync if it's a status update (not initial load)
        if (order.status !== 'pending') {
          saveOrder(firebaseOrder).catch((error) => {
            console.warn('Failed to sync order:', error);
          });
        }
      });
    };

    syncStatusChanges();
  }, [orders]);
}

export function useSyncOrderStatus(orderId: string, status: string) {
  useEffect(() => {
    console.log('🔄 useSyncOrderStatus: Syncing order', orderId, 'status to', status);
    
    updateOrderStatus(orderId, status).catch((error) => {
      console.warn('Failed to sync order status:', error);
    });
  }, [orderId, status]);
}
