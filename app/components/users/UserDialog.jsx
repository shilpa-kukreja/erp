'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'office', label: 'Office / Accounts' },
  { value: 'store', label: 'Store / Production' },
  { value: 'dispatch', label: 'Packing / Dispatch' },
];

const baseSchema = z.object({
  name: z.string().trim().min(2, 'Min 2 chars').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Min 8 chars').optional(),
  role: z.enum(['owner', 'office', 'store', 'dispatch']),
  isActive: z.boolean().optional(),
});

export function UserDialog({ open, onOpenChange, mode, user, onSubmit, saving }) {
  const isEdit = mode === 'edit';

  const schema = isEdit
    ? baseSchema.extend({ email: z.string().email().optional(), password: z.string().optional() })
    : baseSchema.extend({ password: z.string().min(8, 'Min 8 chars') });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: '',
      role: user?.role || 'office',
      isActive: user?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        role: user?.role || 'office',
        isActive: user?.isActive ?? true,
      });
    }
  }, [open, user, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = { name: values.name, role: values.role, isActive: values.isActive };
    if (values.phone) payload.phone = values.phone; else payload.phone = null;
    if (!isEdit) {
      payload.email = values.email;
      payload.password = values.password;
    }
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Update user details. Email and password cannot be changed here.' : 'Create a new staff account.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="off" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" {...form.register('phone')} />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select id="role" {...form.register('role')}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.watch('isActive')}
                onChange={(e) => form.setValue('isActive', e.target.checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || (isEdit && !form.formState.isDirty)}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}