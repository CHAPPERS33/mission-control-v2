"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, statusDot, cn } from "@/lib/utils";
import { RefreshCw, AlertTriangle, Bug } from "lucide-react";

interface HealthRow {
  id: string;
  component: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  message: string;
  last_checked: string;
  source: string;
}

interface HealthResponse {
  data: HealthRow[];
  stale: boolean;
  generated_at: string | null;
  source: string;
  cache_age_seconds: number | null;
}

const LS_KEY = "mc-health-cache";

function loadCached(): { data: HealthRow[]; generatedAt: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Handle both shapes:
    // - new: { data: HealthRow[], generatedAt: string|null }  (saved by health/page.tsx + page.tsx after fix)
    // - old: HealthRow[]  (saved by dashboard before fix — treat as no-cache)
    if (Array.isArray(parsed)) {
      // Old format from dashboard — has data but no generatedAt
      if (parsed.length >= 2) return { data: parsed as HealthRow[], generatedAt: null };
      return null;
    }
    if (parsed && Array.isArray(parsed.data) && parsed.data.length >= 2) {
      return parsed as { data: HealthRow[]; generatedAt: string | null };
    }
    return null;
  } catch { return null; }
}

function saveCached(data: HealthRow[], generatedAt: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, generatedAt }));
  } catch {}
}

// DEBUG log — accumulated in a module-level array so it persists across renders
interface DebugEntry { ts: string; event: string; detail: string; }
const _debugLog: DebugEntry[] = [];
let _debugVisible = false;
function _log(event: string, detail: string) {
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" });
  _debugLog.unshift({ ts: now, event, detail });
  if (_debugLog.length > 30) _debugLog.pop();
  console.debug(`[health-debug] ${now} | ${event} | ${detail}`);
}

export default function HealthPage() {
  const cached = loadCached();
  _log("INIT", `localStorage rows=${cached?.data?.length ?? 0}, generatedAt=${cached?.generatedAt ?? "null"}`);

  const [health, setHealth] = useState<HealthRow[]>(cached?.data ?? []);
  const [stale, setStale] = useState(cached?.generatedAt ? true : false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(cached?.generatedAt ?? null);
  const [loading, setLoading] = useState(!!cached?.data?.length);
  const [lastRefresh, setLastRefresh] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  // Track rows rendered to detect transitions
  const prevRowsRef = useRef<number | null>(cached?.data?.length ?? null);
  const initialFetchDone = useRef(false);

  const fetchHealth = useCallback(async () => {
    const prevLen = prevRowsRef.current;
    _log("FETCH_START", `prevRows=${prevLen ?? "null"}`);

    let newRows = 0;
    let newStale = true;
    let newGen: string | null = null;
    let newSource = "?";

    try {
      const res = await fetch("/api/health");
      const json: HealthResponse = await res.json();

      const fetchedData = json.data ?? [];
      const fetchedGen = json.generated_at ?? null;
      const fetchedStale = json.stale ?? false;

      newRows = fetchedData.length;
      newStale = fetchedStale;
      newGen = fetchedGen;
      newSource = json.source ?? "?";

      _log("FETCH_OK", `rows=${newRows}, stale=${newStale}, generated_at=${newGen ?? "null"}, source=${newSource}`);

      // CRITICAL FIX: Only trust responses that have real Percy data.
      // Cold-start Vercel instances return a 1-row fallback: {id:"percy", message:"No health data received yet", generated_at=null}
      // Do NOT overwrite good cached state with this fallback.
      const isRealResponse = (newRows >= 2) || (newGen !== null && newRows > 0);
      _log("CACHE_DECISION", `isReal=${isRealResponse} because rows=${newRows} gen=${newGen}`);

      if (isRealResponse) {
        setHealth(fetchedData);
        setStale(fetchedStale);
        setGeneratedAt(fetchedGen);
        saveCached(fetchedData, fetchedGen);
        _log("CACHE_SAVED", `saved ${newRows} rows, stale=${fetchedStale}`);
      } else {
        _log("CACHE_SKIPPED", "fallback response — preserving existing state");
      }
    } catch (err) {
      _log("FETCH_ERROR", String(err));
    }

    const rowsNow = newRows || prevLen || 0;
    if (rowsNow !== prevLen) {
      _log("RENDER_TRANSITION", `${prevLen ?? "null"} → ${rowsNow} rows`);
      prevRowsRef.current = rowsNow;
    }

    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      _log("EFFECT", "first fetch starting");
      fetchHealth();
    }
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overall: HealthRow["status"] =
    health.some(h => h.status === "critical") ? "critical"
    : health.some(h => h.status === "warning") ? "warning"
    : health.some(h => h.status === "healthy") ? "healthy"
    : "unknown";

  const healthyCount = health.filter(h => h.status === "healthy").length;
  const warningCount = health.filter(h => h.status === "warning").length;
  const criticalCount = health.filter(h => h.status === "critical").length;
  const unknownCount = health.filter(h => h.status === "unknown").length;

  const cacheAgeMin = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">System Health</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Percy monitoring · 30s refresh · Last: {lastRefresh}
            {generatedAt && <> · Generated: {relativeTime(generatedAt)}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={overall} label={`Overall: ${overall}`} />
          <button
            onClick={() => setShowDebug(v => !v)}
            className="p-1.5 rounded text-text-secondary hover:text-status-warning hover:bg-status-warning/10 transition-colors"
            title="Toggle debug log"
          >
            <Bug size={14} />
          </button>
          <button onClick={fetchHealth} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* DEBUG LOG panel */}
      {showDebug && (
        <div className="mc-card p-4">
          <div className="text-xs font-mono text-text-muted mb-2 uppercase tracking-wider">Debug Log (last 30 events)</div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {_debugLog.map((e, i) => (
              <div key={i} className="text-xs font-mono">
                <span className="text-text-muted">{e.ts}</span>
                {" "}
                <span className={cn(
                  "font-semibold",
                  e.event === "RENDER_TRANSITION" ? "text-status-warning" : "",
                  e.event === "CACHE_SKIPPED" ? "text-status-critical" : "",
                  e.event === "CACHE_SAVED" ? "text-status-healthy" : "",
                  e.event === "FETCH_OK" ? "text-mint" : "",
                )}>{e.event}</span>
                {" | "}
                <span className="text-text-secondary">{e.detail}</span>
              </div>
            ))}
            {_debugLog.length === 0 && (
              <div className="text-xs text-text-muted italic">No events yet</div>
            )}
          </div>
        </div>
      )}

      {/* Stale data warning — only shown when cached data is old */}
      {stale && (
        <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-status-warning flex-shrink-0" />
          <span className="text-xs text-status-warning font-medium">
            {cacheAgeMin !== null && cacheAgeMin > 10
              ? `Percy data is ${cacheAgeMin} min old — refresh pending`
              : "Percy data may be stale — refresh in progress"}
          </span>
        </div>
      )}

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { key: "healthy", label: "Healthy", count: healthyCount },
          { key: "warning", label: "Warning", count: warningCount },
          { key: "critical", label: "Critical", count: criticalCount },
          { key: "unknown", label: "Unknown", count: unknownCount },
        ] as const).map(({ key, label, count }) => (
          <div key={key} className="mc-card p-3 text-center">
            <div className={cn(
              "text-2xl font-mono font-semibold",
              key === "healthy" ? "text-status-healthy" : "",
              key === "warning" ? "text-status-warning" : "",
              key === "critical" ? "text-status-critical" : "",
              key === "unknown" ? "text-status-unknown" : "",
            )}>
              {count}
            </div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {loading && <div className="text-text-muted text-sm">Loading...</div>}

      {!loading && health.length === 0 && (
        <Card title="Percy" subtitle="No health data available">
          <div className="text-sm text-text-muted py-4 text-center">
            No Percy health data received yet. Check Beast push cron is running.
          </div>
        </Card>
      )}

      {/* Percy health rows — always under one "Percy" card */}
      {health.length > 0 && (
        <Card
          title="Percy"
          subtitle={`${health.length} component${health.length !== 1 ? "s" : ""} · ${stale ? "possibly stale" : "live"}`}
        >
          <div className="space-y-0">
            {health.map((row) => (
              <div key={row.id} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusDot(row.status))} />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary font-medium">{row.component}</div>
                    <div className="text-xs text-text-muted mt-0.5 truncate">{row.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <StatusBadge status={row.status} />
                  <span className="text-xs text-muted w-16 text-right">{relativeTime(row.last_checked)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
