"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, statusDot, cn } from "@/lib/utils";
import { Activity, CheckSquare, FolderOpen, Bot, AlertTriangle, TrendingUp, Edit2, Check, X } from "lucide-react";

interface HealthRow { id: string; component: string; status: string; message: string; last_checked: string; source: string; }
interface AgentRow { id: string; name: string; role: string; current_task: string | null; last_activity: string; online: boolean; heartbeat_status: string; }
interface TaskCounts { active: number; blocked: number; completed: number; }
interface AlertRow { id: string; type: string; severity: string; message: string; created_at: string; source: string; }
interface WeatherData { temp: string; feelsLike: string; desc: string; humidity: string; windKmph: string; location: string; icon: string; error?: string; }
interface ActivityEntry { id: string; timestamp: string; type: string; message: string; source: string; }
interface ProposalCounts { pending: number; total: number; }
interface TodoCounts { pending: number; high: number; }

function greeting(): string {
  const h = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", hour: "numeric", hour12: false });
  const hr = parseInt(h);
  if (hr >= 5 && hr < 12) return "Good morning";
  if (hr >= 12 && hr < 17) return "Good afternoon";
  if (hr >= 17 && hr < 21) return "Good evening";
  return "Working late";
}

function LiveClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDate(now.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-right">
      <div className="text-2xl font-mono font-semibold text-text-primary tabular-nums">{time}</div>
      <div className="text-xs text-text-muted mt-0.5">{date}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ active: 0, blocked: 0, completed: 0 });
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [propCounts, setPropCounts] = useState<ProposalCounts>({ pending: 0, total: 0 });
  const [todoCounts, setTodoCounts] = useState<TodoCounts>({ pending: 0, high: 0 });
  const [lastRefresh, setLastRefresh] = useState("");

  // MRR state (editable, persisted in localStorage)
  const [mrr, setMrr] = useState<number>(0);
  const [editingMrr, setEditingMrr] = useState(false);
  const [mrrInput, setMrrInput] = useState("");

  // Goal countdown (days to financial freedom target)
  const GOAL_DATE = "2027-01-01";
  const daysToGoal = Math.ceil((new Date(GOAL_DATE).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    const stored = localStorage.getItem("mc-mrr");
    if (stored) setMrr(parseFloat(stored));
  }, []);

  const saveMrr = () => {
    const val = parseFloat(mrrInput);
    if (!isNaN(val)) {
      setMrr(val);
      localStorage.setItem("mc-mrr", String(val));
    }
    setEditingMrr(false);
  };

  const fetchAll = useCallback(async () => {
    const [h, a, t, al, act, p, td] = await Promise.all([
      fetch("/api/health").then(r => r.json()),
      fetch("/api/agents").then(r => r.json()),
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
      fetch("/api/activity").then(r => r.json()),
      fetch("/api/proposals").then(r => r.json()),
      fetch("/api/workspace/todo").then(r => r.json()),
    ]);
    setHealth(h.data || []);
    setAgents(a.data || []);
    setTaskCounts(t.counts || { active: 0, blocked: 0, completed: 0 });
    setAlerts(al.data || []);
    setActivity(act.data || []);
    setPropCounts({ pending: p.counts?.pending || 0, total: p.counts?.total || 0 });
    setTodoCounts({ pending: td.counts?.pending || 0, high: td.counts?.high || 0 });
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
  }, []);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather");
      const json = await res.json();
      setWeather(json);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    fetchWeather();
    const interval = setInterval(fetchAll, 10000);
    const weatherInterval = setInterval(fetchWeather, 900000); // 15 min
    return () => { clearInterval(interval); clearInterval(weatherInterval); };
  }, [fetchAll, fetchWeather]);

  const overallStatus = health.some(h => h.status === "critical") ? "critical"
    : health.some(h => h.status === "warning") ? "warning" : "healthy";
  const onlineAgents = agents.filter(a => a.online).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with greeting + clock */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{greeting()}, Mark. ⚒️</h1>
          <p className="text-xs text-text-muted mt-0.5">Mission Control · Last refresh: {lastRefresh}</p>
        </div>
        <LiveClock />
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

      {/* Top row: weather + approval queue + MRR + days to goal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weather */}
        <div className="mc-card p-4">
          {weather && !weather.error ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{weather.icon}</span>
                <span className="text-xs text-text-muted">Clacton-on-Sea</span>
              </div>
              <div className="text-2xl font-mono font-semibold text-text-primary">{weather.temp}°C</div>
              <div className="text-xs text-text-muted mt-0.5">{weather.desc}</div>
              <div className="text-xs text-text-muted mt-0.5">Feels {weather.feelsLike}°C · {weather.windKmph}km/h</div>
            </>
          ) : (
            <>
              <div className="text-xs text-text-muted mb-1">Weather</div>
              <div className="text-sm text-text-secondary">Loading...</div>
            </>
          )}
        </div>

        {/* Approval queue */}
        <div className="mc-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wide">Approval Queue</span>
          </div>
          <div className={cn("text-2xl font-mono font-semibold", propCounts.pending > 0 ? "text-status-warning" : "text-status-healthy")}>
            {propCounts.pending}
          </div>
          <div className="text-xs text-text-muted mt-0.5">proposals pending</div>
          {propCounts.pending > 0 && (
            <a href="/command" className="text-xs text-mint hover:underline mt-1 block">Review →</a>
          )}
        </div>

        {/* MRR */}
        <div className="mc-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted uppercase tracking-wide">MRR</span>
            {!editingMrr ? (
              <button onClick={() => { setMrrInput(String(mrr)); setEditingMrr(true); }} className="text-text-muted hover:text-mint transition-colors">
                <Edit2 size={10} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={saveMrr} className="text-status-healthy hover:text-status-healthy/80"><Check size={10} /></button>
                <button onClick={() => setEditingMrr(false)} className="text-text-muted hover:text-status-critical"><X size={10} /></button>
              </div>
            )}
          </div>
          {editingMrr ? (
            <input
              type="number"
              value={mrrInput}
              onChange={e => setMrrInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveMrr()}
              autoFocus
              className="w-full bg-bg-border rounded px-2 py-1 text-sm font-mono text-mint focus:outline-none focus:border-mint/40 border border-bg-border"
            />
          ) : (
            <div className="text-2xl font-mono font-semibold text-mint">
              £{mrr.toLocaleString("en-GB")}
            </div>
          )}
          <div className="text-xs text-text-muted mt-0.5">monthly recurring</div>
        </div>

        {/* Days to goal */}
        <div className="mc-card p-4">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Days to Goal</div>
          <div className="text-2xl font-mono font-semibold text-mint">{daysToGoal}</div>
          <div className="text-xs text-text-muted mt-0.5">until {new Date(GOAL_DATE).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>
          {todoCounts.high > 0 && (
            <div className="text-xs text-status-critical mt-0.5">{todoCounts.high} high-pri tasks</div>
          )}
        </div>
      </div>

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

        {/* Activity Feed */}
        <Card title="Activity Feed" subtitle="10s refresh" action={<span className="text-xs text-text-muted">{activity.length} events</span>}>
          <div className="space-y-0">
            {activity.slice(0, 8).map(ev => (
              <div key={ev.id} className="flex items-start gap-2 py-1.5 border-b border-bg-border last:border-0">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", {
                  "bg-mint": ev.type === "memory",
                  "bg-status-warning": ev.type === "file",
                  "bg-status-healthy": ev.type === "deploy",
                  "bg-text-secondary": ev.type === "system",
                })} />
                <div className="min-w-0">
                  <div className="text-xs text-text-primary truncate">{ev.message}</div>
                  <div className="text-xs text-text-muted">{relativeTime(ev.timestamp)}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="py-4 text-xs text-text-muted text-center">No recent activity</div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom row: quick links + priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card title="Projects" action={<a href="/projects" className="text-xs text-mint hover:underline">View all</a>}>
            <div className="space-y-2">
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="Cirrus" sub="MVP 65% complete" />
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="AMC DUC App" sub="v1 live · v2 planning" />
              <QuickLink href="/projects" icon={<FolderOpen size={14} />} label="Mission Control v2" sub="Phase 2 — live!" />
            </div>
          </Card>
          <Card title="Quick Actions">
            <div className="space-y-2">
              <QuickLink href="/command" icon={<AlertTriangle size={14} />} label="Command Center" sub={`${propCounts.pending} proposals pending`} />
              <QuickLink href="/todo" icon={<CheckSquare size={14} />} label="Todo" sub={`${todoCounts.pending} pending · ${todoCounts.high} high pri`} />
              <QuickLink href="/pipeline" icon={<TrendingUp size={14} />} label="Opportunity Pipeline" sub="Irene · Ernie · Atlas" />
            </div>
          </Card>
        </div>

        {/* Priorities from TODO */}
        <Card title="Priorities" subtitle="From TODO.md — high priority" action={<a href="/todo" className="text-xs text-mint hover:underline">Full list</a>}>
          <PrioritiesList />
        </Card>
      </div>
    </div>
  );
}

function PrioritiesList() {
  const [items, setItems] = useState<Array<{ id: string; text: string; done: boolean; priority: string }>>([]);

  useEffect(() => {
    fetch("/api/workspace/todo").then(r => r.json()).then(json => {
      const high = (json.data || []).filter((i: any) => i.priority === "high" && !i.done).slice(0, 6);
      setItems(high);
    }).catch(() => {});
  }, []);

  if (items.length === 0) {
    return <div className="py-4 text-xs text-text-muted text-center">No high-priority tasks or TODO.md not found</div>;
  }

  return (
    <div className="space-y-0">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 py-2 border-b border-bg-border last:border-0">
          <span className="w-1.5 h-1.5 rounded-full bg-status-critical flex-shrink-0" />
          <span className="text-xs text-text-primary">{item.text}</span>
        </div>
      ))}
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
