export interface ListingSpecification {
  key: string;
  value: string;
}

export interface ListingSeller {
  id: string;
  name: string;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  reviewCount?: number;
  memberSince: string;
  phoneMasked: string;
  avatarUrl?: string;
}

export interface ListingItem {
  id: string;
  slug?: string;
  title: string;
  price: number;
  isNegotiable: boolean;
  condition: 'BRAND_NEW' | 'LIKE_NEW' | 'USED';
  category: string;
  subCategory: string;
  location: {
    division: string;
    district: string;
    thana: string;
    address: string;
  };
  images: string[];
  description: string;
  specifications: ListingSpecification[];
  seller: ListingSeller;
  boost?: {
    isTopAd?: boolean;
    isBumped?: boolean;
  };
  isTopAd?: boolean;
  isBumped?: boolean;
  postedAt?: string;
  createdAt: string;
}

export const MOCK_LISTINGS: ListingItem[] = [
  {
    id: '65f2a1b9c9e77a001f3b2001',
    title: 'Yamaha FZS V3 Dual Channel ABS 2023 Edition (Mint Condition)',
    price: 285000,
    isNegotiable: true,
    condition: 'USED',
    category: 'Vehicles',
    subCategory: 'Motorcycles',
    location: {
      division: 'Dhaka',
      district: 'Dhaka',
      thana: 'Mirpur 10',
      address: 'Near Mirpur 10 Metro Rail Station, Dhaka',
    },
    images: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1000&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1000&q=80',
      'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=1000&q=80',
    ],
    description: `Brand new condition Yamaha FZS V3 Dual Channel ABS.
- Engine: 149cc FI Blue Core Engine
- Mileage: 42 km/l
- Kilometers Run: 9,200 km
- Papers: 2 Years registration done from BRTA Mirpur circle. Smart card and tax token up to date till late 2025.
- Condition: 100% scratch free, regular mobile servicing done at Yamaha official service center.
- Reason for selling: Relocating abroad.

Direct buyers only. Price slightly negotiable face to face. Please don't call with unrealistic offers.`,
    specifications: [
      { key: 'Brand', value: 'Yamaha' },
      { key: 'Model', value: 'FZS V3 Dual Channel ABS' },
      { key: 'Year of Manufacture', value: '2023' },
      { key: 'Engine Capacity', value: '149 cc' },
      { key: 'Kilometers Run', value: '9,200 km' },
      { key: 'Braking System', value: 'Dual Channel ABS' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1001',
      name: 'Tanvir Ahmed',
      isVerified: true,
      rating: 4.9,
      totalReviews: 24,
      reviewCount: 24,
      memberSince: 'March 2023',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
    },
    boost: {
      isTopAd: true,
    },
    isTopAd: true,
    postedAt: '10 mins ago',
    createdAt: '2026-10-23T00:30:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2002',
    title: 'Sony PlayStation 5 Disc Edition (Japan Variant) + 2 Controllers',
    price: 68000,
    isNegotiable: false,
    condition: 'BRAND_NEW',
    category: 'Electronics',
    subCategory: 'Video Games & Consoles',
    location: {
      division: 'Dhaka',
      district: 'Dhaka',
      thana: 'Gulshan 2',
      address: 'Gulshan Pink City Shopping Complex, Dhaka',
    },
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&q=80',
    ],
    description: `Brand new boxed Sony PlayStation 5 (CFI-1200 Disc Model).
- Includes 2 original DualSense wireless controllers (White & Midnight Black)
- 825GB Ultra-high speed SSD
- 4K 120Hz & HDR support
- 1 Year international replacement warranty
- In-store pickup available at Gulshan 2 or delivery across Bangladesh.`,
    specifications: [
      { key: 'Brand', value: 'Sony' },
      { key: 'Model', value: 'PlayStation 5 Disc Edition' },
      { key: 'Storage', value: '825 GB SSD' },
      { key: 'Resolution Support', value: 'Up to 4K 120Hz / 8K' },
      { key: 'Controllers Included', value: '2 DualSense' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1003',
      name: 'Gadget Master BD',
      isVerified: true,
      rating: 5.0,
      totalReviews: 86,
      reviewCount: 86,
      memberSince: 'November 2021',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80',
    },
    boost: {
      isTopAd: true,
    },
    isTopAd: true,
    postedAt: '1 hour ago',
    createdAt: '2026-10-23T01:30:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2003',
    title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium (BTRC Approved)',
    price: 154000,
    isNegotiable: true,
    condition: 'LIKE_NEW',
    category: 'Mobiles',
    subCategory: 'Smartphones',
    location: {
      division: 'Chittagong',
      district: 'Chittagong',
      thana: 'Agrabad',
      address: 'Near Agrabad Commercial Area, Chittagong',
    },
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1000&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1000&q=80',
    ],
    description: `Official BTRC approved iPhone 15 Pro Max Natural Titanium 256GB.
- Battery Health: 99%
- Physical Dual SIM + eSIM supported
- Comes with original Apple 20W charger, Box, and cash memo
- 7 months official Apple warranty remaining
- Used with screen protector and case from day 1, zero scratches or dents.`,
    specifications: [
      { key: 'Brand', value: 'Apple' },
      { key: 'Model', value: 'iPhone 15 Pro Max' },
      { key: 'Storage', value: '256 GB' },
      { key: 'Color', value: 'Natural Titanium' },
      { key: 'Battery Health', value: '99%' },
      { key: 'BTRC Status', value: 'Official Approved' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1002',
      name: 'Rahim Electronics',
      isVerified: true,
      rating: 4.8,
      totalReviews: 48,
      reviewCount: 48,
      memberSince: 'January 2022',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    },
    boost: {
      isTopAd: true,
    },
    isTopAd: true,
    postedAt: '25 mins ago',
    createdAt: '2026-10-23T01:00:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2004',
    title: 'MacBook Air M2 16GB Unified RAM / 256GB SSD Space Gray',
    price: 112000,
    isNegotiable: true,
    condition: 'USED',
    category: 'Electronics',
    subCategory: 'Laptops',
    location: {
      division: 'Dhaka',
      district: 'Dhaka',
      thana: 'Dhanmondi',
      address: 'Near Dhanmondi 27, Dhaka',
    },
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1000&q=80',
    ],
    description: `Super clean MacBook Air M2 13.6-inch Liquid Retina Display.
- Chip: Apple M2 (8-core CPU, 8-core GPU)
- RAM: Upgraded 16GB Unified RAM (perfect for programming & multitasking)
- Storage: 256GB SSD
- Battery Cycle: 48 cycles only (100% capacity)
- MagSafe 3 charger and original 30W adapter included. No dent, no scratch.`,
    specifications: [
      { key: 'Brand', value: 'Apple' },
      { key: 'Model', value: 'MacBook Air M2 (2022)' },
      { key: 'Processor', value: 'Apple M2 Chip' },
      { key: 'RAM', value: '16 GB Unified' },
      { key: 'SSD', value: '256 GB' },
      { key: 'Battery Health', value: '100% (48 Cycles)' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1004',
      name: 'Samiul Hasan',
      isVerified: true,
      rating: 4.7,
      totalReviews: 12,
      reviewCount: 12,
      memberSince: 'July 2023',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    },
    postedAt: '2 hours ago',
    createdAt: '2026-10-23T02:00:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2005',
    title: 'Canon EOS R6 Mark II Mirrorless Camera Body (Mint Condition)',
    price: 215000,
    isNegotiable: false,
    condition: 'LIKE_NEW',
    category: 'Electronics',
    subCategory: 'Cameras & Photography',
    location: {
      division: 'Sylhet',
      district: 'Sylhet',
      thana: 'Zindabazar',
      address: 'Zindabazar Commercial Center, Sylhet',
    },
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1000&q=80',
    ],
    description: `Professional Canon EOS R6 Mark II Mirrorless Camera.
- 24.2 MP Full-Frame CMOS Sensor
- 6K oversampled 4K 60p video recording
- Shutter count less than 3,500 shots
- Comes with original battery, charger, strap, and box
- Tested 100% functional, used inside studio only.`,
    specifications: [
      { key: 'Brand', value: 'Canon' },
      { key: 'Model', value: 'EOS R6 Mark II Body' },
      { key: 'Sensor', value: '24.2 MP Full Frame' },
      { key: 'Shutter Count', value: '< 3,500' },
      { key: 'Video Resolution', value: '4K 60fps / 6K Raw' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1005',
      name: 'Sylhet Camera House',
      isVerified: true,
      rating: 4.9,
      totalReviews: 31,
      reviewCount: 31,
      memberSince: 'February 2022',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
    },
    postedAt: '4 hours ago',
    createdAt: '2026-10-23T02:30:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2006',
    title: 'Toyota Corolla Axio Hybrid 2018 WxB Grade (Pearl White)',
    price: 1980000,
    isNegotiable: true,
    condition: 'USED',
    category: 'Vehicles',
    subCategory: 'Cars',
    location: {
      division: 'Dhaka',
      district: 'Dhaka',
      thana: 'Uttara',
      address: 'Sector 3, Uttara, Dhaka',
    },
    images: [
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=1000&q=80',
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=1000&q=80',
    ],
    description: `Toyota Corolla Axio Hybrid 2018 (Registered 2022).
- Grade: WxB Top Trim (Push start, Projection LED, Half-leather seats)
- Color: Pearl White
- Mileage: 46,000 km
- All papers up to date till mid 2026
- Self driven car, zero accident history, genuine auction sheet available.`,
    specifications: [
      { key: 'Brand', value: 'Toyota' },
      { key: 'Model', value: 'Corolla Axio Hybrid WxB' },
      { key: 'Year of Manufacture', value: '2018' },
      { key: 'Registration Year', value: '2022' },
      { key: 'Fuel Type', value: 'Octane / Hybrid' },
      { key: 'Transmission', value: 'Automatic (CVT)' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1006',
      name: 'Auto Point BD',
      isVerified: true,
      rating: 4.8,
      totalReviews: 54,
      reviewCount: 54,
      memberSince: 'September 2021',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&q=80',
    },
    postedAt: '5 hours ago',
    createdAt: '2026-10-23T03:00:00.000Z',
  },
  {
    id: '65f2a1b9c9e77a001f3b2007',
    title: 'Samsung 55 Inch Crystal 4K UHD Smart TV (Dynamic Crystal Color)',
    price: 52000,
    isNegotiable: true,
    condition: 'BRAND_NEW',
    category: 'Electronics',
    subCategory: 'TVs & Video Accessories',
    location: {
      division: 'Chittagong',
      district: 'Chittagong',
      thana: 'GEC Circle',
      address: 'Near GEC Convention Center, Chittagong',
    },
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1000&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1000&q=80',
    ],
    description: `Brand new in box Samsung 55 Inch CU7000 / CU8000 Crystal 4K Smart TV.
- Resolution: 3840 x 2160 (True 4K UHD)
- OS: Tizen Smart Hub with Netflix, YouTube, Prime Video
- SolarCell Remote included
- 2 Years official panel warranty
- Cash on delivery available in Chittagong and Dhaka.`,
    specifications: [
      { key: 'Brand', value: 'Samsung' },
      { key: 'Screen Size', value: '55 Inch' },
      { key: 'Display Technology', value: 'Crystal 4K UHD' },
      { key: 'Operating System', value: 'Tizen OS' },
      { key: 'Connectivity', value: '3x HDMI, 2x USB, Wi-Fi, Bluetooth' },
    ],
    seller: {
      id: '65f2a1b9c9e77a001f3b1007',
      name: 'Electro World',
      isVerified: true,
      rating: 4.6,
      totalReviews: 19,
      reviewCount: 19,
      memberSince: 'May 2023',
      phoneMasked: '+8809612345678',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&q=80',
    },
    postedAt: '6 hours ago',
    createdAt: '2026-10-23T03:30:00.000Z',
  },
];

function toSlug(title: string): string {
  return (title || 'listing')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'listing';
}

MOCK_LISTINGS.forEach((item) => {
  if (!item.slug) item.slug = toSlug(item.title);
});

export const getMockListingById = (id: string): ListingItem | undefined => {
  return MOCK_LISTINGS.find(
    (item) => item.id === id || item.slug === id || toSlug(item.title) === id
  );
};

export const TOP_ADS = MOCK_LISTINGS.filter((item) => item.isTopAd);
export const RECENT_LISTINGS = MOCK_LISTINGS.filter((item) => !item.isTopAd);
