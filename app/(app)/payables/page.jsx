'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { supplierPaymentsApi } from '@/lib/api';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { Button } from '@/app/components/ui/button';

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PayablesPage() {
  const { user } = useAuth();
  const isAllowed = ['owner', 'office', 'store', 'dispatch'].includes(user?.role);

  const q = useQuery({ 
    queryKey: ['payables-aging'], 
    queryFn: () => supplierPaymentsApi.aging(),
    enabled: isAllowed
  });
  
  const report = q.data?.data?.report || [];
  const totalPayable = report.reduce((sum, r) => sum + r.total, 0);

  if (!isAllowed) return <div className="p-8 text-center text-muted-foreground">Access Denied</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Supplier Payables</h1>
          <p className="text-sm text-muted-foreground">Outstanding balances and aging report</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Outstanding</div>
          <div className="text-2xl font-bold text-destructive">{rupees(totalPayable)}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium text-right">0-30 Days</th>
              <th className="px-4 py-3 font-medium text-right">31-60 Days</th>
              <th className="px-4 py-3 font-medium text-right">61-90 Days</th>
              <th className="px-4 py-3 font-medium text-right">90+ Days</th>
              <th className="px-4 py-3 font-medium text-right">Total Due</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!q.isLoading && report.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No outstanding payables! 🎉</td></tr>}
            
            {report.map((r) => (
              <tr key={r.supplierId} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">
                  {/* Ideally, we link this to a supplier detail page, but we can link to purchase list filtered by supplier */}
                  <Link href={`/purchase?supplierId=${r.supplierId}`} className="text-primary hover:underline">
                    {r.supplierName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">{rupees(r.d30)}</td>
                <td className="px-4 py-3 text-right">{rupees(r.d60)}</td>
                <td className="px-4 py-3 text-right">{rupees(r.d90)}</td>
                <td className="px-4 py-3 text-right text-destructive">{rupees(r.over90)}</td>
                <td className="px-4 py-3 text-right font-bold">{rupees(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}