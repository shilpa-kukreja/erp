'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { productionApi, masterdataApi } from '@/lib/api';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewBatchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    productId: '', godownId: '', plannedQty: '', mfgDate: todayISO(), expDate: '',
  });

  const godownsQ = useQuery({ queryKey: ['godowns', { limit: 200 }], queryFn: () => masterdataApi.godowns.list({ limit: 200 }) });
  const productsQ = useQuery({ queryKey: ['products', { isActive: 'true', limit: 200 }],
    queryFn: () => masterdataApi.products.list({ isActive: 'true', limit: 200 }) });
  const bomsQ = useQuery({ queryKey: ['boms', { isActive: 'true', limit: 200 }],
    queryFn: () => productionApi.boms.list({ isActive: 'true', limit: 200 }) });

  const godowns = godownsQ.data?.data?.items || [];
  const products = productsQ.data?.data?.items || [];
  const boms = bomsQ.data?.data?.items || [];
  const defaultGodown = godowns.find((g) => g.isDefault);

  const producible = products.filter((p) => ['finished', 'semi'].includes(p.type));
  const productsWithBom = producible.filter((p) => boms.some((b) => b.productId === p.id));

  const selectedBom = boms.find((b) => b.productId === form.productId);

  // Live material requirement preview
  const preview = selectedBom && form.plannedQty
    ? selectedBom.items.map((i) => ({
        ...i,
        qtyRequired: (i.qty / selectedBom.outputQty) * Number(form.plannedQty),
      }))
    : [];

  const createMut = useMutation({
    mutationFn: (data) => productionApi.batches.create(data),
    onSuccess: (res) => {
      toast('Batch created (draft)', 'success');
      qc.invalidateQueries({ queryKey: ['batches'] });
      router.replace(`/production/batches/${res.data.batch.id}`);
    },
    onError: (e) => toast(e.message || 'Create failed', 'error'),
  });

  const handleSubmit = () => {
    if (!form.productId) return toast('Select product', 'error');
    if (!form.godownId) return toast('Select godown', 'error');
    if (!form.plannedQty || Number(form.plannedQty) <= 0) return toast('Enter planned qty', 'error');
    if (!form.mfgDate) return toast('Enter mfg date', 'error');

    createMut.mutate({
      productId: form.productId,
      godownId: form.godownId,
      plannedQty: Number(form.plannedQty),
      mfgDate: form.mfgDate,
      expDate: form.expDate || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Production Batch</h1>
          <p className="text-sm text-muted-foreground">Materials auto-computed from the product's BOM</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/production/batches')}>Cancel</Button>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Product to Produce</Label>
            <Select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">Select product with BOM…</option>
              {productsWithBom.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </Select>
            {form.productId && !selectedBom && (
              <p className="text-xs text-destructive">No active BOM for this product</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Godown</Label>
            <Select value={form.godownId || defaultGodown?.id || ''} onChange={(e) => setForm((f) => ({ ...f, godownId: e.target.value }))}>
              <option value="">Select godown…</option>
              {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}{g.isDefault ? ' (default)' : ''}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Planned Qty</Label>
            <Input type="number" step="0.001" min={0.001} value={form.plannedQty}
              onChange={(e) => setForm((f) => ({ ...f, plannedQty: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Mfg Date</Label>
            <Input type="date" value={form.mfgDate} onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Exp Date (optional)</Label>
            <Input type="date" value={form.expDate} onChange={(e) => setForm((f) => ({ ...f, expDate: e.target.value }))} />
          </div>
        </div>
      </div>

      {selectedBom && preview.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-medium mb-3">Materials Required (auto-calculated)</h2>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium text-right">Required Qty</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.productId} className="border-b last:border-0">
                  <td className="px-3 py-2">{p.productName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.productSku}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {p.qtyRequired.toFixed(3)} {p.unitSymbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">
            These will be deducted from stock when you complete the batch. You can adjust at completion.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/production/batches')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createMut.isPending}>
          {createMut.isPending ? 'Creating…' : 'Create Draft Batch'}
        </Button>
      </div>
    </div>
  );
}