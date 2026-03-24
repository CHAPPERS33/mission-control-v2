"use client";

import { useEffect, useState, useCallback } from "react";

interface MostExpensiveSession {
  session_id: string;
  agent: string;
  model: string;
  cost_usd: number;
  tokens_total: number;
}

interface TokenData {
  source: string;
  is_estimate: boolean;
  partial: boolean;
  cache_age_ms: number;
  data_from: string;
  error?: string;
  today: {
    date: string;
    tokens_in: number;
    tokens_out: number;
    tokens_cached: number;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
    most_expensive_session: MostExpensiveSession | null;
  };
  trend: Array<{
    date: string;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  by_agent: Array<{
    agent: string;
    model: string;
    provider: string;
    tokens_in: number;
    tokens_out: number;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  recent_events: Array<{
    ts: string;
    agent: string;
    model: string;
    provider: string;
    tokens_total: number;
    cost_usd: number;
    session_id: string;
  }>;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

function fmtDate(d: string): string {
  try {
    const dt = new Date(d + "T00:00:00Z");
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return d;
  }
}

function fmtTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function TrendChart({ trend }: { trend: TokenData["trend"] }) {
  if (!trend || trend.length === 0) {
    return <div className="text-xs text-text-muted py-4 text-center">No trend data</div>;
  }

  const maxTokens = Math.max(...trend.map(d => d.tokens_total), 1);

  return (
    <div className="flex items-end gap-2 h-32 pt-4">
      {trend.map(day => {
        const heightPct = Math.max((day.tokens_total / maxTokens) * 100, 2);
        return (
          <div key={day.date} className="flex flex-col items-center flex-1 min-w-0">
            <div className="text-xs text-text-muted mb-1 leading-none truncate w-full text-center">
              {fmtTokens(day.tokens_total)}
            </div>
            <div
              className="w-full bg-mint/50 rounded-t"
              style={{ height: `${heightPct}%`, minHeight: "4px" }}
              title={`${day.date}: ${fmtTokens(day.tokens_total)} tokens · ${fmtCost(day.cost_usd)}`}
            />
            <div className="text-xs text-text-muted mt-1 truncate w-full text-center">
              {fmtDate(day.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TokensPage() {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load token data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const cacheAgeMin = data ? Math.floor(data.cache_age_ms / 60000) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Token Usage</h1>
        <p className="text-xs text-text-muted mt-0.5">OpenClaw session data · Real provider costs</p>
      </div>

      {/* Honesty banner */}
      <div className="bg-mint/5 border border-mint/20 rounded-lg p-3 text-xs text-text-secondary">
        Anthropic/OpenAI costs are real provider values. Ollama/local = $0 (free).
      </div>

      {/* Partial warning */}
      {data?.partial && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
          ⚠️ Some session data may be incomplete.
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          Error loading token data: {error}
        </div>
      )}

      {/* Cache age */}
      {data && cacheAgeMin > 1 && (
        <div className="text-xs text-text-muted">
          Last updated {cacheAgeMin} min ago
        </div>
      )}

      {loading && !data && (
        <div className="text-xs text-text-muted py-8 text-center">Loading token data…</div>
      )}

      {data && (
        <>
          {/* Today summary row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="mc-card p-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Total Tokens</div>
              {data.today.tokens_total === 0 ? (
                <div className="text-sm text-text-secondary">No session data yet today</div>
              ) : (
                <>
                  <div className="text-2xl font-mono font-semibold text-text-primary">
                    {fmtTokens(data.today.tokens_total)}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    in: {fmtTokens(data.today.tokens_in)} · out: {fmtTokens(data.today.tokens_out)}
                  </div>
                </>
              )}
            </div>

            <div className="mc-card p-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Total Cost</div>
              {data.today.tokens_total === 0 ? (
                <div className="text-sm text-text-secondary">—</div>
              ) : (
                <>
                  <div className="text-2xl font-mono font-semibold text-mint">
                    {fmtCost(data.today.cost_usd)}
                  </div>
                  <div className="text-xs text-text-muted mt-1">today · USD</div>
                </>
              )}
            </div>

            <div className="mc-card p-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Sessions</div>
              <div className="text-2xl font-mono font-semibold text-text-primary">
                {data.today.session_count}
              </div>
              <div className="text-xs text-text-muted mt-1">today</div>
            </div>

            <div className="mc-card p-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Most Expensive Session</div>
              {data.today.most_expensive_session ? (
                <>
                  <div className="text-lg font-mono font-semibold text-mint">
                    {fmtCost(data.today.most_expensive_session.cost_usd)}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {data.today.most_expensive_session.agent} · {fmtTokens(data.today.most_expensive_session.tokens_total)} tokens
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-secondary">None yet</div>
              )}
            </div>
          </div>

          {/* Most expensive session detail */}
          {data.today.most_expensive_session && (
            <div className="mc-card p-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-3">Most Expensive Session Today</div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Agent</div>
                  <div className="font-medium text-text-primary capitalize">{data.today.most_expensive_session.agent}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Model</div>
                  <div className="font-medium text-text-primary text-xs">{data.today.most_expensive_session.model}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Tokens</div>
                  <div className="font-mono text-text-primary">{fmtTokens(data.today.most_expensive_session.tokens_total)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Cost</div>
                  <div className="font-mono text-mint">{fmtCost(data.today.most_expensive_session.cost_usd)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Session ID</div>
                  <div className="font-mono text-text-secondary text-xs truncate" title={data.today.most_expensive_session.session_id}>
                    {data.today.most_expensive_session.session_id.slice(0, 8)}…
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7-day trend */}
          <div className="mc-card p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">7-Day Trend</div>
            <div className="text-xs text-text-muted mb-3">Tokens per day</div>
            <TrendChart trend={data.trend} />
          </div>

          {/* By agent table */}
          <div className="mc-card p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">By Agent · Today</div>
            {data.by_agent.length === 0 ? (
              <div className="text-xs text-text-muted py-2">No agent data today</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bg-border text-text-muted">
                      <th className="text-left pb-2 pr-3">Agent</th>
                      <th className="text-left pb-2 pr-3">Model</th>
                      <th className="text-left pb-2 pr-3">Provider</th>
                      <th className="text-right pb-2 pr-3">Tokens In</th>
                      <th className="text-right pb-2 pr-3">Tokens Out</th>
                      <th className="text-right pb-2 pr-3">Total</th>
                      <th className="text-right pb-2 pr-3">Cost</th>
                      <th className="text-right pb-2">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_agent.map(row => (
                      <tr key={row.agent} className="border-b border-bg-border last:border-0">
                        <td className="py-2 pr-3 font-medium text-text-primary capitalize">{row.agent}</td>
                        <td className="py-2 pr-3 text-text-secondary font-mono">{row.model}</td>
                        <td className="py-2 pr-3 text-text-secondary">{row.provider}</td>
                        <td className="py-2 pr-3 text-right font-mono text-text-secondary">{fmtTokens(row.tokens_in)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-text-secondary">{fmtTokens(row.tokens_out)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-text-primary">{fmtTokens(row.tokens_total)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-mint">{fmtCost(row.cost_usd)}</td>
                        <td className="py-2 text-right text-text-secondary">{row.session_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* By model table */}
          <div className="mc-card p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">By Model · Today</div>
            {data.by_model.length === 0 ? (
              <div className="text-xs text-text-muted py-2">No model data today</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bg-border text-text-muted">
                      <th className="text-left pb-2 pr-3">Model</th>
                      <th className="text-left pb-2 pr-3">Provider</th>
                      <th className="text-right pb-2 pr-3">Total Tokens</th>
                      <th className="text-right pb-2 pr-3">Cost</th>
                      <th className="text-right pb-2">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_model.map(row => (
                      <tr key={`${row.provider}:${row.model}`} className="border-b border-bg-border last:border-0">
                        <td className="py-2 pr-3 font-mono text-text-primary">{row.model}</td>
                        <td className="py-2 pr-3 text-text-secondary">{row.provider}</td>
                        <td className="py-2 pr-3 text-right font-mono text-text-primary">{fmtTokens(row.tokens_total)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-mint">{fmtCost(row.cost_usd)}</td>
                        <td className="py-2 text-right text-text-secondary">{row.session_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent events */}
          <div className="mc-card p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">Recent Events</div>
            {data.recent_events.length === 0 ? (
              <div className="text-xs text-text-muted py-2">No recent events</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bg-border text-text-muted">
                      <th className="text-left pb-2 pr-3">Timestamp</th>
                      <th className="text-left pb-2 pr-3">Agent</th>
                      <th className="text-left pb-2 pr-3">Model</th>
                      <th className="text-right pb-2 pr-3">Tokens</th>
                      <th className="text-right pb-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_events.map((ev, i) => (
                      <tr key={`${ev.session_id}-${i}`} className="border-b border-bg-border last:border-0">
                        <td className="py-1.5 pr-3 text-text-muted font-mono">{fmtTs(ev.ts)}</td>
                        <td className="py-1.5 pr-3 font-medium text-text-primary capitalize">{ev.agent}</td>
                        <td className="py-1.5 pr-3 text-text-secondary font-mono truncate max-w-[140px]">{ev.model}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-text-primary">{fmtTokens(ev.tokens_total)}</td>
                        <td className="py-1.5 text-right font-mono text-mint">{fmtCost(ev.cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
