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
const getConfigCollection = () => db ? collection(db, "config") : null;

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
  status: 'pending' | 'confirmed' | 'preparing' | 'served' | 'delivered';
  total: number;
  createdAt: number;
  readyAt: number;
  paymentMethod?: 'cash' | 'online';
  assignedWaiterId?: string;
  customerEmail?: string;
}

export interface FirebaseNotification {
  id: string;
  tableId: string;
  type: 'order' | 'call_waiter' | 'request_bill' | 'extra_order' | 'payment_request' | 'cash_payment' | 'feedback';
  message: string;
  read: boolean;
  createdAt: number;
}

export async function upsertOrder(order: FirebaseOrder): Promise<void> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) {
    console.error('[upsertOrder] Firebase not configured');
    return;
  }
  try {
    const docRef = doc(ordersCollection, order.id);
    // Strip base64 images from items — Firestore has a 1MB doc limit
    const sanitizedItems = order.items.map(({ image: _image, ...rest }) => rest);
    const clean = Object.fromEntries(
      Object.entries({ ...order, items: sanitizedItems }).filter(([, v]) => v !== undefined)
    );
    console.log('[upsertOrder] saving order:', order.id, 'table:', order.tableId, 'items:', sanitizedItems.length);
    await setDoc(docRef, clean);
    console.log('[upsertOrder] SUCCESS:', order.id);
  } catch (error) {
    console.error('[upsertOrder] FAILED:', error);
    throw error;
  }
}

export async function fetchOrders(): Promise<FirebaseOrder[]> {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return [];
  try {
    const snapshot = await getDocs(ordersCollection);
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseOrder, "id">),
    }));
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn('Failed to fetch orders from Firebase:', error);
    return [];
  }
}

export function watchOrders(onChanged: (orders: FirebaseOrder[]) => void): () => void {
  const ordersCollection = getOrdersCollection();
  if (!isFirebaseConfigured || !ordersCollection) return () => {};
  try {
    return onSnapshot(ordersCollection, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirebaseOrder, "id">),
      }));
      orders.sort((a, b) => b.createdAt - a.createdAt);
      onChanged(orders);
    });
  } catch (error) {
    console.warn('Failed to watch orders:', error);
    return () => {};
  }
}

export async function upsertNotification(notification: FirebaseNotification): Promise<void> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) {
    console.error('[upsertNotification] Firebase not configured! db=', db, 'isConfigured=', isFirebaseConfigured);
    return;
  }
  try {
    const docRef = doc(notificationsCollection, notification.id);
    const clean = Object.fromEntries(Object.entries(notification).filter(([, v]) => v !== undefined));
    console.log('[upsertNotification] attempting write:', notification.id, notification.type, 'to collection: notifications');
    await setDoc(docRef, clean);
    console.log('[upsertNotification] SUCCESS saved', notification.id, notification.type);
  } catch (error) {
    console.error('[upsertNotification] FAILED:', error);
    throw error; // re-throw so caller can see it
  }
}

export async function fetchNotifications(): Promise<FirebaseNotification[]> {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) return [];
  try {
    // No orderBy — avoids needing a Firestore index on a new collection
    const snapshot = await getDocs(notificationsCollection);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirebaseNotification, "id">),
    }));
    // Sort client-side
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn('Failed to fetch notifications:', error);
    return [];
  }
}

export function watchNotifications(onChanged: (notifications: FirebaseNotification[]) => void) {
  const notificationsCollection = getNotificationsCollection();
  if (!isFirebaseConfigured || !notificationsCollection) {
    console.warn('[watchNotifications] Firebase not configured');
    return () => {};
  }
  try {
    // No orderBy — avoids needing a Firestore index, sort client-side instead
    console.log('[watchNotifications] listener started');
    return onSnapshot(notificationsCollection,
      (snapshot) => {
        const notifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<FirebaseNotification, "id">),
        }));
        // Sort newest first client-side
        notifications.sort((a, b) => b.createdAt - a.createdAt);
        console.log('[watchNotifications] received', notifications.length, 'notifications');
        onChanged(notifications);
      },
      (error) => {
        console.error('[watchNotifications] listener error:', error);
      }
    );
  } catch (error) {
    console.error('[watchNotifications] setup failed:', error);
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

// ── Waiters ───────────────────────────────────────────────────────────────────
export interface FirebaseWaiter {
  id: string;
  name: string;
  email: string;
  active: boolean;
  pin: string;
}

const getWaitersCollection = () => db ? collection(db, 'waiters') : null;

export async function fetchWaiters(): Promise<FirebaseWaiter[]> {
  const col = getWaitersCollection();
  if (!isFirebaseConfigured || !col) return [];
  try {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as FirebaseWaiter);
  } catch (e) {
    console.warn('[fetchWaiters] failed:', e);
    return [];
  }
}

export async function upsertWaiter(waiter: FirebaseWaiter): Promise<void> {
  const col = getWaitersCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    await setDoc(doc(col, waiter.id), waiter);
  } catch (e) {
    console.warn('[upsertWaiter] failed:', e);
  }
}

export async function deleteWaiterFromDb(id: string): Promise<void> {
  const col = getWaitersCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    await deleteDoc(doc(col, id));
  } catch (e) {
    console.warn('[deleteWaiterFromDb] failed:', e);
  }
}

// ── Payment Config (QR codes + UPI IDs) ──────────────────────────────────────
// Each provider stored as its own doc to avoid 1MB Firestore limit:
//   config/payment_phonepe  { qrCode: base64, upiId: string }
//   config/payment_gpay     { qrCode: base64, upiId: string }
//   config/payment_paytm    { qrCode: base64, upiId: string }

export interface PaymentConfig {
  qrCodes: Record<string, string>;
  upiIds: Record<string, string>;
}

// Compress a base64 image string to a small size suitable for Firestore
// QR codes are B&W so they compress very well even at low quality
async function compressBase64QR(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // QR codes don't need to be large — 300px is plenty for display
      const size = Math.min(300, img.width);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      // Try progressively lower quality
      for (const q of [0.5, 0.3, 0.2, 0.1]) {
        const result = canvas.toDataURL('image/jpeg', q);
        if (result.length < 200_000) { // under ~150KB
          resolve(result);
          return;
        }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.1));
    };
    img.onerror = () => resolve(base64); // fallback: use original
    img.src = base64;
  });
}

export async function saveProviderPaymentConfig(
  provider: string,
  qrCode: string,
  upiId: string
): Promise<void> {
  const col = getConfigCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    const compressed = qrCode ? await compressBase64QR(qrCode) : '';
    await setDoc(doc(col, `payment_${provider}`), { qrCode: compressed, upiId });
    console.log(`[saveProviderPaymentConfig] saved ${provider}, size=${compressed.length}`);
  } catch (e) {
    console.error(`[saveProviderPaymentConfig] failed for ${provider}:`, e);
  }
}

export async function saveProviderUPIId(provider: string, upiId: string): Promise<void> {
  const col = getConfigCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    await setDoc(doc(col, `payment_${provider}`), { upiId }, { merge: true });
    console.log(`[saveProviderUPIId] saved ${provider} upiId=${upiId}`);
  } catch (e) {
    console.error(`[saveProviderUPIId] failed for ${provider}:`, e);
  }
}

export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  const col = getConfigCollection();
  if (!isFirebaseConfigured || !col) return null;
  try {
    const providers = ['phonepe', 'gpay', 'paytm'];
    const snaps = await Promise.all(providers.map((p) => getDoc(doc(col, `payment_${p}`))));
    const qrCodes: Record<string, string> = {};
    const upiIds: Record<string, string> = {};
    snaps.forEach((snap, i) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.qrCode) qrCodes[providers[i]] = data.qrCode;
        if (data.upiId) upiIds[providers[i]] = data.upiId;
      }
    });
    console.log('[fetchPaymentConfig] loaded providers:', Object.keys(qrCodes));
    return { qrCodes, upiIds };
  } catch (e: any) {
    // Silently handle permission errors - payment config is optional
    if (e?.code !== 'permission-denied') {
      console.error('[fetchPaymentConfig] failed:', e);
    }
    return null;
  }
}

// ── Coupons ───────────────────────────────────────────────────────────────────
export interface FirebaseCoupon {
  id: string;
  code: string;
  discount: number; // percentage 1-100
  active: boolean;
  expiresAt?: number;
  usageLimit?: number;
  usedCount: number;
  description?: string;
  minOrderAmount?: number; // minimum order total to apply
  createdAt: number;
}

const getCouponsCollection = () => db ? collection(db, 'coupons') : null;

export async function fetchCoupons(): Promise<FirebaseCoupon[]> {
  const col = getCouponsCollection();
  if (!isFirebaseConfigured || !col) return [];
  try {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as FirebaseCoupon)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { console.warn('[fetchCoupons]', e); return []; }
}

export async function upsertCoupon(coupon: FirebaseCoupon): Promise<void> {
  const col = getCouponsCollection();
  if (!isFirebaseConfigured || !col) return;
  await setDoc(doc(col, coupon.id), coupon);
}

export async function deleteCoupon(id: string): Promise<void> {
  const col = getCouponsCollection();
  if (!isFirebaseConfigured || !col) return;
  await deleteDoc(doc(col, id));
}

export async function validateCoupon(code: string, orderTotal?: number): Promise<FirebaseCoupon | { error: string } | null> {
  const col = getCouponsCollection();
  if (!isFirebaseConfigured || !col) return null;
  try {
    const snap = await getDocs(col);
    const coupon = snap.docs.map((d) => d.data() as FirebaseCoupon)
      .find((c) => c.code.toUpperCase() === code.toUpperCase().trim());
    if (!coupon) return { error: 'Invalid coupon code' };
    if (!coupon.active) return { error: 'This coupon is no longer active' };
    if (coupon.expiresAt && Date.now() > coupon.expiresAt) return { error: 'This coupon has expired' };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { error: 'Coupon usage limit reached' };
    if (coupon.minOrderAmount && orderTotal !== undefined && orderTotal < coupon.minOrderAmount) {
      return { error: `Minimum order ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon` };
    }
    return coupon;
  } catch (e) { return null; }
}

export async function incrementCouponUsage(id: string): Promise<void> {
  const col = getCouponsCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    const ref = doc(col, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as FirebaseCoupon;
      await setDoc(ref, { ...data, usedCount: (data.usedCount || 0) + 1 });
    }
  } catch (e) { console.warn('[incrementCouponUsage]', e); }
}

// ── Banners ───────────────────────────────────────────────────────────────────
export interface FirebaseBanner {
  id: string;
  text: string;
  subtext?: string;
  bgColor: string;   // hex or tailwind-style
  textColor: string;
  emoji?: string;
  active: boolean;
  createdAt: number;
}

const getBannersCollection = () => db ? collection(db, 'banners') : null;

export async function fetchBanners(): Promise<FirebaseBanner[]> {
  const col = getBannersCollection();
  if (!isFirebaseConfigured || !col) return [];
  try {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as FirebaseBanner)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { return []; }
}

export async function upsertBanner(banner: FirebaseBanner): Promise<void> {
  const col = getBannersCollection();
  if (!isFirebaseConfigured || !col) return;
  await setDoc(doc(col, banner.id), banner);
}

export async function deleteBanner(id: string): Promise<void> {
  const col = getBannersCollection();
  if (!isFirebaseConfigured || !col) return;
  await deleteDoc(doc(col, id));
}

// ── Table Sessions (occupancy lock) ──────────────────────────────────────────
export type TableOccupancyStatus = 'available' | 'occupied' | 'eating' | 'vacated';

export interface FirebaseTableSession {
  tableId: string;
  status: TableOccupancyStatus;
  sessionId: string;   // random token set when customer first scans
  startedAt: number;
}

const getTableSessionsCollection = () => db ? collection(db, 'tableSessions') : null;

export async function getTableSession(tableId: string): Promise<FirebaseTableSession | null> {
  const col = getTableSessionsCollection();
  if (!isFirebaseConfigured || !col) return null;
  try {
    const snap = await getDoc(doc(col, tableId));
    return snap.exists() ? (snap.data() as FirebaseTableSession) : null;
  } catch { return null; }
}

export async function claimTableSession(tableId: string, sessionId: string): Promise<'ok' | 'occupied'> {
  const col = getTableSessionsCollection();
  if (!isFirebaseConfigured || !col) return 'ok';
  try {
    const snap = await getDoc(doc(col, tableId));
    if (snap.exists()) {
      const existing = snap.data() as FirebaseTableSession;
      // If available or vacated — always allow, reset session
      if (existing.status === 'available' || existing.status === 'vacated') {
        await setDoc(doc(col, tableId), {
          tableId, sessionId, status: 'occupied', startedAt: Date.now(),
        });
        return 'ok';
      }
      // If occupied/eating by a DIFFERENT session, block
      if (
        (existing.status === 'occupied' || existing.status === 'eating') &&
        existing.sessionId !== sessionId
      ) {
        return 'occupied';
      }
      // Same session re-scanning — allow
      return 'ok';
    }
    // No session exists yet — claim it
    await setDoc(doc(col, tableId), {
      tableId, sessionId, status: 'occupied', startedAt: Date.now(),
    });
    return 'ok';
  } catch { return 'ok'; }
}

export async function updateTableSessionStatus(tableId: string, status: TableOccupancyStatus): Promise<void> {
  const col = getTableSessionsCollection();
  if (!isFirebaseConfigured || !col) return;
  try {
    await setDoc(doc(col, tableId), { status }, { merge: true });
  } catch (e) { console.warn('[updateTableSessionStatus]', e); }
}

export async function fetchAllTableSessions(): Promise<FirebaseTableSession[]> {
  const col = getTableSessionsCollection();
  if (!isFirebaseConfigured || !col) return [];
  try {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as FirebaseTableSession);
  } catch { return []; }
}
