import { useState, useEffect } from 'react';
import { useRestaurantStore } from '@/store/restaurantStore';
import { clearAdminSession, getAdminSession, createAdmin, fetchAdmins, deleteAdmin } from '@/lib/adminAuth';
import type { AdminRecord } from '@/lib/adminAuth';
import { fetchWaiters, upsertWaiter } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, LayoutDashboard, UtensilsCrossed, Users, Receipt, LogOut, QrCode, ListOrdered, Upload, X, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

import MenuManagement from '@/components/admin/MenuManagement';
import TableManagement from '@/components/admin/TableManagement';
import OrdersQueue from '@/components/admin/OrdersQueue';

type AdminTab = 'dashboard' | 'menu' | 'tables' | 'orders-queue' | 'waiters' | 'bills' | 'payment-qr' | 'admins';

const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'tables', label: 'Tables', icon: <QrCode className="h-4 w-4" /> },
  { id: 'orders-queue', label: 'Orders Queue', icon: <ListOrdered className="h-4 w-4" /> },
  { id: 'waiters', label: 'Waiters', icon: <Users className="h-4 w-4" /> },
  { id: 'bills', label: 'Bills', icon: <Receipt className="h-4 w-4" /> },
  { id: 'payment-qr', label: 'Payment QR', icon: <QrCode className="h-4 w-4" /> },
  { id: 'admins', label: 'Admins', icon: <ShieldCheck className="h-4 w-4" /> },
];

function Sidebar({ activeTab, setActiveTab }: { activeTab: AdminTab; setActiveTab: (t: AdminTab) => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin-login', { replace: true });
  };

  return (
    <aside className="w-[240px] border-r border-border bg-card text-foreground shrink-0 h-screen sticky top-0 flex flex-col shadow-sm">
      <div className="p-6 border-b border-border">
        <h1 className="font-extrabold text-2xl text-primary">QR Menu</h1>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
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
      <div className="p-4 border-t border-border space-y-3 bg-card">
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

  const stats = [
    { label: 'Menu Items', value: menuItems.length },
    { label: 'Active Waiters', value: waiters.filter((w) => w.active).length },
    { label: 'Pending Orders', value: pendingOrders },
    { label: 'Total Orders', value: orders.length },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6 text-foreground tracking-tight">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
  const { waiters, addWaiter, deleteWaiter, toggleWaiterStatus, setWaiters } = useRestaurantStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', pin: '' });
  const [loadingWaiters, setLoadingWaiters] = useState(false);

  // Load waiters from Firestore on mount so all admins see the same list
  useEffect(() => {
    setLoadingWaiters(true);
    fetchWaiters().then((fbWaiters) => {
      if (fbWaiters.length > 0) setWaiters(fbWaiters);
    }).catch(() => {}).finally(() => setLoadingWaiters(false));
  }, []);

  const handleAdd = () => {
    if (!form.name || !form.email || !form.pin) { toast.error('Fill all fields'); return; }
    if (!/^\d{4}$/.test(form.pin)) { toast.error('PIN must be exactly 4 digits'); return; }
    addWaiter({ name: form.name, email: form.email, active: true, pin: form.pin });
    setForm({ name: '', email: '', pin: '' });
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
          <Button onClick={() => setShowForm(!showForm)} className="rounded-full font-semibold shadow-md pt-0 pb-0 flex items-center"><Plus className="h-4 w-4 mr-1.5" /> Register Staff</Button>
        </div>
      </div>
      
      {showForm && (
        <div className="border border-border/50 bg-card rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold mb-4">New Staff Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1.5">
               <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
               <input className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" placeholder="e.g. John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
               <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
               <input className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" placeholder="e.g. john@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
               <label className="text-sm font-semibold text-muted-foreground">4-Digit PIN</label>
               <input className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" placeholder="e.g. 1234" type="password" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleAdd} className="rounded-full shadow-sm">Register Member</Button>
          </div>
        </div>
      )}
      
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {loadingWaiters ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading staff from server...
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

function BillManagement() {
  const { orders } = useRestaurantStore();
  const servedOrders = orders.filter((o) => o.status === 'served' || o.status === 'confirmed');

  const handlePrintReceipt = (order: ReturnType<typeof useRestaurantStore.getState>['orders'][0]) => {
    const itemsRows = order.items.map((i) => `
      <tr>
        <td class="item-name">${i.name}</td>
        <td class="item-qty">${i.quantity}</td>
        <td class="item-price">&#8377;${(i.price * i.quantity).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const orderTime = new Date(order.createdAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${order.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 32px 16px;
    }
    .receipt {
      background: #fff;
      width: 420px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    }
    .header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: white;
      padding: 28px 28px 20px;
      text-align: center;
    }
    .restaurant-name {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .restaurant-tagline {
      font-size: 12px;
      opacity: 0.85;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .receipt-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 12px;
      letter-spacing: 0.5px;
    }
    .meta {
      padding: 20px 28px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .meta-item label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #999;
      display: block;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 600;
      color: #222;
    }
    .items-section { padding: 20px 28px; }
    .items-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #999;
      margin-bottom: 12px;
    }
    table { width: 100%; border-collapse: collapse; }
    .col-header {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #bbb;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .col-header:last-child { text-align: right; }
    .col-header:nth-child(2) { text-align: center; }
    .item-name { padding: 10px 0 10px; font-size: 13px; color: #333; font-weight: 500; }
    .item-qty { text-align: center; font-size: 13px; color: #888; padding: 10px 8px; }
    .item-price { text-align: right; font-size: 13px; font-weight: 600; color: #222; padding: 10px 0; }
    tr { border-bottom: 1px solid #f8f8f8; }
    tr:last-child { border-bottom: none; }
    .total-section {
      margin: 0 28px 20px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }
    .total-label { font-size: 13px; font-weight: 600; opacity: 0.9; }
    .total-amount { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .payment-chip {
      display: inline-block;
      background: rgba(255,255,255,0.25);
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
    }
    .footer {
      padding: 16px 28px 24px;
      text-align: center;
      border-top: 1px dashed #eee;
    }
    .footer p { font-size: 12px; color: #aaa; line-height: 1.6; }
    .footer .thank-you { font-size: 14px; font-weight: 700; color: #f97316; margin-bottom: 4px; }
    .divider { border: none; border-top: 1px dashed #eee; margin: 0; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; width: 100%; }
      @page { margin: 0; size: A5; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="restaurant-name">🍽️ QR Restaurant</div>
      <div class="restaurant-tagline">Fine Dining Experience</div>
      <div class="receipt-badge">OFFICIAL RECEIPT</div>
    </div>

    <div class="meta">
      <div class="meta-item">
        <label>Table</label>
        <span>${order.tableId}</span>
      </div>
      <div class="meta-item">
        <label>Date &amp; Time</label>
        <span>${orderTime}</span>
      </div>
      <div class="meta-item">
        <label>Order ID</label>
        <span style="font-size:11px">${order.id}</span>
      </div>
      <div class="meta-item">
        <label>Status</label>
        <span style="color:#16a34a">${order.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="items-section">
      <div class="items-title">Order Items</div>
      <table>
        <thead>
          <tr>
            <th class="col-header" style="text-align:left">Item</th>
            <th class="col-header">Qty</th>
            <th class="col-header">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <div class="total-section">
      <div>
        <div class="total-label">Total Amount</div>
        <div class="payment-chip">${order.paymentMethod === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}</div>
      </div>
      <div class="total-amount">&#8377;${order.total.toLocaleString('en-IN')}</div>
    </div>

    <div class="footer">
      <p class="thank-you">Thank you for dining with us!</p>
      <p>We hope you enjoyed your meal.<br/>Visit us again soon.</p>
      <p style="margin-top:8px;font-size:11px">qr-menu-19cd1.web.app</p>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.tableId}-${order.id}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

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
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-7 gap-1.5"
                  onClick={() => handlePrintReceipt(order)}
                >
                  <Receipt className="h-3 w-3" /> Print Receipt
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentQRManagement() {
  const { paymentQRCodes, setPaymentQRCode, clearPaymentQRCode, paymentUPIIds, setPaymentUPIId } = useRestaurantStore();
  const [upiInputs, setUpiInputs] = useState<Record<string, string>>(() => ({ ...paymentUPIIds }));

  const providers = [
    { id: 'phonepe', label: 'PhonePe', color: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
    { id: 'gpay', label: 'Google Pay', color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    { id: 'paytm', label: 'Paytm', color: 'bg-sky-50 border-sky-200', badge: 'bg-sky-100 text-sky-700' },
  ];

  const handleUpload = (provider: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPaymentQRCode(provider, result);
      toast.success(`${provider} QR code uploaded`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUPI = (provider: string) => {
    const val = (upiInputs[provider] || '').trim();
    setPaymentUPIId(provider, val);
    toast.success(val ? `UPI ID saved for ${provider}` : `UPI ID cleared for ${provider}`);
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Payment QR Codes</h2>
        <p className="text-muted-foreground mt-1">Upload your UPI QR codes and set UPI IDs. Customers will scan these when paying online.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((p) => (
          <div key={p.id} className={`border-2 rounded-2xl p-6 ${paymentQRCodes[p.id] ? p.color : 'border-border bg-card'} transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${p.badge}`}>{p.label}</span>
              {paymentQRCodes[p.id] && (
                <button onClick={() => clearPaymentQRCode(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {paymentQRCodes[p.id] ? (
              <div className="text-center">
                <img
                  src={paymentQRCodes[p.id]}
                  alt={`${p.label} QR`}
                  className="w-40 h-40 object-contain mx-auto rounded-xl border border-border bg-white p-2"
                />
                <p className="text-xs text-green-600 font-semibold mt-3">✓ QR code active</p>
                <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                  <Upload className="h-3 w-3" /> Replace
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(p.id, e.target.files[0])} />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold text-muted-foreground">Upload QR Code</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG supported</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(p.id, e.target.files[0])} />
              </label>
            )}

            {/* UPI ID input */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UPI ID (for app deep link)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`e.g. name@${p.id}`}
                  value={upiInputs[p.id] || ''}
                  onChange={(e) => setUpiInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUPI(p.id)}
                  className="flex-1 text-xs bg-background border border-border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => handleSaveUPI(p.id)}
                  className="text-xs px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shrink-0"
                >
                  Save
                </button>
              </div>
              {paymentUPIIds[p.id] && (
                <p className="text-xs text-green-600">✓ {paymentUPIIds[p.id]}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        💡 Upload QR codes and enter UPI IDs. When a customer selects online payment, they can scan the QR or tap "Open in App" to pay the exact bill amount directly in PhonePe/GPay/Paytm.
      </div>
    </div>
  );
}

function AdminManagement() {
  const session = getAdminSession();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchAdmins();
      setAdmins(list);
      setLoaded(true);
    } catch (e: any) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useState(() => { load(); });

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || passcode.length < 4) {
      toast.error('Fill all fields with a 4-digit passcode'); return;
    }
    if (passcode !== confirm) { toast.error('Passcodes do not match'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Invalid email'); return; }
    setAdding(true);
    try {
      await createAdmin(email.trim(), passcode, name.trim());
      toast.success(`Admin "${name}" added`);
      setName(''); setEmail(''); setPasscode(''); setConfirm('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (admin: AdminRecord) => {
    if (admin.email === session?.email) { toast.error("You can't delete your own account"); return; }
    if (!confirm(`Delete admin "${admin.name}"?`)) return;
    try {
      await deleteAdmin(admin.id);
      toast.success(`Removed ${admin.name}`);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (e: any) {
      toast.error('Failed to delete admin');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold">Admin Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage who can log into the admin panel</p>
      </div>

      {/* Add new admin */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Add New Admin
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Manager Raj"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@restaurant.com"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">4-Digit Passcode</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm text-center tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Confirm Passcode</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm text-center tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding} className="gap-2">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Admin
        </Button>
      </div>

      {/* Existing admins list */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Existing Admins ({admins.length})</h3>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '↻'} Refresh
          </Button>
        </div>
        {!loaded || loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No admins found.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{admin.name}
                      {admin.email === session?.email && (
                        <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">You</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={admin.email === session?.email}
                  onClick={() => handleDelete(admin)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { setWaiters } = useRestaurantStore();

  // Always load waiters from Firestore on mount so all admins see the same list
  useEffect(() => {
    fetchWaiters().then((fbWaiters) => {
      if (fbWaiters.length > 0) setWaiters(fbWaiters);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-8 md:p-10 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'orders-queue' && <OrdersQueue />}
          {activeTab === 'waiters' && <WaiterManagement />}
          {activeTab === 'bills' && <BillManagement />}
          {activeTab === 'payment-qr' && <PaymentQRManagement />}
          {activeTab === 'admins' && <AdminManagement />}
        </div>
      </main>
    </div>
  );
}
