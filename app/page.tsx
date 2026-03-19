"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, statusDot, cn } from "@/lib/utils";
import { Activity, CheckSquare, FolderOpen, Bot, AlertTriangle, TrendingUp } from "lucide-react";

interface HealthRow { id: string; component: string; status: string; message: string; last_checked: string; source: string; }
interface AgentRow { id: string; name: string; role: string; current_task: string | null; last_activity: string; online: boolean; heartbeat_status: string; }
interface TaskCounts { active: number; blocked: number; completed: number; }
interface AlertRow { id: string; type: string; severity: string; message: string; created_at: string; source: string; }

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ active: 0, blocked: 0, completed: 0 });
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchAll = async () => {
    const [h, a, t, al] = await Promise.all([
      fetch("/api/health").then(r => r.json()),
      fetch("/api/agents").then(r => r.json()),
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
    ]);
    setHealth(h.data || []);
    setAgents(a.data || []);
    setTaskCounts(t.counts || { active: 0, blocked: 0, completed: 0 });
    setAlerts(al.data || []);
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = health.some(h => h.status === "critical") ? "critical"
    : health.some(h => h.status === "warning") ? "warning" : "healthy";

  const onlineAgents = agents.filter(a => a.online).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Mission Control</h1>
          <p className="text-xs text-text-muted mt-0.5">AI Operations Overview · Last refresh: {lastRefresh}</p>
        </div>
        <StatusBadge status={overallStatus} label={`System ${overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}`} />
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts > 0 && (
        <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-status-critical flex-shrink-0" />
          <span className="text-sm text-status-critical font-medium">{criticalAlerts} critical alert{criticalAlerts > 1 ? "s" : ""} requiring attention</span>
        </div>
      )}

      {/* Warning alerts */}
      {alerts.filter(a => a.severity === "warning").map(alert => (
        <div key={alert.id} className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-status-warning flex-shrink-0" />
          <span className="text-sm text-status-warning">{alert.message}</span>
          <span className="ml-auto text-xs text-text-muted">{relativeTime(alert.created_at)}</span>
        </div>
      ))}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Activity size={18} className="text-mint" />} label="System" value={overallStatus} valueClass={overallStatus === "healthy" ? "text-status-healthy" : overallStatus === "warning" ? "text-status-warning" : "text-status-critical"} sub={`${health.length} components`} />
        <KpiCard icon={<Bot size={18} className="text-mint" />} label="Agents Online" value={`${onlineAgents}/${agents.length}`} valueClass="text-text-primary" sub="heartbeat active" />
        <KpiCard icon={<CheckSquare size={18} className="text-mint" />} label="Active Tasks" value={String(taskCounts.active)} valueClass="text-text-primary" sub={`${taskCounts.blocked} blocked`} />
        <KpiCard icon={<TrendingUp size={18} className="text-mint" />} label="Alerts" value={String(alerts.length)} valueClass={alerts.length > 0 ? "text-status-warning" : "text-text-primary"} sub={`${criticalAlerts} critical`} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System Health */}
        <Card title="System Health" subtitle="Percy monitoring" action={<a href="/health" className="text-xs text-mint hover:underline">View all</a>}>
          <div className="space-y-2">
            {health.slice(0, 6).map(h => (
              <div key={h.id} className="flex items-center justify-between py-1 border-b border-bg-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDot(h.status))} />
                  <span className="text-xs text-text-primary truncate max-w-[140px]">{h.component}</span>
                </div>
                <span className="text-xs text-text-muted">{relativeTime(h.last_checked)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent Status */}
        <Card title="Agent Status" subtitle="Live heartbeats" action={<a href="/agents" className="text-xs text-mint hover:underline">View all</a>}>
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center justify-between py-1 border-b border-bg-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", agent.online ? "bg-status-healthy animate-pulse-slow" : "bg-status-unknown")} />
                  <div>
                    <span className="text-xs text-text-primary font-medium">{agent.name}</span>
                    {agent.current_task && <p className="text-xs text-text-muted truncate max-w-[120px]">{agent.current_task}</p>}
                  </div>
                </div>
                <span className="text-xs text-text-muted">{relativeTime(agent.last_activity)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick links */}
        <div className="space-y-4">
          <Card title="Projects" action={<a href="/projects" className="text-xs text-mint hover:underline">View all</a>}>
            <div className="space-y-2">
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="Cirrus" sub="MVP 65% complete" />
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="AMC DUC App" sub="v1 live · v2 planning" />
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="Mission Control v2" sub="Phase 2 — building now" />
            </div>
          </Card>
          <Card title="Quick Actions">
            <div className="space-y-2">
              <QuickLink href="/alerts" icon={<AlertTriangle size={14} />} label="View Alerts" sub={`${alerts.length} active`} />
              <QuickLink href="/incubator" icon={<Activity size={14} />} label="Idea Incubator" sub="Ideas pipeline" />
              <QuickLink href="/pipeline" icon={<TrendingUp size={14} />} label="Opportunity Pipeline" sub="Irene · Ernie · Atlas" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, valueClass, sub }: { icon: React.ReactNode; label: string; value: string; valueClass: string; sub: string }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn("text-2xl font-semibold font-mono", valueClass)}>{value}</div>
      <div className="text-xs text-text-muted mt-1">{sub}</div>
    </div>
  );
}

function QuickLink({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <a href={href} className="flex items-center gap-2 p-2 rounded hover:bg-bg-border transition-colors group">
      <span className="text-text-muted group-hover:text-mint transition-colors">{icon}</span>
      <div>
        <div className="text-xs text-text-primary">{label}</div>
        <div className="text-xs text-text-muted">{sub}</div>
      </div>
    </a>
  );
}
