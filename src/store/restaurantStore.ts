import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { upsertMenuItem, deleteMenuItem as deleteMenuItemFromDb } from "@/lib/firebaseService";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  dietary?: string[];
  image?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'served';
  total: number;
  createdAt: Date;
  readyAt: number; // timestamp when order is estimated to be ready
  paymentMethod?: 'cash' | 'online';
}

export interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied';
}

export interface Waiter {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface Notification {
  id: string;
  tableId: string;
  type: 'order' | 'call_waiter' | 'request_bill';
  message: string;
  read: boolean;
  createdAt: Date;
}

// Sample menu data
const sampleMenu: MenuItem[] = [
  { id: '1', name: 'Bruschetta', description: 'Grilled bread topped with fresh tomatoes, garlic, and basil', price: 320, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: '2', name: 'Chicken Wings', description: 'Crispy fried wings tossed in spicy buffalo sauce', price: 450, category: 'Appetizers', available: true },
  { id: '3', name: 'Soup of the Day', description: 'Chef\'s special seasonal soup served with bread', price: 280, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: '4', name: 'Caesar Salad', description: 'Romaine lettuce, croutons, parmesan with classic dressing', price: 380, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: '5', name: 'Grilled Salmon', description: 'Atlantic salmon fillet with lemon butter sauce and seasonal vegetables', price: 890, category: 'Mains', available: true },
  { id: '6', name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken and saffron', price: 520, category: 'Mains', available: true },
  { id: '7', name: 'Margherita Pizza', description: 'Classic pizza with mozzarella, fresh tomatoes, and basil', price: 480, category: 'Mains', available: true, dietary: ['V'] },
  { id: '8', name: 'Butter Chicken', description: 'Tender chicken in rich tomato and butter gravy', price: 560, category: 'Mains', available: true },
  { id: '9', name: 'Paneer Tikka Masala', description: 'Grilled paneer cubes in spiced tomato gravy', price: 480, category: 'Mains', available: true, dietary: ['V'] },
  { id: '10', name: 'Lamb Chops', description: 'Herb-crusted lamb chops with mint sauce and roasted potatoes', price: 1250, category: 'Mains', available: true },
  { id: '11', name: 'French Fries', description: 'Crispy golden fries with seasoning', price: 220, category: 'Sides', available: true, dietary: ['V', 'GF'] },
  { id: '12', name: 'Garlic Naan', description: 'Soft naan bread with garlic and butter', price: 120, category: 'Sides', available: true, dietary: ['V'] },
  { id: '13', name: 'Steamed Rice', description: 'Plain basmati rice', price: 150, category: 'Sides', available: true, dietary: ['V', 'GF'] },
  { id: '14', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center, served with ice cream', price: 420, category: 'Desserts', available: true, dietary: ['V'] },
  { id: '15', name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose-flavored sugar syrup', price: 280, category: 'Desserts', available: true, dietary: ['V'] },
  { id: '16', name: 'Mango Lassi', description: 'Chilled yogurt drink blended with fresh mango', price: 180, category: 'Beverages', available: true, dietary: ['V'] },
  { id: '17', name: 'Fresh Lime Soda', description: 'Refreshing lime with soda water, sweet or salted', price: 120, category: 'Beverages', available: true, dietary: ['V', 'GF'] },
  { id: '18', name: 'Cold Coffee', description: 'Iced coffee blended with milk and cream', price: 220, category: 'Beverages', available: true, dietary: ['V'] },
];

const sampleTables: Table[] = [
  { id: 'T1', number: 1, status: 'available' },
  { id: 'T2', number: 2, status: 'available' },
  { id: 'T3', number: 3, status: 'occupied' },
  { id: 'T4', number: 4, status: 'available' },
  { id: 'T5', number: 5, status: 'available' },
  { id: 'T6', number: 6, status: 'available' },
];

const sampleWaiters: Waiter[] = [
  { id: 'W1', name: 'Ravi Kumar', email: 'ravi@restaurant.com', active: true },
  { id: 'W2', name: 'Priya Singh', email: 'priya@restaurant.com', active: true },
  { id: 'W3', name: 'Ankit Sharma', email: 'ankit@restaurant.com', active: false },
];

interface RestaurantStore {
  // Menu
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;

  // Category images (for customer menu section thumbnails)
  categoryImages: Record<string, string>;
  setCategoryImage: (category: string, image: string) => void;
  clearCategoryImage: (category: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;

  // Orders
  orders: Order[];
  placeOrder: (tableId: string) => void;
  addItemsToOrder: (tableId: string, items: CartItem[]) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  getOrderByTableId: (tableId: string) => Order | undefined;
  getActiveOrderForTable: (tableId: string) => Order | undefined;
  updateOrderPaymentMethod: (orderId: string, method: 'cash' | 'online') => void;

  // Tables
  tables: Table[];
  addTable: (number: number) => void;
  deleteTable: (id: string) => void;

  // Waiters
  waiters: Waiter[];
  addWaiter: (waiter: Omit<Waiter, 'id'>) => void;
  deleteWaiter: (id: string) => void;
  toggleWaiterStatus: (id: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Current table (for customer view)
  currentTableId: string | null;
  setCurrentTableId: (id: string) => void;
}

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set, get) => ({
      menuItems: sampleMenu,
      categoryImages: {},
      setMenuItems: (items) => set({ menuItems: items }),
      addMenuItem: async (item) => {
        set((state) => ({ menuItems: [...state.menuItems, item] }));
        try {
          upsertMenuItem(item).catch(error => {
            console.warn("Failed to sync menu item to Firestore:", error);
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("Failed to sync menu item to Firestore:", error);
        }
      },
      setCategoryImage: (category, image) => set((state) => ({
        categoryImages: { ...state.categoryImages, [category]: image },
      })),
      clearCategoryImage: (category) => set((state) => {
        const next = { ...state.categoryImages };
        delete next[category];
        return { categoryImages: next };
      }),
  updateMenuItem: async (id, updates) => {
    set((state) => ({
      menuItems: state.menuItems.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));

    try {
      const current = get().menuItems.find((item) => item.id === id);
      if (current) {
        upsertMenuItem({ ...current, ...updates }).catch(error => {
          console.warn("Failed to sync menu item update to Firestore:", error);
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to sync menu item update to Firestore:", error);
    }
  },
  deleteMenuItem: async (id) => {
    set((state) => ({
      menuItems: state.menuItems.filter((item) => item.id !== id),
    }));

    try {
      deleteMenuItemFromDb(id).catch(error => {
        console.warn("Failed to delete menu item from Firestore:", error);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to delete menu item from Firestore:", error);
    }
  },

  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find((c) => c.id === item.id);
    if (existing) {
      return { cart: state.cart.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c) };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),
  updateCartQuantity: (id, quantity) => set((state) => ({
    cart: quantity <= 0
      ? state.cart.filter((c) => c.id !== id)
      : state.cart.map((c) => c.id === id ? { ...c, quantity } : c),
  })),
  clearCart: () => set({ cart: [] }),
  cartTotal: () => get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),

  orders: [],
  addItemsToOrder: (tableId, items) => {
    set((state) => {
      const existing = state.orders.find((o) => o.tableId === tableId && o.status !== 'served');
      if (!existing) return state;

      const updatedItems = [...existing.items];
      let addedQty = 0;
      items.forEach((item) => {
        const found = updatedItems.find((i) => i.id === item.id);
        if (found) {
          found.quantity += item.quantity;
        } else {
          updatedItems.push(item);
        }
        addedQty += item.quantity;
      });

      const addedMs = addedQty * 15 * 60 * 1000; // 15 minutes per item
      const nextReadyAt = Math.max(existing.readyAt, Date.now()) + addedMs;

      const updatedOrder: Order = {
        ...existing,
        items: updatedItems,
        total: updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
        readyAt: nextReadyAt,
      };

      return {
        orders: state.orders.map((o) => (o.id === existing.id ? updatedOrder : o)),
      };
    });
  },
  placeOrder: (tableId) => {
    const { cart, cartTotal, clearCart, addNotification, addItemsToOrder } = get();
    
    if (cart.length === 0) {
      return;
    }

    const existingOrder = get().orders.find((o) => o.tableId === tableId && o.status !== 'served');
    if (existingOrder) {
      addItemsToOrder(tableId, cart);
      addNotification({ tableId, type: 'extra_order', message: `Table ${tableId} added more items` });
      clearCart();
      return;
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const readyAt = Date.now() + totalItems * 15 * 60 * 1000;

    const order: Order = {
      id: `O${Date.now()}`,
      tableId,
      items: [...cart],
      status: 'pending',
      total: cartTotal(),
      createdAt: new Date(),
      readyAt,
    };
    
    set((state) => {
      const newOrders = [order, ...state.orders];
      return { orders: newOrders };
    });
    
    addNotification({ tableId, type: 'order', message: `New order from Table ${tableId}` });
    clearCart();
  },
  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map((o) => o.id === id ? { ...o, status } : o),
  })),

  getOrderByTableId: (tableId) => {
    const state = get();
    return state.orders.find(
      (order) => order.tableId === tableId && order.status !== 'served'
    );
  },

  getActiveOrderForTable: (tableId) => {
    const state = get();
    return state.orders.find(
      (order) =>
        order.tableId === tableId &&
        ['pending', 'confirmed', 'preparing'].includes(order.status)
    );
  },

  updateOrderPaymentMethod: (orderId, method) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, paymentMethod: method } : o
      ),
    }));
  },

  tables: sampleTables,
  addTable: (number) => set((state) => ({
    tables: [...state.tables, { id: `T${Date.now()}`, number, status: 'available' }],
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id),
  })),

  waiters: sampleWaiters,
  addWaiter: (waiter) => set((state) => ({
    waiters: [...state.waiters, { ...waiter, id: `W${Date.now()}` }],
  })),
  deleteWaiter: (id) => set((state) => ({
    waiters: state.waiters.filter((w) => w.id !== id),
  })),
  toggleWaiterStatus: (id) => set((state) => ({
    waiters: state.waiters.map((w) => w.id === id ? { ...w, active: !w.active } : w),
  })),

  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      { ...notification, id: `N${Date.now()}`, createdAt: new Date(), read: false },
      ...state.notifications,
    ],
  })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
  })),
  clearNotifications: () => set({ notifications: [] }),

  currentTableId: null,
  setCurrentTableId: (id) => set({ currentTableId: id }),
}),
{
  name: 'qr-menu-store-v2',
  // Keep data small; large images might exceed localStorage limits.
  // Persist only lightweight UI state; menu items are loaded from Firestore.
  partialize: (state) => ({
    cart: state.cart,
    tables: state.tables,
    waiters: state.waiters,
    notifications: state.notifications,
    currentTableId: state.currentTableId,
    categoryImages: state.categoryImages,
    orders: state.orders, // Persist orders so they appear across tabs/windows
  }),
  // If you want to clear cached state during development:
  // localStorage.removeItem('qr-menu-store');
}
)
);
