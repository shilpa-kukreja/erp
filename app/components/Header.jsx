'use client';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Button } from '@/app/components/ui/button';

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div>
        <div className="text-sm font-medium">{user?.name}</div>
        <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
      </div>
      <Button variant="outline" onClick={logout}>Logout</Button>
    </header>
  );
}