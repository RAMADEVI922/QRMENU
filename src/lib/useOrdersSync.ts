// No real-time listeners — orders are written to Firestore by the customer
// and fetched on-demand by the waiter panel's refresh button.
// This file is kept for backward compatibility but does nothing now.

export function useOrdersSync() {
  // intentionally empty — no onSnapshot to avoid quota exhaustion
}

export function useSyncOrderStatus(_orderId: string, _status: string) {
  // intentionally empty
}
