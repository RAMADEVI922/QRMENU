import { useEffect, useRef } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { watchOrders, saveOrder, updateOrderStatus, fetchOrders } from './firebaseService';

export function useOrdersSync() {
  const orders = useRestaurantStore((state) => state.orders);
  const setOrders = useRestaurantStore((state) => state.setOrders);
  const syncInProgressRef = useRef(false);
  const lastSyncRef = useRef<string>('');

  // Load initial orders from Firebase (only once)
  useEffect(() => {
    console.log('🔄 useOrdersSync: Loading initial orders from Firebase');
    
    const loadOrders = async () => {
      try {
        const firebaseOrders = await fetchOrders();
        console.log('📥 useOrdersSync: Loaded', firebaseOrders.length, 'orders from Firebase');
        
        // Convert Firebase orders back to local format
        const convertedOrders = firebaseOrders.map((order) => ({
          ...order,
          createdAt: new Date(order.createdAt),
        }));
        
        setOrders(convertedOrders);
      } catch (error) {
        console.warn('Failed to load orders from Firebase:', error);
      }
    };

    loadOrders();
  }, []); // Empty dependency array - run only once

  // Watch for real-time updates from Firebase
  useEffect(() => {
    console.log('👁️ useOrdersSync: Setting up real-time listener for orders');
    
    const unsubscribe = watchOrders((firebaseOrders) => {
      // Prevent unnecessary updates by comparing with last sync
      const ordersJson = JSON.stringify(firebaseOrders);
      if (ordersJson === lastSyncRef.current) {
        return; // No changes, skip update
      }
      lastSyncRef.current = ordersJson;
      
      console.log('📊 useOrdersSync: Received', firebaseOrders.length, 'orders from Firebase');
      
      // Convert Firebase orders back to local format
      const convertedOrders = firebaseOrders.map((order) => ({
        ...order,
        createdAt: new Date(order.createdAt),
      }));
      
      setOrders(convertedOrders);
    });

    return () => {
      console.log('🛑 useOrdersSync: Cleaning up real-time listener');
      unsubscribe();
    };
  }, [setOrders]);

  // Sync local orders to Firebase when they change (debounced)
  useEffect(() => {
    if (syncInProgressRef.current) {
      return; // Skip if sync already in progress
    }

    syncInProgressRef.current = true;
    console.log('💾 useOrdersSync: Syncing', orders.length, 'orders to Firebase');
    
    const syncPromises = orders.map((order) => {
      // Handle both Date objects and ISO strings
      const createdAtString = typeof order.createdAt === 'string' 
        ? order.createdAt 
        : order.createdAt.toISOString();
      
      const firebaseOrder = {
        ...order,
        createdAt: createdAtString,
      };
      
      return saveOrder(firebaseOrder).catch((error) => {
        console.warn('Failed to sync order to Firebase:', error);
      });
    });

    Promise.all(syncPromises).finally(() => {
      syncInProgressRef.current = false;
    });
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
