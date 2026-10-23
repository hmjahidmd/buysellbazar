'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, Lock, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login, deviceFingerprint } = useAuth();

  const [step, setStep] = useState<'MOBILE' | 'OTP'>('MOBILE');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(180); // 3 minutes
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isLoginModalOpen) return null;

  // Carrier validation regex: ^01[3-9]\d{8}$
  const isMobileValid = /^01[3-9]\d{8}$/.test(mobileNumber);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMobileValid) {
      setError('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await apiClient('/api/v1/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          mobileNumber,
          deviceFingerprintHash: deviceFingerprint,
        }),
      });
      setStep('OTP');
      setCountdown(180);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await apiClient<{ accessToken: string; user: any }>('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          mobileNumber,
          otp: fullOtp,
          deviceFingerprintHash: deviceFingerprint,
        }),
      });

      login(res.data.accessToken, res.data.user);
      // Reset state
      setStep('MOBILE');
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code. Please check and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          mobileNumber,
          deviceFingerprintHash: deviceFingerprint,
        }),
      });
      setCountdown(180);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-brand-primary p-6 text-white relative">
          <button
            onClick={closeLoginModal}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-medium text-emerald-100 mb-3">
            <ShieldCheck size={14} /> National NID Verified Classifieds
          </div>
          <h2 className="text-2xl font-bold">Welcome to BuySell BD</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {step === 'MOBILE'
              ? 'Enter your mobile number to sign in or register.'
              : `Enter the 6-digit code sent to ${mobileNumber}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg">
              {error}
            </div>
          )}

          {step === 'MOBILE' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mobile Number (Bangladeshi MSISDN)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-slate-400">
                    <Phone size={18} />
                    <span className="text-sm font-medium text-slate-600">+88</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="01712345678"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.trim())}
                    maxLength={11}
                    autoFocus
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Supported carriers: Grameenphone, Banglalink, Robi, Airtel, Teletalk.
                </p>
              </div>

              <button
                type="submit"
                disabled={!isMobileValid || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-primary text-white font-semibold rounded-xl hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-900/10"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <>
                    Send OTP Verification Code <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-900">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Dev Sandbox Mode
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    রিয়েল SMS ছাড়া টেস্টের জন্য কোড: <strong>123456</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(['1', '2', '3', '4', '5', '6'])}
                  className="px-2.5 py-1.5 bg-brand-primary text-white font-bold rounded-lg hover:bg-emerald-800 text-xs shadow-sm transition-all whitespace-nowrap"
                >
                  Auto-fill 123456
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">
                  6-Digit OTP Security Code
                </label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && idx > 0) {
                          document.getElementById(`otp-input-${idx - 1}`)?.focus();
                        }
                      }}
                      className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Resend code in: <strong className="text-slate-700">{formatCountdown()}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || isSubmitting}
                  className="font-semibold text-brand-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Resend OTP
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('MOBILE')}
                  className="py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={otp.join('').length !== 6 || isSubmitting}
                  className="flex-1 py-3 px-4 bg-brand-primary text-white font-semibold rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-md"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              By proceeding, you agree to BuySell BD Terms of Service & Privacy Policy. Mandatory
              government e-KYC is required before posting listings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
