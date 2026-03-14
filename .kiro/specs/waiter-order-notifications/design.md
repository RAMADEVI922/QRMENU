# Waiter Order Notifications - Design Document

## System Architecture

### Component Structure
```
App
├── CustomerMenu (existing)
│   ├── MenuItemCard
│   ├── CartSheet
│   └── [Order Confirmation Logic]
├── WaiterPanel (existing)
│   ├── IncomingOrders (new)
│   ├── OrderCard (new)
│   └── CompletedOrders (new)
└── AdminPanel (existing)
    └── Dashboard (show order stats)
```

### Data Flow
```
Customer Places Order
    ↓
Order saved to Zustand Store
    ↓
Notification added to Store
    ↓
WaiterPanel subscribes to Store updates
    ↓
Waiter sees new order in real-time
    ↓
Waiter accepts/marks as served
    ↓
Order status updates in Store
    ↓
Customer menu reflects status change
```

## Store Updates (Zustand)

### Existing Order Interface (Update)
```typescript
interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'served';
  total: number;
  createdAt: Date;
  readyAt: number;
}
```

### New Store Methods
```typescript
// Update order status
updateOrderStatus(id: string, status: Order['status']): void

// Get pending orders
getPendingOrders(): Order[]

// Get orders by table
getOrdersByTable(tableId: string): Order[]

// Get completed orders
getCompletedOrders(): Order[]
```

### Notification System (Existing)
```typescript
interface Notification {
  id: string;
  tableId: string;
  type: 'order' | 'call_waiter' | 'request_bill';
  message: string;
  read: boolean;
  createdAt: Date;
}
```

## UI Components

### 1. Customer Menu - Order Confirmation
**Location:** `src/pages/CustomerMenu.tsx`

**Changes:**
- Add success toast when order is placed
- Show confirmation message
- Display order status indicator
- Clear cart after order

**UI Elements:**
- Confirmation toast: "Your order has been successfully placed. A waiter will serve you shortly."
- Status badge showing current order status
- Estimated wait time display

### 2. Waiter Panel - Incoming Orders
**Location:** `src/pages/WaiterPanel.tsx` (new section)

**Components:**
- `IncomingOrders` section showing pending orders
- `OrderCard` component for each order
- Order details display
- Action buttons (Accept, Mark as Served)

**UI Elements:**
```
┌─────────────────────────────────┐
│ INCOMING ORDERS                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Table 5                     │ │
│ │ 2x Butter Chicken           │ │
│ │ 1x Garlic Naan              │ │
│ │ Order Time: 2:30 PM         │ │
│ │ [Accept] [Mark as Served]   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 3. Waiter Panel - Completed Orders
**Location:** `src/pages/WaiterPanel.tsx` (new section)

**UI Elements:**
- List of served orders
- Order history
- Timestamps

## Order Confirmation Flow

### Step 1: Customer Confirms Order
```
Customer clicks "Confirm Order"
    ↓
Validate cart is not empty
    ↓
Create Order object with:
  - id: unique ID
  - tableId: from URL params
  - items: from cart
  - status: "pending"
  - createdAt: current timestamp
  - readyAt: current time + (items.length * 15 minutes)
```

### Step 2: Save Order
```
Add order to store.orders array
    ↓
Add notification to store.notifications
    ↓
Clear cart
    ↓
Show success toast
```

### Step 3: Waiter Receives Notification
```
WaiterPanel subscribes to store.orders
    ↓
Detects new pending order
    ↓
Displays in "Incoming Orders" section
    ↓
Shows alert/badge
```

### Step 4: Waiter Actions
```
Waiter clicks "Accept Order"
    ↓
Order status: pending → confirmed
    ↓
Waiter clicks "Mark as Served"
    ↓
Order status: confirmed → served
    ↓
Order moves to "Completed Orders"
```

## State Management

### Order Lifecycle in Store
```
Initial State:
orders: []
notifications: []

After Customer Places Order:
orders: [
  {
    id: "O1234567890",
    tableId: "T5",
    items: [...],
    status: "pending",
    createdAt: Date,
    readyAt: timestamp
  }
]

notifications: [
  {
    id: "N1234567890",
    tableId: "T5",
    type: "order",
    message: "New order from Table 5",
    read: false,
    createdAt: Date
  }
]

After Waiter Accepts:
orders[0].status: "confirmed"

After Waiter Marks Served:
orders[0].status: "served"
```

## Persistence
- Orders persist in localStorage via Zustand persist middleware
- Notifications persist in localStorage
- Data survives page refresh

## Real-Time Updates
- Zustand store updates trigger component re-renders
- WaiterPanel subscribes to store changes
- CustomerMenu subscribes to order status changes
- No polling required (reactive updates)

## Error Handling
- Validate order data before saving
- Handle empty cart scenario
- Show error toast if order fails
- Graceful degradation if store unavailable

## Accessibility
- Large buttons for touch interaction
- Clear color contrasts
- Semantic HTML
- ARIA labels for status indicators
- Keyboard navigation support
