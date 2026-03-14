import { useEffect } from "react";
import { useRestaurantStore } from "@/store/restaurantStore";
import { 
  fetchMenuItems, 
  watchMenuItems, 
  fetchCategoryBanners, 
  watchCategoryBanners,
  fetchOrders,
  watchOrders,
  fetchNotifications,
  watchNotifications,
  type FirebaseOrder,
  type FirebaseNotification
} from "./firebaseService";

export function useFirebaseSync() {
  const setMenuItems = useRestaurantStore((state) => state.setMenuItems);
  const setCategoryBanners = useRestaurantStore((state) => state.setCategoryBanners);
  const setOrders = useRestaurantStore((state) => state.setOrders);
  const setNotifications = useRestaurantStore((state) => state.setNotifications);

  useEffect(() => {
    let unsubscribeMenu: (() => void) | undefined;
    let unsubscribeBanners: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;
    let cancelled = false;

    const runInit = async () => {
      if (cancelled) return;
      try {
        // Load menu items - merge Firestore items with local sample items
        const items = await fetchMenuItems();
        if (items.length > 0) {
          const store = useRestaurantStore.getState();
          const localItems = store.menuItems;
          const menuItemImages = store.menuItemImages;
          const localById = new Map(localItems.map(i => [i.id, i]));
          const firestoreIds = new Set(items.map((i: { id: string }) => i.id));
          const localOnly = localItems.filter(i => !firestoreIds.has(i.id));
          const merged = items.map((i: { id: string; image?: string }) => {
            const local = localById.get(i.id);
            // Prefer persisted base64 image, then local in-memory, then Firestore
            const persistedImage = menuItemImages[i.id];
            if (!i.image && persistedImage) return { ...i, image: persistedImage };
            if (!i.image && local?.image?.startsWith('data:')) return { ...i, image: local.image };
            return i;
          });
          setMenuItems([...localOnly, ...merged]);
        }
        
        unsubscribeMenu = watchMenuItems((newItems) => {
          // Merge: keep local items not in Firestore, update Firestore items but preserve persisted base64 images
          const store = useRestaurantStore.getState();
          const localItems = store.menuItems;
          const menuItemImages = store.menuItemImages;
          const localById = new Map(localItems.map(i => [i.id, i]));
          const firestoreIds = new Set(newItems.map(i => i.id));
          const localOnly = localItems.filter(i => !firestoreIds.has(i.id));
          const merged = newItems.map(i => {
            const local = localById.get(i.id);
            const persistedImage = menuItemImages[i.id];
            if (!i.image && persistedImage) return { ...i, image: persistedImage };
            if (!i.image && local?.image?.startsWith('data:')) return { ...i, image: local.image };
            return i;
          });
          setMenuItems([...localOnly, ...merged]);
        });

        // Load category banners
        const banners = await fetchCategoryBanners();
        setCategoryBanners(banners);

        unsubscribeBanners = watchCategoryBanners((newBanners) => {
          setCategoryBanners(newBanners);
        });

        // Load orders
        const orders = await fetchOrders();
        if (orders.length > 0) {
          const convertedOrders = orders.map((order: FirebaseOrder) => ({
            ...order,
            createdAt: new Date(order.createdAt),
          }));
          setOrders(convertedOrders);
        }

        unsubscribeOrders = watchOrders((newOrders) => {
          const convertedOrders = newOrders.map((order: FirebaseOrder) => ({
            ...order,
            createdAt: new Date(order.createdAt),
          }));
          setOrders(convertedOrders);
        });

        // Load notifications
        const notifications = await fetchNotifications();
        if (notifications.length > 0) {
          const convertedNotifications = notifications.map((notif: FirebaseNotification) => ({
            ...notif,
            createdAt: new Date(notif.createdAt),
          }));
          setNotifications(convertedNotifications);
        }

        unsubscribeNotifications = watchNotifications((newNotifications) => {
          const convertedNotifications = newNotifications.map((notif: FirebaseNotification) => ({
            ...notif,
            createdAt: new Date(notif.createdAt),
          }));
          setNotifications(convertedNotifications);
        });

      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Firebase sync failed:", error);
      }
    };

    // Wait for Zustand persist to finish rehydrating from localStorage
    // before running sync — otherwise menuItemImages will be empty {}
    const hydrated = useRestaurantStore.persist.hasHydrated();
    if (hydrated) {
      runInit();
    } else {
      const unsub = useRestaurantStore.persist.onFinishHydration(() => {
        runInit();
        unsub();
      });
    }

    return () => {
      cancelled = true;
      unsubscribeMenu?.();
      unsubscribeBanners?.();
      unsubscribeOrders?.();
      unsubscribeNotifications?.();
    };
  }, [setMenuItems, setCategoryBanners, setOrders, setNotifications]);
}
