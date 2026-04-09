"use client";

import { useEffect, useState, useCallback } from "react";
import { relativeTime, cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

interface AlertRow {
  id: string;
  type: string;
  source: string;
  severity: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  suggested_action?: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: "text-status-critical", bg: "bg-status-critical/10 border-status-critical/30" },
  warning: { icon: AlertTriangle, color: "text-status-warning", bg: "bg-status-warning/10 border-status-warning/30" },
  info: { icon: Info, color: "text-mint", bg: "bg-mint/10 border-mint/30" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/alerts");
    const json = await res.json();
    setAlerts(json.data || []);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);
  const critical = alerts.filter(a => a.severity === "critical").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text-primary">Alert System</h1>
          <p className="text-xs text-text-muted mt-0.5">Percy generates system alerts · 15s refresh</p>
        </div>
        {critical > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-status-critical/10 border border-status-critical/30 rounded">
            <AlertCircle size={14} className="text-status-critical" />
            <span className="text-xs text-status-critical font-medium">{critical} critical</span>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "critical", "warning", "info"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors",
              filter === f ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mc-card p-12 text-center">
          <CheckCircle size={32} className="text-status-healthy mx-auto mb-3" />
          <div className="text-sm text-text-primary font-medium">All clear</div>
          <div className="text-xs text-text-muted mt-1">No alerts in this category</div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(alert => {
          const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
          const Icon = config.icon;
          return (
            <div key={alert.id} className={cn("mc-card p-4 border", config.bg)}>
              <div className="flex items-start gap-3">
                <Icon size={16} className={cn("flex-shrink-0 mt-0.5", config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-semibold uppercase tracking-wide", config.color)}>{alert.severity}</span>
                    <span className="text-xs text-text-muted">· {alert.source}</span>
                    <span className="text-xs text-text-muted">· {alert.type.replace("_", " ")}</span>
                  </div>
                  <div className="text-sm text-text-primary">{alert.message}</div>
                  {alert.suggested_action && (
                    <div className="mt-2 px-3 py-2 bg-bg-secondary rounded border border-border-subtle">
                      <div className="text-xs text-text-muted font-medium mb-0.5">Suggested action</div>
                      <div className="text-xs text-text-secondary">{alert.suggested_action}</div>
                    </div>
                  )}
                  <div className="text-xs text-text-muted mt-1">{relativeTime(alert.created_at)}</div>
                </div>
                {alert.acknowledged_at && (
                  <CheckCircle size={14} className="text-status-healthy flex-shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
