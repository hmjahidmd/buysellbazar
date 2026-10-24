'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  ShieldCheck,
  Package,
  Clock,
  MapPin,
  Tag,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Phone,
  RefreshCw,
  X,
  Save,
  Bookmark,
  Calendar,
  Camera,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import { formatPrice, listingPath } from '../../lib/utils';

interface MyListing {
  _id: string;
  slug?: string;
  title: string;
  description: string;
  price: number;
  isNegotiable: boolean;
  category: string;
  subCategory?: string;
  condition: string;
  location: {
    division: string;
    district: string;
    thana: string;
  };
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
  }>;
  status: 'ACTIVE' | 'SOLD' | 'PENDING' | 'EXPIRED' | 'REJECTED' | 'SUSPENDED';
  metrics?: {
    viewsCount: number;
    chatLeadsCount: number;
    offerCount: number;
  };
  createdAt: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal, updateUser, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'ADS' | 'PROFILE' | 'SAVED'>('ADS');
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [quota, setQuota] = useState<{ dailyAdCount: number; remainingToday: number } | null>(null);
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [submittedPending, setSubmittedPending] = useState(false);

  // Edit Modal State
  const [editingAd, setEditingAd] = useState<MyListing | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDesc, setEditDesc] = useState('');
  const [editCondition, setEditCondition] = useState('USED');
  const [editNegotiable, setEditNegotiable] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [bio, setBio] = useState((user?.profile as any)?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    setSubmittedPending(new URLSearchParams(window.location.search).get('submitted') === 'pending');
  }, []);

  useEffect(() => {
    if (user?.profile?.displayName) {
      setDisplayName(user.profile.displayName);
    }
    if (user?.profile?.avatarUrl) {
      setAvatarUrl(user.profile.avatarUrl);
    }
  }, [user]);

  // Handle local avatar file selection
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAvatarUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fetch my listings
  const fetchMyListings = async () => {
    setIsLoadingAds(true);
    try {
      const res = await apiClient<{ listings: MyListing[]; total: number }>('/api/v1/listings/my-listings');
      if (res.data && Array.isArray(res.data.listings)) {
        setMyListings(res.data.listings);
      }
    } catch (err: any) {
      console.error('Failed to load my listings:', err);
    } finally {
      setIsLoadingAds(false);
    }
  };

  // Fetch quota
  const fetchQuota = async () => {
    try {
      const res = await apiClient<{ dailyAdCount: number; maxFreePerDay: number; remainingToday: number }>('/api/v1/users/me/quota');
      if (res.data) {
        setQuota({
          dailyAdCount: res.data.dailyAdCount,
          remainingToday: res.data.remainingToday,
        });
      }
    } catch (err) {
      // quota is non-critical
    }
  };

  const fetchBuyerDashboard = async () => {
    try {
      const [savedResponse, inboxResponse] = await Promise.all([
        apiClient<{ listings: any[] }>('/api/v1/users/me/saved-listings'),
        apiClient<{ inbox: any[] }>('/api/v1/chats'),
      ]);
      setSavedListings(savedResponse.data?.listings || []);
      setInboxCount(inboxResponse.data?.inbox?.length || 0);
    } catch (err) {
      console.error('Failed to load buyer dashboard:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
      fetchMyListings();
      fetchQuota();
      fetchBuyerDashboard();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-brand-primary rounded-full flex items-center justify-center mx-auto">
          <UserIcon size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Please Sign In</h2>
        <p className="text-sm text-slate-500">
          Sign in with your mobile number to view your dashboard, manage posted ads, and update your profile.
        </p>
        <button
          onClick={openLoginModal}
          className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // Handle Mark as Sold
  const handleMarkSold = async (listingId: string) => {
    try {
      await apiClient(`/api/v1/listings/${listingId}/mark-sold`, { method: 'POST' });
      setMyListings((prev) =>
        prev.map((item) => (item._id === listingId ? { ...item, status: 'SOLD' } : item))
      );
      setActionMessage({ type: 'success', text: 'Listing marked as SOLD successfully!' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update listing' });
    }
  };

  // Handle Delete
  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await apiClient(`/api/v1/listings/${listingId}`, { method: 'DELETE' });
      setMyListings((prev) => prev.filter((item) => item._id !== listingId));
      setActionMessage({ type: 'success', text: 'Listing removed successfully!' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete listing' });
    }
  };

  // Open Edit Modal
  const openEditModal = (listing: MyListing) => {
    setEditingAd(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price);
    setEditDesc(listing.description);
    setEditCondition(listing.condition);
    setEditNegotiable(listing.isNegotiable);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    setIsSavingEdit(true);

    try {
      const res = await apiClient(`/api/v1/listings/${editingAd._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          price: Number(editPrice),
          description: editDesc,
          condition: editCondition,
          isNegotiable: editNegotiable,
        }),
      });

      setMyListings((prev) =>
        prev.map((item) =>
          item._id === editingAd._id
            ? {
                ...item,
                title: editTitle,
                price: Number(editPrice),
                description: editDesc,
                condition: editCondition,
                isNegotiable: editNegotiable,
              }
            : item
        )
      );

      setEditingAd(null);
      setActionMessage({ type: 'success', text: 'Listing updated successfully!' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update listing');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await apiClient<{ profile: any }>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          bio,
          avatarUrl,
        }),
      });

      // Update state in AuthContext so whole UI updates immediately
      updateUser({
        profile: {
          ...user?.profile,
          displayName,
          bio,
          avatarUrl,
        },
      });

      setActionMessage({ type: 'success', text: 'Profile information and photo updated successfully!' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Alert Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="text-red-600" />
            )}
            {actionMessage.text}
          </div>
          <button onClick={() => setActionMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Profile Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {avatarUrl || user?.profile?.avatarUrl ? (
              <img
                src={avatarUrl || user?.profile?.avatarUrl}
                alt="Profile Avatar"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
              />
            ) : (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-brand-primary text-white flex items-center justify-center font-black text-2xl shadow-md">
                {(displayName || user?.profile?.displayName || user?.mobileNumber || 'U')[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setActiveTab('PROFILE')}
              className="absolute -bottom-1 -right-1 p-1.5 bg-brand-primary text-white rounded-lg shadow-md hover:bg-emerald-800 transition-colors"
              title="Change Photo"
            >
              <Camera size={13} />
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">
                {user?.profile?.displayName || 'Registered User'}
              </h1>
              {user?.isNidVerified && <VerifiedBadge size="md" />}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone size={13} className="text-slate-400" />
                {user?.mobileNumber}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                Member since 2026
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action & KYC Status */}
        <div className="flex flex-wrap items-center gap-3">
          {user?.isNidVerified ? (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <ShieldCheck size={16} className="text-verified-blue" />
              <span>National NID Verified</span>
            </div>
          ) : (
            <Link
              href="/kyc"
              className="px-4 py-2 bg-sky-50 border border-sky-300 rounded-xl text-xs font-bold text-sky-800 hover:bg-sky-100 flex items-center gap-2 transition-colors"
            >
              <ShieldCheck size={16} /> Complete e-KYC Verification
            </Link>
          )}

          <Link
            href="/post-ad"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
          >
            <PlusCircle size={18} />
            <span>Post New Ad</span>
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Account activity">
        {[
          { label: 'Total ads', value: myListings.length, icon: Package },
          { label: 'Live ads', value: myListings.filter((item) => item.status === 'ACTIVE').length, icon: CheckCircle2 },
          { label: 'Listing views', value: myListings.reduce((total, item) => total + (item.metrics?.viewsCount || 0), 0), icon: Eye },
          { label: 'Buyer conversations', value: inboxCount, icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Icon size={19} className="text-brand-primary" />
            <div><p className="text-lg font-black text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </section>

      {submittedPending && (
        <div role="status" className="border border-amber-300 bg-amber-50 text-amber-900 rounded-xl p-4 text-sm font-semibold">
          Your ad has been submitted and is waiting for admin review. It will appear publicly after approval.
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveTab('ADS')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'ADS'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package size={18} /> My Posted Ads ({myListings.length})
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PROFILE'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserIcon size={18} /> Profile & Settings
        </button>
        <button
          onClick={() => setActiveTab('SAVED')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'SAVED' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bookmark size={18} /> Saved ads ({savedListings.length})
        </button>
        <Link href="/chat" className="pb-3 font-bold text-sm flex items-center gap-2 text-slate-500 hover:text-slate-900">
          <MessageSquare size={18} /> Messages ({inboxCount})
        </Link>
      </div>

      {/* TAB CONTENT: MY ADS */}
      {activeTab === 'ADS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">
              Manage Your Listings
            </h2>
            {quota && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Daily Quota: {quota.dailyAdCount}/30 ads used today
              </span>
            )}
          </div>

          {isLoadingAds ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="animate-spin mx-auto text-brand-primary" size={28} />
              <p className="text-sm">Loading your ads from database...</p>
            </div>
          ) : myListings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
              <Package size={48} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">You haven't posted any ads yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Post your first verified ad today. Reach thousands of verified buyers with zero fraud risk.
              </p>
              <Link
                href="/post-ad"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white font-bold text-sm rounded-xl hover:bg-emerald-800 transition-colors"
              >
                <PlusCircle size={18} /> Post Ad Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map((listing) => (
                <div
                  key={listing._id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Image & Status Badge */}
                    <div className="h-44 bg-slate-100 relative overflow-hidden">
                      <img
                        src={listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800'}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                            listing.status === 'ACTIVE'
                              ? 'bg-emerald-600 text-white'
                              : listing.status === 'SOLD'
                              ? 'bg-slate-700 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium rounded">
                        {listing.category}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-brand-primary">
                          {formatPrice(listing.price)}
                        </span>
                        {listing.isNegotiable && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Negotiable
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm line-clamp-2">
                        {listing.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {listing.description}
                      </p>

                      <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {listing.location?.thana}, {listing.location?.district}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={listingPath({ slug: listing.slug, id: listing._id })}
                      aria-disabled={listing.status === 'PENDING'}
                      onClick={(event) => listing.status === 'PENDING' && event.preventDefault()}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-brand-primary hover:border-brand-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <ExternalLink size={13} /> {listing.status === 'PENDING' ? 'Under review' : 'View'}
                    </Link>

                    <button
                      onClick={() => openEditModal(listing)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    {listing.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleMarkSold(listing._id)}
                        className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        title="Mark as Sold"
                      >
                        <CheckCircle2 size={13} /> Sold
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(listing._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'SAVED' && (
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-800">Saved ads</h2>
          {savedListings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">You have not saved any listings yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {savedListings.map((listing) => (
                <Link key={listing._id} href={`/listings/${listing.slug || listing._id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-600">
                  <img src={listing.images?.[0]?.thumbnailUrl || listing.images?.[0]?.url || '/icon.svg'} alt="" className="w-full aspect-[4/3] object-cover bg-slate-100" />
                  <div className="p-3"><p className="text-sm font-bold text-slate-800 line-clamp-2">{listing.title}</p><p className="mt-1 text-sm font-black text-brand-primary">{formatPrice(listing.price)}</p></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT: PROFILE & SETTINGS */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-800">Edit Profile Information</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Avatar Photo Uploader */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Profile Photo (ছবি আপলোড করুন)
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={28} className="text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                    <Camera size={14} /> Choose Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG, or WebP. Max size: 2MB.
                  </p>
                </div>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Remove Photo"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Preset Avatars */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Or select a verified avatar:
                </span>
                <div className="flex gap-2">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all ${
                        avatarUrl === preset ? 'border-brand-primary scale-105 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display Name (Seller Name)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (Immutable)
              </label>
              <input
                type="text"
                disabled
                value={user?.mobileNumber || ''}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Bound to verified SIM and cryptographic device token.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bio / About Seller
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief intro about yourself or your shop..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white font-bold text-sm rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-sm"
            >
              {isUpdatingProfile ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* EDIT LISTING MODAL */}
      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingAd(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-slate-900">
              Edit Listing: {editingAd.title}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ad Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Price (BDT)
                  </label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="BRAND_NEW">Brand New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="USED">Used</option>
                    <option value="FOR_PARTS">For Parts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editNegotiable}
                    onChange={(e) => setEditNegotiable(e.target.checked)}
                    className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
                  />
                  Price is Negotiable (দাম আলোচনা সাপেক্ষ)
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAd(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  {isSavingEdit ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
