import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, Shield, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">QR Menu</span>
          </div>
          <div className="flex gap-2">
            <Link to="/menu/T1">
              <Button variant="ghost" size="sm">View Menu</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              Manage Your Menu.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              A contactless digital menu system. Customers scan, browse, and order — all from their phone.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Link to="/menu/T1">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <UtensilsCrossed className="h-4 w-4" />
                View Demo Menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin-login">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
            <Link to="/waiter-login">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <UtensilsCrossed className="h-4 w-4" />
                Waiter Panel
              </Button>
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {[
              { title: 'Scan & Order', desc: 'Customers scan a QR code at their table to instantly access the menu and place orders.' },
              { title: 'Real-time Updates', desc: 'Waiters receive instant notifications. Menu changes reflect immediately.' },
              { title: 'Full Control', desc: 'Admin panel to manage menu items, tables, waiters, and track billing.' },
            ].map((f) => (
              <div key={f.title} className="p-4">
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">QR Based Restaurant Menu System · Built with ReactJS</p>
      </footer>
    </div>
  );
}
