import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRestaurantStore, type Order } from '@/store/restaurantStore';
import { updateOrderStatus as syncOrderStatus, fetchOrders, fetchNotifications, type FirebaseOrder, type FirebaseNotification } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Clock, Users, RefreshCw, Hash, User } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'served';
type FilterType = 'all' | 'pending' | 'served';

function formatOrderTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function calculateWaitingTime(createdAt: Date): string {
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  return `${diffMins} mins ago`;
}

const statusColors: Record<OrderStatus, { bg: string; text: string; label: string; dot: string }> = {
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending',   dot: 'bg-yellow-400' },
  confirmed: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed', dot: 'bg-blue-400' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Preparing', dot: 'bg-orange-400' },
  served:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Served',    dot: 'bg-green-400' },
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed'],
  confirmed: ['preparing'],
  preparing: ['served'],
  served:    [],
};

function StatusButton({ currentStatus, orderId, onStatusChange }: {
  currentStatus: OrderStatus;
  orderId: string;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const nextStatuses = statusTransitions[currentStatus];
  const color = statusColors[currentStatus];

  if (nextStatuses.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
        {color.label}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color.bg} ${color.text} hover:opacity-80 transition`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
        {color.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => { onStatusChange(orderId, status); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${statusColors[status].text}`}
            >
              → {statusColors[status].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QueuePositionBadge({ position }: { position: number }) {
  if (position === 1) return <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">#{position} NEXT</span>;
  if (position === 2) return <span className="text-xs font-bold text-white bg-orange-400 px-2 py-0.5 rounded-full">#{position}</span>;
  return <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">#{position}</span>;
}

function OrderRow({ order, queuePosition, onStatusChange, waiterName }: {
  order: Order;
  queuePosition: number | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  waiterName?: string;
}) {
  const waitingTime = useMemo(() => calculateWaitingTime(order.createdAt), [order.createdAt]);

  return (
    <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
      <td className="px-4 py-4">
        {queuePosition !== null ? <QueuePositionBadge position={queuePosition} /> : '—'}
      </td>
      <td className="px-4 py-4 font-bold text-primary">Table {order.tableId}</td>
      <td className="px-4 py-4">
        <div className="space-y-0.5">
          {order.items.map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-medium">{item.quantity}×</span>
              <span className="text-muted-foreground ml-1.5">{item.name}</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatOrderTime(order.createdAt)}
        </div>
        <div className="text-xs text-muted-foreground/70 mt-0.5">{waitingTime}</div>
      </td>
      <td className="px-4 py-4">
        {waiterName ? (
          <span className="text-xs text-primary font-medium flex items-center gap-1">
            <User className="h-3 w-3" />{waiterName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-4">
        <StatusButton
          currentStatus={order.status as OrderStatus}
          orderId={order.id}
          onStatusChange={onStatusChange}
        />
      </td>
    </tr>
  );
}

export default function OrdersQueue() {
  const orders = useRestaurantStore((state) => state.orders);
  const setOrders = useRestaurantStore((state) => state.setOrders);
  const setNotifications = useRestaurantStore((state) => state.setNotifications);
  const updateOrderStatus = useRestaurantStore((state) => state.updateOrderStatus);
  const waiters = useRestaurantStore((state) => state.waiters);
  const autoAssignWaiter = useRestaurantStore((state) => state.autoAssignWaiter);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [, setTick] = useState(0);

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

  // Tick every minute to update waiting times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // FCFS queue — pending orders sorted oldest first
  const pendingQueue = useMemo(() =>
    orders
      .filter((o) => o.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  );

  const activeOrders = useMemo(() =>
    orders
      .filter((o) => o.status === 'confirmed' || o.status === 'preparing')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  );

  const completedOrders = useMemo(() =>
    orders
      .filter((o) => o.status === 'served')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );

  const avgWaitMins = useMemo(() => {
    if (pendingQueue.length === 0) return 0;
    const total = pendingQueue.reduce((sum, o) =>
      sum + Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000), 0);
    return Math.round(total / pendingQueue.length);
  }, [pendingQueue, /* tick dependency via state */]);

  const displayedOrders = useMemo(() => {
    if (selectedFilter === 'pending') return pendingQueue;
    if (selectedFilter === 'served') return completedOrders;
    // 'all' = pending + active (not served)
    return [...pendingQueue, ...activeOrders];
  }, [selectedFilter, pendingQueue, activeOrders, completedOrders]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    syncOrderStatus(orderId, newStatus).catch((e) => console.warn('Failed to sync status:', e));

    // Auto-assign to least-loaded waiter when confirmed
    if (newStatus === 'confirmed') {
      const name = autoAssignWaiter(orderId);
      toast.success(name ? `Order confirmed — assigned to ${name}` : `Order marked as ${statusColors[newStatus].label}`);
    } else {
      toast.success(`Order marked as ${statusColors[newStatus].label}`);
    }

    // Suggest next when served
    if (newStatus === 'served') {
      const nextOrder = pendingQueue.find((o) => o.id !== orderId);
      if (nextOrder) {
        toast.info(`Next in queue: Table ${nextOrder.tableId}`, { duration: 4000 });
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Orders Queue</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-yellow-700">{pendingQueue.length}</p>
          <p className="text-xs text-yellow-600 font-medium mt-0.5">Pending</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-orange-700">{activeOrders.length}</p>
          <p className="text-xs text-orange-600 font-medium mt-0.5">In Progress</p>
        </div>
        <div className="bg-muted border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-foreground">{avgWaitMins}m</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Avg Wait</p>
        </div>
      </div>

      {/* Waiter Workload */}
      {waiters.filter((w) => w.active).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <User className="h-4 w-4" /> Waiter Workload
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {waiters.filter((w) => w.active).map((w) => {
              const assigned = orders.filter((o) => o.assignedWaiterId === w.id && o.status !== 'served');
              const tables = [...new Set(assigned.map((o) => o.tableId))];
              return (
                <div key={w.id} className="border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold truncate">{w.name}</p>
                  </div>
                  <p className="text-2xl font-extrabold">{assigned.length}</p>
                  <p className="text-xs text-muted-foreground">active order{assigned.length !== 1 ? 's' : ''}</p>
                  {tables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tables.map((t) => (
                        <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">T{t.replace(/\D/g, '')}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next in Queue highlight */}
      {pendingQueue.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-700">Next in Queue</p>
              <p className="text-xs text-red-500">
                Table {pendingQueue[0].tableId} · {pendingQueue[0].items.length} items · waiting {calculateWaitingTime(pendingQueue[0].createdAt)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => handleStatusChange(pendingQueue[0].id, 'confirmed')}
          >
            Accept
          </Button>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'served'] as FilterType[]).map((filter) => (
          <Button
            key={filter}
            variant={selectedFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter(filter)}
            className="rounded-full capitalize"
          >
            {filter === 'all' ? `All Active (${pendingQueue.length + activeOrders.length})` :
             filter === 'pending' ? `Pending (${pendingQueue.length})` :
             `Served (${completedOrders.length})`}
          </Button>
        ))}
      </div>

      {/* Orders Table */}
      {displayedOrders.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-10 text-center shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {selectedFilter === 'all' ? 'No active orders' : `No ${selectedFilter} orders`}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 border-b border-border/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Queue</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Table</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Waiter</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => {
                  const qPos = order.status === 'pending'
                    ? pendingQueue.findIndex((o) => o.id === order.id) + 1
                    : null;
                  return (
                    <OrderRow
                      key={order.id}
                      order={order}
                      queuePosition={qPos}
                      waiterName={order.assignedWaiterId ? waiters.find((w) => w.id === order.assignedWaiterId)?.name : undefined}
                      onStatusChange={handleStatusChange}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && selectedFilter !== 'served' && (
        <div className="mt-8">
          <h3 className="text-base font-bold mb-3 text-muted-foreground">
            Completed Today ({completedOrders.length})
          </h3>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Table</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Items</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Order Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-border/50 opacity-70">
                      <td className="px-4 py-3 font-bold text-primary">Table {order.tableId}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatOrderTime(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Served
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
