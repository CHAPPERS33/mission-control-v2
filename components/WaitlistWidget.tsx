'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WaitlistEntry {
  email: string;
  position: number;
  source: string;
  joinedAt: string;
  isNew: boolean;
  isThisWeek: boolean;
}

interface WaitlistData {
  total: number;
  newToday: number;
  newThisWeek: number;
  sourceBreakdown: Record<string, number>;
  recent: WaitlistEntry[];
  generatedAt: string;
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

function formatSource(source: string): string {
  return source.replace(/_/g, ' ');
}

export default function WaitlistWidget() {
  const [data, setData] = useState<WaitlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/waitlist', { cache: 'no-store' });
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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const sourceEntries = data ? Object.entries(data.sourceBreakdown).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="mc-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Cirrus Waitlist</h3>
          <p className="mt-1 text-xs text-text-muted">Live from Cirrus Supabase waitlist table</p>
        </div>
        <Link href="/waitlist" className="text-xs font-medium text-mint hover:text-mint-bright">
          Open view
        </Link>
      </div>

      {loading && <div className="text-sm text-text-muted">Loading waitlist…</div>}
      {error && <div className="text-sm text-status-critical">Error: {error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCell label="Total" value={String(data.total)} />
            <StatCell label="Today" value={String(data.newToday)} highlight={data.newToday > 0} />
            <StatCell label="This week" value={String(data.newThisWeek)} highlight={data.newThisWeek > 0} />
          </div>

          {sourceEntries.length > 0 && (
            <div className="mb-5">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">Source breakdown</div>
              <div className="space-y-2">
                {sourceEntries.map(([source, count]) => {
                  const percent = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                  return (
                    <div key={source} className="rounded-lg border border-bg-border bg-bg-card/70 px-3 py-2.5">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-text-primary capitalize">{formatSource(source)}</span>
                        <span className="text-text-muted">{count} · {percent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full bg-mint" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">Recent signups</div>
            <div className="space-y-2">
              {data.recent.length === 0 && <div className="text-sm text-text-muted">No signups yet</div>}
              {data.recent.slice(0, 8).map((entry, i) => (
                <div
                  key={`${entry.email}-${entry.joinedAt}-${i}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                    entry.isNew
                      ? 'border border-mint/30 bg-mint/10'
                      : 'border border-bg-border bg-bg-card/70'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.isNew && (
                        <span className="rounded bg-mint/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mint-bright">
                          New
                        </span>
                      )}
                      <span className="truncate font-mono text-sm text-text-primary">{maskEmail(entry.email)}</span>
                    </div>
                    <div className="mt-1 text-xs text-text-muted capitalize">
                      {formatSource(entry.source)} · {timeAgo(entry.joinedAt)}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-xs text-text-muted">#{entry.position}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight ? 'border-mint/25 bg-mint/10' : 'border-bg-border bg-bg-card/70'
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold font-mono ${highlight ? 'text-mint-bright' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}
