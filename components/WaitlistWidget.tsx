'use client';

import { useEffect, useState } from 'react';

interface WaitlistEntry {
  email: string;
  position: number;
  source: string;
  joinedAt: string;
  isNew: boolean;
}

interface WaitlistData {
  total: number;
  newToday: number;
  recent: WaitlistEntry[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 3 ? local.slice(0, 3) + '***' : local[0] + '***';
  return `${visible}@${domain}`;
}

export default function WaitlistWidget() {
  const [data, setData] = useState<WaitlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/waitlist');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Cirrus Waitlist</h3>
        <span className="text-xs text-gray-500">cirrusapp.co.uk</span>
      </div>

      {loading && (
        <div className="text-gray-500 text-sm">Loading...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm">Error: {error}</div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div className="flex gap-4 mb-5">
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{data.total}</div>
              <div className="text-xs text-gray-400 mt-1">Total signups</div>
            </div>
            <div className={`flex-1 rounded-lg p-3 text-center ${data.newToday > 0 ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-gray-800'}`}>
              <div className={`text-2xl font-bold ${data.newToday > 0 ? 'text-emerald-400' : 'text-white'}`}>
                {data.newToday}
              </div>
              <div className="text-xs text-gray-400 mt-1">New today</div>
            </div>
          </div>

          {/* Recent signups */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent signups</div>
            {data.recent.length === 0 && (
              <div className="text-gray-500 text-sm">No signups yet</div>
            )}
            {data.recent.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  entry.isNew
                    ? 'bg-emerald-900/30 border border-emerald-700/40'
                    : 'bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {entry.isNew && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0">
                      NEW
                    </span>
                  )}
                  <span className="text-gray-300 text-sm font-mono truncate">
                    {maskEmail(entry.email)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-gray-500">#{entry.position}</span>
                  <span className="text-xs text-gray-500">{timeAgo(entry.joinedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
