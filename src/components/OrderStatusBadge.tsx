import { Order } from '@/store/restaurantStore';
import { AlertCircle, Clock } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: Order['status'];
  waitingTime?: string;
}

/**
 * OrderStatusBadge component displays order status with visual indicator
 * Requirements: 4.1, 10.1
 */
export function OrderStatusBadge({ status, waitingTime }: OrderStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: '⏳ Pending',
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
    },
    confirmed: {
      label: '✓ Confirmed',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    },
    preparing: {
      label: '👨‍🍳 Preparing',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
    },
    served: {
      label: '✓ Served',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    },
  };

  const config = statusConfig[status];

  // Check if waiting time exceeds thresholds
  const isWarning = waitingTime && parseInt(waitingTime) > 30;
  const isCritical = waitingTime && parseInt(waitingTime) > 45;

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} border`}
      >
        <span className="text-sm font-semibold">{config.label}</span>
      </div>

      {waitingTime && (
        <div
          className={`flex items-center gap-2 text-sm ${
            isCritical
              ? 'text-red-600 font-semibold'
              : isWarning
                ? 'text-orange-600'
                : 'text-muted-foreground'
          }`}
        >
          {isCritical && <AlertCircle className="h-4 w-4" />}
          {!isCritical && <Clock className="h-4 w-4" />}
          <span>Waiting: {waitingTime}</span>
        </div>
      )}
    </div>
  );
}
