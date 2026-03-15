import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurantStore } from '@/store/restaurantStore';
import { OrderItemsList } from '@/components/OrderItemsList';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { calculateWaitingTime, formatOrderTime } from '@/lib/orderUtils';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

/**
 * OrderSummaryPage component displays order summary and allows adding more items
 * Route: /order-summary/:tableId
 * Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.4, 5.6
 */
export default function OrderSummaryPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { getOrderByTableId, currentTableId, setCurrentTableId } = useRestaurantStore();
  const [waitingTime, setWaitingTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Set current table on mount
  useEffect(() => {
    if (tableId) {
      console.log('📋 OrderSummaryPage: Setting current table to', tableId);
      setCurrentTableId(tableId);
    }
  }, [tableId, setCurrentTableId]);

  // Get order from store
  const order = tableId ? getOrderByTableId(tableId) : null;
  
  useEffect(() => {
    console.log('📋 OrderSummaryPage: Looking for order for table', tableId);
    if (order) {
      console.log(`  ✅ Found order ${order.id} with ${order.items.length} items, status: ${order.status}`);
    } else {
      console.log(`  ❌ No active order found for table ${tableId}`);
      const allOrders = useRestaurantStore.getState().orders;
      console.log(`  📊 Total orders in store: ${allOrders.length}`);
      allOrders.forEach((o) => {
        console.log(`    - Order ${o.id}: Table ${o.tableId}, Status: ${o.status}`);
      });
    }
  }, [tableId, order]);

  // Update waiting time every 10 seconds
  useEffect(() => {
    if (!order) {
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    const updateWaitingTime = () => {
      setWaitingTime(calculateWaitingTime(order.createdAt));
    };

    updateWaitingTime();
    const interval = setInterval(updateWaitingTime, 10000);

    return () => clearInterval(interval);
  }, [order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find an active order for this table. Please start a new order.
          </p>
          <Button onClick={() => navigate(`/menu/${tableId}`)}>
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const handleAddMoreItems = () => {
    navigate(`/menu/${tableId}`);
  };

  const handleCompleteOrder = () => {
    if (!order.paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    toast.success('Order completed! Thank you for your order.');
    // In a real app, this would proceed to payment processing
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/menu/${tableId}`)}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Menu</span>
          </button>
          <h1 className="text-xl font-bold">Order Summary</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Order Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Table</p>
              <p className="text-2xl font-bold">#{tableId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Order Time</p>
              <p className="text-lg font-semibold">{formatOrderTime(order.createdAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
            <OrderStatusBadge status={order.status} waitingTime={waitingTime} />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Order Items</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <OrderItemsList items={order.items} total={order.total} />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-card border border-border rounded-lg p-4">
          <PaymentMethodSelector
            orderId={order.id}
            selectedMethod={order.paymentMethod}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleAddMoreItems}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Items
          </Button>

          <Button
            onClick={handleCompleteOrder}
            disabled={!order.paymentMethod}
            className="w-full"
            size="lg"
          >
            Complete Order
          </Button>
        </div>
      </div>
    </div>
  );
}
