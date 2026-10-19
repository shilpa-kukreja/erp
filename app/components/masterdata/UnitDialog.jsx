'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(40),
  symbol: z.string().trim().min(1, 'Required').max(10),
  type: z.enum(['weight', 'volume', 'count']),
  decimalPlaces: z.coerce.number().int().min(0).max(4),
  isActive: z.boolean(),
});

export function UnitDialog({ open, onOpenChange, mode, unit, onSubmit, saving }) {
  const isEdit = mode === 'edit';
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', symbol: '', type: 'count', decimalPlaces: 0, isActive: true },
  });

  useEffect(() => {
    if (open) form.reset({
      name: unit?.name || '',
      symbol: unit?.symbol || '',
      type: unit?.type || 'count',
      decimalPlaces: unit?.decimalPlaces ?? 0,
      isActive: unit?.isActive ?? true,
    });
  }, [open, unit, form]);

  const handleSubmit = form.handleSubmit(async (v) => onSubmit(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Unit' : 'New Unit'}</DialogTitle>
        <DialogDescription>Define a measurement unit</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Kilogram" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input placeholder="kg" {...form.register('symbol')} />
              {form.formState.errors.symbol && <p className="text-xs text-destructive">{form.formState.errors.symbol.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select {...form.register('type')}>
                <option value="weight">Weight</option>
                <option value="volume">Volume</option>
                <option value="count">Count</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Decimal Places</Label>
              <Input type="number" min={0} max={4} {...form.register('decimalPlaces')} />
            </div>
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={form.watch('isActive')}
                onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
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