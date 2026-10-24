'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  PlusCircle,
  User as UserIcon,
  Bell,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Store,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import VerifiedBadge from '../ui/VerifiedBadge';

const BD_DIVISIONS = [
  'All Bangladesh',
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
];

export const Header: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal, logout } = useAuth();

  const [selectedDivision, setSelectedDivision] = useState('All Bangladesh');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('q', searchQuery.trim());
    if (selectedDivision !== 'All Bangladesh') params.append('division', selectedDivision);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner / Trust Micro-Bar */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-1 px-4 text-center font-medium flex items-center justify-center gap-2">
        <ShieldCheck size={14} className="text-verified-blue" />
        <span className="hidden sm:inline">Bangladesh's 1st 100% NID-Verified & Anti-Scam Protected Marketplace</span>
        <span className="sm:hidden">Verified marketplace for safer local trading</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 py-2 md:flex-nowrap md:justify-between md:h-16 md:gap-4 md:py-0">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-lg font-black tracking-tighter text-white shadow-md sm:h-10 sm:w-10 sm:text-xl">
              BS
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black leading-none tracking-tight text-slate-900 sm:text-xl">
                BuySell<span className="text-brand-primary">BD</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[10px]">
                Verified Classifieds
              </span>
            </div>
          </Link>

          {/* Location Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <MapPin size={16} className="text-brand-primary" />
              <span>{selectedDivision}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isLocationOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                {BD_DIVISIONS.map((div) => (
                  <button
                    key={div}
                    onClick={() => {
                      setSelectedDivision(div);
                      setIsLocationOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      selectedDivision === div
                        ? 'font-bold text-brand-primary bg-emerald-50'
                        : 'text-slate-700'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Search Bar */}
          <form onSubmit={handleSearch} className="order-3 relative w-full max-w-none md:order-none md:flex-1 md:max-w-xl">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="What are you looking for? (e.g. Yamaha FZS, iPhone 15, Dhaka Flat)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 p-2 bg-brand-primary text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* User & Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-1 md:gap-2">
                <Link
                  href="/chat"
                  className="p-2 text-slate-600 hover:text-brand-primary hover:bg-slate-100 rounded-lg transition-colors relative"
                  title="Messages"
                >
                  <MessageSquare size={20} />
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1 p-1.5 md:gap-2 md:pl-2 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors bg-white"
                  >
                    {user?.profile?.avatarUrl ? (
                      <img
                        src={user.profile.avatarUrl}
                        alt="User Avatar"
                        className="w-7 h-7 rounded-lg object-cover border border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-brand-primary flex items-center justify-center font-bold text-xs">
                        {(user?.profile?.displayName || user?.mobileNumber || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                          {user?.profile?.displayName || user?.mobileNumber}
                        </span>
                        {user?.isNidVerified && <VerifiedBadge size="sm" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium capitalize">
                        {user?.role}
                      </span>
                    </div>
                    <ChevronDown size={14} className="hidden sm:block text-slate-400" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                      {!user?.isNidVerified && (
                        <Link
                          href="/kyc"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-verified-blue bg-sky-50 hover:bg-sky-100 transition-colors"
                        >
                          <ShieldCheck size={18} /> Complete e-KYC Verification
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <UserIcon size={16} /> My Profile & Ads
                      </Link>

                      {user?.role === 'merchant' && (
                        <Link
                          href="/shop/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Store size={16} /> Merchant Dashboard
                        </Link>
                      )}

                      {(user?.role === 'admin' || user?.role === 'moderator') && (
                        <Link
                          href="/admin/moderation"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                        >
                          <Layers size={16} /> Moderation Portal
                        </Link>
                      )}

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-red hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-1 px-2.5 py-2 text-sm font-semibold text-brand-primary hover:bg-emerald-50 rounded-xl transition-colors md:gap-1.5 md:px-4"
              >
                <UserIcon size={18} />
                <span>Login</span>
              </button>
            )}

            {/* Post Ad Button */}
            <Link
              href="/post-ad"
              className="flex items-center gap-1 p-2 bg-brand-accent text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition-all shadow-sm md:gap-1.5 md:px-4"
              aria-label="Post an ad"
            >
              <PlusCircle size={18} />
              <span className="hidden sm:inline">POST AD</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg md:hidden"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav id="mobile-navigation" className="md:hidden border-t border-slate-200 py-2" aria-label="Mobile navigation">
            <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">Browse listings</Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">My dashboard</Link>
                <Link href="/chat" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">Messages</Link>
                {(user?.role === 'admin' || user?.role === 'moderator') && (
                  <Link href="/admin/moderation" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 rounded-lg">Admin moderation</Link>
                )}
              </>
            ) : (
              <button type="button" onClick={() => { setIsMobileMenuOpen(false); openLoginModal(); }} className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">Sign in</button>
            )}
            <Link href="/post-ad" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg">Post an ad</Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
