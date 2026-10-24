'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import LoginModal from '../components/auth/LoginModal';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <title>BuySell BD - 100% NID-Verified & Anti-Scam Classifieds</title>
        <meta
          name="description"
          content="Buy and sell verified mobile phones, electronics, vehicles, and property in Bangladesh with mandatory e-KYC, anti-scam shield, and virtual masked calling."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#047857" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BuySell BD" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col bg-bg-light antialiased">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <LoginModal />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
