"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length > 3 ? local.slice(0, 3) + "***" : local[0] + "***";
  return `${visible}@${domain}`;
}

function formatSource(source: string): string {
  return source.replace(/_/g, " ");
}

function formatJoinedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function WaitlistPage() {
  const [data, setData] = useState<WaitlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/waitlist", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load waitlist");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sources = data ? Object.entries(data.sourceBreakdown).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Cirrus Waitlist</h1>
        <p className="mt-0.5 text-xs text-text-muted">Truthful visibility from the real Cirrus waitlist table</p>
      </div>

      {loading && <div className="text-sm text-text-muted">Loading waitlist…</div>}
      {error && <div className="text-sm text-status-critical">Error: {error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Total signups" value={String(data.total)} />
            <MetricCard label="Signups today" value={String(data.newToday)} highlight={data.newToday > 0} />
            <MetricCard label="Signups this week" value={String(data.newThisWeek)} highlight={data.newThisWeek > 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <Card title="Source breakdown" subtitle="Only shown because source data exists in Cirrus">
                <div className="space-y-3">
                  {sources.map(([source, count]) => {
                    const percent = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                    return (
                      <div key={source} className="rounded-lg border border-bg-border bg-bg-secondary p-3">
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="capitalize text-text-primary">{formatSource(source)}</span>
                          <span className="font-mono text-text-muted">{count} / {data.total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-bg-border">
                          <div className="h-full rounded-full bg-mint" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-text-muted">{percent}% of signups</div>
                      </div>
                    );
                  })}
                  {sources.length === 0 && <div className="text-sm text-text-muted">No source data available.</div>}
                </div>
              </Card>
            </div>

            <div className="xl:col-span-8">
              <Card title="Recent signups" subtitle="Most recent entries from Cirrus waitlist">
                <div className="overflow-hidden rounded-lg border border-bg-border">
                  <div className="grid grid-cols-[1.6fr_90px_120px_170px] gap-3 border-b border-bg-border bg-bg-secondary px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    <div>Email</div>
                    <div>Position</div>
                    <div>Source</div>
                    <div>Joined</div>
                  </div>
                  <div className="divide-y divide-bg-border">
                    {data.recent.map((entry, i) => (
                      <div key={`${entry.email}-${entry.joinedAt}-${i}`} className="grid grid-cols-[1.6fr_90px_120px_170px] gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-text-primary">{maskEmail(entry.email)}</div>
                          <div className="mt-1 text-xs text-text-muted">
                            {entry.isNew ? "Today" : entry.isThisWeek ? "This week" : "Earlier"}
                          </div>
                        </div>
                        <div className="font-mono text-text-primary">#{entry.position}</div>
                        <div className="capitalize text-text-secondary">{formatSource(entry.source)}</div>
                        <div className="text-text-muted">{formatJoinedAt(entry.joinedAt)}</div>
                      </div>
                    ))}
                    {data.recent.length === 0 && (
                      <div className="px-4 py-6 text-sm text-text-muted">No waitlist entries found.</div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`mc-card p-4 ${highlight ? "border-mint/25 bg-mint/10" : ""}`}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`mt-2 font-mono text-3xl font-semibold ${highlight ? "text-mint-bright" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
