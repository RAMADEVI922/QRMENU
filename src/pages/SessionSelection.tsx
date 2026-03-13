import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Zap, QrCode } from 'lucide-react';

export default function SessionSelection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = searchParams.get('table') || 'Unknown';

  const handleActiveTime = () => {
    navigate(`/menu/T${tableNumber}?type=active`);
  };

  const handleIdleTime = () => {
    navigate(`/menu/T${tableNumber}?type=idle`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <QrCode className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">QR Menu</h1>
        </div>
        <p className="text-muted-foreground text-lg">Welcome to our restaurant</p>
      </div>

      {/* Table Number Display */}
      <div className="mb-12 text-center">
        <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">Your Table</p>
        <div className="inline-block bg-primary/10 border-2 border-primary rounded-2xl px-8 py-4">
          <p className="text-5xl font-black text-primary">Table {tableNumber}</p>
        </div>
      </div>

      {/* Session Type Selection */}
      <div className="w-full max-w-md space-y-6">
        <p className="text-center text-muted-foreground font-medium mb-8">
          How would you like to order?
        </p>

        {/* Active Time Button */}
        <Button
          onClick={handleActiveTime}
          className="w-full h-32 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Zap className="h-8 w-8" />
          <span>Active Time</span>
          <span className="text-xs font-normal opacity-90">Quick ordering & service</span>
        </Button>

        {/* Idle Time Button */}
        <Button
          onClick={handleIdleTime}
          className="w-full h-32 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Clock className="h-8 w-8" />
          <span>Idle Time</span>
          <span className="text-xs font-normal opacity-90">Relaxed browsing & ordering</span>
        </Button>
      </div>

      {/* Footer Info */}
      <div className="mt-16 text-center text-xs text-muted-foreground max-w-md">
        <p>
          <strong>Active Time:</strong> For quick service and fast ordering
        </p>
        <p className="mt-2">
          <strong>Idle Time:</strong> For leisurely browsing and relaxed dining
        </p>
      </div>
    </div>
  );
}
