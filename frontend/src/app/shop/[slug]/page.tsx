'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Store,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import VerifiedBadge from '../../../components/ui/VerifiedBadge';
import { formatPrice } from '../../../lib/utils';

export default function StorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Mock Storefront Data
  const store = {
    brandName: 'Gadget Master BD',
    storeSlug: slug,
    tagline: 'Official Importer of Flagship Gaming & Audio Accessories in Bangladesh',
    description:
      'Authorized distributor and retailer for Sony PlayStation, Nintendo, and high-end audiophile equipment in Dhaka. 100% genuine products with manufacturer warranty.',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80',
    tier: 'PLATINUM',
    tradeLicenseNumber: 'TRAD/DSCC/019283/2025',
    tradeLicenseVerified: true,
    rating: 5.0,
    reviewCount: 48,
    metrics: {
      totalListings: 24,
      totalSold: 182,
    },
    contact: {
      officialPhone: '01812345678',
      officialEmail: 'sales@gadgetmasterbd.com',
      physicalStoreAddress: 'Shop 42-44, Level 4, IDB Bhaban, Agargaon, Dhaka',
      websiteUrl: 'https://gadgetmasterbd.com',
    },
    listings: [
      {
        id: '65f2a1b9c9e77a001f3b2002',
        title: 'Sony PlayStation 5 Disc Edition (Japan Variant) + 2 Controllers',
        price: 68000,
        isTopAd: true,
        condition: 'BRAND_NEW',
        image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80',
      },
      {
        id: '65f2a1b9c9e77a001f3b2010',
        title: 'Nintendo Switch OLED Model White Edition (Intact Box)',
        price: 36500,
        isTopAd: false,
        condition: 'BRAND_NEW',
        image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&q=80',
      },
      {
        id: '65f2a1b9c9e77a001f3b2011',
        title: 'Sony DualSense Wireless Controller Midnight Black',
        price: 7800,
        isTopAd: false,
        condition: 'BRAND_NEW',
        image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=600&q=80',
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Store Header & Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-48 sm:h-64 bg-slate-900 relative">
          <img src={store.bannerUrl} alt="Store Banner" className="w-full h-full object-cover opacity-80" />
          <div className="absolute top-4 right-4 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md uppercase tracking-wider">
            {store.tier} MERCHANT
          </div>
        </div>

        <div className="p-6 sm:p-8 relative pt-0 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-6">
            <div className="flex items-end gap-4">
              <img
                src={store.logoUrl}
                alt={store.brandName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-lg bg-white shrink-0"
              />
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {store.brandName}
                  </h1>
                  <VerifiedBadge size="md" showLabel />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{store.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs border border-amber-200">
                <Star size={14} className="fill-amber-400" />
                <span>{store.rating}</span>
                <span className="text-slate-400">({store.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          {/* Trade License & Verification Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Verified Trade License: <strong>{store.tradeLicenseNumber}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{store.contact.physicalStoreAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone size={16} className="text-brand-primary shrink-0" />
              <span>{store.contact.officialPhone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Store Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">
            Store Catalog ({store.listings.length} Active Listings)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {store.listings.map((item) => (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group relative"
            >
              {item.isTopAd && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-brand-accent text-slate-950 font-black text-[10px] rounded shadow">
                  <Sparkles size={12} /> TOP AD
                </div>
              )}
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-lg font-black text-brand-primary block">
                    {formatPrice(item.price)}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-brand-primary transition-colors">
                    {item.title}
                  </h3>
                </div>
                <span className="text-xs text-slate-400">{item.condition}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
