import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Minus, ShoppingCart, Bell, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurantStore, type MenuItem } from '@/store/restaurantStore';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmOrderButton } from '@/components/ConfirmOrderButton';
import { upsertNotification as upsertNotificationDirect, fetchBanners, claimTableSession, updateTableSessionStatus } from '@/lib/firebaseService';
import type { FirebaseBanner } from '@/lib/firebaseService';

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addToCart, cart, updateCartQuantity, menuItemImages } = useRestaurantStore();
  const cartItem = cart.find((c) => c.id === item.id);

  return (
    <div className="py-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="dish-name">{item.name}</span>
            {item.dietary?.filter((d) => d === 'V' || d === 'NV').map((d) => (
              <span
                key={d}
                className={`text-[10px] font-bold rounded px-1 py-0.5 leading-none ${
                  d === 'V'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {d === 'V' ? '🟢 Veg' : '🔴 Non-Veg'}
              </span>
            ))}
          </div>
          <p className="dish-description mt-1">{item.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="dish-price">₹{item.price.toLocaleString('en-IN')}</span>
          {cartItem ? (
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => updateCartQuantity(item.id, cartItem.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold w-6 text-center tabular-nums">{cartItem.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => updateCartQuantity(item.id, cartItem.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  addToCart(item);
                  toast.success(`${item.name} added to cart`);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>
      {(item.image || menuItemImages[item.id]) && (
        <div className="mt-3">
          <img 
            src={item.image || menuItemImages[item.id]} 
            alt={item.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function CartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, cartTotal, updateCartQuantity, removeFromCart, clearCart, currentTableId, addNotification, orders } = useRestaurantStore();
  const navigate = useNavigate();

  const currentOrder = orders.find((o) => o.tableId === currentTableId && o.status !== 'served');

  const getRemainingTime = () => {
    if (!currentOrder) return 0;
    return Math.max(0, currentOrder.readyAt - Date.now());
  };

  const formatTime = (ms: number) => {
    const mins = Math.ceil(ms / 60000);
    return `${mins} min${mins === 1 ? '' : 's'}`;
  };

  return (
    <>
      {open && (
        <>
          <div
            className="fixed inset-0 bg-foreground/20 z-40"
            onClick={onClose}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">Your Order</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">₹{item.price.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold w-5 text-center tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium tabular-nums w-16 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="tabular-nums">₹{cartTotal().toLocaleString('en-IN')}</span>
                </div>
                {currentOrder ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your order is being prepared. Estimated ready in {formatTime(getRemainingTime())}.</p>
                    <ConfirmOrderButton
                      onSuccess={() => onClose()}
                      onError={() => {}}
                    />
                  </div>
                ) : (
                  <ConfirmOrderButton
                    onSuccess={() => onClose()}
                    onError={() => {}}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function CustomerMenu() {
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  const sessionType = searchParams.get('type') || 'active';
  const isDevMode = searchParams.get('dev') === 'true' || window.location.hostname === 'localhost';
  const { menuItems, cart, cartTotal, setCurrentTableId, addNotification, categoryImages, menuItemImages, placeOrder, orders } = useRestaurantStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const vegRef = useRef<HTMLDivElement>(null);
  const nonVegRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState<FirebaseBanner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [tableBlocked, setTableBlocked] = useState(false);

  // Claim the table on mount — block if already occupied by another session
  useEffect(() => {
    if (!tableId) return;
    // Always generate a fresh session ID on each new page load
    const key = `session_${tableId}`;
    const id = `S${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, id);
    claimTableSession(tableId, id).then((result) => {
      if (result === 'occupied') setTableBlocked(true);
    }).catch(() => {});
  }, [tableId]);

  useEffect(() => {
    fetchBanners().then((b) => setBanners(b.filter((x) => x.active))).catch(() => {});
    // Re-fetch every 30s so banner changes reflect without page reload
    const t = setInterval(() => {
      fetchBanners().then((b) => setBanners(b.filter((x) => x.active))).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-rotate banners every 4s
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  // Set current table when the route changes
  useEffect(() => {
    if (tableId) {
      console.log('🏠 CustomerMenu: Received tableId from URL:', tableId);
      console.log('🏠 CustomerMenu: Setting currentTableId to:', tableId);
      setCurrentTableId(tableId);
      
      // Verify it was set immediately
      setTimeout(() => {
        const state = useRestaurantStore.getState();
        if (state.currentTableId === tableId) {
          console.log('🏠 CustomerMenu: ✅ currentTableId successfully set to:', state.currentTableId);
        } else {
          console.log('🏠 CustomerMenu: ⚠️ WARNING - currentTableId mismatch!');
          console.log('   Expected:', tableId);
          console.log('   Actual:', state.currentTableId);
          // Force update again if mismatch
          setCurrentTableId(tableId);
        }
      }, 0);
    }
  }, [tableId, setCurrentTableId]);

  // IMPORTANT: Clear cart when switching tables
  useEffect(() => {
    const state = useRestaurantStore.getState();
    // If cart has items but we're on a different table, clear it
    if (state.cart.length > 0) {
      console.log('⚠️ CustomerMenu: Found cart items on table change - clearing cart');
      const { clearCart } = useRestaurantStore.getState();
      clearCart();
    }
  }, [tableId]);

  const normalizeCategory = (category: string) => {
    // Keep Mains as one category, but show veg / non‑veg containers inside it.
    if (category.toLowerCase().startsWith('mains')) return 'Mains';
    return category;
  };

  const categories = useMemo(() => {
    const cats = new Map<string, MenuItem[]>();
    menuItems
      .filter((item) => item.available)
      .forEach((item) => {
        const category = normalizeCategory(item.category);
        const list = cats.get(category) || [];
        list.push(item);
        cats.set(category, list);
      });
    return cats;
  }, [menuItems]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCallWaiter = async () => {
    if (!tableId) return;
    try {
      await upsertNotificationDirect({
        id: `N${tableId}_cw_${Date.now()}`,
        tableId,
        type: 'call_waiter',
        message: `Table ${tableId} is calling for a waiter`,
        read: false,
        createdAt: Date.now(),
      });
      addNotification({ tableId, type: 'call_waiter', message: `Table ${tableId} is calling for a waiter` });
      toast.success('Waiter has been notified!');
    } catch (e: any) {
      toast.error(`Failed to notify waiter: ${e?.message || e}`);
    }
  };

  const handleRequestBill = async () => {
    if (!tableId) return;
    try {
      await upsertNotificationDirect({
        id: `N${tableId}_rb_${Date.now()}`,
        tableId,
        type: 'request_bill',
        message: `Table ${tableId} is requesting the bill`,
        read: false,
        createdAt: Date.now(),
      });
      addNotification({ tableId, type: 'request_bill', message: `Table ${tableId} is requesting the bill` });
      toast.success('Bill requested! The waiter will bring it shortly.');
    } catch (e: any) {
      toast.error(`Failed to request bill: ${e?.message || e}`);
    }
  };

  if (tableBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2">Table Occupied</h2>
          <p className="text-muted-foreground mb-2">
            This table is currently occupied by another customer.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm mt-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Currently Occupied
          </div>
          <p className="text-xs text-muted-foreground mt-4">Please wait until the table is vacated or ask a waiter for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        {isDevMode && (
          <button
            onClick={() => window.location.href = '/'}
            className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition"
          >
            ← Dev: Back to Home
          </button>
        )}
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Table {tableId}</p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold">Menu</h1>          <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            sessionType === 'active' 
              ? 'bg-blue-500/10 text-blue-600' 
              : 'bg-orange-500/10 text-orange-600'
          }`}>
            {sessionType === 'active' ? '⚡ Active' : '🕐 Idle'}
          </div>
        </div>
      </div>

      {/* ── Promotional Banners ── */}
      {banners.length > 0 && (
        <div className="px-4 mb-2">
          <style>{`
            @keyframes banner-slide {
              0%   { opacity: 0; transform: translateY(-6px); }
              10%  { opacity: 1; transform: translateY(0); }
              85%  { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(6px); }
            }
            .banner-anim { animation: banner-slide 4s ease-in-out; }
          `}</style>
          <div
            key={bannerIdx}
            className="banner-anim rounded-2xl px-4 py-3 text-center shadow-sm"
            style={{ backgroundColor: banners[bannerIdx].bgColor, color: banners[bannerIdx].textColor }}
          >
            <span className="text-xl mr-2">{banners[bannerIdx].emoji}</span>
            <span className="font-bold text-sm">{banners[bannerIdx].text}</span>
            {banners[bannerIdx].subtext && (
              <span className="text-xs opacity-80 ml-2">{banners[bannerIdx].subtext}</span>
            )}
          </div>
          {banners.length > 1 && (
            <div className="flex justify-center gap-1 mt-1.5">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === bannerIdx ? 16 : 6, backgroundColor: i === bannerIdx ? banners[bannerIdx].bgColor : '#d1d5db' }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 px-4 py-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCallWaiter}>
          <Bell className="h-3.5 w-3.5" /> Call Waiter
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRequestBill}>
          <Receipt className="h-3.5 w-3.5" /> Request Bill
        </Button>
      </div>

      {/* Menu: category grid or selected category items */}
      <div className="px-4">
        {!selectedCategory ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from(categories.entries()).map(([category, items]) => {
              const categoryImage = categoryImages[category];
              const thumbnailItem = items.find((i) => i.image || menuItemImages[i.id]);
              const thumbnail = categoryImage || (thumbnailItem ? (thumbnailItem.image || menuItemImages[thumbnailItem.id]) : undefined);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="overflow-hidden rounded-xl border border-border bg-card p-0 text-left shadow-sm hover:shadow-md transition"
                >
                  <div className="h-48 w-full overflow-hidden bg-muted/20">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`${category} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col h-full bg-primary/5 items-center justify-center text-xs text-muted-foreground font-semibold">
                        <span className="text-xl mb-1 opacity-50">🍽️</span>
                        {category}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{category}</span>
                      <span className="text-xs text-muted-foreground">{items.length} items</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground truncate">Tap to browse</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-sm font-medium text-primary hover:underline"
              >
                ← Back to categories
              </button>
              <span className="text-sm text-muted-foreground">{selectedCategory}</span>
            </div>
            <div className="space-y-8 pb-4">
              {(() => {
                const items = categories.get(selectedCategory) ?? [];
                // If a category contains both veg and non-veg options, show them separately.
                const vegItems = items.filter((item) => item.dietary?.includes('V'));
                const nonVegItems = items.filter((item) => !item.dietary?.includes('V'));

                const splitByDiet = vegItems.length > 0 && nonVegItems.length > 0;

                return (
                  <>
                    {splitByDiet ? (
                      <>
                        <div ref={vegRef}>
                          <h2 className="text-lg font-semibold mb-3">🟢 Veg</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {vegItems.map((item) => (
                              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                                <MenuItemCard item={item} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div ref={nonVegRef}>
                          <h2 className="text-lg font-semibold mb-3">🔴 Non‑Veg</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {nonVegItems.map((item) => (
                              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                                <MenuItemCard item={item} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Floating Veg / Non-Veg scroll buttons */}
                        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex gap-2">
                          <button
                            onClick={() => vegRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
                          >
                            🟢 Veg
                          </button>
                          <button
                            onClick={() => nonVegRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
                          >
                            🔴 Non-Veg
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                            <MenuItemCard item={item} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <div
          className="fixed bottom-6 right-6 z-30"
        >
          <Button variant="fab" size="fab" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          </Button>
        </div>
      )}

      {/* Bottom bar with total */}
      {cartCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 z-20 max-w-lg mx-auto"
        >
          <Button className="w-full" size="lg" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart ({cartCount}) · ₹{cartTotal().toLocaleString('en-IN')}
          </Button>
        </div>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
