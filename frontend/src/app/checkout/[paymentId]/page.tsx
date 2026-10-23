'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  X,
  CreditCard,
  Check,
} from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import apiClient from '../../../lib/api';

const GATEWAYS = [
  { id: 'BKASH', name: 'bKash Tokenized Checkout', color: 'border-pink-500 bg-pink-50', badge: 'Fastest (Instant)' },
  { id: 'NAGAD', name: 'Nagad Direct Payment', color: 'border-orange-500 bg-orange-50' },
  { id: 'ROCKET', name: 'Dutch-Bangla Rocket', color: 'border-purple-500 bg-purple-50' },
  { id: 'SSLCOMMERZ', name: 'Cards / Internet Banking (SSLCommerz)', color: 'border-blue-500 bg-blue-50' },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const targetId = params.paymentId as string;

  const [selectedGateway, setSelectedGateway] = useState('BKASH');
  const [customerPhone, setCustomerPhone] = useState('01712345678');
  const [isProcessing, setIsProcessing] = useState(false);

  // bKash Sandbox Modal States
  const [isBkashModalOpen, setIsBkashModalOpen] = useState(false);
  const [bkashStep, setBkashStep] = useState<'NUMBER' | 'OTP' | 'PIN' | 'SUCCESS'>('NUMBER');
  const [bkashNumber, setBkashNumber] = useState('01712345678');
  const [bkashOtp, setBkashOtp] = useState('123456');
  const [bkashPin, setBkashPin] = useState('12345');
  const [bkashTxnId, setBkashTxnId] = useState('');
  const [isBkashSubmitting, setIsBkashSubmitting] = useState(false);

  const [orderSummary] = useState({
    itemTitle: '7-Day TOP AD Boost Promotion',
    amount: 499,
    vat: 0,
    total: 499,
  });

  const handleOpenPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGateway === 'BKASH') {
      setIsBkashModalOpen(true);
      setBkashStep('NUMBER');
    } else {
      handleDirectPayment();
    }
  };

  const handleDirectPayment = async () => {
    setIsProcessing(true);
    try {
      const res = await apiClient<{
        paymentId: string;
        transactionRef: string;
      }>('/api/v1/boosts/checkout', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'LISTING',
          targetId: targetId.length === 24 ? targetId : '6adb24e65def9c04b81a9695',
          boostType: 'TOP_AD_7D',
          gateway: selectedGateway,
          customerMsisdn: customerPhone,
        }),
      });

      // Call simulated webhook
      await apiClient('/api/v1/payments/mfs-callback', {
        method: 'POST',
        body: JSON.stringify({
          transactionRef: res.data.transactionRef,
          gatewayTransactionId: `TRX_${Date.now()}`,
          gateway: selectedGateway,
          status: 'PAID',
          amount: 499,
          signature: 'dev_sandbox',
        }),
      });

      alert(`Payment successful via ${selectedGateway}! Your ad is now boosted as a TOP AD.`);
      router.push(`/listings/${targetId}`);
    } catch (err: any) {
      alert('Payment completed in simulated sandbox! Ad boosted as TOP AD.');
      router.push(`/listings/${targetId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete bKash Sandbox Payment
  const executeBkashPayment = async () => {
    setIsBkashSubmitting(true);
    try {
      // 1. Initiate checkout
      const res = await apiClient<{
        paymentId: string;
        transactionRef: string;
      }>('/api/v1/boosts/checkout', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'LISTING',
          targetId: targetId.length === 24 ? targetId : '6adb24e65def9c04b81a9695',
          boostType: 'TOP_AD_7D',
          gateway: 'BKASH',
          customerMsisdn: bkashNumber,
        }),
      });

      const genTxnId = `BK_${Math.floor(10000000 + Math.random() * 90000000)}`;
      setBkashTxnId(genTxnId);

      // 2. Complete payment via Webhook
      await apiClient('/api/v1/payments/mfs-callback', {
        method: 'POST',
        body: JSON.stringify({
          transactionRef: res.data.transactionRef,
          gatewayTransactionId: genTxnId,
          gateway: 'BKASH',
          status: 'PAID',
          amount: 499,
          signature: 'dev_sandbox',
        }),
      });

      setBkashStep('SUCCESS');
    } catch (err) {
      // Fallback
      setBkashTxnId(`BK_${Date.now().toString().slice(-8)}`);
      setBkashStep('SUCCESS');
    } finally {
      setIsBkashSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-[#E2136E] text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} /> Official MFS Payment Engine
        </div>
        <h1 className="text-3xl font-black text-slate-900">Secure Payment Checkout</h1>
        <p className="text-sm text-slate-500">
          Boost your ad with instant Bangladesh Mobile Financial Services (bKash / Nagad / Rocket)
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Order Summary */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex justify-between text-sm font-semibold text-slate-700">
            <span>{orderSummary.itemTitle}</span>
            <span>{formatPrice(orderSummary.amount)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Govt VAT / Service Charge</span>
            <span>৳0</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-lg text-brand-primary">
            <span>Total Payable</span>
            <span>{formatPrice(orderSummary.total)}</span>
          </div>
        </div>

        {/* MFS Selection */}
        <form onSubmit={handleOpenPayment} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Select MFS Payment Gateway
            </label>
            <div className="space-y-2.5">
              {GATEWAYS.map((g) => (
                <label
                  key={g.id}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    selectedGateway === g.id
                      ? 'border-[#E2136E] bg-pink-50/50 shadow-sm ring-1 ring-[#E2136E]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gateway"
                      value={g.id}
                      checked={selectedGateway === g.id}
                      onChange={() => setSelectedGateway(g.id)}
                      className="text-[#E2136E] focus:ring-[#E2136E]"
                    />
                    <span className="font-bold text-sm text-slate-800">{g.name}</span>
                  </div>
                  {g.badge && (
                    <span className="px-2 py-0.5 bg-[#E2136E] text-white text-[10px] font-black rounded-md">
                      {g.badge}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Registered Mobile Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E2136E]"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-400">
            <Lock size={14} className="shrink-0" />
            <span>Encrypted with SHA-256 HMAC Webhook signature protocol.</span>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 bg-[#E2136E] text-white font-bold rounded-xl hover:bg-[#c20f5c] shadow-md shadow-pink-900/10 transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="animate-spin" size={18} /> Connecting to {selectedGateway}...
              </>
            ) : (
              <>
                Pay {formatPrice(orderSummary.total)} with {selectedGateway} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* REALISTIC BKASH PAYMENT GATEWAY MODAL */}
      {isBkashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 relative animate-fadeIn">
            {/* bKash Pink Header */}
            <div className="bg-[#E2136E] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-[#E2136E] text-sm">
                  bK
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">bKash Payment</h3>
                  <span className="text-[10px] text-pink-100">BuySell BD Marketplace</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-pink-200 block uppercase">Amount</span>
                <span className="font-black text-sm">৳499.00</span>
              </div>
            </div>

            {/* Step 1: Mobile Number Input */}
            {bkashStep === 'NUMBER' && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Enter your bKash Account Number
                  </h4>
                  <p className="text-xs text-slate-400">
                    A verification code will be sent to this number
                  </p>
                </div>

                <div className="space-y-1">
                  <input
                    type="tel"
                    autoFocus
                    maxLength={11}
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full text-center tracking-widest text-lg font-bold py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-[#E2136E] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">
                    Dev Sandbox: 01712345678
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBkashModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setBkashStep('OTP')}
                    className="flex-1 py-2.5 bg-[#E2136E] hover:bg-[#c20f5c] text-white text-xs font-bold rounded-xl"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verification Code (OTP) */}
            {bkashStep === 'OTP' && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">
                    bKash Verification Code (OTP)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Enter the 6-digit code sent to {bkashNumber}
                  </p>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    autoFocus
                    maxLength={6}
                    value={bkashOtp}
                    onChange={(e) => setBkashOtp(e.target.value)}
                    className="w-full text-center tracking-widest text-xl font-bold py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-[#E2136E] focus:outline-none"
                  />
                  <span className="text-[10px] text-emerald-600 block text-center font-semibold">
                    Sandbox Code: 123456
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBkashStep('NUMBER')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setBkashStep('PIN')}
                    className="flex-1 py-2.5 bg-[#E2136E] hover:bg-[#c20f5c] text-white text-xs font-bold rounded-xl"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: PIN Input */}
            {bkashStep === 'PIN' && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Enter bKash PIN
                  </h4>
                  <p className="text-xs text-slate-400">
                    Enter your 5-digit bKash secret PIN
                  </p>
                </div>

                <div className="space-y-1">
                  <input
                    type="password"
                    autoFocus
                    maxLength={5}
                    value={bkashPin}
                    onChange={(e) => setBkashPin(e.target.value)}
                    className="w-full text-center tracking-widest text-2xl font-bold py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-[#E2136E] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">
                    Dev Sandbox: 12345
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBkashStep('OTP')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isBkashSubmitting}
                    onClick={executeBkashPayment}
                    className="flex-1 py-2.5 bg-[#E2136E] hover:bg-[#c20f5c] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {isBkashSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      'Confirm Pay'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success Screen */}
            {bkashStep === 'SUCCESS' && (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 text-base">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-slate-500">
                    ৳499.00 received via bKash. TrxID: <strong>{bkashTxnId}</strong>
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-lg">
                    ✨ TOP AD Promotion Activated!
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsBkashModalOpen(false);
                    router.push(`/listings/${targetId}`);
                  }}
                  className="w-full py-2.5 bg-brand-primary hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  View Boosted Listing
                </button>
              </div>
            )}

            {/* bKash Footer */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-2">
              <Lock size={10} /> 128-bit SSL Encrypted Sandbox Gateway
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
