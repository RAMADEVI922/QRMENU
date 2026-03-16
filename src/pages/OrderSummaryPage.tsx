import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurantStore } from '@/store/restaurantStore';
import { OrderItemsList } from '@/components/OrderItemsList';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { calculateWaitingTime, formatOrderTime } from '@/lib/orderUtils';
import { sendBillEmail, isEmailConfigured } from '@/lib/emailService';
import { ArrowLeft, Plus, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrderSummaryPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { currentTableId, setCurrentTableId } = useRestaurantStore();
  const [waitingTime, setWaitingTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundTimer, setNotFoundTimer] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (tableId) setCurrentTableId(tableId);
  }, [tableId, setCurrentTableId]);

  const order = useRestaurantStore((state) =>
    tableId ? state.orders.find((o) => o.tableId === tableId && o.status !== 'served') ?? null : null
  );

  useEffect(() => {
    const timer = setTimeout(() => setNotFoundTimer(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!order) {
      if (notFoundTimer) setIsLoading(false);
      return;
    }
    setIsLoading(false);
    const update = () => setWaitingTime(calculateWaitingTime(order.createdAt));
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [order, notFoundTimer]);

  if (isLoading || (!order && !notFoundTimer)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
          <Button onClick={() => navigate(`/menu/${tableId}`)}>Back to Menu</Button>
        </div>
      </div>
    );
  }

  const handleSendBill = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSendingEmail(true);
    try {
      await sendBillEmail({
        toEmail: email,
        tableId: tableId!,
        orderId: order.id,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod || 'cash',
        orderTime: formatOrderTime(order.createdAt),
      });
      setEmailSent(true);
      toast.success(`Bill sent to ${email}`);
    } catch (e: any) {
      toast.error(`Failed to send email: ${e?.message || 'Please try again'}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCompleteOrder = () => {
    if (!order.paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    toast.success('Order placed! Enjoy your meal.');
    navigate(`/menu/${tableId}`, { replace: true });
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
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <PaymentMethodSelector orderId={order.id} selectedMethod={order.paymentMethod} />
        </div>

        {/* Email Bill — shown once payment method is selected */}
        {order.paymentMethod && isEmailConfigured && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">Get Bill on Email</h3>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            {emailSent ? (
              <div className="p-3 bg-green-500/10 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">✓ Bill sent to {email}</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendBill()}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  onClick={handleSendBill}
                  disabled={sendingEmail || !email}
                  size="sm"
                  className="shrink-0"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={() => navigate(`/menu/${tableId}`)} variant="outline" className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add More Items
          </Button>
          <Button onClick={handleCompleteOrder} disabled={!order.paymentMethod} className="w-full" size="lg">
            Complete Order
          </Button>
        </div>
      </div>
    </div>
  );
}
