'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Power } from 'lucide-react';
import { productionApi, masterdataApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { BomDialog } from '@/app/components/production/BomDialog';

export default function BomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canWrite = ['owner', 'store', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', isActive: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', bom: null });

  const listQ = useQuery({ queryKey: ['boms', filters], queryFn: () => productionApi.boms.list(filters) });
  const items = listQ.data?.data?.items || [];
  const pagination = listQ.data?.data?.pagination;

  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id ? productionApi.boms.update(id, data) : productionApi.boms.create(data),
    onSuccess: () => {
      toast(dialog.mode === 'edit' ? 'BOM updated' : 'BOM created', 'success');
      qc.invalidateQueries({ queryKey: ['boms'] });
      setDialog({ open: false, mode: 'create', bom: null });
    },
    onError: (e) => toast(e.message || 'Save failed', 'error'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id) => productionApi.boms.update(id, { isActive: false }),
    onSuccess: () => {
      toast('BOM deactivated', 'success');
      qc.invalidateQueries({ queryKey: ['boms'] });
    },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BOMs (Recipes)</h1>
          <p className="text-sm text-muted-foreground">Bill of materials — one active per product</p>
        </div>
        {canWrite && (
          <Button onClick={() => setDialog({ open: true, mode: 'create', bom: null })}>
            <Plus className="h-4 w-4" /> New BOM
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search product…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setFilters((f) => ({ ...f, search: searchInput, page: 1 }))} />
        </div>
        <Select value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, page: 1 }))} className="w-36">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Button variant="outline" onClick={() => setFilters((f) => ({ ...f, search: searchInput, page: 1 }))}>Search</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium text-right">Output Qty</th>
              <th className="px-4 py-3 font-medium text-right">Materials</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!listQ.isLoading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No BOMs yet</td></tr>}
            {items.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{b.productName}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.productSku}</td>
                <td className="px-4 py-3 text-right">{b.outputQty}</td>
                <td className="px-4 py-3 text-right">{b.items.length} item(s)</td>
                <td className="px-4 py-3"><Badge variant={b.isActive ? 'success' : 'destructive'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3 text-right">
                  {canWrite && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, mode: 'edit', bom: b })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {b.isActive && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Deactivate"
                          onClick={() => deactivateMut.mutate(b.id)} disabled={deactivateMut.isPending}>
                          <Power className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <BomDialog
        open={dialog.open}
        onOpenChange={(o) => !o && setDialog({ open: false, mode: 'create', bom: null })}
        mode={dialog.mode}
        bom={dialog.bom}
        onSubmit={(data) => saveMut.mutate({ id: dialog.bom?.id, data })}
        saving={saveMut.isPending}
      />
    </div>
  );
}