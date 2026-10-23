import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#006A4E', // Bangladesh Bottle Green
        'brand-red': '#F42A41',     // National Crimson Red
        'brand-accent': '#FFB800',  // Gold / Top Ad Badge
        'verified-blue': '#1DA1F2', // Blue Shield KYC Badge
        'dark-slate': '#1E293B',    // Dark Slate
        'bg-light': '#F8FAFC',      // Background Light
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
