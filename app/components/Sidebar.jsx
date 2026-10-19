'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard } from 'lucide-react';

const items = [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 border-r bg-muted/20 md:block">
      <div className="p-4 text-lg font-semibold">ERP</div>
      <nav className="space-y-1 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}