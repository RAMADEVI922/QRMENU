import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantStore } from '@/store/restaurantStore';
import {
  fetchOrders, fetchNotifications, upsertNotification,
  type FirebaseOrder, type FirebaseNotification,
} from '@/lib/firebaseService';
import { sendBillEmail } from '@/lib/emailService';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bell, Receipt, UtensilsCrossed, RefreshCw, LogOut, ChefHat, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function useWaiterGuard() {
  const navigate = useNavigate();
  const waiterId = sessionStorage.getItem('myWaiterId');
  const waiterName = sessionStorage.getItem('myWaiterName');
  useEffect(() => {
    if (!waiterId) navigate('/waiter-login', { replace: true });
  }, [waiterId, navigate]);
  return { waiterId, waiterName };
}

// Vacate confirmation dialog
function VacateDialog({ tableId, onConfirm, onCancel }: { tableId: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="h-7 w-7 text-orange-500" />
          </div>
          <h2 className="text-lg font-extrabold">Table {tableId} Served</h2>
          <p className="text-sm text-muted-foreground mt-1">Has the customer vacated the table?</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Not Yet</Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={onConfirm}>
            Table Vacated
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WaiterPanel() {
  const { waiterId, waiterName } = useWaiterGuard();
  const navigate = useNavigate();

  const {
    orders, setOrders, updateOrderStatus, autoAssignWaiter,
    notifications, setNotifications, markNotificationRead,
    vacateTable,
  } = useRestaurantStore();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sendingMsg, setSendingMsg] = useState<string | null>(null);
  const [vacateTarget, setVacateTarget] = useState<{ orderId: string; tableId: string } | null>(null);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({});

  const pendingOrders = orders
    .filter((o) => o.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const myActiveOrders = orders.filter(
    (o) => o.assignedWaiterId === waiterId && (o.status === 'confirmed' || o.status === 'preparing')
  );

  const unreadNotifications = notifications.filter((n) => !n.read);
  const prevCount = useRef(unreadNotifications.length);

  useEffect(() => {
    if (unreadNotifications.length > prevCount.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 520; osc.type = 'sine'; gain.gain.value = 0.2;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
      } catch (_) {}
    }
    prevCount.current = unreadNotifications.length;
  }, [unreadNotifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [fbOrders, fbNotifs] = await Promise.all([fetchOrders(), fetchNotifications()]);
      setOrders(fbOrders.map((o: FirebaseOrder) => ({ ...o, createdAt: new Date(o.createdAt) })));
      setNotifications(fbNotifs.map((n: FirebaseNotification) => ({ ...n, createdAt: new Date(n.createdAt) })));
      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [setOrders, setNotifications]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleConfirm = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    updateOrderStatus(orderId, 'confirmed');
    const name = autoAssignWaiter(orderId);
    toast.success(name ? `Order confirmed — assigned to ${name}` : 'Order confirmed');
    if (order) {
      try {
        await upsertNotification({
          id: `N${order.tableId}_confirmed_${Date.now()}`,
          tableId: order.tableId,
          type: 'order',
          message: `✅ Your order has been confirmed! We're preparing it now.`,
          read: false,
          createdAt: Date.now(),
        });
      } catch (_) {}
    }
  };

  const handleServed = (orderId: string, tableId: string) => {
    updateOrderStatus(orderId, 'served');
    toast.success('Order marked as served');
    setVacateTarget({ orderId, tableId });
  };

  const handleVacateConfirm = async () => {
    if (!vacateTarget) return;
    vacateTable(vacateTarget.tableId);
    try {
      await upsertNotification({
        id: `N${vacateTarget.tableId}_vacated_${Date.now()}`,
        tableId: vacateTarget.tableId,
        type: 'order',
        message: `🙏 Thank you for dining with us! Table ${vacateTarget.tableId} is now available.`,
        read: false,
        createdAt: Date.now(),
      });
    } catch (_) {}
    toast.success(`Table ${vacateTarget.tableId} is now available`);
    setVacateTarget(null);
  };

  const handleOrderComing = async (order: typeof orders[0], mins?: number) => {
    setSendingMsg(order.id);
    try {
      const msg = mins
        ? `🕐 Your order will arrive in about ${mins} minutes! Table ${order.tableId}`
        : `🍽️ Your order is on its way! Table ${order.tableId}`;
      await upsertNotification({
        id: `N${order.tableId}_oc_${Date.now()}`,
        tableId: order.tableId,
        type: 'order',
        message: msg,
        read: false,
        createdAt: Date.now(),
      });
      toast.success(mins ? `Notified Table ${order.tableId} — arriving in ${mins} mins` : `Notified Table ${order.tableId}`);
    } catch (e: any) {
      toast.error(`Failed to notify: ${e?.message}`);
    } finally {
      setSendingMsg(null);
    }
  };

  const handleSendEmail = async (order: typeof orders[0]) => {
    const email = emailInputs[order.id];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email'); return;
    }
    setSendingEmail(order.id);
    try {
      await sendBillEmail({
        toEmail: email,
        tableId: order.tableId,
        orderId: order.id,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod || 'cash',
        orderTime: new Date(order.createdAt).toLocaleString('en-IN'),
      });
      setEmailSent((prev) => ({ ...prev, [order.id]: true }));
      toast.success(`Bill sent to ${email}`);
    } catch (e: any) {
      toast.error(`Email failed: ${e?.message}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('myWaiterId');
    sessionStorage.removeItem('myWaiterName');
    navigate('/waiter-login', { replace: true });
  };

  if (!waiterId) return null;

  return (
    <div className="min-h-screen bg-background">
      {vacateTarget && (
        <VacateDialog
          tableId={vacateTarget.tableId}
          onConfirm={handleVacateConfirm}
          onCancel={() => setVacateTarget(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">{waiterName}</p>
              <p className="text-xs text-muted-foreground">
                {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadNotifications.length > 0 && (
              <div className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '' : 'Refresh'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Alerts */}
        {unreadNotifications.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Alerts</h2>
            {unreadNotifications.map((n) => (
              <div key={n.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                n.type === 'call_waiter' ? 'bg-yellow-50 border-yellow-200' :
                n.type === 'request_bill' ? 'bg-blue-50 border-blue-200' : 'bg-background border-border'
              }`}>
                <div className="flex items-center gap-3">
                  {n.type === 'call_waiter' ? <Bell className="h-4 w-4 text-yellow-600" /> :
                   n.type === 'request_bill' ? <Receipt className="h-4 w-4 text-blue-600" /> :
                   <UtensilsCrossed className="h-4 w-4" />}
                  <span className="text-sm font-medium">{n.message}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>Dismiss</Button>
              </div>
            ))}
          </div>
        )}

        {/* My Active Tables */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            My Tables ({myActiveOrders.length})
          </h2>
          {myActiveOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No tables assigned to you yet.</p>
          ) : (
            <div className="space-y-4">
              {myActiveOrders.map((order) => (
                <div key={order.id} className="border border-primary/30 bg-primary/5 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items · ₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>{order.status}</span>
                  </div>

                  <div className="space-y-1 mb-4 text-sm">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="text-muted-foreground">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notify buttons */}
                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      disabled={sendingMsg === order.id} onClick={() => handleOrderComing(order)}>
                      <Bell className="h-3.5 w-3.5" />
                      {sendingMsg === order.id ? 'Sending...' : 'On the Way'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                      disabled={sendingMsg === order.id} onClick={() => handleOrderComing(order, 5)}>
                      <Clock className="h-3.5 w-3.5" /> 5 mins
                    </Button>
                  </div>

                  {/* Email bill to customer */}
                  <div className="mb-3">
                    {emailSent[order.id] ? (
                      <p className="text-xs text-green-600 font-medium text-center py-1">✓ Bill emailed to customer</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Customer email (optional)"
                          value={emailInputs[order.id] || ''}
                          onChange={(e) => setEmailInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="flex-1 border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                        <Button size="sm" variant="outline" className="gap-1 shrink-0"
                          disabled={sendingEmail === order.id || !emailInputs[order.id]}
                          onClick={() => handleSendEmail(order)}>
                          {sendingEmail === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Email Bill
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Mark Served */}
                  <Button size="sm" className="w-full gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => handleServed(order.id, order.tableId)}>
                    <UtensilsCrossed className="h-3.5 w-3.5" /> Mark as Served
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Queue */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Pending Orders ({pendingOrders.length})
          </h2>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No pending orders.</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order, idx) => (
                <div key={order.id} className={`border rounded-2xl p-4 ${idx === 0 ? 'border-red-300 bg-red-50/40' : 'border-border'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        #{idx + 1}{idx === 0 ? ' NEXT' : ''}
                      </span>
                      <p className="font-bold">Table {order.tableId}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-orange-500">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m ago
                    </div>
                  </div>
                  <div className="space-y-1 mb-4 text-sm">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="text-muted-foreground">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span>Total</span><span>₹{order.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full gap-1.5 mb-2" onClick={() => handleConfirm(order.id)}>
                    <Check className="h-4 w-4" /> Accept Order
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      disabled={sendingMsg === order.id} onClick={() => handleOrderComing(order)}>
                      <Bell className="h-3.5 w-3.5" />
                      {sendingMsg === order.id ? '...' : 'On the Way'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                      disabled={sendingMsg === order.id} onClick={() => handleOrderComing(order, 5)}>
                      <Clock className="h-3.5 w-3.5" /> 5 mins
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
