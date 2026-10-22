'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { productionApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ConfirmDialog } from '@/app/components/ui/alert-dialog';
import { CompleteBatchDialog } from '@/app/components/production/CompleteBatchDialog';

export default function BatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canWrite = ['owner', 'store', 'office'].includes(user?.role);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const q = useQuery({ queryKey: ['batch', id], queryFn: () => productionApi.batches.get(id) });
  const batch = q.data?.data?.batch;

  const completeMut = useMutation({
    mutationFn: (data) => productionApi.batches.complete(id, data),
    onSuccess: () => {
      toast('Batch completed — stock updated', 'success');
      qc.invalidateQueries({ queryKey: ['batch', id] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['stock-balances'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      setCompleteOpen(false);
    },
    onError: (e) => toast(e.message || 'Complete failed', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: () => productionApi.batches.cancel(id),
    onSuccess: () => {
      toast('Batch cancelled', 'success');
      qc.invalidateQueries({ queryKey: ['batch', id] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      setCancelOpen(false);
    },
    onError: (e) => toast(e.message || 'Cancel failed', 'error'),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!batch) return <div className="text-destructive">Batch not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/production/batches"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{batch.batchNo}</h1>
            <p className="text-sm text-muted-foreground">{batch.productName}</p>
          </div>
          <Badge variant={batch.status === 'completed' ? 'success' : batch.status === 'cancelled' ? 'destructive' : 'outline'}>
            {batch.status}
          </Badge>
        </div>
        {batch.status === 'draft' && canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 className="h-4 w-4" /> Complete Batch
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Godown</div>
          <div className="font-medium">{batch.godownName}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Planned Qty</div>
          <div className="font-medium">{batch.plannedQty} {batch.productUnitSymbol}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Produced / Wastage</div>
          <div className="font-medium">
            {batch.producedQty} {batch.productUnitSymbol}
            {batch.wastageQty > 0 && <span className="text-destructive"> / {batch.wastageQty} wasted</span>}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Mfg Date</div>
          <div className="font-medium">{new Date(batch.mfgDate).toLocaleDateString('en-IN')}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Exp Date</div>
          <div className="font-medium">{batch.expDate ? new Date(batch.expDate).toLocaleDateString('en-IN') : '—'}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Completed At</div>
          <div className="font-medium">{batch.completedAt ? new Date(batch.completedAt).toLocaleString() : '—'}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="border-b px-4 py-3"><h2 className="font-medium">Materials</h2></div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium text-right">Required</th>
              <th className="px-4 py-3 font-medium text-right">Used</th>
            </tr>
          </thead>
          <tbody>
            {batch.materialsUsed.map((m, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-3">{m.productName}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.productSku}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.qtyRequired).toFixed(3)} {m.unitSymbol || ''}</td>
                <td className="px-4 py-3 text-right font-medium">{Number(m.qtyUsed).toFixed(3)} {m.unitSymbol || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CompleteBatchDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        batch={batch}
        onSubmit={(data) => completeMut.mutate(data)}
        saving={completeMut.isPending}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this batch?"
        description="Only draft batches can be cancelled. No stock impact."
        confirmText="Cancel Batch"
        confirmVariant="destructive"
        onConfirm={() => cancelMut.mutate()}
        loading={cancelMut.isPending}
      />
    </div>
  );
}