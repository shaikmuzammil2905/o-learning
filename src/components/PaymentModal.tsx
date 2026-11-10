import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { api, formatCurrency } from '../lib/api';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  itemType: 'course' | 'subscription';
  itemId: number;
  itemTitle: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  batchId?: number | null;
  onSuccess: () => void;
}

type PayMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet';

export function PaymentModal({
  open,
  onClose,
  itemType,
  itemId,
  itemTitle,
  amount,
  discountAmount,
  finalAmount,
  batchId,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PayMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState('State Bank of India');
  const [walletName, setWalletName] = useState('PhonePe Wallet');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{
    order_ref: string;
    gateway_txn_id: string;
    final_amount: number;
  } | null>(null);

  if (!open) return null;

  const handlePay = async (simulate: 'success' | 'fail' = 'success') => {
    setError('');
    setProcessing(true);
    try {
      const checkout = await api<{ payment: { id: number; order_ref: string } }>(
        '/api/student/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ item_type: itemType, item_id: itemId, method }),
        }
      );

      const verified = await api<{
        payment: { order_ref: string; gateway_txn_id: string; final_amount: number };
      }>(`/api/student/payments/${checkout.payment.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ simulate, batch_id: batchId || null }),
      });

      setReceipt(verified.payment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be completed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FF7A00]" />
            <div>
              <h3 className="font-display font-bold text-base">Secure Checkout</h3>
              <p className="text-[11px] text-blue-100">O-LEARNING PLATFORM Payment Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {receipt ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="font-display font-bold text-xl text-slate-900">Payment Successful!</h4>
            <p className="text-sm text-slate-600 mt-1">
              Your {itemType === 'course' ? 'course enrollment' : 'subscription plan'} for{' '}
              <span className="font-semibold text-slate-900">{itemTitle}</span> is now active.
            </p>
            <div className="mt-5 bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Reference</span>
                <span className="font-mono font-semibold text-slate-900">{receipt.order_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono font-semibold text-slate-900">{receipt.gateway_txn_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-emerald-600">{formatCurrency(receipt.final_amount)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="mt-6 w-full py-3 rounded-xl bg-[#0052CC] text-white font-bold text-sm hover:bg-[#003EB3] transition cursor-pointer"
            >
              {itemType === 'course' ? 'Go to My Learning' : 'Continue to Dashboard'}
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Order Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-sm">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{itemTitle}</span>
                <span>{formatCurrency(amount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs font-medium">
                  <span>Platform Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-base text-[#00338D]">
                <span>Final Payable Amount</span>
                <span>{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Select Payment Method
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'UPI', label: 'UPI', icon: Smartphone },
                    { id: 'Card', label: 'Card', icon: CreditCard },
                    { id: 'NetBanking', label: 'NetBank', icon: Building2 },
                    { id: 'Wallet', label: 'Wallet', icon: Wallet },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'border-[#0052CC] bg-blue-50 text-[#0052CC] shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Input Area (tokenized/non-stored inputs) */}
            {method === 'UPI' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter UPI ID (GPay, PhonePe, Paytm, BHIM)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@okaxis"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC] outline-none"
                />
              </div>
            )}

            {method === 'Card' && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-[#00338D]">
                  Tokenized Card Checkout (Raw card details are never stored)
                </p>
                <input
                  type="text"
                  placeholder="Cardholder Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Last 4 digits (optional)"
                    maxLength={4}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {method === 'NetBanking' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Bank</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Kotak Mahindra Bank</option>
                </select>
              </div>
            )}

            {method === 'Wallet' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Wallet</label>
                <select
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option>PhonePe Wallet</option>
                  <option>Paytm Wallet</option>
                  <option>Amazon Pay</option>
                </select>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => handlePay('success')}
                className="w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Payment…
                  </>
                ) : (
                  <>Pay Now · {formatCurrency(finalAmount)}</>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-500">
                256-bit encrypted checkout · Instant access upon verification
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
