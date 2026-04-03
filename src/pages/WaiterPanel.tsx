import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantStore } from '@/store/restaurantStore';
import {
  fetchOrders, fetchNotifications, upsertNotification, upsertOrder,
  fetchWaiters,
  type FirebaseOrder, type FirebaseNotification,
} from '@/lib/firebaseService';
import { sendBillEmail } from '@/lib/emailService';
import { computePriority } from '@/lib/aiPriority';
import { Button } from '@/components/ui/button';
import {
  Check, Clock, Bell, Receipt, UtensilsCrossed, RefreshCw, LogOut,
  ChefHat, Mail, Loader2, ShoppingBag, CheckCircle2, Utensils,
  UserCheck, UserX, Zap, Star, Flame, LayoutGrid, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order Placed',    sub: 'Waiting for confirmation',   icon: <ShoppingBag className="h-4 w-4" /> },
  { key: 'confirmed', label: 'Confirmed',        sub: 'Kitchen accepted',           icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'preparing', label: 'Preparing',        sub: 'Chef is cooking',            icon: <ChefHat className="h-4 w-4" /> },
  { key: 'served',    label: 'Ready to Serve',   sub: 'Food is ready — deliver it', icon: <Utensils className="h-4 w-4" /> },
  { key: 'delivered', label: 'Delivered',        sub: 'Tap to complete & free table', icon: <Check className="h-4 w-4" /> },
] as const;

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'served' | 'delivered';

function stepIndex(status: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

// ── Inline Kitchen Kanban ─────────────────────────────────────────────────────
type ColStatus = 'pending' | 'confirmed' | 'preparing' | 'served';
const KITCHEN_COLS: { key: ColStatus; label: string; icon: React.ReactNode; bg: string; border: string }[] = [
  { key: 'pending',   label: 'New',       icon: <ShoppingBag className="h-3.5 w-3.5" />,  bg: 'bg-red-50',    border: 'border-red-200' },
  { key: 'confirmed', label: 'Confirmed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: 'bg-blue-50',   border: 'border-blue-200' },
  { key: 'preparing', label: 'Cooking',   icon: <Flame className="h-3.5 w-3.5" />,        bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'served',    label: 'Ready',     icon: <Utensils className="h-3.5 w-3.5" />,     bg: 'bg-green-50',  border: 'border-green-200' },
];

function elapsedMins(createdAt: Date | string) {
  const m = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return m < 1 ? 'just now' : `${m}m ago`;
}

function useWaiterGuard() {
  const navigate = useNavigate();
  const waiterId = sessionStorage.getItem('myWaiterId');
  const waiterName = sessionStorage.getItem('myWaiterName');
  useEffect(() => {
    if (!waiterId) navigate('/waiter-login', { replace: true });
  }, [waiterId, navigate]);
  return { waiterId, waiterName };
}

export default function WaiterPanel() {
  const { waiterId, waiterName } = useWaiterGuard();
  const navigate = useNavigate();

  const {
    orders, setOrders, updateOrderStatus, autoAssignWaiter,
    notifications, setNotifications, markNotificationRead,
    vacateTable, setWaiters,
  } = useRestaurantStore();

  // Load waiters from Firestore on mount
  useEffect(() => {
    fetchWaiters().then((fbWaiters) => {
      if (fbWaiters.length > 0) setWaiters(fbWaiters);
    }).catch(() => {});
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sendingMsg, setSendingMsg] = useState<string | null>(null);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({});
  const [snoozedOrders, setSnoozedOrders] = useState<Set<string>>(new Set());
  const [kitchenOpen, setKitchenOpen] = useState(false);

  const pendingOrders = (() => {
    const pending = orders.filter((o) => o.status === 'pending' && !snoozedOrders.has(o.id));
    const latestPerTable = new Map<string, typeof orders[0]>();
    for (const o of pending) {
      const existing = latestPerTable.get(o.tableId);
      if (!existing || new Date(o.createdAt) > new Date(existing.createdAt)) {
        latestPerTable.set(o.tableId, o);
      }
    }
    // Sort by AI priority score (highest first)
    return Array.from(latestPerTable.values())
      .map((o) => ({ ...o, priority: computePriority(o) }))
      .sort((a, b) => b.priority.score - a.priority.score);
  })();

  const myActiveOrders = (() => {
    const active = orders.filter(
      (o) => o.assignedWaiterId === waiterId &&
        (o.status === 'confirmed' || o.status === 'preparing' || o.status === 'served') &&
        !snoozedOrders.has(o.id)
    );
    const latestPerTable = new Map<string, typeof orders[0]>();
    for (const o of active) {
      const existing = latestPerTable.get(o.tableId);
      if (!existing || new Date(o.createdAt) > new Date(existing.createdAt)) {
        latestPerTable.set(o.tableId, o);
      }
    }
    return Array.from(latestPerTable.values());
  })();

  // Delivered orders — waiter needs to confirm vacate
  const myDeliveredOrders = (() => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const delivered = orders.filter(
      (o) =>
        o.assignedWaiterId === waiterId &&
        o.status === 'delivered' &&
        !snoozedOrders.has(o.id) &&
        now - new Date(o.createdAt).getTime() < TWO_HOURS
    );
    const latestPerTable = new Map<string, typeof orders[0]>();
    for (const o of delivered) {
      const existing = latestPerTable.get(o.tableId);
      if (!existing || new Date(o.createdAt) > new Date(existing.createdAt)) {
        latestPerTable.set(o.tableId, o);
      }
    }
    return Array.from(latestPerTable.values());
  })();

  // Only show actionable alerts — NOT status update notifications (those are for customers)
  const unreadNotifications = notifications.filter(
    (n) => !n.read && (n.type === 'call_waiter' || n.type === 'request_bill' || n.type === 'extra_order' || n.type === 'cash_payment' || n.type === 'feedback')
  );
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
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const now = Date.now();

      // Only keep orders from the last 6 hours — prevents old history from cluttering the panel
      const recentOrders = fbOrders.filter(
        (o) => now - o.createdAt < SIX_HOURS
      );
      const mappedOrders = recentOrders.map((o: FirebaseOrder) => ({ ...o, createdAt: new Date(o.createdAt) }));
      setOrders(mappedOrders);
      setNotifications(fbNotifs.map((n: FirebaseNotification) => ({ ...n, createdAt: new Date(n.createdAt) })));

      // Auto-snooze any delivered or served orders so they never reappear in active views
      const doneIds = mappedOrders
        .filter((o) => o.status === 'served' || o.status === 'delivered')
        .map((o) => o.id);
      if (doneIds.length > 0) {
        setSnoozedOrders((prev) => new Set([...prev, ...doneIds]));
      }

      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [setOrders, setNotifications]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000); // poll every 15s so cash payment alerts appear quickly
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

  const handleServed = async (orderId: string, tableId: string) => {
    // "Ready to Serve" — food is ready in kitchen, waiter needs to physically deliver it
    updateOrderStatus(orderId, 'served');
    toast.success(`Table ${tableId} — food ready, go deliver it!`);
    try {
      await upsertNotification({
        id: `N${tableId}_served_${Date.now()}`,
        tableId,
        type: 'order',
        message: `🍽️ Your food is ready! Waiter is bringing it to you.`,
        read: false,
        createdAt: Date.now(),
      });
    } catch (_) {}
  };

  const handleDelivered = async (orderId: string, tableId: string) => {
    // Terminate the order immediately — free the table, remove from all views
    const order = orders.find((o) => o.id === orderId);
    vacateTable(tableId);
    setSnoozedOrders((prev) => new Set([...prev, orderId]));

    // Write 'delivered' to Firestore so it never comes back into active views on next poll
    if (order) {
      try {
        await upsertOrder({
          ...order,
          status: 'delivered',
          createdAt: new Date(order.createdAt).getTime(),
        } as FirebaseOrder);
      } catch (_) {}
    }

    // Trigger payment popup on customer screen
    try {
      await upsertNotification({
        id: `N${tableId}_delivered_${Date.now()}`,
        tableId,
        type: 'order',
        message: `✅ Your food has been served! Enjoy your meal.`,
        read: false,
        createdAt: Date.now(),
      });
      await upsertNotification({
        id: `N${tableId}_payment_request_${Date.now()}`,
        tableId,
        type: 'payment_request',
        message: `💳 Please complete your payment.`,
        read: false,
        createdAt: Date.now() + 1,
      });
    } catch (_) {}

    toast.success(`Table ${tableId} — order complete, table freed ✓`);
  };

  const handleVacate = async (orderId: string, tableId: string) => {
    vacateTable(tableId);
    setSnoozedOrders((prev) => new Set([...prev, orderId]));
    // Write vacated status to Firestore so all devices see table as available
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      try {
        await upsertOrder({ ...order, status: 'served', createdAt: new Date(order.createdAt).getTime() } as FirebaseOrder);
      } catch (_) {}
    }
    try {
      await upsertNotification({
        id: `N${tableId}_vacated_${Date.now()}`,
        tableId,
        type: 'order',
        message: `🙏 Thank you for dining with us! Hope to see you again soon.`,
        read: false,
        createdAt: Date.now(),
      });
    } catch (_) {}
    toast.success(`Table ${tableId} is now available`);
  };

  const handleStillAtTable = (orderId: string, tableId: string) => {
    setSnoozedOrders((prev) => new Set([...prev, orderId]));
    toast(`Table ${tableId} — keeping order visible`);
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">
          {/* ── Left column: orders ── */}
          <div className="flex-1 min-w-0 space-y-8">

        {/* Alerts */}
        {unreadNotifications.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Alerts</h2>
            {unreadNotifications.map((n) => {
              // For cash_payment: render a rich card with order details from store
              if (n.type === 'cash_payment') {
                const cashOrder = orders.find(
                  (o) => o.tableId === n.tableId && (o.status === 'served' || o.status === 'preparing' || o.status === 'confirmed')
                ) ?? orders.filter((o) => o.tableId === n.tableId).sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                return (
                  <div key={n.id} className="rounded-xl border-2 border-green-400 bg-green-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-green-500 text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💵</span>
                        <div>
                          <p className="font-bold text-sm">Cash Payment — Table {n.tableId}</p>
                          <p className="text-xs text-green-100">Customer wants to pay cash</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-green-600 shrink-0"
                        onClick={() => markNotificationRead(n.id)}>Dismiss</Button>
                    </div>
                    {cashOrder ? (
                      <div className="px-4 py-3 space-y-1">
                        {cashOrder.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm text-green-900">
                            <span>{item.name} <span className="text-green-600">×{item.quantity}</span></span>
                            <span className="font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-green-900 pt-2 border-t border-green-200 text-base">
                          <span>Total to Collect</span>
                          <span>₹{cashOrder.total.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-green-800 whitespace-pre-line">{n.message}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={n.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                  n.type === 'call_waiter' ? 'bg-yellow-50 border-yellow-200' :
                  n.type === 'request_bill' ? 'bg-blue-50 border-blue-200' :
                  n.type === 'feedback' ? 'bg-purple-50 border-purple-200' :
                  'bg-background border-border'
                }`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {n.type === 'call_waiter' ? <Bell className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" /> :
                     n.type === 'request_bill' ? <Receipt className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" /> :
                     n.type === 'feedback' ? <Star className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" /> :
                     <UtensilsCrossed className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span className="text-sm font-medium whitespace-pre-line">{n.message}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 ml-2" onClick={() => markNotificationRead(n.id)}>Dismiss</Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Delivered — Awaiting Vacate */}
        {myDeliveredOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Delivered — Check Table ({myDeliveredOrders.length})
            </h2>
            <div className="space-y-4">
              {myDeliveredOrders.map((order) => (
                <div key={order.id} className="border border-green-300 bg-green-50/40 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items · ₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700">✓ Delivered</span>
                      {order.paymentMethod === 'online' && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.paymentStatus === 'paid' ? '✓ Online Paid' : 'Online - Pending'}
                        </span>
                      )}
                      {order.paymentMethod === 'cash' && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">Cash</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-4 text-sm bg-white rounded-xl border border-border p-3">
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

                  <p className="text-sm font-medium text-center text-muted-foreground mb-3">
                    Has the customer left the table?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => handleStillAtTable(order.id, order.tableId)}
                    >
                      <UserCheck className="h-4 w-4" />
                      Still at Table
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleVacate(order.id, order.tableId)}
                    >
                      <UserX className="h-4 w-4" />
                      Table Vacated
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              {myActiveOrders.map((order) => {
                const currentStep = stepIndex(order.status as OrderStatus);

                const handleStepClick = async (stepKey: string) => {
                  const newIdx = stepIndex(stepKey);
                  if (newIdx <= currentStep) return;
                  if (newIdx !== currentStep + 1) return;

                  if (stepKey === 'served') {
                    handleServed(order.id, order.tableId);
                    return;
                  }

                  // Tapping "Delivered" terminates the order immediately
                  if (stepKey === 'delivered') {
                    handleDelivered(order.id, order.tableId);
                    return;
                  }

                  updateOrderStatus(order.id, stepKey as any);
                  toast.success(`Table ${order.tableId} → ${stepKey}`);

                  const msgs: Record<string, string> = {
                    confirmed: `✅ Your order has been confirmed! We're preparing it now.`,
                    preparing: `👨‍🍳 Chef is now preparing your food!`,
                  };
                  try {
                    await upsertNotification({
                      id: `N${order.tableId}_${stepKey}_${Date.now()}`,
                      tableId: order.tableId,
                      type: 'order',
                      message: msgs[stepKey] || `Order status: ${stepKey}`,
                      read: false,
                      createdAt: Date.now(),
                    });
                  } catch (_) {}
                };

                return (
                <div key={order.id} className="border border-primary/30 bg-primary/5 rounded-2xl p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">Table {order.tableId}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items · ₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {order.paymentMethod === 'online' && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.paymentStatus === 'paid' ? '✓ Online Paid' : 'Online - Pending'}
                        </span>
                      )}
                      {order.paymentMethod === 'cash' && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">Cash</span>
                      )}
                    </div>
                  </div>

                  {/* Status stepper */}
                  <div className="bg-white rounded-xl border border-border p-3 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Update Status</p>
                    <div className="relative">
                      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                      <div
                        className="absolute left-4 top-4 w-0.5 bg-primary transition-all duration-500"
                        style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                      <div className="space-y-3">
                        {STATUS_STEPS.map((step, i) => {
                          const done = i < currentStep;
                          const active = i === currentStep;
                          const isNext = i === currentStep + 1;
                          const future = i > currentStep;
                          return (
                            <button
                              key={step.key}
                              disabled={!isNext}
                              onClick={() => handleStepClick(step.key as OrderStatus)}
                              className={`relative z-10 w-full flex items-center gap-3 text-left rounded-lg px-2 py-1.5 transition-all ${
                                isNext ? 'hover:bg-primary/10 cursor-pointer ring-1 ring-primary/30' : 'cursor-default'
                              }`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-all ${
                                done   ? 'bg-primary border-primary text-white' :
                                active ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' :
                                isNext ? 'bg-background border-primary/50 text-primary' :
                                         'bg-background border-border text-muted-foreground'
                              }`}>
                                {done ? <Check className="h-4 w-4" /> : step.icon}
                              </div>
                              <div className={`flex-1 ${future && !isNext ? 'opacity-40' : ''}`}>
                                <p className={`text-sm font-semibold ${active ? 'text-primary' : ''}`}>
                                  {step.label}
                                  {active && <span className="ml-2 text-xs font-normal text-primary">● Now</span>}
                                  {isNext && <span className="ml-2 text-xs font-normal text-muted-foreground">← tap to advance</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">{step.sub}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Confirm Delivery — appears when food is ready to physically hand over */}
                  {order.status === 'served' && (
                    <div className="mb-4 p-3 rounded-xl bg-green-50 border-2 border-green-400">
                      <p className="text-sm font-semibold text-green-800 mb-2 text-center">
                        🍽️ Food is ready — did you deliver it?
                      </p>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => handleDelivered(order.id, order.tableId)}
                      >
                        <Check className="h-4 w-4" />
                        Confirm Delivery to Table
                      </Button>
                    </div>
                  )}

                  {/* Items */}
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

                  {/* Email bill */}
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
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Queue */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            New Orders
            {pendingOrders.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </h2>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No pending orders.</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order, idx) => (
                <div key={order.id} className={`border rounded-2xl p-4 ${
                  order.priority.label === 'URGENT' ? 'border-red-400 bg-red-50/60' :
                  order.priority.label === 'HIGH' ? 'border-orange-300 bg-orange-50/40' :
                  'border-border'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.priority.color}`}>
                        {order.priority.label}
                      </span>
                      <p className="font-bold">Table {order.tableId}</p>
                      {order.priority.reasons.length > 0 && (
                        <span className="text-xs text-muted-foreground">· {order.priority.reasons[0]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-orange-500 shrink-0">
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
        </div>{/* end left column */}

          {/* ── Right column: Kitchen Dashboard always open ── */}
          <div className="w-80 shrink-0 hidden lg:block">
            <div className="rounded-2xl border border-gray-200 overflow-hidden sticky top-20">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white">
                <LayoutGrid className="h-4 w-4 text-orange-400" />
                <span className="font-bold text-sm">Kitchen Dashboard</span>
                <span className="text-xs text-gray-400 ml-1">
                  · {orders.filter((o) => !snoozedOrders.has(o.id) && (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing')).length} active
                </span>
              </div>
              <div className="bg-gray-950 p-3">
                <div className="grid grid-cols-2 gap-2">
                  {KITCHEN_COLS.map((col) => {
                    const colOrders = orders
                      .filter((o) => o.status === col.key && !snoozedOrders.has(o.id))
                      .map((o) => ({ ...o, priority: computePriority(o) }))
                      .sort((a, b) => b.priority.score - a.priority.score);
                    return (
                      <div key={col.key} className="flex flex-col gap-1.5">
                        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${col.bg} ${col.border} border`}>
                          <div className="flex items-center gap-1.5 text-gray-800">
                            {col.icon}
                            <span className="font-bold text-xs">{col.label}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full text-gray-700">{colOrders.length}</span>
                        </div>
                        {colOrders.length === 0 && <p className="text-center text-gray-600 text-[10px] py-3">Empty</p>}
                        {colOrders.map((order) => (
                          <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg p-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs text-white">Table {order.tableId}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${order.priority.color}`}>{order.priority.label}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock className="h-2.5 w-2.5" />{elapsedMins(order.createdAt)}
                            </div>
                            <div className="space-y-0.5">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-[10px] text-gray-300">
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-gray-500 ml-1 shrink-0">×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            {col.key !== 'served' && (
                              <button
                                onClick={() => {
                                  const next: Record<string, string> = { pending: 'confirmed', confirmed: 'preparing', preparing: 'served' };
                                  const nextStatus = next[col.key];
                                  updateOrderStatus(order.id, nextStatus as any);
                                  if (nextStatus === 'served') setSnoozedOrders((prev) => new Set([...prev, order.id]));
                                }}
                                className="w-full text-[10px] py-1 rounded bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 font-semibold transition-all"
                              >
                                {col.key === 'pending' ? '✓ Confirm' : col.key === 'confirmed' ? '🔥 Cook' : '✅ Ready'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>{/* end flex row */}
      </div>
    </div>
  );
}
