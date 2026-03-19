"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, statusDot, cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface HealthRow {
  id: string;
  component: string;
  status: string;
  message: string;
  last_checked: string;
  source: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchHealth = useCallback(async () => {
    const res = await fetch("/api/health");
    const json = await res.json();
    setHealth(json.data || []);
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overall = health.some(h => h.status === "critical") ? "critical"
    : health.some(h => h.status === "warning") ? "warning" : "healthy";

  const grouped = health.reduce<Record<string, HealthRow[]>>((acc, row) => {
    (acc[row.source] = acc[row.source] || []).push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">System Health</h1>
          <p className="text-xs text-text-muted mt-0.5">Percy monitoring · 30s refresh · Last: {lastRefresh}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={overall} label={`Overall: ${overall}`} />
          <button onClick={fetchHealth} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        {(["healthy", "warning", "critical"] as const).map(s => {
          const count = health.filter(h => h.status === s).length;
          return (
            <div key={s} className="mc-card p-4 text-center">
              <div className={cn("text-3xl font-mono font-semibold", s === "healthy" ? "text-status-healthy" : s === "warning" ? "text-status-warning" : "text-status-critical")}>
                {count}
              </div>
              <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">{s}</div>
            </div>
          );
        })}
      </div>

      {loading && <div className="text-text-muted text-sm">Loading...</div>}

      {/* Grouped by source */}
      {Object.entries(grouped).map(([source, rows]) => (
        <Card key={source} title={source} subtitle={`${rows.length} component${rows.length !== 1 ? "s" : ""}`}>
          <div className="space-y-0">
            {rows.map((row) => (
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
                  <span className="text-xs text-text-muted w-16 text-right">{relativeTime(row.last_checked)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
