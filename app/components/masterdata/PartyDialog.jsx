'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';

const schema = z.object({
  type: z.enum(['customer', 'dealer', 'distributor', 'supplier']),
  name: z.string().trim().min(2, 'Min 2 chars').max(120),
  gstin: z.string().trim().max(15).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.union([z.string().trim().email('Invalid email'), z.literal('')]).optional(),
  line1: z.string().trim().max(200).optional(),
  city: z.string().trim().max(60).optional(),
  state: z.string().trim().max(60).optional(),
  pincode: z.string().trim().max(10).optional(),
  creditLimitRupees: z.coerce.number().min(0).optional(),
  creditDays: z.coerce.number().int().min(0).max(365).optional(),
  isActive: z.boolean(),
});

const rupees = (p) => (p / 100).toFixed(2);

export function PartyDialog({ open, onOpenChange, mode, party, products, onSubmit, saving }) {
  const isEdit = mode === 'edit';
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ productId: '', priceRupees: '' });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'customer', name: '', gstin: '', phone: '', email: '',
      line1: '', city: '', state: '', pincode: '',
      creditLimitRupees: 0, creditDays: 0, isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: party?.type || 'customer',
        name: party?.name || '',
        gstin: party?.gstin || '',
        phone: party?.phone || '',
        email: party?.email || '',
        line1: party?.address?.line1 || '',
        city: party?.address?.city || '',
        state: party?.address?.state || '',
        pincode: party?.address?.pincode || '',
        creditLimitRupees: party ? party.creditLimitPaise / 100 : 0,
        creditDays: party?.creditDays ?? 0,
        isActive: party?.isActive ?? true,
      });
      setRules((party?.pricingRules || []).map((r) => ({
        productId: r.productId, priceRupees: rupees(r.pricePaise),
      })));
      setNewRule({ productId: '', priceRupees: '' });
    }
  }, [open, party, form]);

  const addRule = () => {
    if (!newRule.productId || newRule.priceRupees === '' || isNaN(Number(newRule.priceRupees))) return;
    if (rules.some((r) => r.productId === newRule.productId)) return;
    setRules((r) => [...r, { productId: newRule.productId, priceRupees: newRule.priceRupees }]);
    setNewRule({ productId: '', priceRupees: '' });
  };

  const removeRule = (productId) => setRules((r) => r.filter((x) => x.productId !== productId));

  const handleSubmit = form.handleSubmit(async (v) => {
    const payload = {
      type: v.type, name: v.name,
      gstin: v.gstin || '',
      phone: v.phone || '',
      email: v.email || '',
      address: {
        line1: v.line1 || '', city: v.city || '', state: v.state || '', pincode: v.pincode || '',
      },
      pricingRules: rules.map((r) => ({
        productId: r.productId,
        pricePaise: Math.round(Number(r.priceRupees) * 100),
      })),
      creditLimitPaise: Math.round((v.creditLimitRupees || 0) * 100),
      creditDays: v.creditDays || 0,
      isActive: v.isActive,
    };
    await onSubmit(payload);
  });

  const productLabel = (id) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.name} (${p.sku})` : id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Party' : 'New Party'}</DialogTitle>
        <DialogDescription>Customer / dealer / distributor / supplier details</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select {...form.register('type')}>
                <option value="customer">Customer</option>
                <option value="dealer">Dealer</option>
                <option value="distributor">Distributor</option>
                <option value="supplier">Supplier</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input placeholder="27ABCDE1234F1Z5" {...form.register('gstin')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Address Line</Label>
            <Input {...form.register('line1')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>City</Label><Input {...form.register('city')} /></div>
            <div className="space-y-2"><Label>State</Label><Input {...form.register('state')} /></div>
            <div className="space-y-2"><Label>Pincode</Label><Input {...form.register('pincode')} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Credit Limit (₹)</Label>
              <Input type="number" step="0.01" min={0} {...form.register('creditLimitRupees')} />
            </div>
            <div className="space-y-2">
              <Label>Credit Days</Label>
              <Input type="number" min={0} max={365} {...form.register('creditDays')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pricing Overrides</Label>
            <div className="rounded-md border p-3 space-y-2">
              {rules.length === 0 && <p className="text-xs text-muted-foreground">No overrides. Base product price will apply.</p>}
              {rules.map((r) => (
                <div key={r.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{productLabel(r.productId)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">₹{r.priceRupees}</span>
                    <button type="button" className="text-destructive" onClick={() => removeRule(r.productId)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Select className="flex-1" value={newRule.productId} onChange={(e) => setNewRule((n) => ({ ...n, productId: e.target.value }))}>
                  <option value="">Select product…</option>
                  {products.filter((p) => !rules.some((r) => r.productId === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </Select>
                <Input type="number" step="0.01" min={0} placeholder="₹" className="w-28"
                  value={newRule.priceRupees}
                  onChange={(e) => setNewRule((n) => ({ ...n, priceRupees: e.target.value }))} />
                <Button type="button" variant="outline" onClick={addRule}>Add</Button>
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox id="partyActive" checked={form.watch('isActive')} onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true })} />
              <Label htmlFor="partyActive" className="cursor-pointer">Active</Label>
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