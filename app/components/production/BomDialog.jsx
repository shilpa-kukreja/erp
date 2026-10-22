'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { masterdataApi } from '@/lib/api';

export function BomDialog({ open, onOpenChange, mode, bom, onSubmit, saving }) {
  const isEdit = mode === 'edit';
  const productsQ = useQuery({
    queryKey: ['products', { limit: 200, isActive: 'true' }],
    queryFn: () => masterdataApi.products.list({ limit: 200, isActive: 'true' }),
    enabled: open,
  });
  const products = productsQ.data?.data?.items || [];
  const producible = products.filter((p) => ['finished', 'semi'].includes(p.type));
  const materialsAvailable = products.filter((p) => ['raw', 'packing', 'semi'].includes(p.type));

  const [productId, setProductId] = useState('');
  const [outputQty, setOutputQty] = useState(1);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [newItem, setNewItem] = useState({ productId: '', qty: '' });

  useEffect(() => {
    if (open) {
      setProductId(bom?.productId || '');
      setOutputQty(bom?.outputQty ?? 1);
      setItems((bom?.items || []).map((i) => ({ productId: i.productId, qty: i.qty })));
      setNotes(bom?.notes || '');
      setNewItem({ productId: '', qty: '' });
    }
  }, [open, bom]);

  const addItem = () => {
    if (!newItem.productId || !newItem.qty) return;
    const qty = Number(newItem.qty);
    if (qty <= 0) return;
    if (newItem.productId === productId) return;
    if (items.some((x) => x.productId === newItem.productId)) return;
    setItems((arr) => [...arr, { productId: newItem.productId, qty }]);
    setNewItem({ productId: '', qty: '' });
  };
  const removeItem = (pid) => setItems((arr) => arr.filter((x) => x.productId !== pid));

  const productLabel = (id) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.name} (${p.sku})` : id;
  };

  const handleSubmit = () => {
    if (!productId) return;
    if (items.length === 0) return;
    onSubmit({
      productId,
      outputQty: Number(outputQty) || 1,
      items,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit BOM' : 'New BOM (Recipe)'}</DialogTitle>
        <DialogDescription>Define materials to produce one batch of the product</DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="space-y-2">
          <Label>Product to Produce</Label>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={isEdit}>
            <option value="">Select finished/semi product…</option>
            {producible.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Output Qty (per batch of this recipe)</Label>
          <Input type="number" step="0.001" min={0.001} value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
          <p className="text-xs text-muted-foreground">e.g., recipe makes 100 pouches → enter 100</p>
        </div>

        <div className="space-y-2">
          <Label>Materials</Label>
          <div className="rounded-md border p-3 space-y-2">
            {items.length === 0 && <p className="text-xs text-muted-foreground">No materials yet</p>}
            {items.map((i) => (
              <div key={i.productId} className="flex items-center justify-between text-sm">
                <span className="truncate">{productLabel(i.productId)}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{i.qty}</span>
                  <button type="button" className="text-destructive" onClick={() => removeItem(i.productId)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Select className="flex-1" value={newItem.productId} onChange={(e) => setNewItem((n) => ({ ...n, productId: e.target.value }))}>
                <option value="">Select material…</option>
                {materialsAvailable.filter((p) => p.id !== productId && !items.some((i) => i.productId === p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </Select>
              <Input type="number" step="0.001" placeholder="Qty" className="w-28"
                value={newItem.qty} onChange={(e) => setNewItem((n) => ({ ...n, qty: e.target.value }))} />
              <Button type="button" variant="outline" onClick={addItem}>Add</Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving || !productId || items.length === 0}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}