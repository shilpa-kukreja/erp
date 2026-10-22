// 'use client';
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { Plus, Search, Pencil } from 'lucide-react';
// import { masterdataApi } from '@/lib/api';
// import { useAuth } from '@/app/components/providers/AuthProvider';
// import { useToast } from '@/app/components/providers/ToastProvider';
// import { Input } from '@/app/components/ui/input';
// import { Select } from '@/app/components/ui/select';
// import { Button } from '@/app/components/ui/button';
// import { Badge } from '@/app/components/ui/badge';
// import { PartyDialog } from '@/app/components/masterdata/PartyDialog';

// const TYPE_LABELS = { customer: 'Customer', dealer: 'Dealer', distributor: 'Distributor', supplier: 'Supplier' };


// export default function PartiesPage() {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const qc = useQueryClient();
//   const canWrite = ['owner', 'office'].includes(user?.role);

//   const [filters, setFilters] = useState({ search: '', type: '', isActive: '', page: 1, limit: 20 });
//   const [searchInput, setSearchInput] = useState('');
//   const [dialog, setDialog] = useState({ open: false, mode: 'create', party: null });

//   const listQuery = useQuery({ queryKey: ['parties', filters], queryFn: () => masterdataApi.parties.list(filters) });
//   const productsQuery = useQuery({ queryKey: ['products', { limit: 200 }], queryFn: () => masterdataApi.products.list({ limit: 200 }) });

//   const items = listQuery.data?.data?.items || [];
//   const pagination = listQuery.data?.data?.pagination;
//   const products = productsQuery.data?.data?.items || [];

//   const saveMutation = useMutation({
//     mutationFn: ({ id, data }) => id ? masterdataApi.parties.update(id, data) : masterdataApi.parties.create(data),
//     onSuccess: () => {
//       toast(dialog.mode === 'edit' ? 'Party updated' : 'Party created', 'success');
//       qc.invalidateQueries({ queryKey: ['parties'] });
//       setDialog({ open: false, mode: 'create', party: null });
//     },
//     onError: (e) => toast(e.message || 'Save failed', 'error'),
//   });

//   const onSearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold">Parties</h1>
//           <p className="text-sm text-muted-foreground">Customers, dealers, distributors and suppliers</p>
//         </div>
//         {canWrite && (
//           <Button onClick={() => setDialog({ open: true, mode: 'create', party: null })}>
//             <Plus className="h-4 w-4" /> New Party
//           </Button>
//         )}
//       </div>

//       <div className="flex flex-wrap items-center gap-2">
//         <div className="relative flex-1 min-w-[220px]">
//           <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//           <Input placeholder="Search name, phone, GSTIN…" className="pl-9" value={searchInput}
//             onChange={(e) => setSearchInput(e.target.value)}
//             onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
//         </div>
//         <Select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} className="w-44">
//           <option value="">All Types</option>
//           {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
//         </Select>
//         <Select value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, page: 1 }))} className="w-36">
//           <option value="">All Status</option>
//           <option value="true">Active</option>
//           <option value="false">Inactive</option>
//         </Select>
//         <Button variant="outline" onClick={onSearch}>Search</Button>
//       </div>

//       <div className="rounded-lg border bg-white">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="border-b bg-muted/40 text-left">
//               <tr>
//                 <th className="px-4 py-3 font-medium">Name</th>
//                 <th className="px-4 py-3 font-medium">Type</th>
//                 <th className="px-4 py-3 font-medium">Phone</th>
//                 <th className="px-4 py-3 font-medium">GSTIN</th>
//                 <th className="px-4 py-3 font-medium">City</th>
//                 <th className="px-4 py-3 font-medium">Rules</th>
//                 <th className="px-4 py-3 font-medium">Status</th>
//                 <th className="px-4 py-3 font-medium text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {listQuery.isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
//               {!listQuery.isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No parties yet</td></tr>}
//               {items.map((p) => (
//                 <tr key={p.id} className="border-b last:border-0">
//                   <td className="px-4 py-3 font-medium">{p.name}</td>
//                   <td className="px-4 py-3"><Badge variant="secondary">{TYPE_LABELS[p.type]}</Badge></td>
//                   <td className="px-4 py-3">{p.phone || '—'}</td>
//                   <td className="px-4 py-3 font-mono text-xs">{p.gstin || '—'}</td>
//                   <td className="px-4 py-3">{p.address?.city || '—'}</td>
//                   <td className="px-4 py-3">{p.pricingRules?.length ? `${p.pricingRules.length} override${p.pricingRules.length > 1 ? 's' : ''}` : '—'}</td>
//                   <td className="px-4 py-3"><Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
//                   <td className="px-4 py-3 text-right">
//                     {canWrite && (
//                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, mode: 'edit', party: p })}>
//                         <Pencil className="h-4 w-4" />
//                       </Button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         {pagination && pagination.totalPages > 1 && (
//           <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
//             <div className="text-muted-foreground">Page {pagination.page} of {pagination.totalPages} • {pagination.total} total</div>
//             <div className="flex gap-2">
//               <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
//               <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
//             </div>
//           </div>
//         )}
//       </div>

//       <PartyDialog
//         open={dialog.open}
//         onOpenChange={(open) => !open && setDialog({ open: false, mode: 'create', party: null })}
//         mode={dialog.mode}
//         party={dialog.party}
//         products={products}
//         onSubmit={(data) => saveMutation.mutate({ id: dialog.party?.id, data })}
//         saving={saveMutation.isPending}
//       />
//     </div>
//   );
// }

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { masterdataApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ConfirmDialog } from '@/app/components/ui/alert-dialog';
import { PartyDialog } from '@/app/components/masterdata/PartyDialog';

const TYPE_LABELS = { customer: 'Customer', dealer: 'Dealer', distributor: 'Distributor', supplier: 'Supplier' };

export default function PartiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canWrite = ['owner', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', type: '', isActive: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', party: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const listQuery = useQuery({ queryKey: ['parties', filters], queryFn: () => masterdataApi.parties.list(filters) });
  const productsQuery = useQuery({ queryKey: ['products', { limit: 200 }], queryFn: () => masterdataApi.products.list({ limit: 200 }) });

  const items = listQuery.data?.data?.items || [];
  const pagination = listQuery.data?.data?.pagination;
  const products = productsQuery.data?.data?.items || [];

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id ? masterdataApi.parties.update(id, data) : masterdataApi.parties.create(data),
    onSuccess: () => {
      toast(dialog.mode === 'edit' ? 'Party updated' : 'Party created', 'success');
      qc.invalidateQueries({ queryKey: ['parties'] });
      setDialog({ open: false, mode: 'create', party: null });
    },
    onError: (e) => toast(e.message || 'Save failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => masterdataApi.parties.delete(id),
    onSuccess: () => {
      toast('Deleted', 'success');
      qc.invalidateQueries({ queryKey: ['parties'] });
      setDeleteTarget(null);
    },
    onError: (e) => toast(e.message || 'Delete failed', 'error'),
  });

  const onSearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Parties</h1>
          <p className="text-sm text-muted-foreground">Customers, dealers, distributors and suppliers</p>
        </div>
        {canWrite && (
          <Button onClick={() => setDialog({ open: true, mode: 'create', party: null })}>
            <Plus className="h-4 w-4" /> New Party
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, GSTIN…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
        </div>
        <Select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} className="w-44">
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
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">GSTIN</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Rules</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!listQuery.isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No parties yet</td></tr>}
              {items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{TYPE_LABELS[p.type]}</Badge></td>
                  <td className="px-4 py-3">{p.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.gstin || '—'}</td>
                  <td className="px-4 py-3">{p.address?.city || '—'}</td>
                  <td className="px-4 py-3">{p.pricingRules?.length ? `${p.pricingRules.length} override${p.pricingRules.length > 1 ? 's' : ''}` : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, mode: 'edit', party: p })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {user?.role === 'owner' && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete permanently"
                        onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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

      <PartyDialog
        open={dialog.open}
        onOpenChange={(open) => !open && setDialog({ open: false, mode: 'create', party: null })}
        mode={dialog.mode}
        party={dialog.party}
        products={products}
        onSubmit={(data) => saveMutation.mutate({ id: dialog.party?.id, data })}
        saving={saveMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Permanently"
        description={deleteTarget
          ? `Delete "${deleteTarget.name}" forever? This only works if it has never been used. If it's been used, deactivate instead.`
          : ''}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}