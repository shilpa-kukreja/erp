'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { purchaseApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ConfirmDialog } from '@/app/components/ui/alert-dialog';
import { useState } from 'react';

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canConfirm = ['owner', 'store', 'office'].includes(user?.role);

  const q = useQuery({ queryKey: ['purchase', id], queryFn: () => purchaseApi.get(id) });
  const bill = q.data?.data?.bill;

  const confirmMutation = useMutation({
    mutationFn: () => purchaseApi.confirm(id),
    onSuccess: () => {
      toast('Confirmed — stock updated', 'success');
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['stock-balances'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      setConfirmOpen(false);
    },
    onError: (e) => toast(e.message || 'Confirm failed', 'error'),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!bill) return <div className="text-destructive">Purchase bill not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/purchase"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{bill.purchaseNo}</h1>
            <p className="text-sm text-muted-foreground">Bill No: {bill.billNo}</p>
          </div>
          <Badge variant={bill.status === 'confirmed' ? 'success' : 'outline'}>{bill.status}</Badge>
        </div>
        {bill.status === 'draft' && canConfirm && (
          <Button onClick={() => setConfirmOpen(true)}>
            <CheckCircle2 className="h-4 w-4" /> Confirm & Receive Stock
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 space-y-1 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Supplier</div>
          <div className="font-medium">{bill.supplierName}</div>
          {bill.supplierGstin && <div className="text-muted-foreground">GSTIN: {bill.supplierGstin}</div>}
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-1 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Godown</div>
          <div className="font-medium">{bill.godownName}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-1 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Bill Date</div>
          <div className="font-medium">{new Date(bill.billDate).toLocaleDateString('en-IN')}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-1 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Due Date</div>
          <div className="font-medium">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : '—'}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
              <th className="px-4 py-3 font-medium text-right">Tax %</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
              <th className="px-4 py-3 font-medium text-right">Tax</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((i, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{i.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{i.productSku}</div>
                </td>
                <td className="px-4 py-3 text-right">{i.qty}</td>
                <td className="px-4 py-3 text-right">{rupees(i.ratePaise)}</td>
                <td className="px-4 py-3 text-right">{i.taxRate}%</td>
                <td className="px-4 py-3 text-right">{rupees(i.lineSubtotalPaise)}</td>
                <td className="px-4 py-3 text-right">{rupees(i.lineTaxPaise)}</td>
                <td className="px-4 py-3 text-right font-medium">{rupees(i.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-1 rounded-lg border bg-white p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rupees(bill.subTotalPaise)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{rupees(bill.taxPaise)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Grand Total</span><span>{rupees(bill.grandTotalPaise)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Paid</span><span>{rupees(bill.paidPaise)}</span></div>
          <div className="flex justify-between font-medium text-destructive"><span>Balance</span><span>{rupees(bill.balancePaise)}</span></div>
        </div>
      </div>

      {bill.notes && (
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs uppercase text-muted-foreground mb-1">Notes</div>
          <p className="text-sm">{bill.notes}</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm & Receive Stock?"
        description="This will add all items to the selected godown's stock and create ledger entries. Cannot be undone."
        confirmText="Confirm & Receive"
        onConfirm={() => confirmMutation.mutate()}
        loading={confirmMutation.isPending}
      />
    </div>
  );
}