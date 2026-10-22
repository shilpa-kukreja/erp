'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { purchaseApi, masterdataApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PurchaseListPage() {
  const { user } = useAuth();
  const canWrite = ['owner', 'store', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const q = useQuery({ queryKey: ['purchases', filters], queryFn: () => purchaseApi.list(filters) });
  const items = q.data?.data?.items || [];
  const pagination = q.data?.data?.pagination;

  const onSearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Bills</h1>
          <p className="text-sm text-muted-foreground">Goods received from suppliers</p>
        </div>
        {canWrite && (
          <Link href="/purchase/new">
            <Button><Plus className="h-4 w-4" /> New Purchase</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search purchase no or bill no…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
        </div>
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} className="w-40">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
        </Select>
        <Button variant="outline" onClick={onSearch}>Search</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Purchase No</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Bill No</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Paid</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!q.isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No purchase bills yet</td></tr>}
            {items.map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/purchase/${b.id}`} className="font-medium text-primary hover:underline">{b.purchaseNo}</Link>
                </td>
                <td className="px-4 py-3">{b.supplierName || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.billNo}</td>
                <td className="px-4 py-3 text-xs">{new Date(b.billDate).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-medium">{rupees(b.grandTotalPaise)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{rupees(b.paidPaise)}</td>
                <td className="px-4 py-3 text-right font-medium text-destructive">{rupees(b.balancePaise)}</td>
                <td className="px-4 py-3">
                  <Badge variant={b.status === 'confirmed' ? 'success' : 'outline'}>{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}