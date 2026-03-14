import { useState, useEffect } from 'react';
import { useRestaurantStore, type Order } from '@/store/restaurantStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'served';
type FilterType = 'all' | 'pending' | 'served';

function formatOrderTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function calculateWaitingTime(createdAt: Date): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  return `${diffMins} minutes ago`;
}

const statusColors: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
  served: { bg: 'bg-green-100', text: 'text-green-700', label: 'Served' },
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed'],
  confirmed: ['preparing'],
  preparing: ['served'],
  served: [],
};

function StatusButton({ 
  currentStatus, 
  orderId, 
  onStatusChange 
}: { 
  currentStatus: OrderStatus; 
  orderId: string; 
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const nextStatuses = statusTransitions[currentStatus];

  if (nextStatuses.length === 0) {
    return (
      <Badge className={`${statusColors[currentStatus].bg} ${statusColors[currentStatus].text} cursor-default`}>
        {statusColors[currentStatus].label}
      </Badge>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full text-xs h-8 gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {statusColors[currentStatus].label}
        <ChevronDown className="h-3 w-3" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                onStatusChange(orderId, status);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${statusColors[status].text}`}
            >
              {statusColors[status].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({ 
  order, 
  onStatusChange 
}: { 
  order: Order; 
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
      <td className="px-6 py-4 font-bold text-primary">Table {order.tableId}</td>
      <td className="px-6 py-4">
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-medium">{item.quantity}x</span>
              <span className="text-muted-foreground ml-2">{item.name}</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-center font-semibold">{order.items.length}</td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatOrderTime(order.createdAt)}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {calculateWaitingTime(order.createdAt)}
      </td>
      <td className="px-6 py-4">
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
  const updateOrderStatus = useRestaurantStore((state) => state.updateOrderStatus);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);

  // Update displayed orders whenever orders or filter changes
  useEffect(() => {
    let filtered = [...orders];

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === selectedFilter);
    } else {
      // Show all non-served orders
      filtered = filtered.filter((o) => o.status !== 'served');
    }

    // Sort by creation time (FIFO - oldest first)
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    setDisplayedOrders(filtered);
  }, [orders, selectedFilter]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      toast.success(`Order ${orderId} marked as ${statusColors[newStatus].label}`);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
  };

  const completedOrders = orders.filter((o) => o.status === 'served').sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Orders Queue</h2>
        <p className="text-muted-foreground mt-1">Manage orders in FIFO order. Oldest orders appear first.</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'served'] as FilterType[]).map((filter) => (
          <Button
            key={filter}
            variant={selectedFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(filter)}
            className="rounded-full capitalize"
          >
            {filter === 'all' ? 'All Orders' : filter}
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
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Table</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Items</th>
                  <th className="text-center px-6 py-4 font-semibold text-muted-foreground">Qty</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Order Time</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Waiting</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Orders Section */}
      {completedOrders.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-4 text-muted-foreground">Completed Orders ({completedOrders.length})</h3>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border/50">
                    <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Table</th>
                    <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Items</th>
                    <th className="text-center px-6 py-4 font-semibold text-muted-foreground">Qty</th>
                    <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Order Time</th>
                    <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">Table {order.tableId}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm">
                              <span className="font-medium">{item.quantity}x</span>
                              <span className="text-muted-foreground ml-2">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">{order.items.length}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatOrderTime(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {calculateWaitingTime(order.createdAt)}
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
