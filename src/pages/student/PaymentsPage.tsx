import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { api, formatCurrency, formatDateTime } from '../../lib/api';

interface PaymentRow {
  id: number;
  order_ref: string;
  item_type: string;
  item_title: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  method: string;
  status: string;
  gateway_txn_id: string;
  created_at: string;
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ payments: PaymentRow[] }>('/api/student/payments')
      .then((res) => {
        setPayments(res.payments);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Payments"
      subtitle="View your course enrollment payment history and order receipts"
      links={STUDENT_LINKS}
    >
      {loading ? (
        <LoadingState message="Loading payment records…" />
      ) : (
        <div className="space-y-6">
          {payments.length === 0 ? (
            <EmptyState
              title="No payment records yet"
              description="Your course enrollment payments and receipts will appear here."
              icon={<CreditCard className="w-7 h-7" />}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h3 className="font-display font-bold text-lg text-[#002B7A]">Payment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3">Order Ref</th>
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Paid</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-800">{p.order_ref}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{p.item_title}</td>
                        <td className="px-5 py-3.5 text-slate-600">{p.method}</td>
                        <td className="px-5 py-3.5 font-bold text-[#00338D]">{formatCurrency(p.final_amount)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                              p.status === 'successful'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-orange-50 text-[#FF7A00]'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{formatDateTime(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

