'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

const REASONS = ['opening', 'purchase', 'production-in', 'production-out', 'sale', 'sale-return', 'adjustment', 'transfer-in', 'transfer-out'];

const REASON_VARIANT = {
  opening: 'secondary', purchase: 'success', 'production-in': 'success', 'production-out': 'outline',
  sale: 'default', 'sale-return': 'secondary', adjustment: 'outline',
  'transfer-in': 'success', 'transfer-out': 'outline',
};

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 }); }

export default function LedgerPage() {
  const [filters, setFilters] = useState({ reason: '', from: '', to: '', page: 1, limit: 50 });
  const [searchInput, setSearchInput] = useState('');

  const q = useQuery({ queryKey: ['stock-ledger', filters], queryFn: () => stockApi.listLedger(filters) });
  const items = q.data?.data?.items || [];
  const pagination = q.data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stock Ledger</h1>
        <p className="text-sm text-muted-foreground">Immutable log of every stock movement</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Input placeholder="Filter by product (from Balances page)" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} disabled />
        </div>
        <Select value={filters.reason} onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value, page: 1 }))} className="w-44">
          <option value="">All Reasons</option>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Input type="date" className="w-40" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))} />
        <Input type="date" className="w-40" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))} />
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Godown</th>
              <th className="px-4 py-3 font-medium text-right">Change</th>
              <th className="px-4 py-3 font-medium text-right">Before → After</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Ref</th>
              <th className="px-4 py-3 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!q.isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No entries</td></tr>}
            {items.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{l.productName || '—'}</div>
                  <div className="font-mono text-xs text-muted-foreground">{l.productSku}</div>
                </td>
                <td className="px-4 py-3">{l.godownName || '—'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${l.qtyChange > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {l.qtyChange > 0 ? '+' : ''}{fmt(l.qtyChange)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmt(l.qtyBefore)} → {fmt(l.qtyAfter)}</td>
                <td className="px-4 py-3"><Badge variant={REASON_VARIANT[l.reason] || 'outline'}>{l.reason}</Badge></td>
                <td className="px-4 py-3 text-xs">
                  <div>{l.refType}</div>
                  {l.refId && <div className="font-mono text-muted-foreground">{l.refId.slice(-8)}</div>}
                  {l.note && <div className="text-muted-foreground italic">{l.note}</div>}
                </td>
                <td className="px-4 py-3 text-xs"><div>{l.userName}</div><div className="text-muted-foreground capitalize">{l.userRole}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground">Page {pagination.page} of {pagination.totalPages} • {pagination.total} entries</div>
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