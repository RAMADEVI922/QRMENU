# Waiter Order Notifications - Implementation Tasks

## Phase 1: Store Updates

- [ ] 1.1 Update Order interface with all required fields
- [ ] 1.2 Add store methods: updateOrderStatus, getPendingOrders, getOrdersByTable, getCompletedOrders
- [ ] 1.3 Ensure orders persist in localStorage via Zustand middleware
- [ ] 1.4 Test store updates and persistence

## Phase 2: Customer Menu - Order Confirmation

- [ ] 2.1 Update placeOrder function to capture all order details
- [ ] 2.2 Add success toast message: "Your order has been successfully placed. A waiter will serve you shortly."
- [ ] 2.3 Add order status indicator badge to menu header
- [ ] 2.4 Display estimated wait time based on item count
- [ ] 2.5 Clear cart after successful order placement
- [ ] 2.6 Test order placement flow end-to-end

## Phase 3: Waiter Panel - Incoming Orders Section

- [ ] 3.1 Create IncomingOrders component to display pending orders
- [ ] 3.2 Create OrderCard component showing:
  - [ ] 3.2.1 Table number
  - [ ] 3.2.2 Ordered items with quantities
  - [ ] 3.2.3 Order time
  - [ ] 3.2.4 Order total
- [ ] 3.3 Add "Accept Order" button (changes status to confirmed)
- [ ] 3.4 Add "Mark as Served" button (changes status to served)
- [ ] 3.5 Style with mobile-friendly layout
- [ ] 3.6 Test order card display and interactions

## Phase 4: Waiter Panel - Completed Orders Section

- [ ] 4.1 Create CompletedOrders component
- [ ] 4.2 Display served orders with timestamps
- [ ] 4.3 Show order history
- [ ] 4.4 Add clear/archive functionality (optional)
- [ ] 4.5 Test completed orders display

## Phase 5: Real-Time Updates

- [ ] 5.1 Subscribe WaiterPanel to store.orders changes
- [ ] 5.2 Subscribe CustomerMenu to order status changes
- [ ] 5.3 Test real-time updates without page refresh
- [ ] 5.4 Verify notifications appear instantly

## Phase 6: Notifications

- [ ] 6.1 Add notification when order is placed
- [ ] 6.2 Add notification when order is accepted
- [ ] 6.3 Add notification when order is served
- [ ] 6.4 Display notifications in WaiterPanel
- [ ] 6.5 Test notification flow

## Phase 7: Admin Dashboard Updates

- [ ] 7.1 Add pending orders count to dashboard
- [ ] 7.2 Add recent orders list to dashboard
- [ ] 7.3 Add order statistics (total orders, revenue)
- [ ] 7.4 Test dashboard updates

## Phase 8: Testing & Polish

- [ ] 8.1 Test order placement from customer menu
- [ ] 8.2 Test waiter receives notification
- [ ] 8.3 Test waiter can accept order
- [ ] 8.4 Test waiter can mark as served
- [ ] 8.5 Test order status updates on customer menu
- [ ] 8.6 Test data persistence on page refresh
- [ ] 8.7 Test with multiple tables simultaneously
- [ ] 8.8 Test error scenarios
- [ ] 8.9 Verify mobile responsiveness
- [ ] 8.10 Performance testing

## Phase 9: Deployment

- [ ] 9.1 Commit changes to GitHub
- [ ] 9.2 Verify GitHub Actions deployment
- [ ] 9.3 Test on GitHub Pages
- [ ] 9.4 Verify all features work in production

## Correctness Properties (Property-Based Testing)

### Property 1: Order Integrity
**Specification:** Every order placed must have all required fields and be retrievable
```
Given: Customer places order with items
When: Order is saved to store
Then: Order has id, tableId, items, status, createdAt, readyAt
And: Order can be retrieved by id
And: Order persists after page refresh
```

### Property 2: Status Transitions
**Specification:** Order status can only transition in valid sequence
```
Given: Order with status "pending"
When: Waiter accepts order
Then: Status changes to "confirmed"
And: Cannot go back to "pending"
And: Can transition to "served"
```

### Property 3: Notification Delivery
**Specification:** Every order placement creates a notification
```
Given: Customer places order
When: Order is saved
Then: Notification is created
And: Notification appears in WaiterPanel within 1 second
And: Notification contains correct table number
```

### Property 4: Data Consistency
**Specification:** Order data remains consistent across components
```
Given: Order is placed and accepted
When: Customer menu and waiter panel both display order
Then: Both show same order status
And: Both show same items and quantities
And: Both show same table number
```

### Property 5: Cart Clearing
**Specification:** Cart is cleared after successful order
```
Given: Customer has items in cart
When: Customer confirms order
Then: Cart becomes empty
And: Cart count shows 0
And: No items remain in cart
```
