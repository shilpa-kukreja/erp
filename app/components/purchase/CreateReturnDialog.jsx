'use client';
import { useState, useEffect } from 'react'; // <-- Added useEffect here
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseReturnsApi } from '@/lib/api';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';

export function CreateReturnDialog({ open, onOpenChange, bill }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('');

  // Reset form when dialog opens
  useEffect(() => { // <-- Changed from useState to useEffect
    if (open && bill) {
      setItems(bill.items.map(i => ({ 
        productId: i.productId, 
        name: i.productName, 
        max: i.qty, 
        returnQty: 0 
      })));
      setReason('');
    }
  }, [open, bill]); // Dependencies array is correct

  const mutation = useMutation({
    mutationFn: (data) => purchaseReturnsApi.create(data),
    onSuccess: () => {
      toast('Items returned successfully. Stock and payables updated.', 'success');
      qc.invalidateQueries({ queryKey: ['purchase', bill.id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['payables-aging'] });
      qc.invalidateQueries({ queryKey: ['stock-balances'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e.message || 'Return failed', 'error'),
  });

  const handleQtyChange = (idx, val) => {
    setItems(prev => {
      const newArr = [...prev];
      let num = Number(val);
      if (num > newArr[idx].max) num = newArr[idx].max;
      if (num < 0) num = 0;
      newArr[idx].returnQty = num;
      return newArr;
    });
  };

  const handleSubmit = () => {
    const validItems = items.filter(i => i.returnQty > 0);
    if (validItems.length === 0) return toast('Select at least one item to return', 'error');

    mutation.mutate({
      purchaseBillId: bill.id,
      items: validItems.map(i => ({ productId: i.productId, qty: i.returnQty })),
      reason: reason || undefined,
    });
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return Items to Supplier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged goods, wrong item, etc." />
          </div>

          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Purchased Qty</th>
                  <th className="px-3 py-2 text-right">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                      No items found on this bill.
                    </td>
                  </tr>
                )}
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.max}</td>
                    <td className="px-3 py-2 text-right">
                      <Input 
                        type="number" 
                        min="0" 
                        max={item.max} 
                        className="w-24 ml-auto h-8 text-right" 
                        value={item.returnQty || ''} 
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Processing…' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}