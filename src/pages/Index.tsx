import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { QrCode, Shield, UtensilsCrossed, ArrowRight } from 'lucide-react';

const spring = { type: "spring" as const, duration: 0.4, bounce: 0 };

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
            <Link to="/admin">
              <Button variant="ghost" size="sm">Admin</Button>
            </Link>
            <Link to="/waiter">
              <Button variant="ghost" size="sm">Waiter</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              Manage Your Menu.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              A contactless digital menu system. Customers scan, browse, and order — all from their phone.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/menu/T1">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <UtensilsCrossed className="h-4 w-4" />
                View Demo Menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"
          >
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
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">QR Based Restaurant Menu System · Built with ReactJS</p>
      </footer>
    </div>
  );
}
