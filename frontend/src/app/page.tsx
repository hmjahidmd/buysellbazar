'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Laptop,
  Car,
  Home as HomeIcon,
  Shirt,
  Briefcase,
  Tv,
  Bike,
  Sparkles,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { formatPrice, listingPath } from '../lib/utils';
import { TOP_ADS as FEATURED_TOP_ADS, RECENT_LISTINGS as DEFAULT_RECENT_LISTINGS } from '../data/mockListings';
import apiClient from '../lib/api';

const CATEGORIES = [
  { name: 'Mobiles', count: '14,250 ads', icon: Smartphone, color: 'text-blue-600 bg-blue-50' },
  { name: 'Electronics', count: '9,810 ads', icon: Laptop, color: 'text-indigo-600 bg-indigo-50' },
  { name: 'Vehicles', count: '6,420 ads', icon: Bike, color: 'text-emerald-600 bg-emerald-50' },
  { name: 'Property', count: '3,100 ads', icon: HomeIcon, color: 'text-amber-600 bg-amber-50' },
  { name: 'Home & Living', count: '4,890 ads', icon: Tv, color: 'text-rose-600 bg-rose-50' },
  { name: 'Fashion & Beauty', count: '8,210 ads', icon: Shirt, color: 'text-purple-600 bg-purple-50' },
  { name: 'Cars & Motors', count: '2,940 ads', icon: Car, color: 'text-sky-600 bg-sky-50' },
  { name: 'Jobs', count: '1,420 postings', icon: Briefcase, color: 'text-teal-600 bg-teal-50' },
];

const DIVISIONS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
];

export default function HomePage() {
  const [recentAds, setRecentAds] = useState<any[]>(DEFAULT_RECENT_LISTINGS);

  useEffect(() => {
    async function loadLiveAds() {
      try {
        const res = await apiClient<{ results: any[] }>('/api/v1/listings/search?limit=12');
        if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
          const formatted = res.data.results.map((item: any) => ({
            id: item._id || item.id,
            slug: item.slug,
            title: item.title,
            price: item.price,
            condition: item.condition || 'USED',
            images: item.images?.length > 0 ? item.images.map((img: any) => (typeof img === 'string' ? img : img.url)) : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800'],
            location: {
              thana: item.location?.thana || 'Dhaka',
              district: item.location?.district || 'Dhaka',
            },
            postedAt: 'Just now',
          }));

          // Prepend live ads before default mock listings, deduplicating by ID
          setRecentAds((prev) => {
            const combined = [...formatted, ...DEFAULT_RECENT_LISTINGS];
            const seen = new Set();
            return combined.filter((it) => {
              if (seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
          });
        }
      } catch (e) {
        // Fallback to default recent listings if backend unreachable
      }
    }
    loadLiveAds();
  }, []);
  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Banner & Geo Grid */}
      <section className="bg-gradient-to-b from-emerald-900 to-brand-primary text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-verified-blue" />
              Verified Bangladeshi Community
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              Buy & Sell with <span className="text-brand-accent">100% Peace of Mind</span>
            </h1>
            <p className="text-emerald-100 text-base sm:text-lg">
              No advance courier fraud. No fake accounts. Mandatory National NID verification and
              virtual masked calling for every trade.
            </p>
          </div>

          {/* Division Selector Pills */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-emerald-200">
              <MapPin size={14} /> Browse Listings by Division:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {DIVISIONS.map((div) => (
                <Link
                  key={div}
                  href={`/search?division=${div}`}
                  className="px-3 py-2 text-center rounded-xl bg-white/15 hover:bg-white hover:text-slate-900 text-white font-medium text-xs transition-all shadow-sm"
                >
                  {div}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Explore Categories</h2>
            <p className="text-sm text-slate-500">Find thousands of verified products across Bangladesh</p>
          </div>
          <Link
            href="/search"
            className="text-sm font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            All Categories <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.name}
                href={`/search?category=${encodeURIComponent(cat.name)}`}
                className="flex min-w-0 items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-primary/50 hover:shadow-md transition-all group"
              >
                <div className={`shrink-0 p-3 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-slate-800 text-sm group-hover:text-brand-primary transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{cat.count}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Featured TOP ADS Carousel Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <Award size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Featured Top Ads</h2>
              <span className="px-2 py-0.5 bg-brand-accent text-slate-950 text-[10px] font-black rounded uppercase tracking-wider">
                TOP AD
              </span>
            </div>
            <p className="text-sm text-slate-500">Verified featured listings with urgent seller availability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_TOP_ADS.map((ad) => (
            <Link
              key={ad.id}
              href={listingPath({ slug: ad.slug, id: ad.id })}
              className="bg-white rounded-2xl border-2 border-amber-300 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col group relative"
            >
              {/* Top Ad Badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-brand-accent text-slate-950 font-black text-xs rounded-lg shadow-md">
                <Sparkles size={14} /> TOP AD
              </div>

              {/* Image with Verified Watermark Preview */}
              <div className="h-56 bg-slate-100 relative overflow-hidden">
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] text-white font-medium rounded">
                  BuySell BD Verified
                </div>
              </div>

              {/* Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-2xl font-black text-brand-primary">
                      {formatPrice(ad.price)}
                    </span>
                    {ad.isNegotiable && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Negotiable
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-base line-clamp-2 group-hover:text-brand-primary transition-colors">
                    {ad.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    {ad.location.thana}, {ad.location.district}
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <span className="truncate max-w-[100px]">{ad.seller.name}</span>
                    <VerifiedBadge size="sm" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Recent Verified Ads */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Verified Ads</h2>
            <p className="text-sm text-slate-500">Fresh listings added by verified community sellers</p>
          </div>
          <Link
            href="/search"
            className="text-sm font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            View All Ads <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {recentAds.map((ad) => (
            <Link
              key={ad.id}
              href={`/listings/${ad.id}`}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group"
            >
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold rounded">
                  {ad.condition}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-lg font-black text-brand-primary block mb-0.5">
                    {formatPrice(ad.price)}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-brand-primary transition-colors">
                    {ad.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[110px]">
                    <MapPin size={12} className="shrink-0" />
                    {ad.location.thana}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock size={12} /> {ad.postedAt}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
