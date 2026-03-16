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

    try {
      console.log('🛒 ConfirmOrderButton: Placing order for table', currentTableId);
      console.log('🛒 ConfirmOrderButton: Cart items:', cart.length);
      
      // Place the order
      placeOrder(currentTableId);

      // Get the updated state from store after placing order
      const state = useRestaurantStore.getState();
      console.log('🛒 ConfirmOrderButton: Total orders in store:', state.orders.length);
      
      const newOrder = state.orders.find(
        (o) => o.tableId === currentTableId && o.status !== 'served'
      );

      if (newOrder) {
        console.log('🛒 ConfirmOrderButton: Order created successfully', newOrder.id);
        toast.success('Order confirmed! Redirecting...');
        onSuccess?.(newOrder.id);

        // Navigate to order summary — push so back button returns to menu
        setTimeout(() => {
          navigate(`/order-summary/${currentTableId}`);
        }, 500);
      } else {
        console.error('🛒 ConfirmOrderButton: Order was not found in store after placement');
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
