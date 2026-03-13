import { useState } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { useClerk } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, LayoutDashboard, UtensilsCrossed, Users, Receipt, LogOut, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import MenuManagement from '@/components/admin/MenuManagement';
import TableManagement from '@/components/admin/TableManagement';

type AdminTab = 'dashboard' | 'menu' | 'tables' | 'waiters' | 'bills';

const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'tables', label: 'Tables', icon: <QrCode className="h-4 w-4" /> },
  { id: 'waiters', label: 'Waiters', icon: <Users className="h-4 w-4" /> },
  { id: 'bills', label: 'Bills', icon: <Receipt className="h-4 w-4" /> },
];

function Sidebar({ activeTab, setActiveTab }: { activeTab: AdminTab; setActiveTab: (t: AdminTab) => void }) {
  const { signOut } = useClerk();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className="w-[240px] border-r border-border bg-card shrink-0 h-screen sticky top-0 flex flex-col shadow-sm">
      <div className="p-6">
        <h1 className="font-extrabold text-2xl bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">QR Menu</h1>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 px-4 py-2 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border space-y-3 bg-muted/20">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-medium">
          ← Back to Home
        </Link>
        <Button
          variant="destructive"
          className="w-full justify-start gap-2 shadow-sm rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

function DashboardView() {
  const { orders, menuItems, waiters } = useRestaurantStore();
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Menu Items', value: menuItems.length },
    { label: 'Active Waiters', value: waiters.filter((w) => w.active).length },
    { label: 'Pending Orders', value: pendingOrders },
    { label: 'Total Orders', value: orders.length },
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6 text-foreground tracking-tight">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm font-semibold text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-3xl font-black tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {orders.length > 0 && (
        <div className="mt-10 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <h3 className="font-bold text-lg">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/5">
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Order ID</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Table</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Items</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Total</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t border-border/50 hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold">{order.id}</td>
                    <td className="px-6 py-4 font-semibold">Table {order.tableId}</td>
                    <td className="px-6 py-4 text-muted-foreground">{order.items.length} items</td>
                    <td className="px-6 py-4 tabular-nums font-bold">₹{order.total.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        order.status === 'pending' ? 'bg-warning/10 text-warning' :
                        order.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                        order.status === 'served' ? 'bg-success/10 text-success' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WaiterManagement() {
  const { waiters, addWaiter, deleteWaiter, toggleWaiterStatus } = useRestaurantStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });

  const handleAdd = () => {
    if (!form.name || !form.email) { toast.error('Fill all fields'); return; }
    addWaiter({ name: form.name, email: form.email, active: true });
    setForm({ name: '', email: '' });
    setShowForm(false);
    toast.success('Waiter registered');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Staff Roster</h2>
          <p className="text-muted-foreground mt-1">Manage your restaurant waiters and staff access.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/waiter">
            <Button size="sm" variant="outline" className="rounded-full font-semibold">Open Waiter Interface</Button>
          </Link>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-full font-semibold shadow-md pt-0 pb-0 flex items-center"><Plus className="h-4 w-4 mr-1.5" /> Register Staff</Button>
        </div>
      </div>
      
      {showForm && (
        <div className="border border-border/50 bg-card rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold mb-4">New Staff Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
               <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
               <input className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" placeholder="e.g. John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
               <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
               <input className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" placeholder="e.g. john@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleAdd} className="rounded-full shadow-sm">Register Member</Button>
          </div>
        </div>
      )}
      
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/10 border-b border-border/50">
              <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Staff Name</th>
              <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Contact Email</th>
              <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Status</th>
              <th className="text-right px-6 py-4 font-semibold text-muted-foreground">Manage</th>
            </tr>
          </thead>
          <tbody>
            {waiters.map((w) => (
              <tr key={w.id} className="border-b border-border/20 last:border-0 hover:bg-muted/5 transition-colors">
                <td className="px-6 py-4 font-bold">{w.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{w.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={w.active} onCheckedChange={() => toggleWaiterStatus(w.id)} className="data-[state=checked]:bg-success" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${w.active ? 'text-success' : 'text-muted-foreground'}`}>
                      {w.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => { deleteWaiter(w.id); toast.success('Waiter removed'); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {waiters.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                  No staff members registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillManagement() {
  const { orders } = useRestaurantStore();
  const servedOrders = orders.filter((o) => o.status === 'served' || o.status === 'confirmed');

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Financial Records</h2>
        <p className="text-muted-foreground mt-1">Review completed orders and generated bills.</p>
      </div>
      
      {servedOrders.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-10 text-center shadow-sm">
           <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
           <p className="text-muted-foreground font-medium">No completed bills to display yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {servedOrders.map((order) => (
            <div key={order.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-border/50">
                <div>
                  <p className="font-extrabold text-lg text-primary">Table {order.tableId}</p>
                  <p className="text-xs text-muted-foreground font-mono font-semibold">{order.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-muted-foreground block mb-0.5">Total Amount</span>
                  <span className="text-2xl font-black tabular-nums">₹{order.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{item.quantity}x <span className="text-muted-foreground ml-1">{item.name}</span></span>
                    <span className="tabular-nums font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                 <span className="text-xs font-semibold px-2 py-1 rounded bg-muted text-muted-foreground uppercase">{order.status}</span>
                 <Button variant="outline" size="sm" className="rounded-full text-xs h-7">Print Receipt</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 md:p-10 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'waiters' && <WaiterManagement />}
          {activeTab === 'bills' && <BillManagement />}
        </div>
      </main>
    </div>
  );
}
