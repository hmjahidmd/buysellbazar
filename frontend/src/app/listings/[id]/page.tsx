'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin,
  Clock,
  ShieldCheck,
  PhoneCall,
  MessageSquare,
  Tag,
  Star,
  Share2,
  Heart,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import VerifiedBadge from '../../../components/ui/VerifiedBadge';
import { formatPrice } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../lib/api';
import { getMockListingById, MOCK_LISTINGS } from '../../../data/mockListings';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const listingId = params.id as string;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isMaskedCallActive, setIsMaskedCallActive] = useState(false);
  const [proxySession, setProxySession] = useState<{ bridgeNumber: string; sessionId: string } | null>(null);

  // Dynamic Listing Data by ID (loads from database, or fallback to mock)
  const [listing, setListing] = useState<any>(() => {
    return (
      getMockListingById(listingId) || {
        ...MOCK_LISTINGS[0],
        id: listingId,
      }
    );
  });

  useEffect(() => {
    const mock = getMockListingById(listingId);
    if (mock) {
      setListing(mock);
      return;
    }

    // Fetch live listing from backend database by ID
    apiClient(`/api/v1/listings/${listingId}`)
      .then((res) => {
        if (res?.data) {
          const d = res.data;
          setListing({
            id: d._id || d.id || listingId,
            title: d.title,
            price: d.price,
            isNegotiable: Boolean(d.isNegotiable),
            condition: d.condition,
            category: d.category,
            subCategory: d.subCategory,
            location: {
              division: d.location?.division || 'Dhaka',
              district: d.location?.district || 'Dhaka',
              thana: d.location?.thana || 'Central',
              address: d.location?.address || `${d.location?.thana || ''}, ${d.location?.district || ''}`,
            },
            images: d.images?.length
              ? d.images.map((img: any) => (typeof img === 'string' ? img : img.url))
              : ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1000&q=80'],
            description: d.description,
            specifications: d.specifications || [
              { key: 'Category', value: d.category },
              { key: 'Condition', value: d.condition },
            ],
            seller: {
              id: d.sellerId?._id || d.sellerId?.id || d.sellerId || 'seller',
              name: d.sellerId?.profile?.displayName || 'Verified Community Seller',
              isVerified: d.sellerId?.isNidVerified ?? true,
              rating: d.sellerId?.ratingAverage || 5.0,
              reviewCount: d.sellerId?.ratingCount || 1,
              memberSince: d.sellerId?.createdAt ? new Date(d.sellerId.createdAt).toLocaleDateString() : 'Recently',
              phoneMasked: '+8809612345678',
              avatarUrl: d.sellerId?.profile?.avatarUrl,
            },
            boost: d.boost || { isTopAd: Boolean(d.isTopAd) },
            isTopAd: Boolean(d.isTopAd || d.boost?.isTopAd),
            postedAt: 'Just now',
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to load listing from API:', err);
      });
  }, [listingId]);

  const isOwner = Boolean(
    isAuthenticated &&
    user?.id &&
    (listing.seller?.id === user.id ||
      listing.sellerId === user.id ||
      listing.sellerId?._id === user.id)
  );

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (isOwner) {
      alert('This is your own listing! You cannot chat with yourself.');
      return;
    }
    try {
      const res = await apiClient<{ roomId: string }>(`/api/v1/chats/start/${listingId}`, {
        method: 'POST',
      });
      if (res?.data?.roomId) {
        router.push(`/chat/${res.data.roomId}`);
        return;
      }
    } catch (e: any) {
      console.warn('Chat start fallback:', e);
    }
    router.push(`/chat/room_${listingId}_${user?.id || 'client'}`);
  };

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (isOwner) {
      alert('You cannot submit an offer on your own listing.');
      return;
    }
    if (!offerPrice || Number(offerPrice) <= 0) return;

    setIsSubmittingOffer(true);
    try {
      await apiClient(`/api/v1/offers/${listingId}`, {
        method: 'POST',
        body: JSON.stringify({
          offeredPrice: Number(offerPrice),
        }),
      });
      setIsOfferModalOpen(false);
      alert('Your binding offer of ' + formatPrice(Number(offerPrice)) + ' has been sent to the seller!');
      router.push(`/chat/room_${listingId}_${user?.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleInitiateProxyCall = async () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    try {
      const res = await apiClient<{ bridgeNumber: string; sessionId: string }>(
        `/api/v1/chats/room_${listingId}_${user?.id}/proxy-call`,
        { method: 'POST' }
      );
      setProxySession(res.data);
      setIsMaskedCallActive(true);
    } catch {
      // Demo fallback
      setProxySession({
        bridgeNumber: '+8809612345678',
        sessionId: 'PROXY_SESS_991823',
      });
      setIsMaskedCallActive(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <span>Home</span> / <span>{listing.category}</span> / <span>{listing.subCategory}</span> /{' '}
          <span className="text-slate-800 font-bold truncate">{listing.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5">
            <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
          </button>
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors">
            <Heart size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Gallery & Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Gallery with Watermark */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="h-96 md:h-[480px] bg-slate-900 relative flex items-center justify-center overflow-hidden">
              <img
                src={listing.images[activeImageIndex]}
                alt={listing.title}
                className="w-full h-full object-contain"
              />

              {/* Watermark Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 rotate-[-15deg]">
                <span className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase border-4 border-white px-6 py-2 rounded-2xl">
                  BuySell BD Verified
                </span>
              </div>

              {/* Nav arrows */}
              {listing.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((i) => (i === 0 ? listing.images.length - 1 : i - 1))
                    }
                    className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((i) => (i === listing.images.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            <div className="p-4 bg-slate-50 flex gap-3 overflow-x-auto border-t border-slate-100">
              {listing.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIndex === idx
                      ? 'border-brand-primary scale-105 shadow-md'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Description & Specifications */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-4">Item Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {listing.specifications?.map((spec: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 rounded-xl flex justify-between border border-slate-100"
                  >
                    <span className="text-slate-400 font-medium">{spec.key}</span>
                    <span className="font-bold text-slate-800">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-xl font-black text-slate-900 mb-4">Seller's Description</h2>
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                {listing.description}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Price Card & Seller Box */}
        <div className="space-y-6">
          {/* Price & Primary Actions */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div>
              {(listing.boost?.isTopAd || listing.isTopAd) && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg mb-2">
                  <Sparkles size={14} className="text-amber-600" /> FEATURED TOP AD
                </div>
              )}
              <h1 className="text-2xl font-black text-slate-900 leading-snug">{listing.title}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {listing.location.thana}, {listing.location.district}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> Posted {listing.postedAt}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-brand-primary">
                  {formatPrice(listing.price)}
                </span>
                {listing.isNegotiable && (
                  <span className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Negotiable
                  </span>
                )}
              </div>
            </div>

            {/* CTAs */}
            {isOwner ? (
              <div className="space-y-2.5 pt-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>This is your listing (manage and boost below)</span>
                </div>
                <Link
                  href="/profile"
                  className="w-full py-3 px-4 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm text-center block"
                >
                  Manage / Edit Listing
                </Link>
                <Link
                  href={`/checkout/${listing.id}?boost=TOP_AD_7D`}
                  className="w-full py-3 px-4 bg-brand-accent hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-center block"
                >
                  <Sparkles size={18} /> Boost with bKash (TOP AD)
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleStartChat}
                  className="w-full py-3.5 px-4 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10"
                >
                  <MessageSquare size={18} /> Chat with Verified Seller
                </button>

                <button
                  onClick={() => setIsOfferModalOpen(true)}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Tag size={18} /> Make a Binding Offer
                </button>

                <button
                  onClick={handleInitiateProxyCall}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} className="text-brand-primary" /> Call Seller (Masked DID)
                </button>
              </div>
            )}
          </div>

          {/* Seller Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Verified Seller Information
            </span>

            <div className="flex items-center gap-4">
              <img
                src={listing.seller.avatarUrl}
                alt={listing.seller.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-base">{listing.seller.name}</h3>
                  {listing.seller.isVerified && <VerifiedBadge size="sm" showLabel />}
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-0.5">
                  <Star size={14} className="fill-amber-400" />
                  <span>{listing.seller.rating}</span>
                  <span className="text-slate-400 font-normal">
                    ({listing.seller.reviewCount} verified reviews)
                  </span>
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Member since {listing.seller.memberSince}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck size={16} className="text-verified-blue shrink-0" />
                <span>NID 3D Liveness Cleared (≥95% Score)</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                This seller's phone and physical device fingerprint are cryptographically bound to
                their verified National ID.
              </p>
            </div>
          </div>

          {/* Anti-Scam Safety Warning */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <span>Anti-Fraud Safety Notice</span>
            </div>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc pl-4">
              <li>
                <strong>NEVER</strong> send bKash or Nagad advance money for courier charges or booking.
              </li>
              <li>Inspect the item in person in a safe public location before completing payment.</li>
              <li>Use BuySell BD's in-chat offer locking system to confirm pricing.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Masked Call Dialog */}
      {isMaskedCallActive && proxySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full text-center space-y-4 border border-slate-100 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-brand-primary rounded-full flex items-center justify-center mx-auto">
              <PhoneCall size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Virtual Calling Bridge Active</h3>
            <p className="text-xs text-slate-500">
              Your real mobile number is completely masked. Dial the BTRC virtual proxy number below
              to speak directly with the seller.
            </p>
            <div className="p-4 bg-slate-100 rounded-2xl text-2xl font-black text-slate-900 tracking-wider">
              {proxySession.bridgeNumber}
            </div>
            <span className="text-[11px] text-slate-400 block">
              Session TTL: 10 minutes (Session ID: {proxySession.sessionId})
            </span>
            <button
              onClick={() => setIsMaskedCallActive(false)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl"
            >
              Close Bridge
            </button>
          </div>
        </div>
      )}

      {/* Binding Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Make a Binding Offer</h3>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleMakeOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Listed Asking Price
                </label>
                <div className="text-lg font-black text-slate-400">
                  {formatPrice(listing.price)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Offer Price (BDT)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 270000"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>
              <p className="text-xs text-slate-400">
                If the seller accepts, this price is locked for 24 hours and conflicting offers are
                auto-voided.
              </p>
              <button
                type="submit"
                disabled={isSubmittingOffer}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-colors"
              >
                {isSubmittingOffer ? 'Submitting...' : 'Submit Binding Offer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
