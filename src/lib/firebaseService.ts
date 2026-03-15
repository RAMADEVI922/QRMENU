import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";

// Compress and resize image aggressively to fit Firestore's 1MB doc limit
// Tries progressively lower quality until under 700KB
function compressImageToBase64(file: File, maxWidth = 400, quality = 0.4): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Try progressively lower quality until under 700KB
      const qualities = [0.4, 0.3, 0.2, 0.1];
      for (const q of qualities) {
        const result = canvas.toDataURL('image/jpeg', q);
        const sizeKB = Math.round(result.length * 0.75 / 1024);
        console.log(`[compress] quality=${q} size=${sizeKB}KB`);
        if (sizeKB < 700) {
          resolve(result);
          return;
        }
      }
      // Last resort: shrink canvas further
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 200;
      smallCanvas.height = Math.round(canvas.height * (200 / canvas.width));
      const sCtx = smallCanvas.getContext('2d')!;
      sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
      resolve(smallCanvas.toDataURL('image/jpeg', 0.3));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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

// Lazy getters — avoids crash when Firebase is not yet initialized
const getMenuItemsCollection = () => db ? collection(db, "menuItems") : null;
const getPhotosCollection = () => db ? collection(db, "photos") : null;
const getOrdersCollection = () => db ? collection(db, "orders") : null;
const getNotificationsCollection = () => db ? collection(db, "notifications") : null;

export async function fetchMenuItems(): Promise<FirebaseMenuItem[]> {
  const menuItemsCollection = getMenuItemsCollection();
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
  const menuItemsCollection = getMenuItemsCollection();
  if (!isFirebaseConfigured || !menuItemsCollection) {
    console.warn('Firebase not configured. Menu item not saved.');
    return;
  }
  try {
    // Warn if image is large — Firestore has 1MB per document limit
    if (item.image?.startsWith('data:')) {
      const sizeKB = Math.round(item.image.length * 0.75 / 1024);
      console.log(`[upsertMenuItem] ${item.id} image size: ~${sizeKB}KB`);
      if (sizeKB > 900) {
        console.warn(`[upsertMenuItem] Image too large (${sizeKB}KB), stripping to avoid Firestore error`);
        const { image: _, ...rest } = item;
        const docRef = doc(menuItemsCollection, item.id);
        await setDoc(docRef, rest);
        return;
      }
    }
    const docRef = doc(menuItemsCollection, item.id);
    // Remove undefined fields — Firestore rejects them
    const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined));
    await setDoc(docRef, clean);
    console.log(`[upsertMenuItem] saved ${item.id} successfully`);
  } catch (error) {
    console.error('Failed to upsert menu item:', error);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const menuItemsCollection = getMenuItemsCollection();
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
  const fallback = async () => {
    const b64 = await compressImageToBase64(file);
    onProgress?.(100);
    return b64;
  };

  if (!isFirebaseConfigured || !storage) {
    return fallback();
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

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => { uploadTask.cancel(); reject(new Error("Upload timed out")); }, 15000)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Firebase Storage upload failed, falling back to base64:', error);
    return fallback();
  }
}

export function watchMenuItems(onChanged: (items: FirebaseMenuItem[]) => void) {
  const menuItemsCollection = getMenuItemsCollection();
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

// Category Banners
export async function saveCategoryBanner(category: string, url: string): Promise<void> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) return;
  try {
    // Warn if base64 is large but still try to save — we compress aggressively
    if (url.startsWith('data:')) {
      const sizeKB = Math.round(url.length * 0.75 / 1024);
      console.log(`[saveCategoryBanner] ${category} image size: ~${sizeKB}KB`);
    }
    const docRef = doc(photosCollection, "category_banners");
    await setDoc(docRef, { [category]: url }, { merge: true });
    console.log(`[saveCategoryBanner] saved ${category} successfully`);
  } catch (error) {
    console.error('Failed to save category banner:', error);
  }
}
export async function fetchCategoryBanners(): Promise<Record<string, string>> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) return {};
  try {
    const docRef = doc(photosCollection, "category_banners");
    const snapshot = await getDoc(docRef);
    return (snapshot.data() as Record<string, string>) || {};
  } catch (error) {
    console.warn('Failed to fetch category banners:', error);
    return {};
  }
}

export function watchCategoryBanners(onChanged: (banners: Record<string, string>) => void) {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) return () => {};
  const docRef = doc(photosCollection, "category_banners");
  return onSnapshot(docRef, (snap) => {
    onChanged((snap.data() as Record<string, string>) || {});
  });
}

export async function uploadCategoryImage(
  file: File,
  category: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fallback = async () => {
    const b64 = await compressImageToBase64(file);
    onProgress?.(100);
    return b64;
  };

  if (!isFirebaseConfigured || !storage) {
    return fallback();
  }

  try {
    const storageRef = ref(storage, `categoryBanners/${category}_${Date.now()}`);
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

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => { uploadTask.cancel(); reject(new Error("Upload timed out")); }, 15000)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Firebase Storage upload failed, falling back to base64:', error);
    return fallback();
  }
}

export async function deleteCategoryBanner(category: string): Promise<void> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) return;
  const docRef = doc(photosCollection, "category_banners");
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    delete data[category];
    await setDoc(docRef, data);
  }
}

// Orders
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
  createdAt: number;
  readyAt: number;
  paymentMethod?: 'cash' | 'online';
}

export interface FirebaseNotification {
  id: string;
  tableId: string;
  type: 'order' | 'call_waiter' | 'request_bill' | 'extra_order';
  message: string;
  read: boolean;
  createdAt: number;
}

export async function upsertOrder(order: FirebaseOrder): Promise<void> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return;
  try {
    const docRef = doc(ordersCollection, order.id);
    await setDoc(docRef, { ...order });
  } catch (error) {
    console.warn('Failed to upsert order:', error);
  }
}

export async function fetchOrders(): Promise<FirebaseOrder[]> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return [];
  try {
    const q = query(ordersCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseOrder, "id">),
    }));
  } catch (error) {
    console.warn('Failed to fetch orders from Firebase:', error);
    return [];
  }
}

export function watchOrders(onChanged: (orders: FirebaseOrder[]) => void): () => void {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return () => {};
  try {
    const q = query(ordersCollection, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseOrder, "id">),
      }));
      onChanged(orders);
    });
  } catch (error) {
    console.warn('Failed to watch orders:', error);
    return () => {};
  }
}

export async function upsertNotification(notification: FirebaseNotification): Promise<void> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) return;
  try {
    const docRef = doc(notificationsCollection, notification.id);
    await setDoc(docRef, { ...notification });
  } catch (error) {
    console.warn('Failed to upsert notification:', error);
  }
}

export async function fetchNotifications(): Promise<FirebaseNotification[]> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) return [];
  try {
    const q = query(notificationsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseNotification, "id">),
    }));
  } catch (error) {
    console.warn('Failed to fetch notifications:', error);
    return [];
  }
}

export function watchNotifications(onChanged: (notifications: FirebaseNotification[]) => void) {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) return () => {};
  try {
    const q = query(notificationsCollection, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseNotification, "id">),
      }));
      onChanged(notifications);
    });
  } catch (error) {
    console.warn('Failed to watch notifications:', error);
    return () => {};
  }
}

// Alias used by useOrdersSync — accepts createdAt as ISO string or number
export async function saveOrder(order: Omit<FirebaseOrder, 'createdAt'> & { createdAt: string | number }): Promise<void> {
  const normalized: FirebaseOrder = {
    ...order,
    createdAt: typeof order.createdAt === 'string' ? new Date(order.createdAt).getTime() : order.createdAt,
  };
  return upsertOrder(normalized);
}

// Alias for backward compatibility with OrdersQueue component
export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return;
  try {
    const docRef = doc(ordersCollection, orderId);
    await setDoc(docRef, { status }, { merge: true });
  } catch (error) {
    console.warn('Failed to update order status:', error);
  }
}
