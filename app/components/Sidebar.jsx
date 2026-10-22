'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Package, Users2, Ruler, Warehouse,Boxes, History ,ShoppingCart,Wallet} from 'lucide-react';
import { useAuth } from '@/app/components/providers/AuthProvider';

const ALL = ['owner', 'office', 'store', 'dispatch'];

const sections = [
  {
    title: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
      { href: '/users', label: 'Users & Roles', icon: Users, roles: ['owner'] },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { href: '/masterdata/products', label: 'Products', icon: Package, roles: ALL },
      { href: '/masterdata/parties', label: 'Parties', icon: Users2, roles: ALL },
      { href: '/masterdata/units', label: 'Units', icon: Ruler, roles: ALL },
      { href: '/masterdata/godowns', label: 'Godowns', icon: Warehouse, roles: ALL },
      // After Godowns, add:
      { href: '/stock', label: 'Stock', icon: Boxes, roles: ALL },
      { href: '/stock/ledger', label: 'Stock Ledger', icon: History, roles: ALL },
    ],
  },
  {
  title: 'Operations',
  items: [
    { href: '/purchase', label: 'Purchase', icon: ShoppingCart, roles: ['owner', 'office', 'store', 'dispatch'] },
    { href: '/payables', label: 'Payables', icon: Wallet, roles: ['owner', 'office', 'store', 'dispatch'] }, 

  ],
},
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="hidden w-64 border-r bg-muted/20 md:block">
      <div className="p-4 text-lg font-semibold">ERP</div>
      <nav className="space-y-4 px-2 pb-6">
        {sections.map((s) => {
          const items = s.items.filter((i) => i.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div key={s.title}>
              <div className="px-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">{s.title}</div>
              <div className="space-y-1">
                {items.map((item) => {
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
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}