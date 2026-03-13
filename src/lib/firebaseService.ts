import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";

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

export interface Photo {
  id: string;
  url: string;
}

// Lazy initialization of collections to avoid errors when Firebase is not configured
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
    const docRef = doc(menuItemsCollection, item.id);
    await setDoc(docRef, { ...item });
  } catch (error) {
    console.warn('Failed to upsert menu item:', error);
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

export async function saveCategoryBanner(category: string, url: string): Promise<void> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) {
    console.warn('Firebase not configured. Category banner not saved.');
    return;
  }
  const docRef = doc(photosCollection, "category_banners");
  await setDoc(docRef, { [category]: url }, { merge: true });
}

export async function fetchCategoryBanners(): Promise<Record<string, string>> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) {
    console.warn('Firebase not configured. Returning empty banners.');
    return {};
  }
  const docRef = doc(photosCollection, "category_banners");
  const snapshot = await getDoc(docRef);
  return (snapshot.data() as Record<string, string>) || {};
}

export function watchCategoryBanners(onChanged: (banners: Record<string, string>) => void) {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) {
    console.warn('Firebase not configured. Category banners will not be watched.');
    return () => {};
  }
  const docRef = doc(photosCollection, "category_banners");
  const unsubscribe = onSnapshot(docRef, (doc) => {
    const data = (doc.data() as Record<string, string>) || {};
    onChanged(data);
  });
  return unsubscribe;
}

export async function uploadCategoryImage(
  file: File,
  category: string,
  onProgress?: (progress: number) => void
): Promise<string> {
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
    setTimeout(() => {
      uploadTask.cancel();
      reject(new Error("Upload timed out after 15 seconds"));
    }, 15000)
  );

  return Promise.race([uploadPromise, timeoutPromise]);
}

export async function deleteCategoryBanner(category: string): Promise<void> {
  const photosCollection = getPhotosCollection();
  if (!photosCollection) {
    console.warn('Firebase not configured. Category banner not deleted.');
    return;
  }
  const docRef = doc(photosCollection, "category_banners");
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    delete data[category];
    await setDoc(docRef, data);
  }
}

// Orders Collection
export interface FirebaseOrder {
  id: string;
  tableId: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
  }>;
  status: 'pending' | 'confirmed' | 'preparing' | 'served';
  total: number;
  createdAt: number;
  readyAt: number;
}

export interface FirebaseNotification {
  id: string;
  tableId: string;
  type: 'order' | 'call_waiter' | 'request_bill' | 'extra_order';
  message: string;
  read: boolean;
  createdAt: number;
}

// Order Functions
export async function fetchOrders(): Promise<FirebaseOrder[]> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Returning empty orders.');
    return [];
  }
  
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

export async function upsertOrder(order: FirebaseOrder): Promise<void> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Order not saved.');
    return;
  }

  try {
    const docRef = doc(ordersCollection, order.id);
    await setDoc(docRef, { ...order });
  } catch (error) {
    console.warn('Failed to upsert order:', error);
  }
}

export async function deleteOrder(id: string): Promise<void> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Order not deleted.');
    return;
  }

  try {
    const docRef = doc(ordersCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Failed to delete order:', error);
  }
}

export function watchOrders(onChanged: (orders: FirebaseOrder[]) => void) {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) {
    console.warn('Firebase not configured. Orders will not be watched.');
    return () => {};
  }

  try {
    const q = query(ordersCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseOrder, "id">),
      }));
      onChanged(orders);
    });
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to watch orders:', error);
    return () => {};
  }
}

// Notification Functions
export async function fetchNotifications(): Promise<FirebaseNotification[]> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) {
    console.warn('Firebase not configured. Returning empty notifications.');
    return [];
  }
  
  try {
    const q = query(notificationsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseNotification, "id">),
    }));
  } catch (error) {
    console.warn('Failed to fetch notifications from Firebase:', error);
    return [];
  }
}

export async function upsertNotification(notification: FirebaseNotification): Promise<void> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) {
    console.warn('Firebase not configured. Notification not saved.');
    return;
  }

  try {
    const docRef = doc(notificationsCollection, notification.id);
    await setDoc(docRef, { ...notification });
  } catch (error) {
    console.warn('Failed to upsert notification:', error);
  }
}

export function watchNotifications(onChanged: (notifications: FirebaseNotification[]) => void) {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) {
    console.warn('Firebase not configured. Notifications will not be watched.');
    return () => {};
  }

  try {
    const q = query(notificationsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseNotification, "id">),
      }));
      onChanged(notifications);
    });
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to watch notifications:', error);
    return () => {};
  }
}
