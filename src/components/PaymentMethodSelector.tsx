import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurantStore } from '@/store/restaurantStore';
import { CreditCard, Banknote } from 'lucide-react';

interface PaymentMethodSelectorProps {
  orderId: string;
  onSelect?: (method: 'cash' | 'online') => void;
  selectedMethod?: 'cash' | 'online';
}

/**
 * PaymentMethodSelector component allows customer to select payment method
 * Requirements: 6.1, 6.2, 6.3
 */
export function PaymentMethodSelector({
  orderId,
  onSelect,
  selectedMethod: initialMethod,
}: PaymentMethodSelectorProps) {
  const { updateOrderPaymentMethod } = useRestaurantStore();
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'online' | null>(
    initialMethod || null
  );

  const handleSelectMethod = (method: 'cash' | 'online') => {
    setSelectedMethod(method);
    updateOrderPaymentMethod(orderId, method);
    onSelect?.(method);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">Payment Method</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleSelectMethod('cash')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedMethod === 'cash'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Banknote className="h-6 w-6 mx-auto mb-2" />
          <p className="text-sm font-medium">Cash on Delivery</p>
        </button>

        <button
          onClick={() => handleSelectMethod('online')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedMethod === 'online'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <CreditCard className="h-6 w-6 mx-auto mb-2" />
          <p className="text-sm font-medium">Online Payment</p>
        </button>
      </div>

      {selectedMethod === 'cash' && (
        <div className="p-3 bg-green-500/10 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✓ Cash payment selected. The waiter will collect payment when serving.
          </p>
        </div>
      )}

      {selectedMethod === 'online' && (
        <div className="p-3 bg-blue-500/10 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            ✓ Online payment selected. You will be redirected to payment processing.
          </p>
        </div>
      )}

      {!selectedMethod && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Please select a payment method to proceed.
          </p>
        </div>
      )}
    </div>
  );
}
