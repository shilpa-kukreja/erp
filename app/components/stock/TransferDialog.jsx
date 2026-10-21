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
  fromGodownId: z.string().min(1, 'Select source'),
  toGodownId: z.string().min(1, 'Select destination'),
  qty: z.coerce.number().positive('Must be > 0'),
  note: z.string().max(300).optional(),
}).refine((d) => d.fromGodownId !== d.toGodownId, { path: ['toGodownId'], message: 'Must differ from source' });

export function TransferDialog({ open, onOpenChange, godowns }) {
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
    defaultValues: { productId: '', fromGodownId: '', toGodownId: '', qty: 0, note: '' },
  });

  useEffect(() => {
    if (open) form.reset({ productId: '', fromGodownId: '', toGodownId: '', qty: 0, note: '' });
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data) => stockApi.transfer(data),
    onSuccess: () => {
      toast('Stock transferred', 'success');
      qc.invalidateQueries({ queryKey: ['stock-balances'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e.message || 'Transfer failed', 'error'),
  });

  const handleSubmit = form.handleSubmit((v) =>
    mutation.mutate({ ...v, note: v.note || undefined, qty: Number(v.qty) })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Transfer Stock</DialogTitle>
        <DialogDescription>Move quantity between godowns (atomic)</DialogDescription>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From Godown</Label>
              <Select {...form.register('fromGodownId')}>
                <option value="">Select…</option>
                {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Godown</Label>
              <Select {...form.register('toGodownId')}>
                <option value="">Select…</option>
                {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
              {form.formState.errors.toGodownId && <p className="text-xs text-destructive">{form.formState.errors.toGodownId.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" step="0.001" {...form.register('qty')} />
            {form.formState.errors.qty && <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea rows={2} {...form.register('note')} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Transferring…' : 'Transfer'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}