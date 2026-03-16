import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  upsertMenuItem,
  deleteMenuItem as deleteMenuItemFromDb,
  upsertOrder,
  upsertNotification,
  type FirebaseOrder,
  type FirebaseNotification,
} from "@/lib/firebaseService";

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
  readyAt: number;
  paymentMethod?: 'cash' | 'online';
  assignedWaiterId?: string;
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
  type: 'order' | 'call_waiter' | 'request_bill' | 'extra_order';
  message: string;
  read: boolean;
  createdAt: Date;
}

const sampleMenu: MenuItem[] = [
  { id: '1', name: 'Bruschetta', description: 'Grilled bread topped with fresh tomatoes, garlic, and basil', price: 320, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: '2', name: 'Chicken Wings', description: 'Crispy fried wings tossed in spicy buffalo sauce', price: 450, category: 'Appetizers', available: true },
  { id: '3', name: 'Stuffed Mushrooms', description: 'Button mushrooms stuffed with herbed cream cheese and breadcrumbs, baked golden', price: 320, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: '4', name: 'Caesar Salad', description: 'Romaine lettuce, croutons, parmesan with classic dressing', price: 380, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A5', name: 'Paneer Tikka', description: 'Marinated paneer cubes grilled in tandoor with bell peppers and onions', price: 360, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A6', name: 'Chicken Seekh Kebab', description: 'Minced chicken mixed with spices and herbs, skewered and grilled', price: 420, category: 'Appetizers', available: true },
  { id: 'A7', name: 'Onion Rings', description: 'Crispy golden battered onion rings served with dipping sauce', price: 220, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A8', name: 'Spring Rolls', description: 'Crispy rolls filled with seasoned vegetables and glass noodles', price: 280, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A9', name: 'Prawn Cocktail', description: 'Chilled prawns served with tangy cocktail sauce and lemon wedge', price: 520, category: 'Appetizers', available: true },
  { id: 'A10', name: 'Hummus & Pita', description: 'Creamy chickpea hummus with warm pita bread and olive oil drizzle', price: 300, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A11', name: 'Nachos with Salsa', description: 'Tortilla chips loaded with salsa, sour cream, jalapeños and cheese', price: 340, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A12', name: 'Fish Fingers', description: 'Crispy breaded fish strips served with tartar sauce', price: 380, category: 'Appetizers', available: true },
  { id: 'A13', name: 'Caprese Skewers', description: 'Fresh mozzarella, cherry tomatoes and basil drizzled with balsamic glaze', price: 320, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A14', name: 'Mutton Shammi Kebab', description: 'Soft minced mutton patties with chana dal, pan-fried and spiced', price: 460, category: 'Appetizers', available: true },
  { id: 'A15', name: 'Corn & Cheese Balls', description: 'Golden fried balls stuffed with sweet corn and melted cheese', price: 260, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A16', name: 'Tandoori Mushrooms', description: 'Large mushrooms marinated in spiced yogurt and roasted in tandoor', price: 300, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A17', name: 'Chicken Satay', description: 'Grilled chicken skewers served with peanut dipping sauce', price: 400, category: 'Appetizers', available: true },
  { id: 'A18', name: 'Vegetable Crudités', description: 'Fresh seasonal vegetables with hummus and ranch dipping sauces', price: 240, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A19', name: 'Chilli Paneer', description: 'Crispy paneer tossed in Indo-Chinese chilli sauce with peppers', price: 340, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A20', name: 'Prawn Tempura', description: 'Japanese-style battered prawns, light and crispy, with dipping sauce', price: 540, category: 'Appetizers', available: true },
  { id: 'A21', name: 'Aloo Tikki', description: 'Spiced potato patties pan-fried golden, served with mint chutney', price: 200, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A22', name: 'Smoked Salmon Blinis', description: 'Mini buckwheat pancakes topped with smoked salmon and cream cheese', price: 580, category: 'Appetizers', available: true },
  { id: 'A23', name: 'Hara Bhara Kebab', description: 'Spinach and pea patties with paneer, shallow fried and served with chutney', price: 280, category: 'Appetizers', available: true, dietary: ['V'] },
  { id: 'A24', name: 'Calamari Fritti', description: 'Lightly battered squid rings fried crisp, served with aioli', price: 460, category: 'Appetizers', available: true },
  { id: '5', name: 'Grilled Salmon', description: 'Atlantic salmon fillet with lemon butter sauce and seasonal vegetables', price: 890, category: 'Mains', available: true },
  { id: '6', name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken and saffron', price: 520, category: 'Mains', available: true },
  { id: '7', name: 'Margherita Pizza', description: 'Classic pizza with mozzarella, fresh tomatoes, and basil', price: 480, category: 'Mains', available: true, dietary: ['V'] },
  { id: '8', name: 'Butter Chicken', description: 'Tender chicken in rich tomato and butter gravy', price: 560, category: 'Mains', available: true },
  { id: '9', name: 'Paneer Tikka Masala', description: 'Grilled paneer cubes in spiced tomato gravy', price: 480, category: 'Mains', available: true, dietary: ['V'] },
  { id: '10', name: 'Lamb Chops', description: 'Herb-crusted lamb chops with mint sauce and roasted potatoes', price: 1250, category: 'Mains', available: true },
  // Indian Mains
  { id: 'M1', name: 'Dal Makhani', description: 'Slow-cooked black lentils simmered overnight in butter and cream', price: 380, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M2', name: 'Mutton Rogan Josh', description: 'Kashmiri slow-braised mutton in aromatic whole spices and yogurt gravy', price: 720, category: 'Mains', available: true },
  { id: 'M3', name: 'Palak Paneer', description: 'Fresh cottage cheese cubes in smooth spiced spinach gravy', price: 420, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M4', name: 'Chicken Chettinad', description: 'Fiery South Indian chicken curry with freshly ground Chettinad spices', price: 580, category: 'Mains', available: true },
  { id: 'M5', name: 'Vegetable Biryani', description: 'Fragrant basmati rice layered with seasonal vegetables, saffron and fried onions', price: 420, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M6', name: 'Mutton Biryani', description: 'Slow-dum cooked basmati rice with tender mutton pieces and caramelised onions', price: 680, category: 'Mains', available: true },
  { id: 'M7', name: 'Shahi Paneer', description: 'Paneer in rich cashew and cream gravy with mild aromatic spices', price: 460, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M8', name: 'Chicken Tikka Masala', description: 'Tandoor-grilled chicken in velvety tomato-cream masala sauce', price: 560, category: 'Mains', available: true },
  { id: 'M9', name: 'Kadai Paneer', description: 'Paneer and peppers tossed in freshly ground kadai masala', price: 440, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M10', name: 'Prawn Masala', description: 'Juicy prawns cooked in spiced onion-tomato masala with coastal flavours', price: 680, category: 'Mains', available: true },
  { id: 'M11', name: 'Chicken Korma', description: 'Tender chicken in mild, fragrant almond and saffron cream sauce', price: 540, category: 'Mains', available: true },
  { id: 'M12', name: 'Aloo Gobi', description: 'Dry-spiced cauliflower and potato with cumin, turmeric and fresh coriander', price: 320, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M13', name: 'Fish Curry', description: 'Fresh fish in tangy Goan coconut and tamarind curry', price: 620, category: 'Mains', available: true },
  { id: 'M14', name: 'Chana Masala', description: 'Hearty chickpeas in bold spiced tomato and onion gravy', price: 340, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M15', name: 'Lamb Keema', description: 'Minced lamb cooked with peas, tomatoes and warming whole spices', price: 580, category: 'Mains', available: true },
  { id: 'M16', name: 'Malai Kofta', description: 'Soft paneer and potato dumplings in rich cashew cream gravy', price: 460, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M17', name: 'Chicken Saag', description: 'Tender chicken pieces slow-cooked in spiced mustard greens and spinach', price: 520, category: 'Mains', available: true },
  { id: 'M18', name: 'Hyderabadi Dum Biryani', description: 'Royal dum-cooked biryani with saffron, rose water and caramelised onions', price: 640, category: 'Mains', available: true },
  { id: 'M19', name: 'Baingan Bharta', description: 'Smoky roasted aubergine mashed with onions, tomatoes and spices', price: 320, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M20', name: 'Tandoori Chicken', description: 'Half chicken marinated in yogurt and spices, roasted in clay tandoor', price: 620, category: 'Mains', available: true },
  // International Mains
  { id: 'M21', name: 'Beef Lasagne', description: 'Layers of pasta, slow-cooked beef ragù and béchamel, baked golden', price: 720, category: 'Mains', available: true },
  { id: 'M22', name: 'Chicken Alfredo Pasta', description: 'Fettuccine tossed in creamy parmesan Alfredo sauce with grilled chicken', price: 580, category: 'Mains', available: true },
  { id: 'M23', name: 'Thai Green Curry', description: 'Fragrant coconut milk curry with vegetables and jasmine rice', price: 520, category: 'Mains', available: true, dietary: ['V'] },
  { id: 'M24', name: 'BBQ Pork Ribs', description: 'Slow-smoked pork ribs glazed in smoky BBQ sauce, served with coleslaw', price: 980, category: 'Mains', available: true },
  { id: 'M25', name: 'Mushroom Risotto', description: 'Creamy Arborio rice with wild mushrooms, white wine and parmesan', price: 540, category: 'Mains', available: true, dietary: ['V'] },
  { id: '11', name: 'French Fries', description: 'Crispy golden fries with seasoning', price: 220, category: 'Sides', available: true, dietary: ['V'] },
  { id: '12', name: 'Garlic Naan', description: 'Soft naan bread with garlic and butter', price: 120, category: 'Sides', available: true, dietary: ['V'] },
  { id: '13', name: 'Steamed Rice', description: 'Plain basmati rice', price: 150, category: 'Sides', available: true, dietary: ['V'] },
  { id: '14', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center, served with ice cream', price: 420, category: 'Desserts', available: true, dietary: ['V'] },
  { id: '15', name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose-flavored sugar syrup', price: 280, category: 'Desserts', available: true, dietary: ['V'] },
  { id: '16', name: 'Mango Lassi', description: 'Chilled yogurt drink blended with fresh mango', price: 180, category: 'Beverages', available: true, dietary: ['V'] },
  { id: '17', name: 'Fresh Lime Soda', description: 'Refreshing lime with soda water, sweet or salted', price: 120, category: 'Beverages', available: true, dietary: ['V'] },
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
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;

  categoryImages: Record<string, string>;
  setCategoryImage: (category: string, image: string) => void;
  setCategoryBanners: (banners: Record<string, string>) => void;
  clearCategoryImage: (category: string) => void;

  menuItemImages: Record<string, string>;
  setMenuItemImage: (itemId: string, image: string) => void;
  clearMenuItemImage: (itemId: string) => void;

  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;

  orders: Order[];
  setOrders: (orders: Order[]) => void;
  placeOrder: (tableId: string) => void;
  addItemsToOrder: (tableId: string, items: CartItem[]) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  assignOrderToWaiter: (orderId: string, waiterId: string) => void;
  autoAssignWaiter: (orderId: string) => string | null; // returns assigned waiter name or null
  getOrderByTableId: (tableId: string) => Order | undefined;
  getActiveOrderForTable: (tableId: string) => Order | undefined;
  updateOrderPaymentMethod: (orderId: string, method: 'cash' | 'online') => void;

  tables: Table[];
  addTable: (number: number) => void;
  deleteTable: (id: string) => void;

  waiters: Waiter[];
  addWaiter: (waiter: Omit<Waiter, 'id'>) => void;
  deleteWaiter: (id: string) => void;
  toggleWaiterStatus: (id: string) => void;

  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  currentTableId: string | null;
  setCurrentTableId: (id: string) => void;
}

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set, get) => ({
      menuItems: sampleMenu,
      categoryImages: {},
      menuItemImages: {},
      setMenuItems: (items) => set({ menuItems: items }),
      addMenuItem: async (item) => {
        set((state) => ({ menuItems: [...state.menuItems, item] }));
        upsertMenuItem(item).catch((e) => console.warn("Failed to sync menu item:", e));
      },
      setCategoryImage: (category, image) => set((state) => ({
        categoryImages: { ...state.categoryImages, [category]: image },
      })),
      setCategoryBanners: (banners) => set((state) => ({
        // Merge: keep existing base64 banners, overlay Firestore banners
        categoryImages: { ...state.categoryImages, ...banners },
      })),
      clearCategoryImage: (category) => set((state) => {
        const next = { ...state.categoryImages };
        delete next[category];
        return { categoryImages: next };
      }),
      setMenuItemImage: (itemId, image) => set((state) => ({
        menuItemImages: { ...state.menuItemImages, [itemId]: image },
      })),
      clearMenuItemImage: (itemId) => set((state) => {
        const next = { ...state.menuItemImages };
        delete next[itemId];
        return { menuItemImages: next };
      }),
      updateMenuItem: async (id, updates) => {
        set((state) => ({
          menuItems: state.menuItems.map((item) => item.id === id ? { ...item, ...updates } : item),
        }));
        // Get the updated item directly from updates merged with current
        const current = get().menuItems.find((item) => item.id === id);
        if (current) {
          const toSave = { ...current, ...updates };
          console.log('[updateMenuItem] saving to Firestore:', toSave.id, 'image length:', toSave.image?.length ?? 0);
          upsertMenuItem(toSave).catch((e) => console.warn("Failed to sync menu item update:", e));
        }
      },
      deleteMenuItem: async (id) => {
        set((state) => ({ menuItems: state.menuItems.filter((item) => item.id !== id) }));
        deleteMenuItemFromDb(id).catch((e) => console.warn("Failed to delete menu item:", e));
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
      setOrders: (orders) => set({ orders }),
      addItemsToOrder: (tableId, items) => {
        set((state) => {
          const existing = state.orders.find((o) => o.tableId === tableId && o.status !== 'served');
          if (!existing) return state;
          const updatedItems = [...existing.items];
          let addedQty = 0;
          items.forEach((item) => {
            const found = updatedItems.find((i) => i.id === item.id);
            if (found) { found.quantity += item.quantity; }
            else { updatedItems.push(item); }
            addedQty += item.quantity;
          });
          const nextReadyAt = Math.max(existing.readyAt, Date.now()) + addedQty * 15 * 60 * 1000;
          const updatedOrder: Order = {
            ...existing,
            items: updatedItems,
            total: updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
            readyAt: nextReadyAt,
          };
          upsertOrder({ ...updatedOrder, createdAt: updatedOrder.createdAt.getTime() } as FirebaseOrder)
            .catch((e) => console.warn("Failed to sync order:", e));
          return { orders: state.orders.map((o) => (o.id === existing.id ? updatedOrder : o)) };
        });
      },
      placeOrder: (tableId) => {
        const { cart, cartTotal, clearCart, addNotification, addItemsToOrder } = get();
        if (cart.length === 0) return;
        const existingOrder = get().orders.find((o) => o.tableId === tableId && o.status !== 'served');
        if (existingOrder) {
          addItemsToOrder(tableId, cart);
          addNotification({ tableId, type: 'extra_order', message: `Table ${tableId} added more items` });
          clearCart();
          return;
        }
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const order: Order = {
          id: `O${Date.now()}`,
          tableId,
          items: [...cart],
          status: 'pending',
          total: cartTotal(),
          createdAt: new Date(),
          readyAt: Date.now() + totalItems * 15 * 60 * 1000,
        };
        set((state) => ({ orders: [order, ...state.orders] }));
        upsertOrder({ ...order, createdAt: order.createdAt.getTime() } as FirebaseOrder)
          .catch((e) => console.error('[placeOrder] FIRESTORE WRITE FAILED:', e));
        addNotification({ tableId, type: 'order', message: `New order from Table ${tableId}` });
        clearCart();
      },
      updateOrderStatus: (id, status) => {
        set((state) => ({ orders: state.orders.map((o) => o.id === id ? { ...o, status } : o) }));
        const order = get().orders.find((o) => o.id === id);
        if (order) {
          upsertOrder({ ...order, createdAt: order.createdAt.getTime() } as FirebaseOrder)
            .catch((e) => console.warn("Failed to sync order status:", e));
        }
      },
      assignOrderToWaiter: (orderId, waiterId) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, assignedWaiterId: waiterId } : o),
        }));
        const order = get().orders.find((o) => o.id === orderId);
        if (order) {
          upsertOrder({ ...order, createdAt: order.createdAt.getTime() } as FirebaseOrder)
            .catch((e) => console.warn("Failed to sync waiter assignment:", e));
        }
      },
      autoAssignWaiter: (orderId) => {
        const { waiters, orders } = get();
        const activeWaiters = waiters.filter((w) => w.active);
        if (activeWaiters.length === 0) return null;
        // Find waiter with fewest active (non-served) orders
        const workload = activeWaiters.map((w) => ({
          waiter: w,
          count: orders.filter((o) => o.assignedWaiterId === w.id && o.status !== 'served').length,
        }));
        workload.sort((a, b) => a.count - b.count);
        const assigned = workload[0].waiter;
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, assignedWaiterId: assigned.id } : o),
        }));
        const order = get().orders.find((o) => o.id === orderId);
        if (order) {
          upsertOrder({ ...order, createdAt: order.createdAt.getTime() } as FirebaseOrder)
            .catch((e) => console.warn("Failed to sync auto-assignment:", e));
        }
        return assigned.name;
      },
      getOrderByTableId: (tableId) =>
        get().orders.find((o) => o.tableId === tableId && o.status !== 'served'),
      getActiveOrderForTable: (tableId) =>
        get().orders.find((o) => o.tableId === tableId && ['pending', 'confirmed', 'preparing'].includes(o.status)),
      updateOrderPaymentMethod: (orderId, method) =>
        set((state) => ({ orders: state.orders.map((o) => o.id === orderId ? { ...o, paymentMethod: method } : o) })),

      tables: sampleTables,
      addTable: (number) => set((state) => ({
        tables: [...state.tables, { id: `T${Date.now()}`, number, status: 'available' }],
      })),
      deleteTable: (id) => set((state) => ({ tables: state.tables.filter((t) => t.id !== id) })),

      waiters: sampleWaiters,
      addWaiter: (waiter) => set((state) => ({
        waiters: [...state.waiters, { ...waiter, id: `W${Date.now()}` }],
      })),
      deleteWaiter: (id) => set((state) => ({ waiters: state.waiters.filter((w) => w.id !== id) })),
      toggleWaiterStatus: (id) => set((state) => ({
        waiters: state.waiters.map((w) => w.id === id ? { ...w, active: !w.active } : w),
      })),

      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notification) => {
        const newNotif = { ...notification, id: `N${notification.tableId}_${Date.now()}`, createdAt: new Date(), read: false };
        set((state) => ({ notifications: [newNotif, ...state.notifications] }));
        console.log('[addNotification] saving to Firestore:', newNotif.id, newNotif.type);
        upsertNotification({ ...newNotif, createdAt: newNotif.createdAt.getTime() } as FirebaseNotification)
          .then(() => console.log('[addNotification] saved successfully:', newNotif.id))
          .catch((e) => console.error('[addNotification] FIRESTORE WRITE FAILED:', e));
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        }));
        const notif = get().notifications.find((n) => n.id === id);
        if (notif) {
          upsertNotification({ ...notif, read: true, createdAt: notif.createdAt.getTime() } as FirebaseNotification)
            .catch((e) => console.warn("Failed to sync notification read:", e));
        }
      },
      clearNotifications: () => set({ notifications: [] }),

      currentTableId: null,
      setCurrentTableId: (id) => set({ currentTableId: id }),
    }),
    {
      name: 'qr-menu-store-v2',
      partialize: (state) => ({
        cart: state.cart,
        tables: state.tables,
        waiters: state.waiters,
        currentTableId: state.currentTableId,
        categoryImages: state.categoryImages,
        menuItemImages: state.menuItemImages,
        // orders and notifications are NOT persisted — always fetched fresh from Firestore
      }),
    }
  )
);

