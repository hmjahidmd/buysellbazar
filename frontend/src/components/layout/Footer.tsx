import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, PhoneCall, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20 border-t border-slate-800">
      {/* Safety Notice Strip */}
      <div className="bg-emerald-950/80 border-b border-emerald-900/50 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary text-white rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">
                100% Anti-Scam Safe Marketplace Policy
              </h4>
              <p className="text-emerald-200 text-xs">
                Mandatory National e-KYC. Never send advance bKash/Nagad money for courier fees.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-emerald-100 font-medium sm:gap-6">
            <span className="flex min-w-0 items-center gap-1.5">
              <CheckCircle2 size={16} className="text-verified-blue" /> NID 3D Liveness Verified
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Lock size={16} className="text-brand-accent" /> Virtual Masked Calling
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <AlertTriangle size={16} className="text-brand-red" /> Anti-Fraud Chat Shield
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Popular Categories
            </h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/search?category=Mobiles" className="hover:text-white transition-colors">
                  Mobile Phones & Gadgets
                </Link>
              </li>
              <li>
                <Link href="/search?category=Electronics" className="hover:text-white transition-colors">
                  Electronics & Laptops
                </Link>
              </li>
              <li>
                <Link href="/search?category=Vehicles" className="hover:text-white transition-colors">
                  Motorbikes & Cars
                </Link>
              </li>
              <li>
                <Link href="/search?category=Property" className="hover:text-white transition-colors">
                  Flats & Apartments
                </Link>
              </li>
              <li>
                <Link href="/search?category=Home & Living" className="hover:text-white transition-colors">
                  Home & Living
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Divisions & Geo
            </h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/search?division=Dhaka" className="hover:text-white transition-colors">
                  Dhaka Division
                </Link>
              </li>
              <li>
                <Link href="/search?division=Chittagong" className="hover:text-white transition-colors">
                  Chittagong Division
                </Link>
              </li>
              <li>
                <Link href="/search?division=Sylhet" className="hover:text-white transition-colors">
                  Sylhet Division
                </Link>
              </li>
              <li>
                <Link href="/search?division=Rajshahi" className="hover:text-white transition-colors">
                  Rajshahi Division
                </Link>
              </li>
              <li>
                <Link href="/search?division=Khulna" className="hover:text-white transition-colors">
                  Khulna Division
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Trust & Safety
            </h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/kyc" className="hover:text-white transition-colors">
                  NID Verification Portal
                </Link>
              </li>
              <li>
                <Link href="/safety-tips" className="hover:text-white transition-colors">
                  Anti-Fraud Safety Tips
                </Link>
              </li>
              <li>
                <Link href="/shop/register" className="hover:text-white transition-colors">
                  B2C Merchant Storefronts
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy (CSFLE Vault)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Contact & Hotline
            </h5>
            <p className="text-xs text-slate-400 mb-3">
              Need assistance or want to report fraud? Our Trust & Safety team is on duty 24/7.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">National Helpline:</span>
              <span className="text-lg font-black text-white tracking-wide block">
                +880 9612-345678
              </span>
              <span className="break-all text-[11px] text-emerald-400 block mt-1">
                support@marketplace.com.bd
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} BuySell BD Marketplace Ltd. All rights reserved.</p>
          <p>Strictly compliant with Bangladesh BTRC and Cyber Security Regulations.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
