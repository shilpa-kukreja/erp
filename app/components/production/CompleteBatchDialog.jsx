'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';

export function CompleteBatchDialog({ open, onOpenChange, batch, onSubmit, saving }) {
  const [producedQty, setProducedQty] = useState(0);
  const [wastageQty, setWastageQty] = useState(0);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    if (open && batch) {
      setProducedQty(batch.plannedQty);
      setWastageQty(0);
      setMaterials(batch.materialsUsed.map((m) => ({
        productId: m.productId,
        productName: m.productName,
        unitSymbol: m.unitSymbol,
        qtyRequired: m.qtyRequired,
        qtyUsed: m.qtyRequired,
      })));
    }
  }, [open, batch]);

  const updateMaterial = (pid, qtyUsed) => {
    setMaterials((arr) => arr.map((m) => (m.productId === pid ? { ...m, qtyUsed } : m)));
  };

  const handleSubmit = () => {
    if (Number(producedQty) <= 0) return;
    onSubmit({
      producedQty: Number(producedQty),
      wastageQty: Number(wastageQty) || 0,
      materialsOverride: materials
        .filter((m) => Number(m.qtyUsed) !== Number(m.qtyRequired))
        .map((m) => ({ productId: m.productId, qtyUsed: Number(m.qtyUsed) })),
    });
  };

  if (!batch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Complete Batch {batch.batchNo}</DialogTitle>
        <DialogDescription>
          This will deduct materials from stock and add produced quantity. Cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Produced Qty ({batch.productUnitSymbol})</Label>
            <Input type="number" step="0.001" min={0.001} value={producedQty}
              onChange={(e) => setProducedQty(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Wastage Qty (optional)</Label>
            <Input type="number" step="0.001" min={0} value={wastageQty}
              onChange={(e) => setWastageQty(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Materials Used</Label>
          <div className="rounded-md border p-2 space-y-2">
            {materials.map((m) => (
              <div key={m.productId} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.productName}</div>
                  <div className="text-xs text-muted-foreground">Required: {Number(m.qtyRequired).toFixed(3)} {m.unitSymbol}</div>
                </div>
                <Input type="number" step="0.001" min={0} value={m.qtyUsed}
                  onChange={(e) => updateMaterial(m.productId, e.target.value)}
                  className="w-28" />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Completing…' : 'Complete & Update Stock'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}