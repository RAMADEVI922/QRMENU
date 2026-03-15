/**
 * MIGRATION GUIDE: Switching from Offline Mode to Firebase
 * 
 * The app was using offline mode by default, which saved orders to localStorage.
 * Now it uses Firebase Firestore as primary with offline as fallback.
 * 
 * IMPORTANT: You may have orders cached in localStorage from when offline mode was enabled.
 * Only Table T2 orders made it to Firebase. Other table orders are stuck in localStorage.
 * 
 * MIGRATION STEPS:
 * 1. Clear all cached data:      __clearAppData()
 * 2. Start your dev server:       npm run dev
 * 3. Re-test with any/all tables
 * 4. All new orders go to Firebase (no more quota exhaustion)
 * 
 * WHY THE QUOTA ERRORS:
 * - Offline mode was saving orders to localStorage
 * - Firebase listener was also trying to sync them back
 * - This created duplicate writes, exhausting the free quota
 * - Now using Firebase first, which respects quota limits
 */

export function clearAllAppData() {
  console.log('🗑️ Clearing all app data...');
  
  // Remove all localStorage keys related to the app
  const keysToRemove = [
    'qr-menu-store-v2',
    'qr-menu-offline-orders',
    'qr-menu-offline-mode',
    'orders_backup'
  ];
  
  keysToRemove.forEach(key => {
    const had = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (had) {
      console.log(`  ✓ Removed ${key}`);
    }
  });
  
  // Also clear any @tanstack/react-query cache
  try {
    const queryClient = sessionStorage.getItem('@tanstack/react-query');
    if (queryClient) {
      sessionStorage.removeItem('@tanstack/react-query');
      console.log('  ✓ Removed React Query cache');
    }
  } catch (e) {
    // Ignore errors
  }
  
  console.log('✅ All app data cleared!');
  console.log('   Refresh the page to start fresh with Firebase');
}

export function showAppData() {
  console.log('📦 Current app data in storage:\n');
  
  const store = localStorage.getItem('qr-menu-store-v2');
  if (store) {
    try {
      const parsed = JSON.parse(store);
      console.log('Zustand Store:');
      console.log('  Orders:', parsed.state?.orders?.length || 0);
      console.log('  Current Table ID:', parsed.state?.currentTableId);
      console.log('  Cart Items:', parsed.state?.cart?.length || 0);
    } catch (e) {
      console.log('  (Could not parse Zustand store)');
    }
  } else {
    console.log('Zustand Store: (empty)');
  }
  
  const offlineOrders = localStorage.getItem('qr-menu-offline-orders');
  if (offlineOrders) {
    try {
      const parsed = JSON.parse(offlineOrders);
      console.log('\nOffline Orders Cache:', parsed.length, 'orders');
      const byTable: Record<string, number> = {};
      parsed.forEach((o: any) => {
        byTable[o.tableId] = (byTable[o.tableId] || 0) + 1;
      });
      Object.entries(byTable).forEach(([table, count]) => {
        console.log(`  Table ${table}: ${count} order(s)`);
      });
    } catch (e) {
      console.log('Offline Orders Cache: (could not parse)');
    }
  } else {
    console.log('Offline Orders Cache: (empty)');
  }
}

// Register global commands
if (typeof window !== 'undefined') {
  (window as any).__clearAppData = clearAllAppData;
  (window as any).__showAppData = showAppData;
  
  console.log('🔧 Migration tools available:');
  console.log('   __clearAppData()  - Remove all cached orders');
  console.log('   __showAppData()   - Show current cached data');
}
