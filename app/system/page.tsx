"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RefreshCw, Server, Cpu, HardDrive, Activity, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  memory: { total: number; free: number; usedPercent: number };
  cpu: string;
  gatewayStatus: "running" | "stopped" | "unknown";
  recentLogs: string[];
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");
  const [logFilter, setLogFilter] = useState("");

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/system");
    const json = await res.json();
    setInfo(json.data || null);
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, [fetch_]);

  const gatewayColor = info?.gatewayStatus === "running"
    ? "text-status-healthy" : info?.gatewayStatus === "stopped"
    ? "text-status-critical" : "text-status-unknown";

  const filteredLogs = (info?.recentLogs || []).filter(l =>
    logFilter ? l.toLowerCase().includes(logFilter.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">System</h1>
          <p className="text-xs text-text-muted mt-0.5">The Beast · host info · gateway logs · {lastRefresh}</p>
        </div>
        <button onClick={fetch_} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading && <div className="text-text-muted text-sm">Loading system info...</div>}

      {info && (
        <>
          {/* Gateway status banner */}
          <div className={cn(
            "mc-card p-4 flex items-center gap-3",
            info.gatewayStatus === "running" ? "border-status-healthy/30 bg-status-healthy/5"
              : info.gatewayStatus === "stopped" ? "border-status-critical/30 bg-status-critical/5"
              : "border-bg-border"
          )}>
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", {
              "bg-status-healthy animate-pulse-slow": info.gatewayStatus === "running",
              "bg-status-critical": info.gatewayStatus === "stopped",
              "bg-status-unknown": info.gatewayStatus === "unknown",
            })} />
            <div>
              <span className="text-sm font-semibold text-text-primary">OpenClaw Gateway</span>
              <span className={cn("ml-2 text-sm", gatewayColor)}>
                {info.gatewayStatus.charAt(0).toUpperCase() + info.gatewayStatus.slice(1)}
              </span>
            </div>
          </div>

          {/* System info grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={<Server size={16} className="text-mint" />} label="Host" value={info.hostname} sub={info.platform} />
            <InfoCard icon={<Cpu size={16} className="text-mint" />} label="CPU" value={info.arch} sub={info.cpu.slice(0, 30)} />
            <InfoCard
              icon={<HardDrive size={16} className="text-mint" />}
              label="Memory"
              value={`${info.memory.usedPercent}%`}
              sub={`${formatBytes(info.memory.total - info.memory.free)} / ${formatBytes(info.memory.total)}`}
            />
            <InfoCard icon={<Activity size={16} className="text-mint" />} label="Uptime" value={formatUptime(info.uptime)} sub="system uptime" />
            <InfoCard icon={<Server size={16} className="text-mint" />} label="Node.js" value={info.nodeVersion} sub="runtime" />
          </div>

          {/* Memory bar */}
          <Card title="Memory Usage">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Used</span>
                <span className="text-text-primary font-mono">{info.memory.usedPercent}%</span>
              </div>
              <div className="h-3 bg-bg-border rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", {
                    "bg-status-healthy": info.memory.usedPercent < 70,
                    "bg-status-warning": info.memory.usedPercent >= 70 && info.memory.usedPercent < 90,
                    "bg-status-critical": info.memory.usedPercent >= 90,
                  })}
                  style={{ width: `${info.memory.usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Used: {formatBytes(info.memory.total - info.memory.free)}</span>
                <span>Free: {formatBytes(info.memory.free)}</span>
                <span>Total: {formatBytes(info.memory.total)}</span>
              </div>
            </div>
          </Card>

          {/* Gateway Logs */}
          <Card
            title="Gateway Logs"
            subtitle={`${filteredLogs.length} lines`}
            action={
              <input
                type="text"
                placeholder="Filter..."
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                className="bg-bg-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none w-28"
              />
            }
          >
            {filteredLogs.length > 0 ? (
              <div className="bg-bg-primary rounded p-3 max-h-80 overflow-y-auto">
                <pre className="text-xs text-text-secondary font-mono leading-relaxed whitespace-pre-wrap">
                  {filteredLogs.join("\n")}
                </pre>
              </div>
            ) : (
              <div className="py-6 text-center text-text-muted text-xs">
                {logFilter ? "No log lines match filter" : "No gateway logs found — check ~/.openclaw/logs/"}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-mono font-semibold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-0.5 truncate">{sub}</div>
    </div>
  );
}
