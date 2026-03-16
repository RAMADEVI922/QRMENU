import { useEffect, useRef, useState, useCallback } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { fetchOrders, fetchNotifications, type FirebaseOrder, type FirebaseNotification } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bell, Receipt, UtensilsCrossed, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function WaiterPanel() {
  const {
    orders, setOrders, updateOrderStatus, autoAssignWaiter, assignOrderToWaiter,
    notifications, setNotifications, markNotificationRead,
    waiters,
  } = useRestaurantStore();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Which waiter is "me" on this device — persisted in sessionStorage
  const [myWaiterId, setMyWaiterId] = useState<string | null>(
    () => sessionStorage.getItem('myWaiterId')
  );

  const pendingOrders = orders
    .filter((o) => o.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const myActiveOrders = orders.filter(
    (o) => o.assignedWaiterId === myWaiterId && o.status !== 'served' && o.status !== 'pending'
  );

  const unreadNotifications = notifications.filter((n) => !n.read);
  const prevNotificationCount = useRef(unreadNotifications.length);

  useEffect(() => {
    if (unreadNotifications.length > prevNotificationCount.current) {
      const latest = unreadNotifications[0];
      if (latest) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 520;
          osc.type = 'sine';
          gain.gain.value = 0.2;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.18);
        } catch (_) {}
      }
    }
    prevNotificationCount.current = unreadNotifications.length;
  }, [unreadNotifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [firebaseOrders, firebaseNotifs] = await Promise.all([fetchOrders(), fetchNotifications()]);
      setOrders(firebaseOrders.map((o: FirebaseOrder) => ({ ...o, createdAt: new Date(o.createdAt) })));
      setNotifications(firebaseNotifs.map((n: FirebaseNotification) => ({ ...n, createdAt: new Date(n.createdAt) })));
      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message || e}`);
    } finally {
      setRefreshing(false);
    }
  }, [setOrders, setNotifications]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120000);
    return () => clearInterval(interval);
  }, [refresh]);

  const selectWaiter = (id: string) => {
    setMyWaiterId(id);
    sessionStorage.setItem('myWaiterId', id);
  };

  const handleConfirmOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'confirmed');
    // Auto-assign to least-loaded waiter
    const assignedName = autoAssignWaiter(orderId);
    if (assignedName) {
      toast.success(`Order confirmed — assigned to ${assignedName}`);
    } else {
      toast.success('Order confirmed');
    }
  };

  const handleMarkServed = (orderId: string) => {
    updateOrderStatus(orderId, 'served');
    toast.success('Order marked as served');
    const next = pendingOrders[0];
    if (next) toast.info(`Next in queue: Table ${next.tableId}`, { duration: 4000 });
  };

  const handleAssignNext = () => {
    const next = pendingOrders[0];
    if (!next) { toast.info('No pending orders'); return; }
    updateOrderStatus(next.id, 'confirmed');
    if (myWaiterId) {
      assignOrderToWaiter(next.id, myWaiterId);
      toast.success(`Table ${next.tableId} assigned to you`);
    } else {
      const name = autoAssignWaiter(next.id);
      toast.success(`Table ${next.tableId} assigned to ${name || 'a waiter'}`);
    }
  };

  // Waiter selector screen if no waiter chosen
  if (!myWaiterId) {
    const activeWaiters = waiters.filter((w) => w.active);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-2 text-center">Who are you?</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Select your name to see your assigned orders</p>
          <div className="space-y-2">
            {activeWaiters.map((w) => (
              <button
                key={w.id}
                onClick={() => selectWaiter(w.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.email}</p>
                </div>
              </button>
            ))}
            {activeWaiters.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No active waiters. Enable waiters in admin panel.</p>
            )}
          </div>
          <Link to="/" className="block text-center text-xs text-muted-foreground mt-6 hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const me = waiters.find((w) => w.id === myWaiterId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Waiter Panel</h1>
            <p className="text-xs text-muted-foreground">
              {me ? `Logged in as ${me.name}` : ''} · {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
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
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <button
              onClick={() => { setMyWaiterId(null); sessionStorage.removeItem('myWaiterId'); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Switch
            </button>
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
                <div key={n.id} className={`flex items-center justify-between p-3 rounded-xl border border-border ${
                  n.type === 'call_waiter' ? 'bg-warning/5' : n.type === 'request_bill' ? 'bg-primary/5' : 'bg-background'
                }`}>
                  <div className="flex items-center gap-3">
                    {n.type === 'call_waiter' ? <Bell className="h-4 w-4 text-warning" /> :
                     n.type === 'request_bill' ? <Receipt className="h-4 w-4 text-primary" /> :
                     <UtensilsCrossed className="h-4 w-4 text-foreground" />}
                    <span className="text-sm font-medium">{n.message}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>Dismiss</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Assigned Orders */}
        <div>
          <h2 className="category-header mb-3">My Tables ({myActiveOrders.length})</h2>
          {myActiveOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No tables assigned to you</p>
          ) : (
            <div className="space-y-3">
              {myActiveOrders.map((order) => (
                <div key={order.id} className="border border-primary/30 bg-primary/5 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items · ₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>{order.status}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="tabular-nums text-muted-foreground">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleMarkServed(order.id)}>
                    <UtensilsCrossed className="h-4 w-4 mr-1" /> Mark as Served
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="category-header">Pending Orders ({pendingOrders.length})</h2>
            {pendingOrders.length > 0 && (
              <Button size="sm" onClick={handleAssignNext} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Take Next
              </Button>
            )}
          </div>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending orders</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order, idx) => (
                <div key={order.id} className={`border rounded-xl p-4 ${idx === 0 ? 'border-red-300 bg-red-50/50' : 'border-border'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        #{idx + 1}{idx === 0 ? ' NEXT' : ''}
                      </span>
                      <p className="font-semibold">Table {order.tableId}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-warning">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m ago
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
                    <div className="flex justify-between font-semibold text-sm">
                      <span>Total</span>
                      <span>₹{order.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => handleConfirmOrder(order.id)}>
                    <Check className="h-4 w-4 mr-1" /> Confirm & Auto-Assign
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
