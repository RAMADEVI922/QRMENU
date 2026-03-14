import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateOrder,
  validateCart,
  validateTableId,
  getSortedOrders,
  validateStatusTransition,
  formatOrderTime,
  formatPrice,
  calculateWaitingTime,
  validateOrderDataIntegrity,
} from './orderUtils';
import { Order, CartItem, MenuItem } from '@/store/restaurantStore';

// Arbitraries for property-based testing
const menuItemArbitrary = (): fc.Arbitrary<MenuItem> =>
  fc.record({
    id: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    description: fc.string(),
    price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
    category: fc.string({ minLength: 1 }),
    available: fc.boolean(),
    dietary: fc.option(fc.array(fc.constantFrom('V', 'GF', 'VG'), { maxLength: 3 })),
    image: fc.option(fc.string()),
  });

const cartItemArbitrary = (): fc.Arbitrary<CartItem> =>
  fc.record({
    id: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    description: fc.string(),
    price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
    category: fc.string({ minLength: 1 }),
    available: fc.boolean(),
    dietary: fc.option(fc.array(fc.constantFrom('V', 'GF', 'VG'), { maxLength: 3 })),
    image: fc.option(fc.string()),
    quantity: fc.integer({ min: 1, max: 100 }),
  });

const orderArbitrary = (): fc.Arbitrary<Order> => {
  const items = fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 10 });
  return items.chain((cartItems) =>
    fc.record({
      id: fc.string({ minLength: 1 }),
      tableId: fc.string({ minLength: 1 }),
      items: fc.constant(cartItems),
      status: fc.constantFrom('pending', 'confirmed', 'preparing', 'served'),
      total: fc.constant(
        cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      ),
      createdAt: fc.date(),
      readyAt: fc.integer({ min: 0 }),
    })
  );
};

describe('Order Validation - Property 2: Order Validation Rejects Invalid Data', () => {
  it('should reject orders with empty items array', () => {
    fc.assert(
      fc.property(menuItemArbitrary(), (menuItem) => {
        const order: Order = {
          id: 'O1',
          tableId: 'T1',
          items: [],
          status: 'pending',
          total: 0,
          createdAt: new Date(),
          readyAt: 0,
        };
        const result = validateOrder(order, [menuItem]);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      })
    );
  });

  it('should reject orders with negative quantities', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1 }),
        (menuItems) => {
          const cartItem: CartItem = {
            ...menuItems[0],
            quantity: -1,
          };
          const order: Order = {
            id: 'O1',
            tableId: 'T1',
            items: [cartItem],
            status: 'pending',
            total: 0,
            createdAt: new Date(),
            readyAt: 0,
          };
          const result = validateOrder(order, menuItems);
          expect(result.isValid).toBe(false);
        }
      )
    );
  });

  it('should reject orders with invalid table ID', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1 }),
        (menuItems) => {
          const cartItem: CartItem = {
            ...menuItems[0],
            quantity: 1,
          };
          const order: Order = {
            id: 'O1',
            tableId: '',
            items: [cartItem],
            status: 'pending',
            total: menuItems[0].price,
            createdAt: new Date(),
            readyAt: 0,
          };
          const result = validateOrder(order, menuItems);
          expect(result.isValid).toBe(false);
        }
      )
    );
  });

  it('should reject orders with mismatched total price', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1 }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
        (menuItems, wrongTotal) => {
          const cartItem: CartItem = {
            ...menuItems[0],
            quantity: 1,
          };
          const correctTotal = menuItems[0].price;
          // Only test if the wrong total is actually different
          if (Math.abs(wrongTotal - correctTotal) > 0.01) {
            const order: Order = {
              id: 'O1',
              tableId: 'T1',
              items: [cartItem],
              status: 'pending',
              total: wrongTotal,
              createdAt: new Date(),
              readyAt: 0,
            };
            const result = validateOrder(order, menuItems);
            expect(result.isValid).toBe(false);
          }
        }
      )
    );
  });

  it('should accept valid orders with correct data', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1, maxLength: 5 }),
        (menuItems) => {
          const cartItems: CartItem[] = menuItems.map((item) => ({
            ...item,
            quantity: fc.sample(fc.integer({ min: 1, max: 10 }))[0],
          }));
          const total = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const order: Order = {
            id: 'O1',
            tableId: 'T1',
            items: cartItems,
            status: 'pending',
            total,
            createdAt: new Date(),
            readyAt: 0,
          };
          const result = validateOrder(order, menuItems);
          expect(result.isValid).toBe(true);
          expect(result.errors.length).toBe(0);
        }
      )
    );
  });
});

describe('FIFO Ordering - Property 4: FIFO Ordering Preserved', () => {
  it('should sort orders by createdAt in ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(orderArbitrary(), { minLength: 1, maxLength: 10 }),
        (orders) => {
          const sorted = getSortedOrders(orders);
          for (let i = 1; i < sorted.length; i++) {
            const prevTime = new Date(sorted[i - 1].createdAt).getTime();
            const currTime = new Date(sorted[i].createdAt).getTime();
            expect(prevTime).toBeLessThanOrEqual(currTime);
          }
        }
      )
    );
  });

  it('should preserve order position after updates', () => {
    fc.assert(
      fc.property(
        fc.array(orderArbitrary(), { minLength: 2, maxLength: 5 }),
        (orders) => {
          const sorted1 = getSortedOrders(orders);
          // Simulate an update to the first order (change status)
          const updated = sorted1.map((o, i) =>
            i === 0 ? { ...o, status: 'preparing' as const } : o
          );
          const sorted2 = getSortedOrders(updated);
          // Position should be preserved
          expect(sorted2[0].id).toBe(sorted1[0].id);
        }
      )
    );
  });
});

describe('Status Transitions - Property 18: Order Status Transitions Valid', () => {
  it('should allow valid transitions', () => {
    const validTransitions = [
      { from: 'pending' as const, to: 'confirmed' as const },
      { from: 'pending' as const, to: 'preparing' as const },
      { from: 'confirmed' as const, to: 'preparing' as const },
      { from: 'preparing' as const, to: 'served' as const },
    ];

    validTransitions.forEach(({ from, to }) => {
      const result = validateStatusTransition(from, to);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  it('should reject invalid transitions', () => {
    const invalidTransitions = [
      { from: 'served' as const, to: 'pending' as const },
      { from: 'served' as const, to: 'preparing' as const },
      { from: 'preparing' as const, to: 'pending' as const },
      { from: 'confirmed' as const, to: 'pending' as const },
    ];

    invalidTransitions.forEach(({ from, to }) => {
      const result = validateStatusTransition(from, to);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should prevent status downgrades', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('pending', 'confirmed', 'preparing', 'served'),
        fc.constantFrom('pending', 'confirmed', 'preparing', 'served'),
        (from, to) => {
          const fromStatus = from as Order['status'];
          const toStatus = to as Order['status'];
          const statusOrder = ['pending', 'confirmed', 'preparing', 'served'];
          const fromIndex = statusOrder.indexOf(fromStatus);
          const toIndex = statusOrder.indexOf(toStatus);

          const result = validateStatusTransition(fromStatus, toStatus);
          if (toIndex < fromIndex) {
            // Downgrade attempt
            expect(result.isValid).toBe(false);
          }
        }
      )
    );
  });
});

describe('Utility Functions', () => {
  it('should format order time correctly', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const formatted = formatOrderTime(date);
        expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
      })
    );
  });

  it('should format price with currency and 2 decimals', () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0), max: Math.fround(10000) }), (price) => {
        if (!Number.isNaN(price)) {
          const formatted = formatPrice(price);
          expect(formatted).toMatch(/₹\d+\.\d{2}/);
        }
      })
    );
  });

  it('should calculate waiting time correctly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3600000 }), (ms) => {
        const pastDate = new Date(Date.now() - ms);
        const waiting = calculateWaitingTime(pastDate);
        expect(waiting).toMatch(/\d+m\s\d+s/);
      })
    );
  });
});

describe('Cart Validation', () => {
  it('should reject empty cart', () => {
    const result = validateCart([]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject cart with invalid quantities', () => {
    fc.assert(
      fc.property(menuItemArbitrary(), (item) => {
        const cartItem: CartItem = { ...item, quantity: 0 };
        const result = validateCart([cartItem]);
        expect(result.isValid).toBe(false);
      })
    );
  });

  it('should accept valid cart', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary(), { minLength: 1 }),
        (cart) => {
          const result = validateCart(cart);
          expect(result.isValid).toBe(true);
        }
      )
    );
  });
});

describe('Table ID Validation', () => {
  it('should reject null or empty table ID', () => {
    let result = validateTableId(null);
    expect(result.isValid).toBe(false);

    result = validateTableId('');
    expect(result.isValid).toBe(false);
  });

  it('should accept valid table ID', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tableId) => {
        const result = validateTableId(tableId);
        expect(result.isValid).toBe(true);
      })
    );
  });
});

describe('Order Data Integrity - Property 21: Order Data Integrity Validation', () => {
  it('should validate all item IDs reference valid menu items', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1, maxLength: 5 }),
        (menuItems) => {
          const cartItems: CartItem[] = menuItems.map((item) => ({
            ...item,
            quantity: 1,
          }));
          const total = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const order: Order = {
            id: 'O1',
            tableId: 'T1',
            items: cartItems,
            status: 'pending',
            total,
            createdAt: new Date(),
            readyAt: 0,
          };
          const result = validateOrderDataIntegrity(order, menuItems);
          expect(result.isValid).toBe(true);
        }
      )
    );
  });

  it('should reject orders with invalid item IDs', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary(), { minLength: 1 }),
        (menuItems) => {
          const invalidItem: CartItem = {
            ...menuItems[0],
            id: 'INVALID_ID',
            quantity: 1,
          };
          const order: Order = {
            id: 'O1',
            tableId: 'T1',
            items: [invalidItem],
            status: 'pending',
            total: invalidItem.price,
            createdAt: new Date(),
            readyAt: 0,
          };
          const result = validateOrderDataIntegrity(order, menuItems);
          expect(result.isValid).toBe(false);
        }
      )
    );
  });
});
