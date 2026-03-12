import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, Bell, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurantStore, type MenuItem } from '@/store/restaurantStore';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

const spring = { type: "spring" as const, duration: 0.4, bounce: 0 };

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addToCart, cart, updateCartQuantity } = useRestaurantStore();
  const cartItem = cart.find((c) => c.id === item.id);

  return (
    <div className="py-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="dish-name">{item.name}</span>
            {item.dietary?.map((d) => (
              <span key={d} className="text-[10px] font-bold border border-muted-foreground/30 text-muted-foreground rounded px-1 py-0.5 leading-none">
                {d}
              </span>
            ))}
          </div>
          <p className="dish-description mt-1">{item.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="dish-price">₹{item.price.toLocaleString('en-IN')}</span>
          {cartItem ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={spring}
              className="flex items-center gap-2 bg-primary/10 rounded-lg p-1"
            >
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
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.97, opacity: 0.8 }} transition={spring}>
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
            </motion.div>
          )}
        </div>
      </div>
      {item.image && (
        <div className="mt-3">
          <img 
            src={item.image} 
            alt={item.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function CartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, cartTotal, updateCartQuantity, removeFromCart, clearCart, placeOrder, currentTableId, addNotification } = useRestaurantStore();

  const handlePlaceOrder = () => {
    if (!currentTableId) return;
    placeOrder(currentTableId);
    toast.success('Order placed! The waiter will confirm shortly.');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
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
                <Button className="w-full" size="lg" onClick={handlePlaceOrder}>
                  Confirm Order
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function CustomerMenu() {
  const { tableId } = useParams<{ tableId: string }>();
  const { menuItems, cart, cartTotal, setCurrentTableId, addNotification, categoryImages } = useRestaurantStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Set current table on mount
  useState(() => {
    if (tableId) setCurrentTableId(tableId);
  });

  const categories = useMemo(() => {
    const cats = new Map<string, MenuItem[]>();
    menuItems
      .filter((item) => item.available)
      .forEach((item) => {
        const list = cats.get(item.category) || [];
        list.push(item);
        cats.set(item.category, list);
      });
    return cats;
  }, [menuItems]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCallWaiter = () => {
    if (!tableId) return;
    addNotification({ tableId, type: 'call_waiter', message: `Table ${tableId} is calling for a waiter` });
    toast.success('Waiter has been notified!');
  };

  const handleRequestBill = () => {
    if (!tableId) return;
    addNotification({ tableId, type: 'request_bill', message: `Table ${tableId} is requesting the bill` });
    toast.success('Bill requested! The waiter will bring it shortly.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Table {tableId}</p>
        <h1 className="text-2xl font-bold mt-1">Menu</h1>
      </div>

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
              const thumbnail = categoryImage || items.find((i) => i.image)?.image;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="overflow-hidden rounded-xl border border-border bg-card p-0 text-left shadow-sm hover:shadow-md transition"
                >
                  <div className="h-28 w-full overflow-hidden bg-muted/20">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`${category} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No image
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
            <div className="flex gap-4 overflow-x-auto pb-4 pr-1 snap-x snap-mandatory">
              {categories.get(selectedCategory)?.map((item) => (
                <div key={item.id} className="shrink-0 w-[340px] snap-start rounded-xl border border-border bg-card p-4">
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="fixed bottom-6 right-6 z-30"
        >
          <Button variant="fab" size="fab" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          </Button>
        </motion.div>
      )}

      {/* Bottom bar with total */}
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={spring}
          className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 z-20 max-w-lg mx-auto"
        >
          <Button className="w-full" size="lg" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart ({cartCount}) · ₹{cartTotal().toLocaleString('en-IN')}
          </Button>
        </motion.div>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
