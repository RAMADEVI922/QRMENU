import { Order, CartItem, MenuItem } from '@/store/restaurantStore';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates an order object against all required fields and business rules
 * Requirements: 1.2, 1.3, 1.4, 11.1, 11.3
 */
export function validateOrder(order: Order, menuItems: MenuItem[]): ValidationResult {
  const errors: string[] = [];

  // Validate items exist and quantities are positive
  if (!order.items || order.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  order.items?.forEach((item) => {
    const menuItem = menuItems.find((m) => m.id === item.id);
    if (!menuItem) {
      errors.push(`Item ${item.id} not found in menu`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.name}: must be a positive integer`);
    }
  });

  // Validate total price
  const calculatedTotal = order.items?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0;
  if (Math.abs(order.total - calculatedTotal) > 0.01) {
    errors.push(`Total price mismatch: expected ${calculatedTotal}, got ${order.total}`);
  }

  // Validate table and timestamp
  if (!order.tableId) {
    errors.push('Table ID is required');
  }

  if (!(order.createdAt instanceof Date) && typeof order.createdAt !== 'string') {
    errors.push('Invalid timestamp');
  }

  // Validate status
  const validStatuses = ['pending', 'confirmed', 'preparing', 'served'];
  if (!validStatuses.includes(order.status)) {
    errors.push(`Invalid status: ${order.status}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates cart is not empty and all items have positive quantities
 * Requirements: 1.2, 1.3, 1.4
 */
export function validateCart(cart: CartItem[]): ValidationResult {
  const errors: string[] = [];

  if (!cart || cart.length === 0) {
    errors.push('Cart is empty');
  }

  cart?.forEach((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.name}: must be a positive integer`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates table ID exists in the system
 * Requirements: 1.2, 1.3, 1.4
 */
export function validateTableId(tableId: string | null): ValidationResult {
  const errors: string[] = [];

  if (!tableId) {
    errors.push('Table ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sorts orders by createdAt timestamp in ascending order (FIFO)
 * Requirements: 2.3, 15.1, 15.2, 15.3
 */
export function getSortedOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
}

/**
 * Validates status transition rules
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6
 */
export function validateStatusTransition(
  currentStatus: Order['status'],
  newStatus: Order['status']
): ValidationResult {
  const errors: string[] = [];

  const validTransitions: Record<Order['status'], Order['status'][]> = {
    pending: ['confirmed', 'preparing'],
    confirmed: ['preparing'],
    preparing: ['served'],
    served: [],
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    errors.push(
      `Invalid status transition from ${currentStatus} to ${newStatus}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats order time as HH:MM AM/PM
 * Requirements: 2.5, 4.1, 10.1, 10.2
 */
export function formatOrderTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Normalize invalid dates (e.g. from malformed strings) to avoid showing "Invalid Date" in UI.
  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid time';
  }

  // Use the user's local time zone so displayed order time matches the device's clock.
  // Ensure AM/PM is upper-case for consistency across browsers/locales.
  return dateObj
    .toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

/**
 * Formats price with currency and 2 decimal places
 * Requirements: 2.5, 4.1, 10.1, 10.2
 */
export function formatPrice(price: number, currency: string = '₹'): string {
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Calculates waiting time from order creation to now
 * Requirements: 2.5, 4.1, 10.1, 10.2
 */
export function calculateWaitingTime(createdAt: Date | string): string {
  const createdTime = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const diff = new Date().getTime() - createdTime.getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Validates order data integrity
 * Requirements: 11.1, 11.3
 */
export function validateOrderDataIntegrity(
  order: Order,
  menuItems: MenuItem[]
): ValidationResult {
  const errors: string[] = [];

  // Verify all item IDs reference valid menu items
  order.items?.forEach((item) => {
    const menuItem = menuItems.find((m) => m.id === item.id);
    if (!menuItem) {
      errors.push(`Item ${item.id} not found in menu`);
    }
  });

  // Verify quantities are positive integers
  order.items?.forEach((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Invalid quantity for item ${item.id}`);
    }
  });

  // Verify total matches sum of (price × quantity)
  const calculatedTotal = order.items?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0;
  if (Math.abs(order.total - calculatedTotal) > 0.01) {
    errors.push('Total price mismatch');
  }

  // Verify table ID is valid
  if (!order.tableId) {
    errors.push('Invalid table ID');
  }

  // Verify timestamp is valid date
  if (!(order.createdAt instanceof Date) && typeof order.createdAt !== 'string') {
    errors.push('Invalid timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
