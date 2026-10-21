'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { masterdataApi, stockApi } from '@/lib/api';
import { useToast } from '@/app/components/providers/ToastProvider';

const schema = z.object({
  productId: z.string().min(1, 'Select product'),
  godownId: z.string().min(1, 'Select godown'),
  qtyChange: z.coerce.number().refine((v) => v !== 0, 'Cannot be 0'),
  reason: z.enum(['opening', 'adjustment']),
  note: z.string().max(300).optional(),
});

export function AdjustDialog({ open, onOpenChange, godowns, defaultGodownId }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ['products', { limit: 200, isActive: 'true' }],
    queryFn: () => masterdataApi.products.list({ limit: 200, isActive: 'true' }),
    enabled: open,
  });
  const products = productsQuery.data?.data?.items || [];

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', godownId: defaultGodownId || '', qtyChange: 0, reason: 'opening', note: '' },
  });

  useEffect(() => {
    if (open) form.reset({ productId: '', godownId: defaultGodownId || '', qtyChange: 0, reason: 'opening', note: '' });
  }, [open, defaultGodownId, form]);

  const mutation = useMutation({
    mutationFn: (data) => stockApi.adjust(data),
    onSuccess: () => {
      toast('Stock adjusted', 'success');
      qc.invalidateQueries({ queryKey: ['stock-balances'] });
      qc.invalidateQueries({ queryKey: ['stock-low'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e.message || 'Adjust failed', 'error'),
  });

  const handleSubmit = form.handleSubmit((v) =>
    mutation.mutate({ ...v, note: v.note || undefined, qtyChange: Number(v.qtyChange) })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Adjust Stock</DialogTitle>
        <DialogDescription>Add opening stock or adjust quantities (+ / -)</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select {...form.register('productId')}>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </Select>
            {form.formState.errors.productId && <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Godown</Label>
            <Select {...form.register('godownId')}>
              <option value="">Select…</option>
              {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            {form.formState.errors.godownId && <p className="text-xs text-destructive">{form.formState.errors.godownId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Qty Change</Label>
              <Input type="number" step="0.001" {...form.register('qtyChange')} placeholder="e.g. 100 or -5" />
              <p className="text-xs text-muted-foreground">Positive to add, negative to write-off</p>
              {form.formState.errors.qtyChange && <p className="text-xs text-destructive">{form.formState.errors.qtyChange.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select {...form.register('reason')}>
                <option value="opening">Opening Stock</option>
                <option value="adjustment">Adjustment</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea rows={2} {...form.register('note')} placeholder="e.g. Initial stock, damaged goods…" />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Apply'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}