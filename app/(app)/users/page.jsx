'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, KeyRound, Power } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useToast } from '@/app/components/providers/ToastProvider';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { UserDialog } from '@/app/components/users/UserDialog';
import { ResetPasswordDialog } from '@/app/components/users/ResetPasswordDialog';
import { ConfirmDialog } from '@/app/components/ui/alert-dialog';

const ROLE_LABELS = {
  owner: 'Owner',
  office: 'Office',
  store: 'Store',
  dispatch: 'Dispatch',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function UsersPage() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Guard: owner only
  useEffect(() => {
    if (me && me.role !== 'owner') router.replace('/dashboard');
  }, [me, router]);

  const [filters, setFilters] = useState({ search: '', role: '', isActive: '', page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const listQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.list(filters),
    enabled: me?.role === 'owner',
  });

  const items = listQuery.data?.data?.items || [];
  const pagination = listQuery.data?.data?.pagination;

  // Dialogs
  const [userDialog, setUserDialog] = useState({ open: false, mode: 'create', user: null });
  const [pwDialog, setPwDialog] = useState({ open: false, user: null });
  const [confirmToggle, setConfirmToggle] = useState({ open: false, user: null });

  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      toast('User created', 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
      setUserDialog({ open: false, mode: 'create', user: null });
    },
    onError: (e) => toast(e.message || 'Create failed', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      toast('User updated', 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
      setUserDialog({ open: false, mode: 'create', user: null });
      setConfirmToggle({ open: false, user: null });
    },
    onError: (e) => toast(e.message || 'Update failed', 'error'),
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, newPassword }) => usersApi.resetPassword(id, newPassword),
    onSuccess: () => {
      toast('Password reset — user must sign in again', 'success');
      setPwDialog({ open: false, user: null });
    },
    onError: (e) => toast(e.message || 'Reset failed', 'error'),
  });

  const onSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const submitUserDialog = async (payload) => {
    if (userDialog.mode === 'create') {
      await createMutation.mutateAsync(payload);
    } else {
      await updateMutation.mutateAsync({ id: userDialog.user.id, data: payload });
    }
  };

  const saving =
    createMutation.isPending || updateMutation.isPending || resetPwMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts and roles</p>
        </div>
        <Button onClick={() => setUserDialog({ open: true, mode: 'create', user: null })}>
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
        <Select
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))}
          className="w-40"
        >
          <option value="">All Roles</option>
          <option value="owner">Owner</option>
          <option value="office">Office</option>
          <option value="store">Store</option>
          <option value="dispatch">Dispatch</option>
        </Select>
        <Select
          value={filters.isActive}
          onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, page: 1 }))}
          className="w-36"
        >
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
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              )}
              {!listQuery.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
              {items.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {u.name} {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'owner' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'destructive'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit"
                          onClick={() => setUserDialog({ open: true, mode: 'edit', user: u })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Reset password"
                          onClick={() => setPwDialog({ open: true, user: u })}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          disabled={isSelf}
                          onClick={() => setConfirmToggle({ open: true, user: u })}
                        >
                          <Power className={`h-4 w-4 ${u.isActive ? 'text-green-600' : 'text-destructive'}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} • {pagination.total} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserDialog
        open={userDialog.open}
        onOpenChange={(open) => !open && setUserDialog({ open: false, mode: 'create', user: null })}
        mode={userDialog.mode}
        user={userDialog.user}
        onSubmit={submitUserDialog}
        saving={saving}
      />

      <ResetPasswordDialog
        open={pwDialog.open}
        onOpenChange={(open) => !open && setPwDialog({ open: false, user: null })}
        user={pwDialog.user}
        onSubmit={(newPassword) =>
          resetPwMutation.mutateAsync({ id: pwDialog.user.id, newPassword })
        }
        saving={saving}
      />

      <ConfirmDialog
        open={confirmToggle.open}
        onOpenChange={(open) => !open && setConfirmToggle({ open: false, user: null })}
        title={confirmToggle.user?.isActive ? 'Deactivate User' : 'Activate User'}
        description={
          confirmToggle.user
            ? confirmToggle.user.isActive
              ? `${confirmToggle.user.name} will lose access immediately.`
              : `${confirmToggle.user.name} will regain access.`
            : ''
        }
        confirmText={confirmToggle.user?.isActive ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmToggle.user?.isActive ? 'destructive' : 'default'}
        onConfirm={() =>
          updateMutation.mutate({
            id: confirmToggle.user.id,
            data: { isActive: !confirmToggle.user.isActive },
          })
        }
        loading={updateMutation.isPending}
      />
    </div>
  );
}