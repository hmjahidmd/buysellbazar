import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BuySell BD Marketplace',
    short_name: 'BuySell BD',
    description: 'Buy and sell locally with verified marketplace members.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#047857',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}