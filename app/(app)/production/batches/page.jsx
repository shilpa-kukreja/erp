'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { productionApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

export default function BatchesPage() {
  const { user } = useAuth();
  const canWrite = ['owner', 'store', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const q = useQuery({ queryKey: ['batches', filters], queryFn: () => productionApi.batches.list(filters) });
  const items = q.data?.data?.items || [];
  const pagination = q.data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Production Batches</h1>
          <p className="text-sm text-muted-foreground">Manufacturing batches with auto batch numbers</p>
        </div>
        {canWrite && (
          <Link href="/production/batches/new">
            <Button><Plus className="h-4 w-4" /> New Batch</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search batch no…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setFilters((f) => ({ ...f, search: searchInput, page: 1 }))} />
        </div>
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} className="w-40">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button variant="outline" onClick={() => setFilters((f) => ({ ...f, search: searchInput, page: 1 }))}>Search</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Batch No</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Godown</th>
              <th className="px-4 py-3 font-medium text-right">Planned</th>
              <th className="px-4 py-3 font-medium text-right">Produced</th>
              <th className="px-4 py-3 font-medium">Mfg Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!q.isLoading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No batches yet</td></tr>}
            {items.map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/production/batches/${b.id}`} className="font-medium text-primary hover:underline">{b.batchNo}</Link>
                </td>
                <td className="px-4 py-3">{b.productName}</td>
                <td className="px-4 py-3">{b.godownName}</td>
                <td className="px-4 py-3 text-right">{b.plannedQty}</td>
                <td className="px-4 py-3 text-right font-medium">{b.producedQty || '—'}</td>
                <td className="px-4 py-3 text-xs">{new Date(b.mfgDate).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <Badge variant={b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                    {b.status}
                  </Badge>
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
    </div>
  );
}