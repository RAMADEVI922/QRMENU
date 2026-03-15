import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";
import { isOfflineModeEnabled, saveOfflineOrder, updateOfflineOrderStatus, getOfflineOrders } from "./offlineMode";

export interface FirebaseMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  dietary?: string[];
  image?: string;
}

const menuItemsCollection = db ? collection(db, "menuItems") : null;

export async function fetchMenuItems(): Promise<FirebaseMenuItem[]> {
  if (!isFirebaseConfigured || !menuItemsCollection) {
    console.warn('Firebase not configured. Returning empty menu items.');
    return [];
  }
  
  try {
    const q = query(menuItemsCollection, orderBy("name"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseMenuItem, "id">),
    }));
  } catch (error) {
    console.warn('Failed to fetch menu items from Firebase:', error);
    return [];
  }
}

export async function upsertMenuItem(item: FirebaseMenuItem): Promise<void> {
  if (!isFirebaseConfigured || !menuItemsCollection) {
    console.warn('Firebase not configured. Menu item not saved.');
    return;
  }

  try {
    const docRef = doc(menuItemsCollection, item.id);
    await setDoc(docRef, { ...item });
  } catch (error) {
    console.warn('Failed to upsert menu item:', error);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  if (!isFirebaseConfigured || !menuItemsCollection) {
    console.warn('Firebase not configured. Menu item not deleted.');
    return;
  }

  try {
    const docRef = doc(menuItemsCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Failed to delete menu item:', error);
  }
}

export async function uploadMenuItemImage(
  file: File,
  itemId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    console.warn('Firebase not configured. Image not uploaded.');
    return '';
  }

  try {
    const storageRef = ref(storage, `menuItems/${itemId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const uploadPromise = new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    // Adding a 15-second timeout to prevent the UI from hanging indefinitely
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => {
        uploadTask.cancel();
        reject(new Error("Upload timed out after 15 seconds"));
      }, 15000)
    );

    return Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Failed to upload image:', error);
    return '';
  }
}

export function watchMenuItems(onChanged: (items: FirebaseMenuItem[]) => void) {
  if (!isFirebaseConfigured || !menuItemsCollection) {
    console.warn('Firebase not configured. Menu items will not be watched.');
    return () => {};
  }

  try {
    const q = query(menuItemsCollection, orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseMenuItem, "id">),
      }));
      onChanged(items);
    });
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to watch menu items:', error);
    return () => {};
  }
}


// ============ ORDERS FUNCTIONS ============

export interface FirebaseOrder {
  id: string;
  tableId: string;
  items: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    available: boolean;
    dietary?: string[];
    image?: string;
    quantity: number;
  }>;
  status: 'pending' | 'confirmed' | 'preparing' | 'served';
  total: number;
  createdAt: string; // ISO string
  readyAt: number;
  paymentMethod?: 'cash' | 'online';
}

const ordersCollection = db ? collection(db, "orders") : null;

export async function saveOrder(order: FirebaseOrder, retryCount: number = 0): Promise<void> {
  if (!isFirebaseConfigured || !ordersCollection) {
    // Firebase not available - fallback to offline storage
    if (isOfflineModeEnabled()) {
      saveOfflineOrder(order);
    }
    console.warn('⚠️ Firebase not configured. Order saved to offline storage only.');
    return;
  }

  try {
    const docRef = doc(ordersCollection, order.id);
    await setDoc(docRef, {
      ...order,
      createdAt: order.createdAt, // Already ISO string
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    });
    console.log('✅ Order saved to Firebase:', order.id, 'from Table:', order.tableId);
  } catch (error: any) {
    const errorMessage = error?.message || JSON.stringify(error);
    const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('resource-exhausted');
    
    if (isQuotaError) {
      console.error('🚨 QUOTA EXCEEDED - Cannot save order to Firebase:', order.id);
      console.error('💡 Tip: Wait a few minutes and try again, or upgrade to Firebase Blaze plan');
    } else {
      console.warn('⚠️ Failed to save order to Firebase:', error);
    }
    
    // Retry with exponential backoff (max 3 retries, up to 8 seconds total)
    if (retryCount < 3 && !isQuotaError) {
      const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`⏳ Retrying order save (attempt ${retryCount + 2}/4) after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return saveOrder(order, retryCount + 1);
    }
    
    // Always fallback to offline storage on error
    console.log('💾 Saving to offline storage as fallback');
    saveOfflineOrder(order);
  }
}

export async function updateOrderStatus(orderId: string, status: string, retryCount: number = 0): Promise<void> {
  // If offline mode is enabled, update in localStorage instead of Firebase
  if (isOfflineModeEnabled()) {
    updateOfflineOrderStatus(orderId, status as 'pending' | 'confirmed' | 'preparing' | 'served');
    return;
  }

  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('⚠️ Firebase not configured. Order status not updated.');
    return;
  }

  try {
    const docRef = doc(ordersCollection, orderId);
    await setDoc(docRef, { 
      status, 
      updatedAt: new Date().toISOString(),
      statusChangedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('✅ Order status updated in Firebase:', orderId, '→', status);
  } catch (error: any) {
    const errorMessage = error?.message || JSON.stringify(error);
    const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('resource-exhausted');
    
    if (isQuotaError) {
      console.error('🚨 QUOTA EXCEEDED - Cannot update order status:', orderId);
    } else {
      console.warn('⚠️ Failed to update order status:', error);
    }
    
    // Retry with exponential backoff (max 2 retries for status updates)
    if (retryCount < 2 && !isQuotaError) {
      const delayMs = Math.pow(2, retryCount) * 1000;
      console.log(`⏳ Retrying status update (attempt ${retryCount + 2}/3) after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return updateOrderStatus(orderId, status, retryCount + 1);
    }
    
    // Fallback to offline storage on error
    updateOfflineOrderStatus(orderId, status as 'pending' | 'confirmed' | 'preparing' | 'served');
  }
}

export async function fetchOrders(): Promise<FirebaseOrder[]> {
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Loading from offline storage.');
    // Fallback to offline storage
    if (isOfflineModeEnabled()) {
      const offlineOrders = getOfflineOrders();
      return offlineOrders as FirebaseOrder[];
    }
    return [];
  }

  try {
    // Fetch orders from all 6 tables
    const ALL_TABLES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const q = query(
      ordersCollection,
      orderBy('createdAt', 'desc'),
      limit(200) // Fetch more to ensure we get all tables
    );
    const snapshot = await getDocs(q);

    const allOrders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseOrder, "id">),
    }));
    
    // Filter to valid tables only
    const validOrders = allOrders.filter(order => ALL_TABLES.includes(order.tableId));
    console.log('📥 Fetched', validOrders.length, 'orders from', new Set(validOrders.map(o => o.tableId)).size, 'tables');
    
    return validOrders;
  } catch (error) {
    console.warn('Failed to fetch orders from Firebase:', error);
    // Fallback to offline storage on error
    if (isOfflineModeEnabled()) {
      const offlineOrders = getOfflineOrders();
      return offlineOrders as FirebaseOrder[];
    }
    return [];
  }
}

export function watchOrders(onChanged: (orders: FirebaseOrder[]) => void): () => void {
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Using offline storage with polling.');
    // Fallback to offline storage with polling
    if (isOfflineModeEnabled()) {
      const offlineOrders = getOfflineOrders();
      onChanged(offlineOrders as FirebaseOrder[]);
      
      const pollInterval = setInterval(() => {
        const updated = getOfflineOrders();
        onChanged(updated as FirebaseOrder[]);
      }, 1000);
      
      return () => clearInterval(pollInterval);
    }
    return () => {};
  }

  try {
    // Watch orders from all 6 tables with optimized query
    const ALL_TABLES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const q = query(
      ordersCollection,
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
      const allOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseOrder, "id">),
      }));
      
      // Filter to valid tables only
      const validOrders = allOrders.filter(order => ALL_TABLES.includes(order.tableId));
      const tables = Array.from(new Set(validOrders.map(o => o.tableId))).sort().join(', ');
      console.log('📊 Firebase orders updated:', validOrders.length, 'orders from tables:', tables || 'none');
      onChanged(validOrders);
    }, (error) => {
      console.warn('Firebase listener error:', error);
      // Fallback to offline storage on error
      if (isOfflineModeEnabled()) {
        const offlineOrders = getOfflineOrders();
        onChanged(offlineOrders as FirebaseOrder[]);
        
        const pollInterval = setInterval(() => {
          const updated = getOfflineOrders();
          onChanged(updated as FirebaseOrder[]);
        }, 500);
        
        return () => clearInterval(pollInterval);
      }
    });
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to watch orders:', error);
    // Fallback to offline storage on error
    if (isOfflineModeEnabled()) {
      const offlineOrders = getOfflineOrders();
      onChanged(offlineOrders as FirebaseOrder[]);
      
      const pollInterval = setInterval(() => {
        const updated = getOfflineOrders();
        onChanged(updated as FirebaseOrder[]);
      }, 500);
      
      return () => clearInterval(pollInterval);
    }
    return () => {};
  }
}
