import { Button } from '@/components/ui/button';
import { useRestaurantStore } from '@/store/restaurantStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ConfirmOrderButtonProps {
  onSuccess?: (orderId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

/**
 * ConfirmOrderButton component handles order confirmation logic and validation
 * Requirements: 1.1, 2.1, 3.1, 3.2
 */
export function ConfirmOrderButton({
  onSuccess,
  onError,
  disabled = false,
}: ConfirmOrderButtonProps) {
  const { cart, currentTableId, placeOrder } = useRestaurantStore();
  const navigate = useNavigate();

  const handleConfirmOrder = () => {
    // Validate cart is not empty
    if (!cart || cart.length === 0) {
      const error = new Error('Please add items before confirming order');
      toast.error(error.message);
      onError?.(error);
      return;
    }

    // Validate table ID exists
    if (!currentTableId) {
      const error = new Error('Invalid table session');
      toast.error(error.message);
      onError?.(error);
      return;
    }

    // IMPORTANT: Log the exact table before order placement
    const state = useRestaurantStore.getState();
    console.log('🛒 ConfirmOrderButton: ========== ORDER PLACEMENT ==========');
    console.log('🛒 ConfirmOrderButton: currentTableId from store:', state.currentTableId);
    console.log('🛒 ConfirmOrderButton: currentTableId from hook:', currentTableId);
    if (state.currentTableId !== currentTableId) {
      console.warn('🛒 ConfirmOrderButton: ⚠️ TABLE ID MISMATCH!');
    }
    console.log('🛒 ConfirmOrderButton: Placing order for table', currentTableId);
    console.log('🛒 ConfirmOrderButton: Cart items:', cart.map(item => `${item.quantity}x ${item.name}`));
    
    try {
      // Place the order
      placeOrder(currentTableId);

      // Get the updated state from store after placing order
      const updatedState = useRestaurantStore.getState();
      console.log('🛒 ConfirmOrderButton: Total orders in store:', updatedState.orders.length);
      console.log('🛒 ConfirmOrderButton: Orders by table:');
      const byTable: Record<string, number> = {};
      updatedState.orders.forEach(o => {
        byTable[o.tableId] = (byTable[o.tableId] || 0) + 1;
      });
      Object.entries(byTable).forEach(([table, count]) => {
        console.log(`  📦 Table ${table}: ${count}`);
      });
      
      const newOrder = updatedState.orders.find(
        (o) => o.tableId === currentTableId && o.status !== 'served'
      );

      if (newOrder) {
        console.log('🛒 ConfirmOrderButton: ✅ Order created successfully', newOrder.id);
        console.log('🛒 ConfirmOrderButton: Order details:', {
          id: newOrder.id,
          tableId: newOrder.tableId,
          items: newOrder.items.length,
          status: newOrder.status,
        });
        console.log('🛒 ConfirmOrderButton: ========== ORDER PLACEMENT COMPLETE ==========\n');
        toast.success('Order confirmed! Redirecting...');
        onSuccess?.(newOrder.id);

        // Redirect to post-order page
        setTimeout(() => {
          navigate(`/order-summary/${currentTableId}`);
        }, 500);
      } else {
        console.error('🛒 ConfirmOrderButton: ❌ Order was not found in store after placement');
        toast.error('Order was not created. Please try again.');
      }
    } catch (error) {
      console.error('🛒 ConfirmOrderButton: Error placing order', error);
      const err = error instanceof Error ? error : new Error('Failed to confirm order');
      toast.error(err.message);
      onError?.(err);
    }
  };

  return (
    <Button
      onClick={handleConfirmOrder}
      disabled={disabled || cart.length === 0}
      size="lg"
      className="w-full"
    >
      Confirm Order
    </Button>
  );
}
