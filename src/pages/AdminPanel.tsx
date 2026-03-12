import { useState } from 'react';
import { useRestaurantStore, type MenuItem } from '@/store/restaurantStore';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Menu, LayoutDashboard, UtensilsCrossed, Users, TableProperties, Receipt, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { Link, useLocation } from 'react-router-dom';

type AdminTab = 'dashboard' | 'menu' | 'waiters' | 'tables' | 'bills';

const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'waiters', label: 'Waiters', icon: <Users className="h-4 w-4" /> },
  { id: 'tables', label: 'Tables', icon: <TableProperties className="h-4 w-4" /> },
  { id: 'bills', label: 'Bills', icon: <Receipt className="h-4 w-4" /> },
];

function Sidebar({ activeTab, setActiveTab }: { activeTab: AdminTab; setActiveTab: (t: AdminTab) => void }) {
  return (
    <aside className="w-[240px] border-r border-border bg-background shrink-0 h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="font-bold text-lg">QR Menu</h1>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
      </div>
    </aside>
  );
}

function DashboardView() {
  const { orders, menuItems, tables, waiters } = useRestaurantStore();
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Menu Items', value: menuItems.length },
    { label: 'Tables', value: tables.length },
    { label: 'Active Waiters', value: waiters.filter((w) => w.active).length },
    { label: 'Pending Orders', value: pendingOrders },
    { label: 'Total Orders', value: orders.length },
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {orders.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-lg mb-4">Recent Orders</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Table</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                    <td className="px-4 py-3">{order.tableId}</td>
                    <td className="px-4 py-3">{order.items.length} items</td>
                    <td className="px-4 py-3 tabular-nums">₹{order.total.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-warning/10 text-warning' :
                        order.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                        order.status === 'served' ? 'bg-success/10 text-success' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {order.status}
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

function MenuManagement() {
  const { menuItems, addMenuItem, deleteMenuItem, updateMenuItem } = useRestaurantStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', dietary: '' });

  const categories = [...new Set(menuItems.map((i) => i.category))];

  const handleSubmit = () => {
    if (!form.name || !form.price || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }
    const dietary = form.dietary ? form.dietary.split(',').map((d) => d.trim()) : undefined;
    if (editingId) {
      updateMenuItem(editingId, { name: form.name, description: form.description, price: Number(form.price), category: form.category, dietary });
      toast.success('Item updated');
      setEditingId(null);
    } else {
      addMenuItem({ name: form.name, description: form.description, price: Number(form.price), category: form.category, available: true, dietary });
      toast.success('Item added');
    }
    setForm({ name: '', description: '', price: '', category: '', dietary: '' });
    setShowForm(false);
  };

  const startEdit = (item: MenuItem) => {
    setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, dietary: item.dietary?.join(', ') || '' });
    setEditingId(item.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Manage Menu</h2>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', description: '', price: '', category: '', dietary: '' }); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Item' : 'Add New Item'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Price *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="categories" />
            <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Dietary (V, GF)" value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} />
          </div>
          <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>{editingId ? 'Update' : 'Add'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                <td className="px-4 py-3 tabular-nums">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateMenuItem(item.id, { available: !item.available })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteMenuItem(item.id); toast.success('Item deleted'); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Manage Waiters</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Add Waiter</Button>
      </div>
      {showForm && (
        <div className="border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="admin-input border border-border rounded-lg px-3 w-full bg-background" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Register</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {waiters.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.email}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleWaiterStatus(w.id)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {w.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteWaiter(w.id); toast.success('Waiter removed'); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableManagement() {
  const { tables, addTable, deleteTable } = useRestaurantStore();
  const [newNumber, setNewNumber] = useState('');

  const handleAdd = () => {
    const num = Number(newNumber);
    if (!num || tables.find((t) => t.number === num)) { toast.error('Invalid or duplicate table number'); return; }
    addTable(num);
    setNewNumber('');
    toast.success(`Table ${num} created`);
  };

  const baseUrl = window.location.origin;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Manage Tables</h2>
        <div className="flex gap-2">
          <input className="admin-input border border-border rounded-lg px-3 w-24 bg-background" placeholder="Table #" type="number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} />
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="border border-border rounded-xl p-5 text-center space-y-3">
            <p className="font-bold text-lg">Table {table.number}</p>
            <div className="flex justify-center bg-background p-3 rounded-lg">
              <QRCode value={`${baseUrl}/menu/${table.id}`} size={120} />
            </div>
            <p className="text-xs text-muted-foreground break-all">{baseUrl}/menu/{table.id}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${table.status === 'available' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
              {table.status}
            </span>
            <div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteTable(table.id); toast.success('Table deleted'); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillManagement() {
  const { orders } = useRestaurantStore();
  const servedOrders = orders.filter((o) => o.status === 'served' || o.status === 'confirmed');

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Bills</h2>
      {servedOrders.length === 0 ? (
        <p className="text-muted-foreground">No bills to display yet.</p>
      ) : (
        <div className="space-y-4">
          {servedOrders.map((order) => (
            <div key={order.id} className="border border-border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">Table {order.tableId}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.id}</p>
                </div>
                <span className="text-lg font-bold tabular-nums">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="tabular-nums text-muted-foreground">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
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
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 py-8 px-10 overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'menu' && <MenuManagement />}
        {activeTab === 'waiters' && <WaiterManagement />}
        {activeTab === 'tables' && <TableManagement />}
        {activeTab === 'bills' && <BillManagement />}
      </main>
    </div>
  );
}
