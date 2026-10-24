'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Send,
  Image as ImageIcon,
  Tag,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import VerifiedBadge from '../../../components/ui/VerifiedBadge';
import { formatPrice } from '../../../lib/utils';
import apiClient from '../../../lib/api';

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM_WARNING' | 'MEETUP_PIN';
  isScamFlagged?: boolean;
  createdAt: string;
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const roomId = params.roomId as string;
  const listingId = roomId?.split('_')?.[1];

  const [listingInfo, setListingInfo] = useState<{
    title: string;
    price: number;
    sellerName: string;
    sellerVerified: boolean;
    image: string;
  }>({
    title: 'Listing',
    price: 0,
    sellerName: 'Marketplace member',
    sellerVerified: false,
    image: '/icon.svg',
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatError, setChatError] = useState('');

  const [inputContent, setInputContent] = useState('');
  const [hasScamWarning, setHasScamWarning] = useState(false);
  const [scamWarningText, setScamWarningText] = useState('');

  // Fetch live listing details
  useEffect(() => {
    if (listingId && listingId.length === 24) {
      apiClient<{ _id: string; title: string; price: number; images: any[]; sellerId: any }>(
        `/api/v1/listings/${listingId}`
      )
        .then((res) => {
          if (res?.data) {
            setListingInfo({
              title: res.data.title,
              price: res.data.price,
              sellerName: res.data.sellerId?.profile?.displayName || 'Verified Seller',
              sellerVerified: res.data.sellerId?.isNidVerified ?? true,
              image:
                res.data.images?.[0]?.url ||
                (typeof res.data.images?.[0] === 'string' ? res.data.images[0] : 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=150&q=80'),
            });
          }
        })
        .catch((err) => setChatError(err.message || 'Unable to load conversation'));
    }
  }, [listingId]);

  // Load message history from backend
  useEffect(() => {
    if (isAuthenticated && roomId) {
      apiClient<{ messages: any[] }>(`/api/v1/chats/${roomId}/messages`)
        .then((res) => {
          if (res?.data && Array.isArray(res.data.messages) && res.data.messages.length > 0) {
            setMessages(
              res.data.messages.map((m: any) => ({
                id: m._id || m.id,
                senderId: m.senderId?._id || m.senderId || 'unknown',
                content: m.content,
                type: m.messageType || 'TEXT',
                isScamFlagged: m.isScamFlagged,
                createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, roomId]);

  // Active Offer Pin state
  const [activeOffer] = useState<{
    id: string;
    offeredPrice: number;
    status: 'PENDING' | 'ACCEPTED' | 'COUNTERED';
    buyerId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hasScamWarning]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    const currentText = inputContent.trim();
    setChatError('');
    try {
      const response = await apiClient<{ message: any; warningMessage?: any }>(
        `/api/v1/chats/${roomId}/messages`,
        { method: 'POST', body: JSON.stringify({ content: currentText }) }
      );
      const saved = response.data.message;
      setMessages((current) => [...current, {
        id: saved._id || saved.id,
        senderId: saved.senderId?._id || saved.senderId || user?.id || '',
        content: saved.content,
        type: saved.messageType || 'TEXT',
        isScamFlagged: saved.isScamFlagged,
        createdAt: new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      if (response.data.warningMessage) {
        const warning = response.data.warningMessage;
        setMessages((current) => [...current, {
          id: warning._id || warning.id,
          senderId: warning.senderId?._id || warning.senderId || '',
          content: warning.content,
          type: 'SYSTEM_WARNING',
          isScamFlagged: true,
          createdAt: new Date(warning.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        setHasScamWarning(true);
        setScamWarningText(warning.content);
      }
      setInputContent('');
    } catch (err: any) {
      setChatError(err.message || 'Message could not be sent');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* 1. Header Bar: Listing summary, Seller info & Masked Call button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={listingInfo.image}
            alt={listingInfo.title}
            className="w-12 h-12 rounded-xl object-cover border"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm">{listingInfo.sellerName}</span>
              {listingInfo.sellerVerified && <VerifiedBadge size="sm" />}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-black text-brand-primary">{formatPrice(listingInfo.price)}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 truncate max-w-[200px]">
                {listingInfo.title}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => alert('Dialing virtual proxy bridge number: +8809612345678 (Real phone masked)')}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-brand-primary text-xs font-bold rounded-xl transition-colors"
        >
          <PhoneCall size={16} /> <span className="hidden sm:inline">Call (Masked)</span>
        </button>
      </div>

      {/* 2. Active Offer Card Pin */}
      {activeOffer && (
        <div className="mt-2 bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
              <Tag size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900">
                  Agreed Price Locked: {formatPrice(activeOffer.offeredPrice)}
                </span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded uppercase">
                  {activeOffer.status}
                </span>
              </div>
              <span className="text-[11px] text-amber-700">
                Competing offers auto-voided. Please inspect in person before cash/MFS payment.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. High-Risk Flashing Scam Alert Banner */}
      {hasScamWarning && (
        <div className="mt-2 bg-rose-600 text-white p-3.5 rounded-2xl shadow-lg scam-alert-banner flex items-center gap-3 shrink-0">
          <ShieldAlert size={24} className="shrink-0 text-amber-300" />
          <div className="text-xs leading-relaxed font-semibold">
            {scamWarningText}
          </div>
        </div>
      )}

      {chatError && <p role="alert" className="mt-2 text-sm text-rose-700">{chatError}</p>}

      {/* 4. Scrolling Message Feed */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && !chatError && (
          <p className="py-8 text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === user?.id;

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-brand-primary text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {m.content}
              </div>
              <span className="text-[10px] text-slate-400 px-1">{m.createdAt}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Bottom Input Bar */}
      <form onSubmit={handleSendMessage} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => alert('Photo attachment: Max 5MB image with automated perceptual watermark.')}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          title="Attach Image"
        >
          <ImageIcon size={20} />
        </button>

        <input
          type="text"
          placeholder="Type your message... (Advance fee demands will be intercepted)"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />

        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="p-2.5 bg-brand-primary text-white rounded-xl hover:bg-emerald-800 disabled:opacity-40 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
