'use client';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Module 1 — Auth System ✅</CardTitle>
          <CardDescription>Login, register, roles, sessions, audit trail all working.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <div className="text-xs uppercase text-muted-foreground">Email</div>
              <div className="text-sm font-medium">{user?.email}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-xs uppercase text-muted-foreground">Role</div>
              <div className="text-sm font-medium capitalize">{user?.role}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-xs uppercase text-muted-foreground">Status</div>
              <div className="text-sm font-medium">{user?.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}