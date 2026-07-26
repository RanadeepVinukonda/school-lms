import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OptionsSelect } from '@/components/ui/select';
import { inventoryService, InventoryItem, InventoryCategory, Supplier } from '@/services/inventoryService';

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('items');

  // Item Form State
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', category_id: '', quantity: 0, unit: 'pcs', reorder_level: 5, supplier_id: '' });
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Category Form State
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Supplier Form State
  const [showSupForm, setShowSupForm] = useState(false);
  const [supForm, setSupForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });

  // Stock Adjustment State
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Queries
  const { data: itemsRes, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['admin-inventory-items'],
    queryFn: () => inventoryService.getItems(),
    enabled: activeTab === 'items',
  });

  const { data: catsRes, isLoading: catsLoading, refetch: refetchCats } = useQuery({
    queryKey: ['admin-inventory-categories'],
    queryFn: () => inventoryService.getCategories(),
    enabled: activeTab === 'categories' || (activeTab === 'items' && showItemForm),
  });

  const { data: supsRes, isLoading: supsLoading, refetch: refetchSups } = useQuery({
    queryKey: ['admin-inventory-suppliers'],
    queryFn: () => inventoryService.getSuppliers(),
    enabled: activeTab === 'suppliers' || (activeTab === 'items' && showItemForm),
  });

  const items = itemsRes?.data || [];
  const categories = catsRes?.data || [];
  const suppliers = supsRes?.data || [];

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: typeof itemForm) => inventoryService.createItem(data),
    onSuccess: () => {
      toast.success('Inventory item created');
      setItemForm({ name: '', category_id: '', quantity: 0, unit: 'pcs', reorder_level: 5, supplier_id: '' });
      setShowItemForm(false);
      refetchItems();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: InventoryItem) => inventoryService.updateItem(data.id, data),
    onSuccess: () => {
      toast.success('Inventory item updated');
      setEditingItem(null);
      refetchItems();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update item'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteItem(id),
    onSuccess: () => {
      toast.success('Inventory item deleted');
      refetchItems();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete item'),
  });

  const createCatMutation = useMutation({
    mutationFn: (data: typeof catForm) => inventoryService.createCategory(data),
    onSuccess: () => {
      toast.success('Category created');
      setCatForm({ name: '', description: '' });
      setShowCatForm(false);
      refetchCats();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create category'),
  });

  const createSupMutation = useMutation({
    mutationFn: (data: typeof supForm) => inventoryService.createSupplier(data),
    onSuccess: () => {
      toast.success('Supplier created');
      setSupForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
      setShowSupForm(false);
      refetchSups();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create supplier'),
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data: { item_id: string; quantity_changed: number; reason?: string }) =>
      inventoryService.logUsage(data),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      setAdjustingItem(null);
      setAdjustQty(0);
      setAdjustReason('');
      refetchItems();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to adjust stock'),
  });

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;
    createItemMutation.mutate(itemForm);
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    createCatMutation.mutate(catForm);
  };

  const handleSupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supForm.name.trim()) return;
    createSupMutation.mutate(supForm);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustQty === 0) return;
    adjustStockMutation.mutate({
      item_id: adjustingItem.id,
      quantity_changed: adjustQty,
      reason: adjustReason,
    });
  };

  return (
    <>
      <SEOHead title="Inventory Management" description="Track school assets, supplies, and orders" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Inventory Management</h1>
          <p className="text-body-md text-muted-foreground mt-1 font-normal">Track school resources, stationeries, suppliers, and stocks</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 max-w-md">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <h2 className="text-title-sm font-semibold text-foreground">Resource Directory</h2>
              {!showItemForm && !editingItem && !adjustingItem && (
                <Button onClick={() => setShowItemForm(true)}>
                  <Icon name="add" size={16} className="mr-1.5" />
                  Add Item
                </Button>
              )}
            </div>

            {/* Adjust Stock Form */}
            {adjustingItem && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Adjust Stock for: {adjustingItem.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdjustSubmit} className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Quantity Delta (e.g. -5 or +10)</label>
                        <Input
                          type="number"
                          value={adjustQty}
                          onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Reason</label>
                        <Input
                          placeholder="e.g. Distributed to Grade 10"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setAdjustingItem(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={adjustStockMutation.isPending}>
                        Confirm Adjustment
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Add Item Form */}
            {showItemForm && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Add New Resource Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Item Name *</label>
                        <Input
                          placeholder="e.g. Chalk Box"
                          value={itemForm.name}
                          onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Category</label>
                        <OptionsSelect
                          options={categories.map((c: InventoryCategory) => ({ value: c.id, label: c.name }))}
                          value={itemForm.category_id}
                          onValueChange={(v: string) => setItemForm({ ...itemForm, category_id: v })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Quantity</label>
                        <Input
                          type="number"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Unit</label>
                        <Input
                          placeholder="e.g. boxes, pcs"
                          value={itemForm.unit}
                          onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Reorder Alert Level</label>
                        <Input
                          type="number"
                          value={itemForm.reorder_level}
                          onChange={(e) => setItemForm({ ...itemForm, reorder_level: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Supplier</label>
                        <OptionsSelect
                          options={suppliers.map((s: Supplier) => ({ value: s.id, label: s.name }))}
                          value={itemForm.supplier_id}
                          onValueChange={(v: string) => setItemForm({ ...itemForm, supplier_id: v })}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowItemForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={createItemMutation.isPending}>
                        Create Item
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <DataFetchWrapper data={items} isLoading={itemsLoading} onRetry={refetchItems} loadingType="table">
              {() => (
                <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Resource Item</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Stock Level</th>
                        <th className="px-6 py-3">Reorder Alert</th>
                        <th className="px-6 py-3">Supplier</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm font-medium">
                      {items.map((item: InventoryItem) => (
                        <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold">{item.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{item.category?.name || '-'}</td>
                          <td className="px-6 py-4 font-mono font-bold">
                            {item.quantity} {item.unit || 'pcs'}
                          </td>
                          <td className="px-6 py-4">
                            {item.quantity <= (item.reorder_level || 5) ? (
                              <span className="inline-flex items-center gap-1 text-xs text-error font-bold bg-error-container/20 px-2.5 py-1 rounded-full">
                                <Icon name="warning" size={12} />
                                Reorder Required
                              </span>
                            ) : (
                              <span className="text-xs text-success font-bold bg-success-container/20 px-2.5 py-1 rounded-full">
                                Sufficient
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{item.supplier?.name || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => setAdjustingItem(item)}>
                                <Icon name="exposure" size={14} className="mr-1" />
                                Adjust Stock
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-error hover:text-error hover:bg-error-container/20"
                                onClick={() => {
                                  if (confirm(`Delete "${item.name}" from inventory?`)) {
                                    deleteItemMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Icon name="delete" size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <h2 className="text-title-sm font-semibold text-foreground">Categories List</h2>
              {!showCatForm && (
                <Button onClick={() => setShowCatForm(true)}>
                  <Icon name="add" size={16} className="mr-1.5" />
                  Add Category
                </Button>
              )}
            </div>

            {showCatForm && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Add Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCatSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <label className="text-label-sm text-muted-foreground mb-1 block">Category Name *</label>
                      <Input
                        placeholder="e.g. Lab Equipment"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-label-sm text-muted-foreground mb-1 block">Description</label>
                      <Input
                        placeholder="Lab glassware, instruments, chemicals"
                        value={catForm.description}
                        onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowCatForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={createCatMutation.isPending}>
                        Save Category
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <DataFetchWrapper data={categories} isLoading={catsLoading} onRetry={refetchCats} loadingType="table">
              {() => (
                <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Category Name</th>
                        <th className="px-6 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {categories.map((c: InventoryCategory) => (
                        <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold">{c.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <h2 className="text-title-sm font-semibold text-foreground">Supplier Directory</h2>
              {!showSupForm && (
                <Button onClick={() => setShowSupForm(true)}>
                  <Icon name="add" size={16} className="mr-1.5" />
                  Add Supplier
                </Button>
              )}
            </div>

            {showSupForm && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Add Supplier</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSupSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Supplier Name *</label>
                        <Input
                          placeholder="e.g. Acme Stationery"
                          value={supForm.name}
                          onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Contact Person</label>
                        <Input
                          placeholder="John Doe"
                          value={supForm.contact_person}
                          onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Phone</label>
                        <Input
                          placeholder="9876543210"
                          value={supForm.phone}
                          onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Email</label>
                        <Input
                          type="email"
                          placeholder="acme@supplies.com"
                          value={supForm.email}
                          onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-label-sm text-muted-foreground mb-1 block">Address</label>
                        <Input
                          placeholder="123 Supply Lane, Cityville"
                          value={supForm.address}
                          onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowSupForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={createSupMutation.isPending}>
                        Save Supplier
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <DataFetchWrapper data={suppliers} isLoading={supsLoading} onRetry={refetchSups} loadingType="table">
              {() => (
                <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Supplier Name</th>
                        <th className="px-6 py-3">Contact</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {suppliers.map((s: Supplier) => (
                        <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold">{s.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{s.contact_person || '-'}</td>
                          <td className="px-6 py-4 text-muted-foreground">{s.phone || '-'}</td>
                          <td className="px-6 py-4 text-muted-foreground">{s.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
