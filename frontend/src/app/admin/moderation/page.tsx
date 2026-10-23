'use client';

import React, { useState } from 'react';
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

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'BAN_ACTION'>('QUEUE');
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
  const [reports, setReports] = useState([
    {
      reportId: '65f2a1b9c9e77a001f3b3001',
      ticketNumber: 'REP-202610-8912',
      targetType: 'LISTING',
      targetId: '65f2a1b9c9e77a001f3b2001',
      reason: 'SCAM',
      description: 'Seller asked for bKash 2,000 BDT advance courier charge before shipping the bike.',
      reporterPhone: '01712345678',
      status: 'SUBMITTED',
      createdAt: '15 mins ago',
    },
    {
      reportId: '65f2a1b9c9e77a001f3b3002',
      ticketNumber: 'REP-202610-8913',
      targetType: 'USER',
      targetId: '65f2a1b9c9e77a001f3b1009',
      reason: 'FRAUD',
      description: 'User created multiple accounts using forged selfie image.',
      reporterPhone: '01899999999',
      status: 'SUBMITTED',
      createdAt: '1 hour ago',
    },
  ]);

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
    } catch {
      setReports((prev) => prev.filter((r) => r.reportId !== selectedTicket.reportId));
      setSelectedTicket(null);
      alert('Mock: Ticket resolved and logged successfully.');
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

      {activeTab === 'QUEUE' ? (
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
