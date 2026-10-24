'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Upload,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';
import { fieldsForCategory } from '../../data/categoryFields';

const CATEGORIES = [
  'Mobiles',
  'Electronics',
  'Vehicles',
  'Property',
  'Home & Living',
  'Fashion & Beauty',
  'Cars & Motors',
  'Jobs',
];

const CONDITIONS = [
  { value: 'BRAND_NEW', label: 'Brand New (Intact/Boxed)' },
  { value: 'LIKE_NEW', label: 'Like New (Used few times)' },
  { value: 'USED', label: 'Used (Normal wear and tear)' },
  { value: 'FOR_PARTS', label: 'For Parts / Not Working' },
];

export default function PostAdPage() {
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('USED');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [thana, setThana] = useState('Mirpur');
  const [images, setImages] = useState<string[]>([]);
  const [selectedBoost, setSelectedBoost] = useState<'NONE' | 'TOP_AD_7D' | 'BUMP_UP'>('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const specFields = fieldsForCategory(category);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
        <ShieldCheck size={48} className="text-verified-blue mx-auto" />
        <h1 className="text-2xl font-bold text-slate-800">Sign in to Post an Ad</h1>
        <p className="text-sm text-slate-500">
          Only verified users can post classified ads on BuySell BD. Please sign in to proceed.
        </p>
        <button
          onClick={openLoginModal}
          className="px-6 py-2.5 bg-brand-primary text-white font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!user?.isNidVerified) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={36} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Mandatory e-KYC Verification Required</h1>
        <p className="text-sm text-slate-500">
          Under platform security policy, all sellers must complete National NID OCR + 3D Liveness
          verification before publishing ads to protect buyers from fraud.
        </p>
        <button
          onClick={() => router.push('/kyc')}
          className="px-6 py-3 bg-verified-blue text-white font-bold rounded-xl hover:bg-sky-600 transition-colors shadow-md"
        >
          Complete e-KYC Verification (2 mins)
        </button>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (user) {
                const updated = { ...user, isNidVerified: true };
                localStorage.setItem('auth_user', JSON.stringify(updated));
                window.location.reload();
              }
            }}
            className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors inline-block"
          >
            ⚡ Quick-Unlock Verification (Dev Mode Instant Test)
          </button>
        </div>
      </div>
    );
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleRealImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => (prev.length < 10 ? [...prev, reader.result as string] : prev));
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => (prev.length < 10 ? [...prev, reader.result as string] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUseCategoryTemplatePhotos = () => {
    let samplePhotos: string[] = [];
    if (category === 'Mobiles') {
      samplePhotos = [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
      ];
    } else if (category === 'Electronics') {
      samplePhotos = [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80',
      ];
    } else if (category === 'Vehicles' || category === 'Cars & Motors') {
      samplePhotos = [
        'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80',
        'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&q=80',
      ];
    } else {
      samplePhotos = [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
      ];
    }
    setImages(samplePhotos);
  };

  const handleSubmitAd = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const specifications = Object.entries(specValues)
        .filter(([, value]) => String(value || '').trim())
        .map(([key, value]) => ({ key, value: String(value).trim() }));

      const res = await apiClient<{ listingId: string; status: string; slug?: string; id?: string }>('/api/v1/listings', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          subCategory: category,
          specifications,
          price: Number(price),
          isNegotiable,
          condition,
          location: {
            division,
            district,
            thana,
          },
          images: images.map((url) => ({ url })),
        }),
      });

      const created = res?.data as any;
      if (selectedBoost !== 'NONE') {
        router.push(`/checkout/${created?.id || created?._id || created?.listingId}?boost=${selectedBoost}`);
      } else {
        router.push('/profile?submitted=pending');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish listing');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Stepper Header */}
      <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-bold text-slate-500">
        <span className={step >= 1 ? 'text-brand-primary' : ''}>1. Category</span>
        <span>•</span>
        <span className={step >= 2 ? 'text-brand-primary' : ''}>2. Details</span>
        <span>•</span>
        <span className={step >= 3 ? 'text-brand-primary' : ''}>3. Location</span>
        <span>•</span>
        <span className={step >= 4 ? 'text-brand-primary' : ''}>4. Photos</span>
        <span>•</span>
        <span className={step >= 5 ? 'text-brand-primary' : ''}>5. Boost</span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-brand-red rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Choose a Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setSpecValues({});
                  setStep(2);
                }}
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all ${
                  category === cat
                    ? 'border-brand-primary bg-emerald-50 text-brand-primary'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Item Details */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Item Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Listing Title</label>
              <input
                type="text"
                placeholder="e.g. Yamaha FZS V3 Dual Channel ABS 2023"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asking Price (BDT)
                </label>
                <input
                  type="number"
                  placeholder="285000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="w-5 h-5 text-brand-primary rounded"
                />
                <label htmlFor="negotiable" className="text-sm font-bold text-slate-700">
                  Price is Negotiable
                </label>
              </div>
            </div>

            {specFields.length > 0 && (
              <div className="pt-2 space-y-3">
                <h3 className="text-sm font-black text-slate-800">
                  {category} specifications
                </h3>
                <p className="text-[11px] text-slate-500">
                  Same fields buyers see on demo ads (Brand, Model, year, fuel, etc. depending on category).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{field.label}</label>
                      {field.type === 'select' && field.options ? (
                        <select
                          value={specValues[field.key] || ''}
                          onChange={(e) =>
                            setSpecValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={specValues[field.key] || ''}
                          onChange={(e) =>
                            setSpecValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description
              </label>
              <textarea
                rows={5}
                placeholder="Describe condition, documentation, specifications, and reason for selling..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="py-3 px-5 bg-slate-100 rounded-xl font-bold text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!title || !price || !description}
              className="flex-1 py-3 px-5 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 disabled:opacity-50"
            >
              Next: Location
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Select Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Division</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              >
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thana / Area</label>
              <input
                type="text"
                value={thana}
                onChange={(e) => setThana(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="py-3 px-5 bg-slate-100 rounded-xl font-bold text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 px-5 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800"
            >
              Next: Upload Photos
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Photos */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Upload Product Photos (Max 10)</h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {images.length} / 10 Added
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select real photos of your {category || 'product'} from your computer or mobile. Translucent "BuySell BD Verified" watermark will be applied automatically.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleRealImageUpload}
            className="hidden"
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDropFiles}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
              isDragging
                ? 'border-brand-primary bg-emerald-50 scale-[1.01]'
                : 'border-slate-300 hover:border-brand-primary bg-slate-50/60 hover:bg-emerald-50/30'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-brand-primary flex items-center justify-center mb-3 shadow-sm">
              <Upload size={24} />
            </div>
            <span className="text-sm font-bold text-slate-800">
              Click to browse photos from computer or mobile
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Supports JPEG, PNG, WebP (or drag and drop files here)
            </span>
          </div>

          {/* Quick Demo Template Helper */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-600 font-medium">
              Don't have photos handy right now?
            </span>
            <button
              type="button"
              onClick={handleUseCategoryTemplatePhotos}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-brand-primary text-slate-700 font-bold rounded-lg shadow-sm hover:text-brand-primary transition-all"
            >
              ⚡ Use Sample {category || 'Product'} Photos
            </button>
          </div>

          {/* Image Previews Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative h-32 rounded-xl overflow-hidden border border-slate-200 group shadow-sm bg-slate-100">
                  <img src={img} alt={`Product Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  
                  {/* Primary Badge */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-700 text-white font-bold text-[9px] rounded-md shadow">
                      Cover Photo
                    </span>
                  )}

                  {/* Watermark preview tag */}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[8px] font-semibold rounded">
                    BuySell BD Verified
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-brand-primary hover:text-brand-primary transition-colors bg-slate-50/50"
                >
                  <Plus size={24} />
                  <span className="text-xs font-bold mt-1">+ Add More</span>
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="py-3 px-5 bg-slate-100 rounded-xl font-bold text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 py-3 px-5 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800"
            >
              Next: Promotion & Boost
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Boost Promotion */}
      {step === 5 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Boost Your Listing (Optional)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Top Ads get up to 10x more buyer views and faster sales.
            </p>
          </div>

          <div className="space-y-3">
            <label
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedBoost === 'NONE'
                  ? 'border-brand-primary bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="boost"
                  checked={selectedBoost === 'NONE'}
                  onChange={() => setSelectedBoost('NONE')}
                  className="text-brand-primary"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Free Standard Ad</span>
                  <span className="text-xs text-slate-400">Active for 30 days</span>
                </div>
              </div>
              <span className="text-sm font-black text-slate-800">৳0 (Free)</span>
            </label>

            <label
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedBoost === 'TOP_AD_7D'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="boost"
                  checked={selectedBoost === 'TOP_AD_7D'}
                  onChange={() => setSelectedBoost('TOP_AD_7D')}
                  className="text-amber-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">TOP AD (7 Days)</span>
                    <span className="px-2 py-0.5 bg-brand-accent text-slate-950 text-[10px] font-black rounded uppercase">
                      Popular
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Highlighted with gold badge on Home & Search top
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-brand-primary">৳499</span>
            </label>

            <label
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedBoost === 'BUMP_UP'
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="boost"
                  checked={selectedBoost === 'BUMP_UP'}
                  onChange={() => setSelectedBoost('BUMP_UP')}
                  className="text-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Instant Bump Up</span>
                  <span className="text-xs text-slate-500">Refreshes ad to top of search results</span>
                </div>
              </div>
              <span className="text-sm font-black text-brand-primary">৳99</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="py-3 px-5 bg-slate-100 rounded-xl font-bold text-sm"
            >
              Back
            </button>
            <button
              onClick={handleSubmitAd}
              disabled={isSubmitting}
              className="flex-1 py-3 px-5 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 shadow-md"
            >
              {isSubmitting ? 'Publishing Ad...' : 'Publish Listing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
