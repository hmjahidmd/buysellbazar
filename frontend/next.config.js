/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      'cdn.marketplace.com.bd',
      'buysell.bd',
      'images.unsplash.com',
    ],
  },
  // Do not proxy /api/v1 away from this Next.js app.
  // Vercel serves auth/listings from src/app/api/v1/[...slug]/route.ts + MongoDB Atlas.
  // Set USE_EXTERNAL_API=true only if a separate Express backend is actually deployed.
  async rewrites() {
    const external = process.env.NEXT_PUBLIC_API_URL;
    if (process.env.USE_EXTERNAL_API === 'true' && external && !external.includes('localhost')) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${external.replace(/\/$/, '')}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
