# Orders Queue (FIFO) - Design Document

## System Architecture

### Component Structure
```
AdminPanel
├── Sidebar (existing)
├── DashboardView (existing)
├── MenuManagement (existing)
├── TableManagement (existing)
├── OrdersQueue (NEW)
│   ├── OrdersQueueHeader
│   ├── OrdersQueueTable
│   │   ├── OrderRow (for each order)
│   │   └── StatusButton
│   ├── CompletedOrdersSection (optional)
│   └── OrdersQueueStats
├── WaiterManagement (existing)
└── BillManagement (existing)
```

### Navigation Update
```
Admin Dashboard Tabs:
- Dashboard
- Menu
- Tables
- Orders Queue (NEW)
- Waiters
- Bills
```

## Data Flow

### Order Placement to Queue Display
```
Customer Places Order
    ↓
Order saved to Zustand store (orders array)
    ↓
Notification created
    ↓
OrdersQueue component subscribes to store
    ↓
Component detects new order
    ↓
Order appears in queue (FIFO sorted)
    ↓
Real-time update (no refresh needed)
```

### Status Update Flow
```
Kitchen staff clicks status button
    ↓
Status changes (Pending → Preparing → Served → Completed)
    ↓
updateOrderStatus() called in store
    ↓
Order object updated in store
    ↓
All subscribed components re-render
    ↓
OrdersQueue displays updated status
    ↓
CustomerMenu shows updated status
    ↓
AdminPanel Dashboard updates stats
```

## Store Integration

### Existing Order Interface (No changes needed)
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

### Store Methods (Already exist)
```typescript
// Get all orders
orders: Order[]

// Update order status
updateOrderStatus(id: string, status: Order['status']): void

// Get pending orders
getPendingOrders(): Order[]

// Get completed orders
getCompletedOrders(): Order[]
```

### New Computed Properties
```typescript
// Get orders sorted by time (FIFO)
getOrdersQueue(): Order[] {
  return orders
    .filter(o => o.status !== 'served')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

// Get completed orders
getCompletedOrders(): Order[] {
  return orders
    .filter(o => o.status === 'served')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Get orders by status
getOrdersByStatus(status: Order['status']): Order[] {
  return orders.filter(o => o.status === status)
}
```

## UI Design

### Orders Queue Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ Orders Queue                                             │
├─────────────────────────────────────────────────────────┤
│ [Filter: All] [Pending] [Preparing] [Served]            │
├─────────────────────────────────────────────────────────┤
│ Table │ Items              │ Qty │ Time    │ Status      │
├─────────────────────────────────────────────────────────┤
│ T5    │ Butter Chicken     │ 2   │ 2:30 PM │ [Pending]   │
│       │ Garlic Naan        │ 1   │         │             │
├─────────────────────────────────────────────────────────┤
│ T3    │ Caesar Salad       │ 1   │ 2:28 PM │ [Preparing] │
│       │ Mango Lassi        │ 2   │         │             │
├─────────────────────────────────────────────────────────┤
│ T1    │ Grilled Salmon     │ 1   │ 2:25 PM │ [Served]    │
│       │ French Fries       │ 1   │         │             │
└─────────────────────────────────────────────────────────┘
```

### Order Card Layout (Mobile)
```
┌──────────────────────────────┐
│ Table 5                      │
│ ─────────────────────────────│
│ 2x Butter Chicken            │
│ 1x Garlic Naan               │
│ ─────────────────────────────│
│ Order Time: 2:30 PM          │
│ Waiting: 5 minutes           │
│ ─────────────────────────────│
│ [Pending ▼]                  │
└──────────────────────────────┘
```

### Status Button States
```
Pending (Gray)
    ↓ Click
Preparing (Orange)
    ↓ Click
Served (Green)
    ↓ Click
Completed (Blue/Hidden)
```

## Component Specifications

### OrdersQueue Component
**Location:** `src/components/admin/OrdersQueue.tsx`

**Props:** None (subscribes to Zustand store)

**State:**
- selectedFilter: 'all' | 'pending' | 'preparing' | 'served'
- sortBy: 'time' | 'table'

**Methods:**
- handleStatusChange(orderId, newStatus)
- handleFilterChange(filter)
- handleSortChange(sortBy)
- formatOrderTime(timestamp)
- calculateWaitingTime(createdAt)

**Renders:**
- Header with filters
- Orders table/cards
- Completed orders section
- Statistics

### OrderRow Component
**Props:**
- order: Order
- onStatusChange: (orderId, status) => void

**Renders:**
- Table number
- Items list
- Quantities
- Order time
- Waiting time
- Status button

### StatusButton Component
**Props:**
- currentStatus: Order['status']
- orderId: string
- onStatusChange: (orderId, status) => void

**Behavior:**
- Dropdown menu with valid next statuses
- Color-coded by status
- Disabled if no valid transitions
- Shows confirmation on click

## Sorting & Filtering Logic

### FIFO Sorting
```typescript
const sortedOrders = orders
  .filter(o => o.status !== 'served')
  .sort((a, b) => {
    // Oldest orders first
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
```

### Status Filtering
```typescript
const filteredOrders = sortedOrders.filter(o => {
  if (selectedFilter === 'all') return true
  return o.status === selectedFilter
})
```

### Time Calculation
```typescript
const waitingTime = Date.now() - order.createdAt.getTime()
const minutes = Math.floor(waitingTime / 60000)
const display = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
```

## Real-Time Updates

### Subscription Pattern
```typescript
useEffect(() => {
  // Subscribe to store changes
  const unsubscribe = useRestaurantStore.subscribe(
    (state) => state.orders,
    (orders) => {
      // Re-sort and filter orders
      const queue = getOrdersQueue(orders)
      setDisplayedOrders(queue)
    }
  )
  
  return unsubscribe
}, [])
```

### Status Update Handler
```typescript
const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
  updateOrderStatus(orderId, newStatus)
  // Store update triggers re-render automatically
  toast.success(`Order ${orderId} marked as ${newStatus}`)
}
```

## Performance Optimizations

### Memoization
```typescript
const OrderRow = React.memo(({ order, onStatusChange }) => {
  // Prevents unnecessary re-renders
})

const StatusButton = React.memo(({ currentStatus, orderId, onStatusChange }) => {
  // Prevents unnecessary re-renders
})
```

### Virtual Scrolling (Optional)
- For lists with 50+ orders
- Use react-window or similar
- Improves performance significantly

### Pagination (Optional)
- Show 10-20 orders per page
- Load more button
- Reduces DOM nodes

## Accessibility

### Color Coding
- Pending: Gray (#6B7280)
- Preparing: Orange (#F59E0B)
- Served: Green (#10B981)
- Completed: Blue (#3B82F6)

### ARIA Labels
```html
<button aria-label="Change order status from Pending to Preparing">
  Pending ▼
</button>
```

### Keyboard Navigation
- Tab through orders
- Enter to open status menu
- Arrow keys to select status
- Escape to close menu

## Mobile Responsiveness

### Breakpoints
- Mobile: < 640px (card layout)
- Tablet: 640px - 1024px (2-column layout)
- Desktop: > 1024px (table layout)

### Touch Optimization
- Large buttons (48px minimum)
- Adequate spacing between elements
- Swipe gestures for status change (optional)

## Error Handling

### Scenarios
- Order update fails: Show error toast, revert UI
- Store unavailable: Show offline message
- Invalid status transition: Disable button
- Network error: Retry with exponential backoff

## Integration Points

### With Admin Dashboard
- Add "Orders Queue" tab to navItems
- Update activeTab type to include 'orders-queue'
- Add conditional render in AdminPanel

### With Zustand Store
- Use existing orders array
- Use existing updateOrderStatus method
- Subscribe to store changes

### With Notifications
- Show toast when status changes
- Show alert for new orders (optional)
- Sound notification (optional)
