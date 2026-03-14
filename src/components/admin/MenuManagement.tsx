import React, { useState, useRef } from 'react';
import { useRestaurantStore, type MenuItem } from '@/store/restaurantStore';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit, X, UploadCloud, Search, DollarSign, Image as ImageIcon, Flame, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMenuItemImage, uploadCategoryImage, saveCategoryBanner, deleteCategoryBanner } from '@/lib/firebaseService';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuManagement() {
  const { menuItems, addMenuItem, deleteMenuItem, updateMenuItem, categoryImages, setCategoryImage, clearCategoryImage, setMenuItemImage, clearMenuItemImage } = useRestaurantStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', dietary: '', image: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);

  const normalizeCategory = (category: string) => {
    if (category.toLowerCase().startsWith('mains')) return 'Mains';
    return category;
  };

  const categories = [...new Set(menuItems.map((i) => normalizeCategory(i.category)))];
  const allTabs = ['All', ...categories];

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || normalizeCategory(item.category) === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openAdd = () => {
    setForm({ name: '', description: '', price: '', category: activeCategory !== 'All' ? activeCategory : '', dietary: '', image: '' });
    setEditingId(null);
    setSelectedFile(null);
    setShowForm(true);
  };

  const startEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      dietary: item.dietary?.join(', ') || '',
      image: item.image || '',
    });
    setEditingId(item.id);
    setSelectedFile(null);
    setShowForm(true);
  };

  const fileToUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSaving(true);

    const itemId = editingId ?? `M${Date.now()}`;
    const dietary = form.dietary ? form.dietary.split(',').map((d) => d.trim()) : undefined;

    let imageUrl = form.image ? form.image : undefined;

    if (selectedFile) {
      try {
        imageUrl = await uploadMenuItemImage(selectedFile, itemId, (progress: number) => {
        });
        setForm((prev) => ({ ...prev, image: imageUrl ?? '' }));
      } catch (error) {
        console.warn('Failed to upload image to Firebase Storage:', error);
        toast.error('Image upload failed; saving item without image');
        imageUrl = undefined;
      }
    }

    try {
      if (editingId) {
        await updateMenuItem(editingId, {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          dietary,
          image: imageUrl,
        });
        // If image is base64, store it separately in the persistent images map
        if (imageUrl?.startsWith('data:')) {
          setMenuItemImage(editingId, imageUrl);
        }
        toast.success('Item updated successfully');
      } else {
        await addMenuItem({
          id: itemId,
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          available: true,
          dietary,
          image: imageUrl,
        });
        // If image is base64, store it separately in the persistent images map
        if (imageUrl?.startsWith('data:')) {
          setMenuItemImage(itemId, imageUrl);
        }
        toast.success('New menu item added');
      }

      setShowForm(false);
    } catch (error) {
      toast.error('Failed to save item');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryImageUpload = async (category: string, file: File | null) => {
    if (!file) return;
    
    setIsSaving(true);
    
    try {
      const imageUrl = await uploadCategoryImage(file, category, (progress) => {
      });
      
      await saveCategoryBanner(category, imageUrl);
      setCategoryImage(category, imageUrl);
      toast.success(`Banner uploaded for ${category}`);
    } catch (error) {
      console.error('Failed to upload category banner:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCategoryBanner = async (category: string) => {
    try {
      await deleteCategoryBanner(category);
      clearCategoryImage(category);
      toast.success(`Banner removed for ${category}`);
    } catch (error) {
      console.error('Failed to delete category banner:', error);
      toast.error('Failed to remove cover image');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            Menu Master
          </h2>
          <p className="text-muted-foreground mt-1">Craft, curate, and control your culinary offerings.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border-border/50 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all text-foreground"
            />
          </div>
          <Button onClick={openAdd} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all px-6">
            <Plus className="h-4 w-4 mr-2" /> 
            Add Item
          </Button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {allTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              activeCategory === tab 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'bg-card text-muted-foreground hover:bg-muted border border-border/50 hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid View */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        <AnimatePresence>
          {filteredItems.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              key={item.id}
              className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-48 w-full overflow-hidden bg-muted/30">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                
                {/* Price Tag */}
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-border/50 text-foreground">
                  ₹{item.price.toLocaleString('en-IN')}
                </div>
                
                {/* Overlay actions */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform bg-white text-black" onClick={() => startEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform" onClick={() => { deleteMenuItem(item.id); clearMenuItemImage(item.id); toast.success('Deleted'); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-foreground line-clamp-1" title={item.name}>{item.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {item.description || "No description provided."}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={item.available} 
                      onCheckedChange={() => updateMenuItem(item.id, { available: !item.available })}
                      className="data-[state=checked]:bg-success"
                    />
                    <span className={`text-xs font-semibold ${item.available ? 'text-success' : 'text-muted-foreground'}`}>
                      {item.available ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                  
                  {item.dietary && item.dietary.length > 0 && (
                    <div className="flex gap-1">
                      {item.dietary.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-md tracking-wider">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold mb-2">No menu items found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              There are no items matching "<b>{searchQuery}</b>" in the <b>{activeCategory}</b> category.
            </p>
            <Button onClick={openAdd} variant="outline" className="rounded-full">Add your first item</Button>
          </div>
        )}
      </motion.div>

      {/* Category Management Banner (Show only if a specific category is selected) */}
      {activeCategory !== 'All' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl overflow-hidden relative h-40 group flex flex-col justify-end p-6 border border-border shadow-md"
        >
          {categoryImages[activeCategory] ? (
            <img src={categoryImages[activeCategory]} alt={activeCategory} className="absolute inset-0 w-full h-full object-cover z-0" />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 z-0 flex items-center justify-center">
               <ImageIcon className="w-16 h-16 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-0" />
          
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold text-primary tracking-widest uppercase mb-1">Category Detail</p>
              <h3 className="text-3xl font-extrabold text-foreground">{activeCategory}</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={catFileInputRef}
                onChange={(e) => handleCategoryImageUpload(activeCategory, e.target.files?.[0] ?? null)}
              />
              <Button onClick={() => catFileInputRef.current?.click()} variant="secondary" className="rounded-full backdrop-blur-md bg-background/50 border border-border/50 shadow-sm">
                <ImagePlus className="w-4 h-4 mr-2" />
                Change Cover
              </Button>
              {categoryImages[activeCategory] && (
                <Button onClick={() => handleClearCategoryBanner(activeCategory)} variant="destructive" size="icon" className="rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Add/Edit Modal Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => !isSaving && setShowForm(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  {editingId ? 'Edit Menu Item' : 'Craft New Item'}
                </h3>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => !isSaving && setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-6 flex-1 scrollbar-thin">
                <form id="menu-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">Name <span className="text-destructive">*</span></label>
                      <input 
                        required
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                        placeholder="e.g. Truffle Fries" 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })} 
                        disabled={isSaving}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">Price (₹) <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          required
                          type="number"
                          min="0"
                          className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                          placeholder="e.g. 299" 
                          value={form.price} 
                          onChange={(e) => setForm({ ...form, price: e.target.value })} 
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">Category <span className="text-destructive">*</span></label>
                      <input 
                        required
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                        placeholder="e.g. Starters" 
                        value={form.category} 
                        onChange={(e) => setForm({ ...form, category: e.target.value })} 
                        list="categories-list"
                        disabled={isSaving}
                      />
                      <datalist id="categories-list">
                        {categories.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">Dietary Badges</label>
                      <input 
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                        placeholder="e.g. V, GF, Vegan" 
                        value={form.dietary} 
                        onChange={(e) => setForm({ ...form, dietary: e.target.value })} 
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">Description</label>
                    <textarea 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm min-h-[100px] resize-y"
                      placeholder="Describe the dish, ingredients, and flavor profile..." 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">Item Image</label>
                    
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      {/* Image Preview / Upload Area */}
                      <div 
                        onClick={() => !isSaving && fileInputRef.current?.click()}
                        className={`relative w-full md:w-40 h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all group ${
                          (selectedFile || form.image) ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {selectedFile ? (
                          <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                        ) : form.image ? (
                          <img src={form.image} alt="preview" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
                            <UploadCloud className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium">Click to upload</span>
                          </div>
                        )}
                        
                        {(selectedFile || form.image) && !isSaving && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Change Image</span>
                          </div>
                        )}
                        
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          disabled={isSaving}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setForm(prev => ({ ...prev, image: '' }));
                            }
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 space-y-3 w-full">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          For the best presentation, upload a high-quality, brightly lit image. 1:1 aspect ratio recommended. 
                          Max size 5MB.
                        </p>
                        
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-[1px] flex-1 bg-border/50"></div>
                          <span className="text-xs text-muted-foreground uppercase font-semibold">Or paste URL</span>
                          <div className="h-[1px] flex-1 bg-border/50"></div>
                        </div>
                        
                        <input
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                          placeholder="https://example.com/image.jpg"
                          value={form.image}
                          onChange={(e) => {
                            setForm({ ...form, image: e.target.value });
                            setSelectedFile(null); // Clear selected file if user types a URL
                          }}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowForm(false)} 
                  disabled={isSaving}
                  className="rounded-full px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="menu-form"
                  disabled={isSaving}
                  className="rounded-full px-8 shadow-md"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Saving...
                    </div>
                  ) : (
                     editingId ? 'Save Changes' : 'Create Item'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

