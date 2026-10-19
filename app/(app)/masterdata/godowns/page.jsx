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
import { GodownDialog } from '@/app/components/masterdata/GodownDialog';

export default function GodownsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canWrite = ['owner', 'office'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', isActive: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', godown: null });

  const listQuery = useQuery({
    queryKey: ['godowns', filters],
    queryFn: () => masterdataApi.godowns.list(filters),
  });

  const items = listQuery.data?.data?.items || [];
  const pagination = listQuery.data?.data?.pagination;

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id ? masterdataApi.godowns.update(id, data) : masterdataApi.godowns.create(data),
    onSuccess: () => {
      toast(dialog.mode === 'edit' ? 'Godown updated' : 'Godown created', 'success');
      qc.invalidateQueries({ queryKey: ['godowns'] });
      setDialog({ open: false, mode: 'create', godown: null });
    },
    onError: (e) => toast(e.message || 'Save failed', 'error'),
  });

  const onSearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Godowns</h1>
          <p className="text-sm text-muted-foreground">Storage locations</p>
        </div>
        {canWrite && (
          <Button onClick={() => setDialog({ open: true, mode: 'create', godown: null })}>
            <Plus className="h-4 w-4" /> New Godown
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name…" className="pl-9" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
        </div>
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
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Default</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!listQuery.isLoading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No godowns yet</td></tr>}
              {items.map((g) => (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.address || '—'}</td>
                  <td className="px-4 py-3">{g.isDefault ? <Badge variant="default">Default</Badge> : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={g.isActive ? 'success' : 'destructive'}>{g.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, mode: 'edit', godown: g })}>
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

      <GodownDialog
        open={dialog.open}
        onOpenChange={(open) => !open && setDialog({ open: false, mode: 'create', godown: null })}
        mode={dialog.mode}
        godown={dialog.godown}
        onSubmit={(data) => saveMutation.mutate({ id: dialog.godown?.id, data })}
        saving={saveMutation.isPending}
      />
    </div>
  );
}