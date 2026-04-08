import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Types matching the page.tsx AgentListItem interface
type AgentStatus = "active" | "planning" | "reviewing" | "waiting_mark" | "waiting_external" | "blocked" | "idle" | "offline" | "unknown";
type AgentHealth = "healthy" | "warning" | "critical" | "unknown";

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
  status: AgentStatus;
  health: AgentHealth;
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
  model?: string | null;
  owner?: string | null;
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

// ── Helpers ───────────────────────────────────────────────────────

function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function freshnessLabel(minutes: number | null): string {
  if (minutes === null) return "Unknown";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function mapHealth(status: string, freshness: number | null): AgentHealth {
  if (freshness === null || freshness > 240) return "critical";
  if (status === "active") return "healthy";
  if (status === "blocked" || status === "offline") return "critical";
  if (status === "idle" || status === "unknown" || status === "waiting_mark") return "warning";
  return "warning";
}

function deriveObjective(taskStage: string | null, taskTitle: string | null): string | null {
  if (!taskTitle) return null;
  if (taskStage === "blocked") return `Unblock: ${taskTitle}`;
  if (taskStage === "approved" || taskStage === "approval") return `Awaiting approval to start: ${taskTitle}`;
  if (taskStage === "peer_review") return `Peer review: ${taskTitle}`;
  if (taskStage === "execution") return `Execute: ${taskTitle}`;
  return taskTitle;
}

// ── GET /api/agents/deck ───────────────────────────────────────────

export async function GET() {
  try {
    // 1. Fetch all heartbeats (current agent state)
    const { data: heartbeats, error: hbError } = await supabaseAdmin
      .from("agent_heartbeats")
      .select("*")
      .order("agent_id");

    if (hbError) throw hbError;

    // 2. Fetch current tasks
    const { data: tasks, error: taskError } = await supabaseAdmin
      .from("agent_tasks")
      .select("*")
      .order("updated_at", { ascending: false });

    if (taskError) throw taskError;

    // 3. Build agents list
    const agents: AgentListItem[] = (heartbeats ?? []).map((hb) => {
      // Get active task for this agent (execution > blocked > approved)
      const agentTasks = (tasks ?? []).filter((t) => t.agent_id === hb.agent_id);
      const activeTask = agentTasks.find((t) => t.stage === "execution")
        ?? agentTasks.find((t) => t.stage === "peer_review")
        ?? agentTasks.find((t) => t.stage === "blocked")
        ?? agentTasks.find((t) => t.stage === "approved")
        ?? agentTasks.find((t) => t.stage === "plan")
        ?? null;

      const lastSeenAt = hb.last_heartbeat ?? hb.updated_at ?? null;
      const freshness = minutesSince(lastSeenAt);

      const metadata = (hb.metadata as Record<string, unknown>) ?? {};

      // Priority: use metadata.agentStatus if present (written by sync-agent-data),
      // otherwise fall back to freshness + task stage derivation.
      const derivedStatus = (() => {
        const metaStatus = metadata.agentStatus as string | undefined;
        if (metaStatus && ['active', 'planning', 'reviewing', 'waiting_mark', 'blocked', 'idle', 'offline', 'unknown'].includes(metaStatus)) {
          return metaStatus as AgentStatus;
        }
        // Freshness + task stage derivation
        if (freshness !== null && freshness <= 240) {
          if (activeTask?.stage === "execution") return "active";
          if (activeTask?.stage === "blocked") return "blocked";
          if (activeTask?.stage === "approved" || activeTask?.stage === "approval") return "waiting_mark";
          if (activeTask?.stage === "plan") return "planning";
          if (activeTask?.stage === "peer_review") return "reviewing";
          return "idle";
        }
        if (activeTask?.stage === "peer_review") return "reviewing";
        if (activeTask?.stage === "approved" || activeTask?.stage === "approval") return "waiting_mark";
        if (activeTask?.stage === "blocked") return "blocked";
        return "offline";
      })();


      let status: AgentStatus = derivedStatus;

      const isBlocked = status === "blocked";
      const isWaitingMark = status === "waiting_mark";
      const isNeedsReview = status === "reviewing";

      let blockerSummary: string | null = null;
      if (isBlocked) {
        blockerSummary = activeTask?.title ? `Blocked on ${activeTask.title}` : "Blocked";
      } else if (isWaitingMark) {
        blockerSummary = "Waiting for Mark's approval";
      } else if (isNeedsReview) {
        blockerSummary = "Needs peer review";
      }

      const currentTaskObj: AgentTask | null = activeTask ? {
        id: activeTask.taskboard_id ?? String(activeTask.id),
        title: activeTask.title,
        stage: activeTask.stage,
        blockedReason: null,
        updatedAt: activeTask.updated_at,
      } : null;

      // linkedOpportunity derived from metadata or agent_id
      const linkedOpportunity: AgentOpportunity | null = null;

      // recentActions: derive from task + heartbeat timestamps
      const recentActions: AgentAction[] = [];
      if (activeTask) {
        recentActions.push({
          id: `action-task-${activeTask.agent_id}`,
          timestamp: activeTask.updated_at,
          type: "task",
          message: `${hb.agent_name} is ${status === 'active' ? 'executing' : status}: ${activeTask.title}`,
        });
      }
      if (hb.last_proof) {
        recentActions.push({
          id: `action-proof-${hb.agent_id}`,
          timestamp: hb.last_heartbeat ?? hb.updated_at,
          type: "proof",
          message: `${hb.agent_name} produced: ${hb.last_proof}`,
        });
      }

      return {
        id: hb.agent_id,
        name: hb.agent_name,
        role: hb.role,
        status,
        health: mapHealth(status, freshness),
        freshnessMinutes: freshness,
        freshnessLabel: freshnessLabel(freshness),
        currentTask: currentTaskObj,
        currentObjective: deriveObjective(activeTask?.stage ?? null, activeTask?.title ?? null),
        latestProof: hb.last_proof ? {
          id: `proof-${hb.agent_id}`,
          title: hb.last_proof,
          type: "note",
          timestamp: hb.last_heartbeat ?? hb.updated_at,
        } : null,
        proofCount: hb.last_proof ? 1 : 0,
        blockerState: {
          isBlocked,
          isWaitingMark,
          isNeedsReview,
          summary: blockerSummary,
        },
        linkedOpportunity,
        recentActions: recentActions.slice(0, 5),
        lastSeenAt: lastSeenAt ?? new Date(0).toISOString(),
        model: hb.model ?? null,
        owner: hb.owner ?? null,
      };
    });

    const summary = {
      total: agents.length,
      active: agents.filter((a) => a.status === "active").length,
      idle: agents.filter((a) => a.status === "idle").length,
      blocked: agents.filter((a) => a.status === "blocked").length,
      waitingMark: agents.filter((a) => a.status === "waiting_mark").length,
      offline: agents.filter((a) => a.status === "offline" || a.status === "unknown").length,
    };

    const payload: AgentsDeckPayload = {
      generatedAt: new Date().toISOString(),
      agents,
      summary,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[/api/agents/deck] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch agents deck", detail: String(err) },
      { status: 500 }
    );
  }
}
