"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckSquare,
  ShieldCheck,
  FileText,
  Radar,
  ArrowRight,
  Clock3,
  Sparkles,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, relativeTime } from "@/lib/utils";

interface CommandDeckAgent {
  id: string;
  name: string;
  role: string;
  currentTask: string | null;
  freshnessMinutes: number | null;
  freshnessLabel: string;
  status: string;
  health: string;
  proofCount: number;
  lastSeenAt: string;
}

interface CommandDeckPriority {
  id: string;
  title: string;
  owner: string | null;
  status: string;
  whyNow: string;
  action: string;
  updatedAt: string;
}

interface CommandDeckActivity {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  source: string;
  needsMark: boolean;
}

interface NeedsMarkItem {
  id: string;
  title: string;
  requestedBy: string;
  category: string;
  reason: string;
  recommendedAction: string;
  urgency: string;
  createdAt: string;
}

interface ProofItem {
  id: string;
  title: string;
  type: string;
  relatedTo: string;
  timestamp: string;
  path: string;
  hasMore?: boolean;
}

interface RuntimeSummary {
  overall: string;
  onlineAgents: number;
  staleAgents: number;
  blockedTasks: number;
  approvalsWaiting: number;
  generatedAt: string;
}

interface CommandDeckPayload {
  generatedAt: string;
  agents: CommandDeckAgent[];
  priorities: CommandDeckPriority[];
  activity: CommandDeckActivity[];
  needsMark: NeedsMarkItem[];
  proofFeed: {
    total: number;
    latest: ProofItem[];
    hasMore: boolean;
  };
  runtime: RuntimeSummary;
  taskSummary: {
    active: number;
    blocked: number;
    queued: number;
    completed: number;
    pendingTodo: number;
  };
}

const EMPTY_PAYLOAD: CommandDeckPayload = {
  generatedAt: new Date(0).toISOString(),
  agents: [],
  priorities: [],
  activity: [],
  needsMark: [],
  proofFeed: { total: 0, latest: [], hasMore: false },
  runtime: {
    overall: "unknown",
    onlineAgents: 0,
    staleAgents: 0,
    blockedTasks: 0,
    approvalsWaiting: 0,
    generatedAt: new Date(0).toISOString(),
  },
  taskSummary: { active: 0, blocked: 0, queued: 0, completed: 0, pendingTodo: 0 },
};

function greeting(): string {
  const hour = Number(
    new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hour12: false,
    })
  );

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Working late";
}

function missionNarrative(payload: CommandDeckPayload): string {
  if (payload.priorities[0]?.title) {
    return `${payload.priorities[0].title} is top of the board. ${payload.needsMark.length} item${payload.needsMark.length === 1 ? "" : "s"} need Mark. ${payload.runtime.onlineAgents}/${payload.agents.length} agents are visible.`;
  }

  return `${payload.taskSummary.active} active priorities, ${payload.needsMark.length} waiting on Mark, ${payload.runtime.onlineAgents}/${payload.agents.length} agents visible.`;
}

function urgencyClass(urgency: string): string {
  if (urgency === "high") return "text-status-critical";
  if (urgency === "medium") return "text-status-warning";
  return "text-text-secondary";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function priorityCardClass(status: string): string {
  if (status === "blocked") return "priority-blocked";
  if (status === "approved") return "priority-waiting";
  return "priority-active";
}

function freshnessMinutesAgo(timestamp: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
}

function isRecentActivity(timestamp: string): boolean {
  return freshnessMinutesAgo(timestamp) <= 10;
}

function isFreshPriority(updatedAt: string): boolean {
  return freshnessMinutesAgo(updatedAt) <= 15;
}

function runtimeAccent(overall: string): string {
  if (overall === "critical") return "border-status-critical/40 bg-status-critical/10";
  if (overall === "warning") return "border-status-warning/40 bg-status-warning/10";
  return "border-mint/30 bg-mint/10";
}

function healthDotClass(health: string): string {
  if (health === "critical") return "bg-status-critical status-pulse-critical";
  if (health === "warning") return "bg-status-warning";
  if (health === "healthy") return "bg-status-healthy live-dot";
  return "bg-status-unknown";
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<CommandDeckPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("--:--:--");

  const fetchDeck = useCallback(async () => {
    try {
      const response = await fetch("/api/command-deck", { cache: "no-store" });
      const data = (await response.json()) as CommandDeckPayload;
      setPayload(data);
    } catch {
      setPayload(EMPTY_PAYLOAD);
    } finally {
      setLoading(false);
      setLastRefresh(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Europe/London",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
  }, []);

  useEffect(() => {
    fetchDeck();
    const interval = setInterval(fetchDeck, 15000);
    return () => clearInterval(interval);
  }, [fetchDeck]);

  return (
    <div className="space-y-6 animate-fade-in scanline-overlay">
      <section className="mc-card radar-sweep overflow-hidden border-mint/20 bg-[linear-gradient(135deg,rgba(94,186,160,0.08),rgba(6,13,10,0.96)_38%,rgba(12,26,20,0.98))] px-5 py-5 lg:px-6 lg:py-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-mint">
                <span className="h-2 w-2 rounded-full bg-mint ambient-ping" />
                Home / Command Deck
              </div>
              <Link 
                href="/alerts" 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  payload.runtime.overall === "healthy" 
                    ? "border-mint/20 bg-mint/10 text-mint-bright" 
                    : "border-status-critical/30 bg-status-critical/10 text-status-critical animate-pulse"
                )}
              >
                <TriangleAlert size={13} />
                System Alerts
              </Link>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary lg:text-3xl">
              {greeting()}, Mark
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary lg:text-[15px]">
              {missionNarrative(payload)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SignalPill icon={<Radar size={13} />} label={`${payload.taskSummary.active} active`} />
              <SignalPill icon={<TriangleAlert size={13} />} label={`${payload.needsMark.length} waiting on Mark`} tone={payload.needsMark.length > 0 ? "warning" : "neutral"} />
              <SignalPill icon={<Bot size={13} />} label={`${payload.runtime.onlineAgents}/${payload.agents.length || 0} agents visible`} />
              <SignalPill icon={<ShieldCheck size={13} />} label={`${payload.proofFeed.total} proof traces`} tone="violet" />
            </div>
          </div>

          <div className={cn("relative z-10 min-w-[250px] rounded-xl border p-4", runtimeAccent(payload.runtime.overall))}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">Runtime / Health</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", healthDotClass(payload.runtime.overall === "healthy" ? "healthy" : payload.runtime.overall === "warning" ? "warning" : payload.runtime.overall === "critical" ? "critical" : "unknown"))} />
                  <StatusBadge status={payload.runtime.overall} label={payload.runtime.overall} />
                </div>
              </div>
              <Wifi className="text-text-muted" size={16} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <RuntimeCell label="Online" value={String(payload.runtime.onlineAgents)} />
              <RuntimeCell label="Stale" value={String(payload.runtime.staleAgents)} warning={payload.runtime.staleAgents > 0} />
              <RuntimeCell label="Blocked" value={String(payload.runtime.blockedTasks)} critical={payload.runtime.blockedTasks > 0} />
              <RuntimeCell label="Approvals" value={String(payload.runtime.approvalsWaiting)} warning={payload.runtime.approvalsWaiting > 0} />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
              <span>Refresh {lastRefresh}</span>
              <span>{relativeTime(payload.generatedAt)}</span>
            </div>
          </div>
        </div>
      </section>

      {payload.needsMark.length > 0 && (
        <section className="needs-mark-banner rounded-xl border px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg border border-status-warning/30 bg-status-warning/15 p-2">
                <AlertTriangle size={16} className="text-status-warning" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  Mark is needed on {payload.needsMark.length} item{payload.needsMark.length === 1 ? "" : "s"}
                </div>
                <div className="text-xs text-text-secondary">
                  Approvals and blockers are separated here so the important stuff floats up fast.
                </div>
              </div>
            </div>
            <Link href="/command" className="inline-flex items-center gap-2 text-xs font-medium text-mint hover:text-mint-bright">
              Open command view
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          icon={<CheckSquare size={16} className="text-mint" />}
          label="What matters now"
          value={String(payload.taskSummary.active)}
          sub={`${payload.taskSummary.blocked} blocked · ${payload.taskSummary.queued} queued`}
          accent="mint"
        />
        <MetricCard
          icon={<Bot size={16} className="text-cyan-300" />}
          label="Agent presence"
          value={`${payload.runtime.onlineAgents}/${payload.agents.length}`}
          sub={`${payload.runtime.staleAgents} stale signals`}
          accent="cyan"
        />
        <MetricCard
          icon={<TriangleAlert size={16} className="text-status-warning" />}
          label="Needs Mark"
          value={String(payload.needsMark.length)}
          sub={`${payload.runtime.approvalsWaiting} approvals waiting`}
          accent="warning"
          valueClass={payload.needsMark.length > 0 ? "text-status-warning" : undefined}
        />
        <MetricCard
          icon={<ShieldCheck size={16} className="proof-violet" />}
          label="Proof / outputs"
          value={String(payload.proofFeed.total)}
          sub={payload.proofFeed.hasMore ? `showing 6 most recent` : `${payload.taskSummary.pendingTodo} TODOs pending`}
          accent="violet"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card
            title="Top mission"
            subtitle="The priorities that actually matter right now"
            className="card-glow-fresh"
          >
            <div className="space-y-3">
              {payload.priorities.map((priority, index) => {
                const fresh = isFreshPriority(priority.updatedAt);
                return (
                  <div
                    key={priority.id}
                    className={cn(
                      "rounded-xl border border-bg-border bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent)] p-4 transition-all",
                      priorityCardClass(priority.status),
                      fresh && "card-glow-fresh"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Sparkles size={14} className="text-mint flex-shrink-0" />}
                          <div className="text-sm font-semibold text-text-primary">{priority.title}</div>
                        </div>
                        <div className="mt-1 text-xs text-text-muted">
                          {priority.owner || "Unassigned"} · {relativeTime(priority.updatedAt)}
                        </div>
                      </div>
                      <StatusBadge
                        status={priority.status === "execution" ? "healthy" : priority.status === "blocked" ? "critical" : "warning"}
                        label={statusLabel(priority.status)}
                      />
                    </div>

                    <div className="mt-3 text-sm leading-6 text-text-secondary">{priority.whyNow}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-mint">
                      <ArrowRight size={12} />
                      Next move: {priority.action}
                    </div>
                  </div>
                );
              })}
              {payload.priorities.length === 0 && <EmptyState text="No active priorities found on the board." />}
            </div>
          </Card>

          <Card title="Recent activity feed" subtitle="Real movement, visible proof, no dashboard theatre">
            <div className="space-y-2">
              {payload.activity.map((item) => {
                const fresh = isRecentActivity(item.timestamp);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border border-bg-border bg-bg-card/70 px-3 py-3",
                      fresh && "card-glow-fresh"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0",
                          item.needsMark
                            ? "bg-status-warning status-pulse-warning"
                            : item.type === "proof"
                              ? "proof-violet-bg border proof-violet"
                              : "bg-status-healthy live-dot"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm leading-6 text-text-primary">{item.message}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                          <span>{item.source}</span>
                          <span className="text-bg-border">•</span>
                          <span className={cn(fresh ? "timestamp-fresh" : "timestamp-stale")}>{relativeTime(item.timestamp)}</span>
                          {item.needsMark && (
                            <span className="rounded-full border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-status-warning">
                              needs Mark
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {payload.activity.length === 0 && <EmptyState text="No recent activity yet." />}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card title="Agent presence" subtitle="Current status, freshness, and visible signs of life">
            <div className="space-y-3">
              {payload.agents.map((agent) => {
                const freshnessMinutes = agent.freshnessMinutes;
                const freshness =
                  freshnessMinutes === null ? "stale" : freshnessMinutes <= 10 ? "fresh" : freshnessMinutes <= 60 ? "recent" : "stale";
                return (
                  <div
                    key={agent.id}
                    className={cn(
                      "rounded-xl border border-bg-border p-4",
                      freshness === "fresh" && "agent-tile-fresh card-glow-fresh",
                      freshness === "stale" && "bg-status-critical/5",
                      freshness === "recent" && "bg-bg-card/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", healthDotClass(agent.health))} />
                          <div className="text-sm font-semibold text-text-primary">{agent.name}</div>
                        </div>
                        <div className="mt-1 text-xs text-text-muted">{agent.role}</div>
                      </div>
                      <StatusBadge status={agent.health} label={statusLabel(agent.status)} />
                    </div>

                    <div className="mt-3 rounded-lg border border-bg-border/80 bg-black/10 px-3 py-2.5 text-xs leading-5 text-text-secondary">
                      {agent.currentTask || "No active task recorded"}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Clock3 size={12} />
                        <span className={cn(freshness === "stale" ? "text-status-warning" : "text-text-muted")}>
                          {agent.freshnessLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <ShieldCheck size={12} className="proof-violet" />
                        <span>{agent.proofCount} proof</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Proof feed summary" subtitle="Latest tangible outputs from the system">
            <div className="space-y-2">
              {payload.proofFeed.latest.map((item, index) => {
                const fresh = index < 2;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border px-3 py-3",
                      "proof-violet-bg",
                      fresh && "card-glow-fresh"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg border border-violet-400/30 bg-violet-400/10 p-2">
                        <FileText size={14} className="proof-violet" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-text-primary">{item.title}</div>
                        <div className="mt-1 text-xs text-text-muted">
                          {item.relatedTo} · {relativeTime(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {payload.proofFeed.latest.length === 0 && <EmptyState text="No proof artifacts found yet." />}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-3">
          <Card
            title="Needs Mark queue"
            subtitle="Human intervention only"
            action={<Link href="/command" className="text-xs text-mint hover:underline">Command</Link>}
          >
            <div className="space-y-3">
              {payload.needsMark.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4",
                    item.urgency === "high"
                      ? "border-status-critical/35 bg-status-critical/10"
                      : item.urgency === "medium"
                        ? "border-status-warning/35 bg-status-warning/10"
                        : "border-bg-border bg-bg-card/70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold leading-6 text-text-primary">{item.title}</div>
                    <span className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", urgencyClass(item.urgency))}>
                      {item.urgency}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {item.requestedBy} · {item.category} · {relativeTime(item.createdAt)}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-text-secondary">{item.reason}</div>
                  <div className="mt-3 rounded-lg border border-white/5 bg-black/10 px-3 py-2 text-xs text-mint">
                    Recommended: {item.recommendedAction}
                  </div>
                </div>
              ))}
              {payload.needsMark.length === 0 && <EmptyState text="Nothing needs Mark right now." />}
            </div>
          </Card>

          <Card title="Runtime snapshot" subtitle="Fast system read at a glance">
            <div className="space-y-3">
              <RuntimeStrip label="System state" value={payload.runtime.overall} status={payload.runtime.overall} />
              <RuntimeStrip label="Live agents" value={`${payload.runtime.onlineAgents}/${payload.agents.length}`} />
              <RuntimeStrip label="Blocked tasks" value={String(payload.runtime.blockedTasks)} status={payload.runtime.blockedTasks > 0 ? "critical" : "healthy"} />
              <RuntimeStrip label="Approvals waiting" value={String(payload.runtime.approvalsWaiting)} status={payload.runtime.approvalsWaiting > 0 ? "warning" : "healthy"} />
              <RuntimeStrip label="Board refresh" value={relativeTime(payload.generatedAt)} />
            </div>
          </Card>
        </div>
      </section>

      {loading && <div className="text-xs text-text-muted">Loading command deck…</div>}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  valueClass,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
  accent?: "mint" | "warning" | "violet" | "cyan";
}) {
  const accentClass =
    accent === "warning"
      ? "border-status-warning/25 bg-[linear-gradient(135deg,rgba(243,156,18,0.12),rgba(16,30,23,0.9))]"
      : accent === "violet"
        ? "border-violet-400/25 bg-[linear-gradient(135deg,rgba(167,139,250,0.12),rgba(16,30,23,0.9))]"
        : accent === "cyan"
          ? "border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(16,30,23,0.9))]"
          : "border-mint/25 bg-[linear-gradient(135deg,rgba(94,186,160,0.12),rgba(16,30,23,0.9))]";

  return (
    <div className={cn("mc-card metric-card-hover p-4", accentClass)}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</span>
      </div>
      <div className={cn("font-mono text-3xl font-semibold text-text-primary", valueClass)}>{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{sub}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-4 text-center text-xs text-text-muted">{text}</div>;
}

function RuntimeCell({
  label,
  value,
  warning,
  critical,
}: {
  label: string;
  value: string;
  warning?: boolean;
  critical?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", critical ? "text-status-critical" : warning ? "text-status-warning" : "text-text-primary")}>
        {value}
      </div>
    </div>
  );
}

function SignalPill({
  icon,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "warning" | "violet";
}) {
  const toneClass =
    tone === "warning"
      ? "border-status-warning/30 bg-status-warning/10 text-status-warning"
      : tone === "violet"
        ? "border-violet-400/30 bg-violet-400/10 proof-violet"
        : "border-mint/20 bg-mint/10 text-mint-bright";

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", toneClass)}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function RuntimeStrip({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-bg-border bg-bg-card/70 px-3 py-2.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.16em]",
          status === "critical"
            ? "text-status-critical"
            : status === "warning"
              ? "text-status-warning"
              : status === "healthy"
                ? "text-mint-bright"
                : "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}
