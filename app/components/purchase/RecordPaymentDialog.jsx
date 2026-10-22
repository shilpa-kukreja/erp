'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierPaymentsApi } from '@/lib/api';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function RecordPaymentDialog({ open, onOpenChange, bill, supplierBills }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState('bank');
  const [refNo, setRefNo] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && bill) {
      setAmountRupees('');
      setMode('bank');
      setRefNo('');
      setPaidAt(new Date().toISOString().slice(0, 10));
      setNotes('');
      // Pre-select the current bill
      setAllocations([{ billId: bill.id, amountPaise: bill.balancePaise }]);
    }
  }, [open, bill]);

  const amountPaise = Math.round(Number(amountRupees || 0) * 100);

  const mutation = useMutation({
    mutationFn: (data) => supplierPaymentsApi.create(data),
    onSuccess: () => {
      toast('Payment recorded successfully', 'success');
      qc.invalidateQueries({ queryKey: ['purchase', bill.id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['payables-aging'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e.message || 'Payment failed', 'error'),
  });

  const handleSubmit = () => {
    if (amountPaise <= 0) return toast('Enter a valid amount', 'error');
    
    // Filter out zero allocations and validate sum
    const validAllocs = allocations.filter(a => a.amountPaise > 0);
    const allocSum = validAllocs.reduce((s, a) => s + a.amountPaise, 0);
    
    if (validAllocs.length > 0 && allocSum > amountPaise) {
      return toast('Allocations exceed total payment amount', 'error');
    }

    mutation.mutate({
      supplierId: bill.supplierId,
      amountPaise,
      mode,
      referenceNo: refNo || undefined,
      paidAt,
      notes: notes || undefined,
      allocations: validAllocs.length > 0 ? validAllocs : undefined,
    });
  };

  const handleAllocChange = (billId, valRupees) => {
    const valPaise = Math.round(Number(valRupees || 0) * 100);
    setAllocations(prev => {
      const existing = prev.find(a => a.billId === billId);
      if (existing) {
        return prev.map(a => a.billId === billId ? { ...a, amountPaise: valPaise } : a);
      }
      return [...prev, { billId, amountPaise: valPaise }];
    });
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment to {bill.supplierName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <Label>Amount (₹)</Label>
            <Input type="number" step="0.01" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Payment Mode</Label>
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference No (optional)</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Txn ID, Cheque No" />
          </div>
          <div className="space-y-1">
            <Label>Payment Date</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Allocation Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Bill Allocations</Label>
          <div className="border rounded-md max-h-48 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2">Bill No</th>
                  <th className="px-3 py-2 text-right">Due</th>
                  <th className="px-3 py-2 text-right">Pay Now (₹)</th>
                </tr>
              </thead>
              <tbody>
                {supplierBills.map((b) => {
                  const alloc = allocations.find(a => a.billId === b.id);
                  return (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{b.purchaseNo} <span className="text-xs text-muted-foreground">({b.billNo})</span></td>
                      <td className="px-3 py-2 text-right text-destructive font-medium">{rupees(b.balancePaise)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input 
                          type="number" 
                          className="w-24 ml-auto h-8 text-right" 
                          value={alloc ? alloc.amountPaise / 100 : ''} 
                          onChange={(e) => handleAllocChange(b.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Leave blank to auto-allocate via FIFO.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}