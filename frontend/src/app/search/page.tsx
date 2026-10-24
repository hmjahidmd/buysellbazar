'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Filter,
  SlidersHorizontal,
  ShieldCheck,
  Check,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import { formatPrice, listingPath } from '../../lib/utils';
import apiClient from '../../lib/api';
import { MOCK_LISTINGS } from '../../data/mockListings';

const CATEGORIES = [
  'All Categories',
  'Mobiles',
  'Electronics',
  'Vehicles',
  'Property',
  'Home & Living',
  'Fashion & Beauty',
  'Cars & Motors',
  'Jobs',
];

const CONDITIONS = ['ALL', 'BRAND_NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS'];

const GEO_DATA: Record<string, string[]> = {
  Dhaka: ['Dhaka Sadar', 'Mirpur', 'Dhanmondi', 'Gulshan', 'Uttara', 'Mohammadpur', 'Badda'],
  Chittagong: ['Kotwali', 'Panchlaish', 'Agrabad', 'Halishahar', 'GEC Circle'],
  Sylhet: ['Sylhet Sadar', 'Zindabazar', 'Amberkhana', 'Subidbazar'],
  Rajshahi: ['Boalia', 'Motihar', 'Rajpara'],
  Khulna: ['Khulna Sadar', 'Sonadanga', 'Khalishpur'],
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All Categories');
  const [selectedDivision, setSelectedDivision] = useState(searchParams.get('division') || 'All Bangladesh');
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || '');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('createdAt_desc');

  // Listings data from centralized mockListings (or API)
  const [listings, setListings] = useState<any[]>(MOCK_LISTINGS);

  // Load real database listings
  useEffect(() => {
    async function fetchLiveListings() {
      try {
        const res = await apiClient<{ results: any[] }>('/api/v1/listings/search?limit=50');
        if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
          const liveFormatted = res.data.results.map((item: any) => ({
            id: item._id || item.id,
            slug: item.slug,
            title: item.title,
            description: item.description || '',
            category: item.category || 'Mobiles',
            price: item.price || 0,
            isNegotiable: item.isNegotiable ?? true,
            condition: item.condition || 'USED',
            location: {
              division: item.location?.division || 'Dhaka',
              district: item.location?.district || 'Dhaka',
              thana: item.location?.thana || 'Mirpur',
            },
            images: item.images?.length > 0 ? item.images.map((img: any) => (typeof img === 'string' ? img : img.url)) : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800'],
            isTopAd: !!item.boost?.isTopAd,
            isBumped: !!item.boost?.isBumped,
            seller: {
              id: item.sellerId?._id || 'seller_live',
              name: item.sellerId?.profile?.displayName || 'Verified Seller',
              isVerified: item.sellerId?.isNidVerified ?? true,
              rating: item.sellerId?.ratingAverage || 5.0,
            },
            postedAt: 'Just now',
          }));

          setListings((prev) => {
            const combined = [...liveFormatted, ...MOCK_LISTINGS];
            const seen = new Set();
            return combined.filter((it) => {
              if (seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
          });
        }
      } catch (err) {
        // Fallback to mock
      }
    }
    fetchLiveListings();
  }, []);

  // Apply filters in state
  const filteredListings = listings.filter((l) => {
    if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (selectedCategory !== 'All Categories' && l.category !== selectedCategory) return false;
    if (selectedDivision !== 'All Bangladesh' && l.location.division !== selectedDivision) return false;
    if (selectedCondition !== 'ALL' && l.condition !== selectedCondition) return false;
    if (verifiedOnly && !l.seller.isVerified) return false;
    if (minPrice !== '' && l.price < Number(minPrice)) return false;
    if (maxPrice !== '' && l.price > Number(maxPrice)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Search & Active Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keywords..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="createdAt_desc">Most Recent</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar Filters */}
        <aside className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <SlidersHorizontal size={16} /> Filters
            </span>
            <button
              onClick={() => {
                setQ('');
                setSelectedCategory('All Categories');
                setSelectedDivision('All Bangladesh');
                setSelectedCondition('ALL');
                setVerifiedOnly(false);
                setMinPrice('');
                setMaxPrice('');
              }}
              className="text-xs text-brand-primary font-bold hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Verified Sellers Toggle */}
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-verified-blue" />
              <span className="text-xs font-bold text-slate-800">Verified Sellers Only</span>
            </div>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
            />
          </div>

          {/* Category Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Category
            </h4>
            <div className="space-y-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === c
                      ? 'bg-emerald-50 text-brand-primary font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Division / Geo Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Division & Location
            </h4>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedDistrict('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="All Bangladesh">All Bangladesh</option>
              {Object.keys(GEO_DATA).map((div) => (
                <option key={div} value={div}>
                  {div} Division
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Slider / Inputs */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Price Range (BDT)
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ৳"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max ৳"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Condition Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Item Condition
            </h4>
            <div className="space-y-1.5">
              {CONDITIONS.map((cond) => (
                <label key={cond} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value={cond}
                    checked={selectedCondition === cond}
                    onChange={() => setSelectedCondition(cond)}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  <span>{cond.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Listings Result Grid */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredListings.length}</strong> verified ads
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((ad) => (
              <Link
                key={ad.id}
                href={listingPath({ slug: ad.slug, id: ad.id })}
                className={`bg-white rounded-2xl border ${
                  ad.isTopAd ? 'border-amber-300 shadow-md ring-1 ring-amber-200' : 'border-slate-200'
                } hover:shadow-lg transition-all overflow-hidden flex flex-col group relative`}
              >
                {ad.isTopAd && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-brand-accent text-slate-950 font-black text-[10px] rounded shadow">
                    <Sparkles size={12} /> TOP AD
                  </div>
                )}

                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={ad.images[0]}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded">
                    {ad.condition}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="text-lg font-black text-brand-primary">
                        {formatPrice(ad.price)}
                      </span>
                      {ad.isNegotiable && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Negotiable
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-brand-primary transition-colors">
                      {ad.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin size={12} className="shrink-0" />
                      {ad.location.thana}
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="truncate max-w-[90px]">{ad.seller.name}</span>
                      <VerifiedBadge size="sm" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-sm">
          Loading catalog search...
        </div>
      }
    >
      <SearchContent />
    </React.Suspense>
  );
}
