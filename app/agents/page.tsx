"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, cn } from "@/lib/utils";
import {
  RefreshCw,
  Bot,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  Zap,
  Target,
  CircleDot,
} from "lucide-react";

// ── Types mirroring /api/agents/deck payload ──────────────────────

interface AgentTask {
  id: string;
  title: string;
  stage: string;
  blockedReason: string | null;
  updatedAt: string;
}

interface AgentProofItem {
  id: string;
  title: string;
  type: string;
  timestamp: string;
}

interface AgentAction {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

interface AgentBlockerState {
  isBlocked: boolean;
  isWaitingMark: boolean;
  isNeedsReview: boolean;
  summary: string | null;
}

interface AgentOpportunity {
  id: string;
  title: string;
  status: string;
}

interface AgentListItem {
  id: string;
  name: string;
  role: string;
  status: string;
  health: string;
  freshnessMinutes: number | null;
  freshnessLabel: string;
  currentTask: AgentTask | null;
  currentObjective: string | null;
  latestProof: AgentProofItem | null;
  proofCount: number;
  blockerState: AgentBlockerState;
  linkedOpportunity: AgentOpportunity | null;
  recentActions: AgentAction[];
  lastSeenAt: string;
}

interface AgentsDeckPayload {
  generatedAt: string;
  agents: AgentListItem[];
  summary: {
    total: number;
    active: number;
    idle: number;
    blocked: number;
    waitingMark: number;
    offline: number;
  };
}

const EMPTY_PAYLOAD: AgentsDeckPayload = {
  generatedAt: new Date(0).toISOString(),
  agents: [],
  summary: { total: 0, active: 0, idle: 0, blocked: 0, waitingMark: 0, offline: 0 },
};

// ── Helpers ───────────────────────────────────────────────────────

const agentEmoji: Record<string, string> = {
  bert: "\u{1F916}", atlas: "\u{1F5FA}\uFE0F", mabel: "\u{1F3D7}\uFE0F", harold: "\u{1F50D}",
  ernie: "\u{1F52C}", pip: "\u{1F4E3}", irene: "\u{1F3AF}", percy: "\u{1F441}\uFE0F",
};

function healthDotClass(health: string): string {
  if (health === "critical") return "bg-status-critical status-pulse-critical";
  if (health === "warning") return "bg-status-warning";
  if (health === "healthy") return "bg-status-healthy live-dot";
  return "bg-status-unknown";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function freshnessCategory(minutes: number | null): "fresh" | "recent" | "stale" {
  if (minutes === null) return "stale";
  if (minutes <= 10) return "fresh";
  if (minutes <= 60) return "recent";
  return "stale";
}

function blockerBorderClass(blocker: AgentBlockerState): string {
  if (blocker.isBlocked) return "agent-card-blocked";
  if (blocker.isWaitingMark) return "agent-card-waiting";
  if (blocker.isNeedsReview) return "agent-card-review";
  return "";
}

function stageColor(stage: string): string {
  if (stage === "execution") return "text-status-healthy";
  if (stage === "blocked") return "text-status-critical";
  if (stage === "approved") return "text-status-warning";
  return "text-text-muted";
}

// ── Page ──────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [payload, setPayload] = useState<AgentsDeckPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("--:--:--");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const fetchDeck = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/deck", { cache: "no-store" });
      const data = (await res.json()) as AgentsDeckPayload;
      setPayload(data);
    } catch {
      /* keep stale data visible */
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

  const { summary } = payload;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header strip ─────────────────────────────────── */}
      <section className="mc-card overflow-hidden border-mint/20 bg-[linear-gradient(135deg,rgba(94,186,160,0.06),rgba(6,13,10,0.96)_40%)] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-mint">
              <span className="h-2 w-2 rounded-full bg-mint ambient-ping" />
              Agents
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Agent Operations
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {summary.active} active, {summary.idle} idle, {summary.blocked} blocked, {summary.waitingMark} waiting on Mark, {summary.offline} offline
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <SummaryPill value={summary.active} label="Active" tone="mint" />
              <SummaryPill value={summary.blocked} label="Blocked" tone={summary.blocked > 0 ? "critical" : "muted"} />
              <SummaryPill value={summary.waitingMark} label="Needs Mark" tone={summary.waitingMark > 0 ? "warning" : "muted"} />
            </div>
            <button
              onClick={fetchDeck}
              className="ml-2 rounded-lg border border-bg-border bg-bg-card p-2 text-text-secondary transition-colors hover:border-mint/30 hover:text-mint"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
          <span>Last refresh {lastRefresh}</span>
          <span className="text-bg-border">|</span>
          <span>Board data {relativeTime(payload.generatedAt)}</span>
        </div>
      </section>

      {/* ── Agent grid ───────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {payload.agents.map((agent) => {
          const freshness = freshnessCategory(agent.freshnessMinutes);
          const expanded = expandedAgent === agent.id;
          return (
            <div
              key={agent.id}
              className={cn(
                "mc-card agent-card-hover transition-all duration-200",
                freshness === "fresh" && "card-glow-fresh",
                freshness === "stale" && "border-bg-border/60 opacity-80",
                blockerBorderClass(agent.blockerState),
                expanded && "ring-1 ring-mint/30"
              )}
            >
              {/* Agent header */}
              <div className="flex items-start justify-between gap-3 p-4 pb-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-mint/20 bg-mint/10 text-lg">
                      {agentEmoji[agent.id] || "\u{1F916}"}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-card",
                        healthDotClass(agent.health)
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{agent.name}</div>
                    <div className="text-xs text-text-muted">{agent.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={agent.health} label={statusLabel(agent.status)} />
                </div>
              </div>

              {/* Objective / current task */}
              <div className="px-4 pt-3">
                {agent.currentObjective ? (
                  <div className="rounded-lg border border-bg-border/80 bg-black/15 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Target size={12} className="mt-0.5 flex-shrink-0 text-mint" />
                      <div>
                        <div className="text-xs font-medium text-text-primary">{agent.currentObjective}</div>
                        {agent.currentTask && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                            <span className={cn("font-mono uppercase tracking-wider", stageColor(agent.currentTask.stage))}>
                              {agent.currentTask.stage}
                            </span>
                            <span className="text-bg-border">|</span>
                            <span>{relativeTime(agent.currentTask.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-bg-border/50 bg-black/10 px-3 py-2.5 text-xs text-text-muted italic">
                    No active task recorded
                  </div>
                )}
              </div>

              {/* Blocker banner */}
              {(agent.blockerState.isBlocked || agent.blockerState.isWaitingMark) && (
                <div className="mx-4 mt-3">
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      agent.blockerState.isBlocked
                        ? "border-status-critical/30 bg-status-critical/10 text-status-critical"
                        : "border-status-warning/30 bg-status-warning/10 text-status-warning"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="flex-shrink-0" />
                      <span>{agent.blockerState.summary}</span>
                    </div>
                    {agent.currentTask?.blockedReason && (
                      <div className="mt-1.5 text-[11px] opacity-80">
                        Reason: {agent.currentTask.blockedReason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats row: freshness, proof, opportunity */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <Clock3 size={12} />
                  <span className={cn(freshness === "stale" ? "text-status-warning" : "text-text-muted")}>
                    {agent.freshnessLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="proof-violet" />
                  <span>{agent.proofCount} proof{agent.proofCount !== 1 ? "s" : ""}</span>
                </div>
                {agent.linkedOpportunity && (
                  <div className="flex items-center gap-1.5">
                    <CircleDot size={12} className="text-cyan-400" />
                    <span className="text-cyan-300/80">{agent.linkedOpportunity.title}</span>
                  </div>
                )}
              </div>

              {/* Latest proof */}
              {agent.latestProof && (
                <div className="mx-4 mt-3">
                  <div className="rounded-lg border proof-violet-bg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="proof-violet flex-shrink-0" />
                      <span className="truncate text-xs text-text-primary">{agent.latestProof.title}</span>
                      <span className="ml-auto flex-shrink-0 text-[11px] text-text-muted">
                        {relativeTime(agent.latestProof.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expand toggle for recent actions */}
              <div className="mt-3 border-t border-bg-border/60">
                <button
                  onClick={() => setExpandedAgent(expanded ? null : agent.id)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-text-muted transition-colors hover:text-mint"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap size={11} />
                    {agent.recentActions.length} recent action{agent.recentActions.length !== 1 ? "s" : ""}
                  </span>
                  <ArrowRight
                    size={12}
                    className={cn("transition-transform", expanded && "rotate-90")}
                  />
                </button>

                {expanded && agent.recentActions.length > 0 && (
                  <div className="border-t border-bg-border/40 px-4 pb-3 pt-2">
                    <div className="space-y-2">
                      {agent.recentActions.map((action) => (
                        <div key={action.id} className="flex items-start gap-2 text-xs">
                          <span
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                              action.type === "proof"
                                ? "bg-violet-400"
                                : action.type === "task"
                                  ? "bg-mint"
                                  : "bg-text-muted"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-text-secondary">{action.message}</div>
                            <div className="mt-0.5 text-[11px] text-text-muted">
                              {relativeTime(action.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expanded && agent.recentActions.length === 0 && (
                  <div className="border-t border-bg-border/40 px-4 pb-3 pt-2 text-xs text-text-muted italic">
                    No recent actions recorded
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {loading && (
        <div className="text-center text-xs text-text-muted">Loading agents deck...</div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SummaryPill({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "mint" | "warning" | "critical" | "muted";
}) {
  const toneClass =
    tone === "critical"
      ? "border-status-critical/30 bg-status-critical/10 text-status-critical"
      : tone === "warning"
        ? "border-status-warning/30 bg-status-warning/10 text-status-warning"
        : tone === "mint"
          ? "border-mint/20 bg-mint/10 text-mint-bright"
          : "border-bg-border bg-bg-card/50 text-text-muted";

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", toneClass)}>
      <span className="font-mono">{value}</span>
      <span>{label}</span>
    </div>
  );
}
