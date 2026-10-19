'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';

const schema = z.object({
  type: z.enum(['raw', 'packing', 'semi', 'finished', 'traded']),
  name: z.string().trim().min(2, 'Min 2 chars').max(120),
  sku: z.string().trim().min(1, 'Required').max(40).transform((s) => s.toUpperCase()),
  unit: z.string().min(1, 'Select unit'),
  hsnCode: z.string().trim().max(12).optional(),
  taxRate: z.coerce.number().int().refine((v) => [0, 5, 12, 18, 28].includes(v), 'Invalid GST rate'),
  priceRupees: z.coerce.number().min(0, 'Required'),
  costRupees: z.coerce.number().min(0).optional(),
  reorderPoint: z.coerce.number().min(0),
  reorderQty: z.coerce.number().min(0),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

export function ProductDialog({ open, onOpenChange, mode, product, units, onSubmit, saving }) {
  const isEdit = mode === 'edit';
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'finished', name: '', sku: '', unit: '', hsnCode: '', taxRate: 18,
      priceRupees: 0, costRupees: 0, reorderPoint: 0, reorderQty: 0, description: '', isActive: true,
    },
  });

  useEffect(() => {
    if (open) form.reset({
      type: product?.type || 'finished',
      name: product?.name || '',
      sku: product?.sku || '',
      unit: product?.unit?.id || '',
      hsnCode: product?.hsnCode || '',
      taxRate: product?.taxRate ?? 18,
      priceRupees: product ? product.basePricePaise / 100 : 0,
      costRupees: product ? product.costPerUnitPaise / 100 : 0,
      reorderPoint: product?.reorderPoint ?? 0,
      reorderQty: product?.reorderQty ?? 0,
      description: product?.description || '',
      isActive: product?.isActive ?? true,
    });
  }, [open, product, form]);

  const handleSubmit = form.handleSubmit(async (v) => {
    const payload = {
      type: v.type, name: v.name, sku: v.sku, unit: v.unit,
      hsnCode: v.hsnCode || '',
      taxRate: v.taxRate,
      basePricePaise: Math.round(v.priceRupees * 100),
      costPerUnitPaise: Math.round((v.costRupees || 0) * 100),
      reorderPoint: v.reorderPoint, reorderQty: v.reorderQty,
      description: v.description || '',
      isActive: v.isActive,
    };
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Product' : 'New Product'}</DialogTitle>
        <DialogDescription>Product master details</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select {...form.register('type')}>
                <option value="raw">Raw Material</option>
                <option value="packing">Packing Material</option>
                <option value="semi">Semi-Finished</option>
                <option value="finished">Finished Goods</option>
                <option value="traded">Traded Item</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="PRD-001" {...form.register('sku')} />
              {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Product name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select {...form.register('unit')}>
                <option value="">Select…</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </Select>
              {form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input placeholder="1234" {...form.register('hsnCode')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>GST Rate</Label>
              <Select {...form.register('taxRate')}>
                {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" step="0.01" min={0} {...form.register('priceRupees')} />
              {form.formState.errors.priceRupees && <p className="text-xs text-destructive">{form.formState.errors.priceRupees.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cost (₹)</Label>
              <Input type="number" step="0.01" min={0} {...form.register('costRupees')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input type="number" min={0} {...form.register('reorderPoint')} />
            </div>
            <div className="space-y-2">
              <Label>Reorder Qty</Label>
              <Input type="number" min={0} {...form.register('reorderQty')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} {...form.register('description')} />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox id="prodActive" checked={form.watch('isActive')} onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true })} />
              <Label htmlFor="prodActive" className="cursor-pointer">Active</Label>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}