'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Trash2, Plus } from 'lucide-react';
import { purchaseApi, masterdataApi } from '@/lib/api';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const suppliersQ = useQuery({ queryKey: ['parties', { type: 'supplier', isActive: 'true', limit: 200 }],
    queryFn: () => masterdataApi.parties.list({ type: 'supplier', isActive: 'true', limit: 200 }) });
  const godownsQ = useQuery({ queryKey: ['godowns', { limit: 200 }], queryFn: () => masterdataApi.godowns.list({ limit: 200 }) });
  const productsQ = useQuery({ queryKey: ['products', { isActive: 'true', limit: 200 }],
    queryFn: () => masterdataApi.products.list({ isActive: 'true', limit: 200 }) });

  const suppliers = suppliersQ.data?.data?.items || [];
  const godowns = godownsQ.data?.data?.items || [];
  const products = productsQ.data?.data?.items || [];
  const defaultGodown = godowns.find((g) => g.isDefault);

  const [header, setHeader] = useState({
    supplierId: '', godownId: defaultGodown?.id || '',
    billNo: '', billDate: todayISO(), dueDate: '', notes: '',
  });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ productId: '', qty: '', rateRupees: '' });

  const productById = (id) => products.find((p) => p.id === id);

  const addItem = () => {
    if (!newItem.productId || !newItem.qty || newItem.rateRupees === '') return;
    const p = productById(newItem.productId);
    if (!p) return;
    const qty = Number(newItem.qty);
    const rateRupees = Number(newItem.rateRupees);
    if (qty <= 0 || rateRupees < 0) return;

    setItems((arr) => [...arr, {
      productId: p.id, productName: p.name, productSku: p.sku, unitSymbol: p.unit?.symbol,
      qty, ratePaise: Math.round(rateRupees * 100), taxRate: p.taxRate,
    }]);
    setNewItem({ productId: '', qty: '', rateRupees: '' });
  };

  const removeItem = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const computedItems = items.map((i) => {
    const lineSub = Math.round(i.qty * i.ratePaise);
    const lineTax = Math.round((lineSub * i.taxRate) / 100);
    return { ...i, lineSubtotalPaise: lineSub, lineTaxPaise: lineTax, lineTotalPaise: lineSub + lineTax };
  });
  const subTotal = computedItems.reduce((s, i) => s + i.lineSubtotalPaise, 0);
  const taxTotal = computedItems.reduce((s, i) => s + i.lineTaxPaise, 0);
  const grandTotal = subTotal + taxTotal;

  const createMutation = useMutation({
    mutationFn: (data) => purchaseApi.create(data),
    onSuccess: (res) => {
      toast('Purchase bill created (draft)', 'success');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      router.replace(`/purchase/${res.data.bill.id}`);
    },
    onError: (e) => toast(e.message || 'Create failed', 'error'),
  });

  const handleSubmit = () => {
    if (!header.supplierId) return toast('Select a supplier', 'error');
    if (!header.godownId) return toast('Select a godown', 'error');
    if (!header.billNo.trim()) return toast('Enter bill number', 'error');
    if (!header.billDate) return toast('Select bill date', 'error');
    if (items.length === 0) return toast('Add at least one item', 'error');

    createMutation.mutate({
      supplierId: header.supplierId,
      godownId: header.godownId,
      billNo: header.billNo.trim(),
      billDate: header.billDate,
      dueDate: header.dueDate || null,
      notes: header.notes || undefined,
      items: computedItems.map((i) => ({
        productId: i.productId, qty: i.qty, ratePaise: i.ratePaise, taxRate: i.taxRate,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Purchase Bill</h1>
          <p className="text-sm text-muted-foreground">Record goods received. Stock updates when you confirm.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/purchase')}>Cancel</Button>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select value={header.supplierId} onChange={(e) => setHeader((h) => ({ ...h, supplierId: e.target.value }))}>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Godown (receiving)</Label>
            <Select value={header.godownId} onChange={(e) => setHeader((h) => ({ ...h, godownId: e.target.value }))}>
              <option value="">Select godown…</option>
              {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}{g.isDefault ? ' (default)' : ''}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Supplier Bill No</Label>
            <Input value={header.billNo} onChange={(e) => setHeader((h) => ({ ...h, billNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Bill Date</Label>
            <Input type="date" value={header.billDate} onChange={(e) => setHeader((h) => ({ ...h, billDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Due Date (optional)</Label>
            <Input type="date" value={header.dueDate} onChange={(e) => setHeader((h) => ({ ...h, dueDate: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Notes (optional)</Label>
          <Textarea rows={2} value={header.notes} onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))} />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Items</h2>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/30 p-3">
          <div className="flex-1 min-w-[220px]">
            <Label className="text-xs">Product</Label>
            <Select value={newItem.productId} onChange={(e) => {
              const pid = e.target.value;
              const p = productById(pid);
              setNewItem((n) => ({ ...n, productId: pid, rateRupees: p ? (p.costPerUnitPaise / 100).toString() : '' }));
            }}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs">Qty</Label>
            <Input type="number" step="0.001" value={newItem.qty}
              onChange={(e) => setNewItem((n) => ({ ...n, qty: e.target.value }))} />
          </div>
          <div className="w-32">
            <Label className="text-xs">Rate (₹)</Label>
            <Input type="number" step="0.01" value={newItem.rateRupees}
              onChange={(e) => setNewItem((n) => ({ ...n, rateRupees: e.target.value }))} />
          </div>
          <Button onClick={addItem}><Plus className="h-4 w-4" /> Add</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium text-right">Rate</th>
                <th className="px-3 py-2 font-medium text-right">Tax %</th>
                <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                <th className="px-3 py-2 font-medium text-right">Tax</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {computedItems.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground text-xs">No items yet</td></tr>
              )}
              {computedItems.map((i, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{i.productName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{i.productSku}</div>
                  </td>
                  <td className="px-3 py-2">{i.unitSymbol || '—'}</td>
                  <td className="px-3 py-2 text-right">{i.qty}</td>
                  <td className="px-3 py-2 text-right">{rupees(i.ratePaise)}</td>
                  <td className="px-3 py-2 text-right">{i.taxRate}%</td>
                  <td className="px-3 py-2 text-right">{rupees(i.lineSubtotalPaise)}</td>
                  <td className="px-3 py-2 text-right">{rupees(i.lineTaxPaise)}</td>
                  <td className="px-3 py-2 text-right font-medium">{rupees(i.lineTotalPaise)}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rupees(subTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{rupees(taxTotal)}</span></div>
            <div className="flex justify-between border-t pt-1 font-semibold"><span>Grand Total</span><span>{rupees(grandTotal)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/purchase')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Saving…' : 'Save as Draft'}
        </Button>
      </div>
    </div>
  );
}