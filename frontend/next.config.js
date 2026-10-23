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
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
