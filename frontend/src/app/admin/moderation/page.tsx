'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Ban,
  AlertTriangle,
  Layers,
  Search,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../lib/api';

export default function ModerationPortalPage() {
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'ALL_LISTINGS' | 'QUEUE' | 'BAN_ACTION'>('LISTINGS');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionVerdict, setResolutionVerdict] = useState<'ACTION_TAKEN' | 'DISMISSED'>('ACTION_TAKEN');
  const [resolutionAction, setResolutionAction] = useState<
    'SUSPEND_LISTING' | 'DELETE_REVIEW' | 'WARN_USER' | 'BAN_USER' | 'NO_ACTION'
  >('SUSPEND_LISTING');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Direct ban form state
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  // Mock Queue
  const [reports, setReports] = useState<any[]>([]);
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'moderator'].includes(user?.role || '')) {
      setIsLoadingListings(false);
      return;
    }
    Promise.all([
      apiClient<{ listings: any[] }>('/api/v1/admin/moderation/listings/queue'),
      apiClient<{ queue: any[] }>('/api/v1/admin/moderation/queue'),
    ])
      .then(([listingRes, reportRes]) => {
        setPendingListings(listingRes.data?.listings || []);
        setReports(reportRes.data?.queue || []);
      })
      .catch((err) => alert(err.message || 'Unable to load moderation queue'))
      .finally(() => setIsLoadingListings(false));
  }, [isAuthenticated, user?.role]);

  const fetchAllListings = async (event?: React.FormEvent) => {
    event?.preventDefault();
    try {
      const response = await apiClient<{ listings: any[] }>('/api/v1/admin/moderation/listings', {
        params: { q: listingSearch || undefined, status: listingStatus || undefined },
      });
      setAllListings(response.data?.listings || []);
    } catch (err: any) {
      alert(err.message || 'Unable to load listings');
    }
  };

  const deleteAnyListing = async (listingId: string) => {
    if (!confirm('Delete this listing from the marketplace?')) return;
    try {
      await apiClient(`/api/v1/admin/moderation/listings/${listingId}`, { method: 'DELETE' });
      setAllListings((current) => current.filter((item) => item._id !== listingId));
      setPendingListings((current) => current.filter((item) => item._id !== listingId));
    } catch (err: any) {
      alert(err.message || 'Unable to delete listing');
    }
  };

  const handleReviewListing = async (listingId: string, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
    try {
      await apiClient(`/api/v1/admin/moderation/listings/${listingId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setPendingListings((current) => current.filter((item) => item._id !== listingId));
    } catch (err: any) {
      alert(err.message || 'Unable to review listing');
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsResolving(true);
    try {
      await apiClient(`/api/v1/admin/moderation/resolve-report/${selectedTicket.reportId}`, {
        method: 'POST',
        body: JSON.stringify({
          verdict: resolutionVerdict,
          action: resolutionAction,
          resolutionNotes: resolutionNotes || 'Resolved according to trust and safety community standards.',
          notifyReporter: true,
        }),
      });

      setReports((prev) => prev.filter((r) => r.reportId !== selectedTicket.reportId));
      setSelectedTicket(null);
      alert('Moderation ticket resolved and logged to cryptographic WORM audit chain.');
    } catch (err: any) {
      alert(err.message || 'Unable to resolve report');
    } finally {
      setIsResolving(false);
    }
  };

  const handleExecuteBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUserId || !banReason) return;

    setIsBanning(true);
    try {
      await apiClient('/api/v1/admin/moderation/ban-user', {
        method: 'POST',
        body: JSON.stringify({
          userId: banUserId,
          reason: banReason,
          blacklistDevices: true,
          blacklistNid: true,
          suspendAllListings: true,
        }),
      });
      alert('User, physical device fingerprints, and NID permanently banned and logged.');
      setBanUserId('');
      setBanReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to ban user');
    } finally {
      setIsBanning(false);
    }
  };

  if (!isAuthenticated || !['admin', 'moderator'].includes(user?.role || '')) {
    return (
      <main className="max-w-xl mx-auto my-16 px-4 text-center">
        <Lock size={36} className="mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Admin access required</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with an authorized moderator or admin account to review ads.</p>
      </main>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">
              Trust & Safety Moderation Portal
            </h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-lg uppercase">
              Admin Tier-2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enforce community guidelines, fraud ring isolation, and permanent device bans.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('ALL_LISTINGS');
              void fetchAllListings();
            }}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'ALL_LISTINGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All ads
          </button>
          <button
            onClick={() => setActiveTab('LISTINGS')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'LISTINGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Ads for review ({pendingListings.length})
          </button>
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'QUEUE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Abuse Reports Queue ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('BAN_ACTION')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'BAN_ACTION' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Direct Ban Enforcement
          </button>
        </div>
      </div>

      {activeTab === 'ALL_LISTINGS' ? (
        <section className="space-y-4">
          <form onSubmit={fetchAllListings} className="flex flex-col sm:flex-row gap-2">
            <input value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Search title or listing ID" className="flex-1 p-3 bg-white border border-slate-200 rounded-lg text-sm" />
            <select value={listingStatus} onChange={(event) => setListingStatus(event.target.value)} className="p-3 bg-white border border-slate-200 rounded-lg text-sm">
              <option value="">All statuses</option>
              {['PENDING', 'ACTIVE', 'HOLD', 'SOLD', 'EXPIRED', 'REJECTED', 'SUSPENDED', 'DELETED'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-lg font-bold">Search</button>
          </form>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {allListings.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No matching listings.</p> : allListings.map((listing) => (
              <article key={listing._id} className="flex items-center gap-4 p-4">
                <img src={listing.images?.[0]?.thumbnailUrl || listing.images?.[0]?.url || '/icon.svg'} alt="" className="w-14 h-14 rounded-lg object-cover bg-slate-100" />
                <div className="min-w-0 flex-1"><p className="font-bold text-sm text-slate-900 truncate">{listing.title}</p><p className="text-xs text-slate-500">{listing.status} · {listing.sellerId?.profile?.displayName || listing.sellerId?.mobileNumber || 'Seller'}</p></div>
                {listing.status !== 'DELETED' && <button onClick={() => deleteAnyListing(listing._id)} title="Delete listing" className="p-2 text-rose-700 hover:bg-rose-50 rounded-lg"><Ban size={17} /></button>}
              </article>
            ))}
          </div>
        </section>
      ) : activeTab === 'LISTINGS' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoadingListings ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading pending listings...</p>
          ) : pendingListings.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No ads are waiting for review.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingListings.map((listing) => (
                <article key={listing._id} className="grid grid-cols-[72px_1fr_auto] gap-4 p-4 items-center">
                  <img
                    src={listing.images?.[0]?.thumbnailUrl || listing.images?.[0]?.url || '/icon.svg'}
                    alt=""
                    className="w-[72px] h-[72px] rounded-lg object-cover bg-slate-100"
                  />
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 truncate">{listing.title}</h2>
                    <p className="text-xs text-slate-500">{listing.category} · ৳{Number(listing.price).toLocaleString()} · {listing.sellerId?.profile?.displayName || listing.sellerId?.mobileNumber}</p>
                    <p className="text-xs text-slate-500 truncate">{listing.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReviewListing(listing._id, 'APPROVE')} title="Approve and publish" className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 size={16} /></button>
                    <button onClick={() => handleReviewListing(listing._id, 'REJECT')} title="Reject listing" className="p-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"><XCircle size={16} /></button>
                    <button onClick={() => handleReviewListing(listing._id, 'DELETE')} title="Delete listing" className="p-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"><Ban size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'QUEUE' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Ticket</th>
                <th className="p-4">Type</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Evidence & Description</th>
                <th className="p-4">Logged</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.reportId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-800">{r.ticketNumber}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-slate-100 font-bold rounded text-slate-700">
                      {r.targetType}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-rose-600">{r.reason}</td>
                  <td className="p-4 max-w-xs text-slate-600 truncate">{r.description}</td>
                  <td className="p-4 text-slate-400">{r.createdAt}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedTicket(r)}
                      className="px-3 py-1.5 bg-brand-primary text-white font-bold rounded-lg hover:bg-emerald-800 transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl space-y-6">
          <div className="flex items-center gap-2 text-rose-600">
            <Ban size={24} />
            <h2 className="text-xl font-black text-slate-900">Enforce Permanent Ban</h2>
          </div>
          <p className="text-xs text-slate-500">
            Banning a user revokes all active JWT sessions, suspends all listings, blacklists bound
            hardware device fingerprints, and marks their NID hash as banned.
          </p>

          <form onSubmit={handleExecuteBan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target User ID</label>
              <input
                type="text"
                placeholder="65f2a1b9c9e77a001f3b1001"
                value={banUserId}
                onChange={(e) => setBanUserId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Judicial / Policy Ban Reason
              </label>
              <textarea
                rows={4}
                placeholder="Detail the fraud pattern or policy violation (logged to WORM audit log)..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isBanning}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-md"
            >
              {isBanning ? 'Executing Ban...' : 'Enforce Permanent Ban & Device Blacklist'}
            </button>
          </form>
        </div>
      )}

      {/* Ticket Investigation Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full space-y-4 border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                Ticket: {selectedTicket.ticketNumber}
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Type:</span>
                <span className="font-bold text-slate-800">{selectedTicket.targetType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target ID:</span>
                <span className="font-mono text-slate-800">{selectedTicket.targetId}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Report Description:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border">
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            <form onSubmit={handleResolveTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enforce Action
                </label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="SUSPEND_LISTING">SUSPEND_LISTING (Take down ad)</option>
                  <option value="BAN_USER">BAN_USER (Permanent account ban)</option>
                  <option value="WARN_USER">WARN_USER (Send fraud notice)</option>
                  <option value="DELETE_REVIEW">DELETE_REVIEW (Remove abusive review)</option>
                  <option value="NO_ACTION">NO_ACTION (Dismiss report)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resolution Notes (Min 10 chars)
                </label>
                <input
                  type="text"
                  placeholder="Confirmed advance payment demand in chat..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isResolving}
                className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-emerald-800 shadow-md transition-colors"
              >
                {isResolving ? 'Resolving...' : 'Commit Verdict & Log to WORM Chain'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
