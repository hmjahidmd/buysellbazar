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
  return (
    <html lang="en">
      <head>
        <title>BuySell BD - 100% NID-Verified & Anti-Scam Classifieds</title>
        <meta
          name="description"
          content="Buy and sell verified mobile phones, electronics, vehicles, and property in Bangladesh with mandatory e-KYC, anti-scam shield, and virtual masked calling."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
