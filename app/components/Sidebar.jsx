'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users } from 'lucide-react';
import { useAuth } from '@/app/components/providers/AuthProvider';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'office', 'store', 'dispatch'] },
  { href: '/users', label: 'Users & Roles', icon: Users, roles: ['owner'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const visible = items.filter((i) => user && i.roles.includes(user.role));

  return (
    <aside className="hidden w-64 border-r bg-muted/20 md:block">
      <div className="p-4 text-lg font-semibold">ERP</div>
      <nav className="space-y-1 px-2">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}