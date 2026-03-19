"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, cn } from "@/lib/utils";
import { RefreshCw, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  lastRun: string | null;
  nextRun: string | null;
  status: string;
  script: string;
}

interface Summary {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
}

function scheduleLabel(cron: string): string {
  const map: Record<string, string> = {
    "*/2 * * * *": "Every 2 min",
    "*/5 * * * *": "Every 5 min",
    "*/30 * * * *": "Every 30 min",
    "0 */2 * * *": "Every 2 hrs",
    "0 */6 * * *": "Every 6 hrs",
    "0 6 * * *": "Daily 06:00",
    "0 0 * * *": "Daily midnight",
  };
  return map[cron] || cron;
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, healthy: 0, warning: 0, critical: 0 });
  const [lastRefresh, setLastRefresh] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/cron");
    const json = await res.json();
    setJobs(json.data || []);
    setSummary(json.summary || { total: 0, healthy: 0, warning: 0, critical: 0 });
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Cron Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">{summary.total} scheduled jobs · Last: {lastRefresh}</p>
        </div>
        <button onClick={fetch_} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-status-healthy">{summary.healthy}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Healthy</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-status-warning">{summary.warning}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Warning</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-status-critical">{summary.critical}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Failed</div>
        </div>
      </div>

      {loading && <div className="text-text-muted text-sm">Loading cron jobs...</div>}

      {/* Jobs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map(job => (
          <CronCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function CronCard({ job }: { job: CronJob }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0 mt-1",
            job.status === "healthy" ? "bg-status-healthy animate-pulse-slow"
              : job.status === "warning" ? "bg-status-warning"
              : job.status === "critical" ? "bg-status-critical animate-pulse"
              : "bg-status-unknown"
          )} />
          <div>
            <div className="text-sm font-semibold text-text-primary">{job.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{job.description}</div>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-bg-border text-xs">
        <div>
          <div className="text-text-muted mb-0.5">Schedule</div>
          <div className="text-mint font-mono">{scheduleLabel(job.schedule)}</div>
        </div>
        <div>
          <div className="text-text-muted mb-0.5">Script</div>
          <div className="text-text-secondary font-mono truncate">{job.script}</div>
        </div>
        <div>
          <div className="text-text-muted mb-0.5">Last Run</div>
          <div className="text-text-primary">{job.lastRun ? relativeTime(job.lastRun) : "Never"}</div>
        </div>
        <div>
          <div className="text-text-muted mb-0.5">Next Run</div>
          <div className="text-text-primary">{job.nextRun ? relativeTime(job.nextRun) : "—"}</div>
        </div>
      </div>
    </div>
  );
}
