'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { stockApi, masterdataApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { AdjustDialog } from '@/app/components/stock/AdjustDialog';
import { TransferDialog } from '@/app/components/stock/TransferDialog';

const TABS = [
  { id: 'balances',     label: 'Balances' },
  { id: 'low',          label: 'Low Stock', icon: AlertTriangle },
  { id: 'reservations', label: 'Reservations' },
];

const TYPE_LABELS = { raw: 'Raw', packing: 'Packing', semi: 'Semi', finished: 'Finished', traded: 'Traded' };

function num(v) { return Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 }); }

export default function StockPage() {
  const { user } = useAuth();
  const canWrite = ['owner', 'office', 'store'].includes(user?.role);

  const [tab, setTab] = useState('balances');
  const [godownId, setGodownId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialog, setDialog] = useState({ type: null, productId: null });

  const godownsQuery = useQuery({ queryKey: ['godowns', { limit: 200 }], queryFn: () => masterdataApi.godowns.list({ limit: 200 }) });
  const godowns = godownsQuery.data?.data?.items || [];
  const defaultGodown = godowns.find((g) => g.isDefault);
  const effectiveGodownId = godownId || defaultGodown?.id || '';

  const balanceFilters = { search, godownId: effectiveGodownId, page: 1, limit: 100 };
  const balancesQuery = useQuery({
    queryKey: ['stock-balances', balanceFilters],
    queryFn: () => stockApi.listBalances(balanceFilters),
    enabled: tab === 'balances',
  });

  const lowQuery = useQuery({
    queryKey: ['stock-low', { search }],
    queryFn: () => stockApi.listBalances({ search, onlyLowStock: 'true', page: 1, limit: 100 }),
    enabled: tab === 'low',
  });

  const resQuery = useQuery({
    queryKey: ['stock-reservations'],
    queryFn: () => stockApi.listReservations({ status: 'active', page: 1, limit: 100 }),
    enabled: tab === 'reservations',
  });

  const balances = balancesQuery.data?.data?.items || [];
  const lowItems = lowQuery.data?.data?.items || [];
  const reservations = resQuery.data?.data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">Live physical, reserved, and available quantities</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialog({ type: 'transfer', productId: null })}>
              <ArrowRightLeft className="h-4 w-4" /> Transfer
            </Button>
            <Button onClick={() => setDialog({ type: 'adjust', productId: null })}>
              <Plus className="h-4 w-4" /> Adjust Stock
            </Button>
          </div>
        )}
      </div>

      <div className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.icon && <t.icon className="mr-1 inline h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'balances' || tab === 'low') && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search product or SKU…" className="pl-9" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)} />
          </div>
          {tab === 'balances' && (
            <Select value={effectiveGodownId} onChange={(e) => setGodownId(e.target.value)} className="w-56">
              {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}{g.isDefault ? ' (default)' : ''}</option>)}
            </Select>
          )}
          <Button variant="outline" onClick={() => setSearch(searchInput)}>Search</Button>
        </div>
      )}

      {tab === 'balances' && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Physical</th>
                <th className="px-4 py-3 font-medium text-right">Reserved</th>
                <th className="px-4 py-3 font-medium text-right">Available</th>
                <th className="px-4 py-3 font-medium text-right">Reorder Pt</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {balancesQuery.isLoading && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!balancesQuery.isLoading && balances.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">No products</td></tr>}
              {balances.map((b) => (
                <tr key={b.productId} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.sku}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[b.type]}</td>
                  <td className="px-4 py-3">{b.unit?.symbol || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{num(b.physicalQty)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{num(b.reservedQty)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{num(b.availableQty)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{num(b.reorderPoint)}</td>
                  <td className="px-4 py-3">
                    {b.isLowStock
                      ? <Badge variant="destructive">Low</Badge>
                      : b.physicalQty > 0 ? <Badge variant="success">OK</Badge> : <Badge variant="outline">Empty</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'low' && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">On Hand</th>
                <th className="px-4 py-3 font-medium text-right">Reorder Point</th>
                <th className="px-4 py-3 font-medium text-right">Shortage</th>
                <th className="px-4 py-3 font-medium">Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {lowQuery.isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!lowQuery.isLoading && lowItems.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No low-stock items</td></tr>}
              {lowItems.map((b) => (
                <tr key={b.productId} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.sku}</td>
                  <td className="px-4 py-3">{b.unit?.symbol || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-destructive">{num(b.physicalQty)}</td>
                  <td className="px-4 py-3 text-right">{num(b.reorderPoint)}</td>
                  <td className="px-4 py-3 text-right">{num(b.reorderPoint - b.physicalQty)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {b.breakdown?.map((x) => `${x.godownName}: ${num(x.physicalQty)}`).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reservations' && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Godown</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {resQuery.isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!resQuery.isLoading && reservations.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No active reservations</td></tr>}
              {reservations.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{r.orderId.slice(-8)}</td>
                  <td className="px-4 py-3">{r.productName || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.productSku || '—'}</td>
                  <td className="px-4 py-3">{r.godownName || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{num(r.qty)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdjustDialog
        open={dialog.type === 'adjust'}
        onOpenChange={(o) => !o && setDialog({ type: null, productId: null })}
        godowns={godowns}
        defaultGodownId={effectiveGodownId}
      />

      <TransferDialog
        open={dialog.type === 'transfer'}
        onOpenChange={(o) => !o && setDialog({ type: null, productId: null })}
        godowns={godowns}
      />
    </div>
  );
}