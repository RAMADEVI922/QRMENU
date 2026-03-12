import { useRestaurantStore } from '@/store/restaurantStore';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bell, Receipt, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const spring = { type: "spring" as const, duration: 0.4, bounce: 0 };

export default function WaiterPanel() {
  const { orders, updateOrderStatus, notifications, markNotificationRead } = useRestaurantStore();

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleConfirmOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'confirmed');
    toast.success('Order confirmed');
  };

  const handleMarkServed = (orderId: string) => {
    updateOrderStatus(orderId, 'served');
    toast.success('Order marked as served');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Waiter Panel</h1>
            <p className="text-xs text-muted-foreground">Order Management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        {/* Notifications */}
        {unreadNotifications.length > 0 && (
          <div className="space-y-2">
            <h2 className="category-header mb-3">Notifications</h2>
            <AnimatePresence>
              {unreadNotifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={spring}
                  className={`flex items-center justify-between p-3 rounded-xl border border-border ${
                    n.type === 'call_waiter' ? 'bg-warning/5' : n.type === 'request_bill' ? 'bg-primary/5' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {n.type === 'call_waiter' ? <Bell className="h-4 w-4 text-warning" /> :
                     n.type === 'request_bill' ? <Receipt className="h-4 w-4 text-primary" /> :
                     <UtensilsCrossed className="h-4 w-4 text-foreground" />}
                    <span className="text-sm font-medium">{n.message}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>
                    Dismiss
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pending Orders */}
        <div>
          <h2 className="category-header mb-3">Pending Orders ({pendingOrders.length})</h2>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending orders</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="border border-border rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground font-mono">{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      <span className="text-xs text-warning font-medium">Pending</span>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="tabular-nums text-muted-foreground">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <hr className="border-border my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">₹{order.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => handleConfirmOrder(order.id)}>
                    <Check className="h-4 w-4 mr-1" /> Confirm Order
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Orders */}
        <div>
          <h2 className="category-header mb-3">Active Orders ({confirmedOrders.length})</h2>
          {confirmedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No active orders</p>
          ) : (
            <div className="space-y-3">
              {confirmedOrders.map((order) => (
                <div key={order.id} className="border border-border rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items · ₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{order.status}</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleMarkServed(order.id)}>
                    <UtensilsCrossed className="h-4 w-4 mr-1" /> Mark as Served
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
