'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';
import { formatPrice } from '../../lib/utils';

interface InboxConversation {
  roomId: string;
  listing: { title: string; price: number; images?: Array<{ url: string }> } | null;
  counterpart: { profile?: { displayName?: string }; isNidVerified?: boolean };
  lastMessage: { content: string; createdAt: string };
  unreadCount: number;
}

export default function ChatInboxPage() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient<{ inbox: InboxConversation[] }>('/api/v1/chats')
      .then((response) => setConversations(response.data?.inbox || []))
      .catch((err) => setError(err.message || 'Unable to load conversations'));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div className="max-w-lg mx-auto p-8 text-center"><h1 className="text-xl font-bold">Sign in to view messages</h1><button onClick={openLoginModal} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg">Sign in</button></div>;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900">Messages</h1>
      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
      {!error && conversations.length === 0 ? (
        <div className="mt-6 border-y border-slate-200 py-16 text-center text-slate-500">
          <MessageSquare size={28} className="mx-auto mb-3" />
          <p>No conversations yet.</p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
          {conversations.map((conversation) => (
            <Link key={conversation.roomId} href={`/chat/${conversation.roomId}`} className="flex items-center gap-4 py-4 hover:bg-slate-50">
              <img src={conversation.listing?.images?.[0]?.url || '/icon.svg'} alt="" className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{conversation.listing?.title || 'Listing unavailable'}</p>
                <p className="text-xs text-slate-500">{conversation.counterpart?.profile?.displayName || 'Marketplace member'}{conversation.listing ? ` · ${formatPrice(conversation.listing.price)}` : ''}</p>
                <p className="mt-1 text-sm text-slate-600 truncate">{conversation.lastMessage.content}</p>
              </div>
              <div className="text-right shrink-0">
                <time className="text-xs text-slate-400">{new Date(conversation.lastMessage.createdAt).toLocaleDateString()}</time>
                {conversation.unreadCount > 0 && <span className="block mt-1 text-xs font-bold text-white bg-emerald-700 rounded-full px-2 py-0.5">{conversation.unreadCount}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}