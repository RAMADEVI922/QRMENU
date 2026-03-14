import { CartItem } from '@/store/restaurantStore';
import { formatPrice } from '@/lib/orderUtils';

interface OrderItemsListProps {
  items: CartItem[];
  total: number;
}

/**
 * OrderItemsList component displays all items in an order
 * Requirements: 4.1, 4.4, 4.5
 */
export function OrderItemsList({ items, total }: OrderItemsListProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-4 pb-3 border-b border-border">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t-2 border-border">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-base">Total</span>
          <span className="font-bold text-lg">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
