'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil } from 'lucide-react';
import { masterdataApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ProductDialog } from '@/app/components/masterdata/ProductDialog';

const TYPE_LABELS = { raw: 'Raw Material', packing: 'Packing', semi: 'Semi-Finished', finished: 'Finished', traded: 'Traded' };
const TYPE_COLORS = { raw: 'secondary', packing: 'secondary', semi: 'outline', finished: 'default', traded: 'outline' };

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canWrite = ['owner', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', type: '', isActive: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', product: null });

  const listQuery = useQuery({ queryKey: ['products', filters], queryFn: () => masterdataApi.products.list(filters) });
  const unitsQuery = useQuery({ queryKey: ['units', { limit: 200 }], queryFn: () => masterdataApi.units.list({ limit: 200 }) });

  const items = listQuery.data?.data?.items || [];
  const pagination = listQuery.data?.data?.pagination;
  const units = unitsQuery.data?.data?.items || [];

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id ? masterdataApi.products.update(id, data) : masterdataApi.products.create(data),
    onSuccess: () => {
      toast(dialog.mode === 'edit' ? 'Product updated' : 'Product created', 'success');
      qc.invalidateQueries({ queryKey: ['products'] });
      setDialog({ open: false, mode: 'create', product: null });
    },
    onError: (e) => toast(e.message || 'Save failed', 'error'),
  });

  const onSearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Raw, packing, semi-finished, finished and traded items</p>
        </div>
        {canWrite && (
          <Button onClick={() => setDialog({ open: true, mode: 'create', product: null })} disabled={units.length === 0}>
            <Plus className="h-4 w-4" /> New Product
          </Button>
        )}
      </div>

      {units.length === 0 && !unitsQuery.isLoading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Create at least one <a className="underline" href="/masterdata/units">Unit</a> before adding products.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, SKU, HSN…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
        </div>
        <Select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} className="w-48">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, page: 1 }))} className="w-36">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Button variant="outline" onClick={onSearch}>Search</Button>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">HSN</th>
                <th className="px-4 py-3 font-medium">GST</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!listQuery.isLoading && items.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">No products yet</td></tr>}
              {items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3"><Badge variant={TYPE_COLORS[p.type]}>{TYPE_LABELS[p.type]}</Badge></td>
                  <td className="px-4 py-3">{p.unit?.symbol || '—'}</td>
                  <td className="px-4 py-3">{p.hsnCode || '—'}</td>
                  <td className="px-4 py-3">{p.taxRate}%</td>
                  <td className="px-4 py-3 text-right font-medium">{rupees(p.basePricePaise)}</td>
                  <td className="px-4 py-3"><Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, mode: 'edit', product: p })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground">Page {pagination.page} of {pagination.totalPages} • {pagination.total} total</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ProductDialog
        open={dialog.open}
        onOpenChange={(open) => !open && setDialog({ open: false, mode: 'create', product: null })}
        mode={dialog.mode}
        product={dialog.product}
        units={units}
        onSubmit={(data) => saveMutation.mutate({ id: dialog.product?.id, data })}
        saving={saveMutation.isPending}
      />
    </div>
  );
}