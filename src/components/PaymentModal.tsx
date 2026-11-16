import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { api, formatCurrency } from '../lib/api';
import { broadcastPlatformUpdate } from '../lib/realtime';
import { clearStoredReferralCode, getStoredReferralCode } from '../lib/referral';
import { RAZORPAY_KEY_ID, loadRazorpayScript } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';

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
  referralCode?: string | null;
  onSuccess: () => void;
}

type PayMethod = 'Razorpay' | 'UPI' | 'Card' | 'NetBanking' | 'Wallet';

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
  referralCode,
  onSuccess,
}: PaymentModalProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<PayMethod>('Razorpay');
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

  const handleRazorpayPay = async () => {
    setError('');
    setProcessing(true);
    try {
      const activeRefCode = referralCode || getStoredReferralCode();

      // 1. Create Checkout Record & Razorpay Order on server
      const checkout = await api<{
        payment: { id: number; order_ref: string; final_amount: number };
        verification_token?: string;
        razorpay?: {
          order_id: string | null;
          amount: number;
          currency: string;
          key_id: string;
        };
      }>('/api/student/checkout', {
        method: 'POST',
        body: JSON.stringify({ item_type: itemType, item_id: itemId, method: 'Card' }),
      });

      // Free item: verify directly
      if (finalAmount === 0 || checkout.payment.final_amount === 0) {
        const verified = await api<{
          payment: { order_ref: string; gateway_txn_id: string; final_amount: number };
        }>(`/api/student/payments/${checkout.payment.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            simulate: 'success',
            batch_id: batchId || null,
            referral_code: itemType === 'course' ? activeRefCode : null,
            verification_token: checkout.verification_token,
          }),
        });

        if (itemType === 'course' && activeRefCode) clearStoredReferralCode();
        broadcastPlatformUpdate('payment');
        setReceipt(verified.payment);
        setProcessing(false);
        return;
      }

      // 2. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      const keyId = checkout.razorpay?.key_id || RAZORPAY_KEY_ID;

      // 3. Open official Razorpay Checkout Modal
      const rzpOptions = {
        key: keyId,
        amount: checkout.razorpay?.amount || Math.round(finalAmount * 100),
        currency: checkout.razorpay?.currency || 'INR',
        name: 'O-LEARNING PLATFORM',
        description: `${itemType === 'course' ? 'Course Enrollment' : 'Subscription'} · ${itemTitle}`,
        image: 'https://o-learning.vercel.app/favicon.ico',
        order_id: checkout.razorpay?.order_id || undefined,
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: {
          color: '#0052CC',
        },
        notes: {
          platform: 'O-Learning Platform',
          item_type: itemType,
          item_title: itemTitle,
          order_ref: checkout.payment.order_ref,
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => {
          setProcessing(true);
          try {
            const verified = await api<{
              payment: { order_ref: string; gateway_txn_id: string; final_amount: number };
            }>(`/api/student/payments/${checkout.payment.id}/verify`, {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || checkout.razorpay?.order_id || null,
                razorpay_signature: response.razorpay_signature || null,
                batch_id: batchId || null,
                referral_code: itemType === 'course' ? activeRefCode : null,
                verification_token: checkout.verification_token,
              }),
            });

            if (itemType === 'course' && activeRefCode) {
              clearStoredReferralCode();
            }
            broadcastPlatformUpdate('payment');
            setReceipt(verified.payment);
          } catch (vErr) {
            broadcastPlatformUpdate('payment');
            setError(vErr instanceof Error ? vErr.message : 'Razorpay payment verification failed.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(rzpOptions);
      razorpayInstance.open();
    } catch (err) {
      broadcastPlatformUpdate('payment');
      setError(err instanceof Error ? err.message : 'Unable to initiate Razorpay checkout.');
      setProcessing(false);
    }
  };

  const handleSimulatedPay = async (simulate: 'success' | 'fail' = 'success') => {
    setError('');
    setProcessing(true);
    try {
      const checkout = await api<{ payment: { id: number; order_ref: string }; verification_token?: string }>(
        '/api/student/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ item_type: itemType, item_id: itemId, method: method === 'Razorpay' ? 'UPI' : method }),
        }
      );

      const activeRefCode = referralCode || getStoredReferralCode();
      const verified = await api<{
        payment: { order_ref: string; gateway_txn_id: string; final_amount: number };
      }>(`/api/student/payments/${checkout.payment.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          simulate,
          batch_id: batchId || null,
          referral_code: itemType === 'course' ? activeRefCode : null,
          verification_token: checkout.verification_token,
        }),
      });

      if (itemType === 'course' && activeRefCode) {
        clearStoredReferralCode();
      }
      broadcastPlatformUpdate('payment');
      setReceipt(verified.payment);
    } catch (err) {
      broadcastPlatformUpdate('payment');
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
              <p className="text-[11px] text-blue-100">O-LEARNING PLATFORM · Razorpay Payment Gateway</p>
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
                <span className="text-slate-500">Payment Gateway</span>
                <span className="font-semibold text-blue-600">Razorpay (Verified)</span>
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
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Course Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              {referralCode && (
                <div className="flex justify-between text-xs text-[#0052CC]">
                  <span>Referral Code</span>
                  <span className="font-mono font-semibold">{referralCode}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
                <span>Total Payable</span>
                <span className="text-[#00338D]">{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            {/* Razorpay Test Mode Banner */}
            <div className="rounded-2xl p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#002970] text-white flex items-center justify-center font-bold text-xs">
                  R
                </div>
                <div>
                  <p className="font-bold text-slate-900">Razorpay Secure Gateway</p>
                  <p className="text-[11px] text-slate-500 font-mono">Test Key: {RAZORPAY_KEY_ID}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
                Active
              </span>
            </div>

            {/* Payment Options Header */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Choose Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Razorpay', label: 'Razorpay (All)', icon: Zap, badge: 'Recommended' },
                  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                  { id: 'Card', label: 'Cards', icon: CreditCard },
                  { id: 'NetBanking', label: 'NetBanking', icon: Building2 },
                  { id: 'Wallet', label: 'Wallets', icon: Wallet },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as PayMethod)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'border-[#0052CC] bg-blue-50/70 text-[#00338D] shadow-sm ring-1 ring-[#0052CC]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {m.badge && (
                        <span className="absolute -top-1.5 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          {m.badge}
                        </span>
                      )}
                      <Icon className={`w-4 h-4 mb-1 ${active ? 'text-[#0052CC]' : 'text-slate-400'}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Details */}
            {method === 'Razorpay' && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#0052CC]" /> Opens Official Razorpay Checkout Modal
                </p>
                <p>
                  Supports <span className="font-medium text-slate-800">Google Pay, PhonePe, Paytm, BHIM, Cards (Visa/MasterCard/RuPay), NetBanking</span> across 50+ banks, and wallets.
                </p>
              </div>
            )}

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

            {/* Primary Action Button */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={processing}
                onClick={method === 'Razorpay' ? handleRazorpayPay : () => handleSimulatedPay('success')}
                className="w-full py-3.5 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Razorpay…
                  </>
                ) : (
                  <>Pay with Razorpay · {formatCurrency(finalAmount)}</>
                )}
              </button>

              {/* Instant Test Mode Helper */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleSimulatedPay('success')}
                  className="text-[11px] text-slate-500 hover:text-emerald-600 underline cursor-pointer"
                >
                  ⚡ Fast Test (Instant Success)
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleSimulatedPay('fail')}
                  className="text-[11px] text-slate-500 hover:text-red-600 underline cursor-pointer"
                >
                  Simulate Failure
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                🔒 256-bit SSL encrypted · Razorpay Standard Checkout · 100% Secure
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
