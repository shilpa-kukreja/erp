'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';

const schema = z.object({
  name: z.string().trim().min(2, 'Min 2 chars').max(80),
  address: z.string().trim().max(300).optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export function GodownDialog({ open, onOpenChange, mode, godown, onSubmit, saving }) {
  const isEdit = mode === 'edit';
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', isDefault: false, isActive: true },
  });

  useEffect(() => {
    if (open) form.reset({
      name: godown?.name || '',
      address: godown?.address || '',
      isDefault: godown?.isDefault ?? false,
      isActive: godown?.isActive ?? true,
    });
  }, [open, godown, form]);

  const handleSubmit = form.handleSubmit(async (v) => onSubmit(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Godown' : 'New Godown'}</DialogTitle>
        <DialogDescription>Storage location details</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Main Godown" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input placeholder="Street, City" {...form.register('address')} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="isDefault" checked={form.watch('isDefault')} onChange={(e) => form.setValue('isDefault', e.target.checked, { shouldDirty: true })} />
              <Label htmlFor="isDefault" className="cursor-pointer">Set as default</Label>
            </div>
            {isEdit && (
              <div className="flex items-center gap-2">
                <Checkbox id="isActive" checked={form.watch('isActive')} onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true })} />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}