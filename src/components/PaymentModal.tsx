import { useState } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X, XCircle } from 'lucide-react';
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
        image: '/images/logo-transparent.png',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FF7A00]" />
            <div>
              <h3 className="font-display font-bold text-base">Secure Checkout</h3>
              <p className="text-[11px] text-blue-100">O-LEARNING PLATFORM · Razorpay</p>
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

            <div className="rounded-2xl p-3.5 bg-blue-50/70 border border-blue-200/80 text-xs text-slate-600 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#002970] text-white flex items-center justify-center font-bold text-sm shrink-0">
                R
              </div>
              <div>
                <p className="font-bold text-slate-900">Razorpay Checkout</p>
                <p className="text-[11px] text-slate-500">
                  Pay securely via UPI, Cards, NetBanking, or Wallets.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={processing}
                onClick={handleRazorpayPay}
                className="w-full py-3.5 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Opening Razorpay…
                  </>
                ) : (
                  <>Pay with Razorpay · {formatCurrency(finalAmount)}</>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> 256-bit SSL encrypted · Powered by Razorpay
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
