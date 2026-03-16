import { useEffect, useRef, useState, useCallback } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { fetchOrders, fetchNotifications, type FirebaseOrder, type FirebaseNotification } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bell, Receipt, UtensilsCrossed, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function WaiterPanel() {
  const { orders, setOrders, updateOrderStatus, notifications, setNotifications, markNotificationRead } = useRestaurantStore();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
  const unreadNotifications = notifications.filter((n) => !n.read);

  const prevNotificationCount = useRef(unreadNotifications.length);

  // Play a beep when new notifications arrive
  useEffect(() => {
    if (unreadNotifications.length > prevNotificationCount.current) {
      const latest = unreadNotifications[0];
      if (latest) {
        try {
          const tableNum = Number(latest.tableId.replace(/\D/g, '')) || 1;
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 440 + (tableNum - 1) * 50;
          osc.type = 'sine';
          gain.gain.value = 0.2;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.18);
        } catch (_) { /* audio not available */ }
      }
    }
    prevNotificationCount.current = unreadNotifications.length;
  }, [unreadNotifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [firebaseOrders, firebaseNotifs] = await Promise.all([
        fetchOrders(),
        fetchNotifications(),
      ]);
      const convertedOrders = firebaseOrders.map((o: FirebaseOrder) => ({
        ...o,
        createdAt: new Date(o.createdAt),
      }));
      setOrders(convertedOrders);

      const convertedNotifs = firebaseNotifs.map((n: FirebaseNotification) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
      setNotifications(convertedNotifs);
      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message || e}`);
    } finally {
      setRefreshing(false);
    }
  }, [setOrders, setNotifications]);

  // Auto-refresh on mount and every 30 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120000); // 2 minutes to conserve Firestore quota
    return () => clearInterval(interval);
  }, [refresh]);

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
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Waiter Panel</h1>
            <p className="text-xs text-muted-foreground">
              {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
            </p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        {/* Notifications */}
        {unreadNotifications.length > 0 && (
          <div className="space-y-2">
            <h2 className="category-header mb-3">Notifications</h2>
            <div className="space-y-2">
              {unreadNotifications.map((n) => (
                <div
                  key={n.id}
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
                </div>
              ))}
            </div>
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
