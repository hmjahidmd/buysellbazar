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
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
