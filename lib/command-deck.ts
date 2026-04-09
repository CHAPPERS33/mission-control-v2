import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSyncCaches } from "@/lib/mc-sync-cache";

export type AgentDeckStatus =
  | "active"
  | "planning"
  | "reviewing"
  | "waiting_mark"
  | "waiting_external"
  | "blocked"
  | "idle"
  | "offline"
  | "unknown";

export interface CommandDeckAgent {
  id: string;
  name: string;
  role: string;
  currentTask: string | null;
  freshnessMinutes: number | null;
  freshnessLabel: string;
  status: AgentDeckStatus;
  health: "healthy" | "warning" | "critical" | "unknown";
  proofCount: number;
  lastSeenAt: string;
}

export interface CommandDeckPriority {
  id: string;
  title: string;
  owner: string | null;
  status: "execution" | "approved" | "blocked";
  whyNow: string;
  action: string;
  updatedAt: string;
}

export interface CommandDeckActivity {
  id: string;
  timestamp: string;
  type: "agent" | "task" | "proof" | "system";
  message: string;
  source: string;
  needsMark: boolean;
}

export interface NeedsMarkItem {
  id: string;
  title: string;
  requestedBy: string;
  category: "approval" | "decision" | "attention" | "review";
  reason: string;
  recommendedAction: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
}

export interface ProofFeedSummaryItem {
  id: string;
  title: string;
  type: "artifact" | "note";
  relatedTo: string;
  timestamp: string;
  path: string;
}

export interface RuntimeHealthSummary {
  overall: "healthy" | "warning" | "critical" | "unknown";
  onlineAgents: number;
  staleAgents: number;
  blockedTasks: number;
  approvalsWaiting: number;
  generatedAt: string;
}

export interface CommandDeckPayload {
  generatedAt: string;
  agents: CommandDeckAgent[];
  priorities: CommandDeckPriority[];
  activity: CommandDeckActivity[];
  needsMark: NeedsMarkItem[];
  proofFeed: {
    total: number;
    latest: ProofFeedSummaryItem[];
    hasMore: boolean;
  };
  runtime: RuntimeHealthSummary;
  taskSummary: {
    active: number;
    blocked: number;
    queued: number;
    completed: number;
    pendingTodo: number;
  };
}

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

function mapHealth(status: AgentDeckStatus): CommandDeckAgent["health"] {
  switch (status) {
    case "active":
      return "healthy";
    case "idle":
    case "waiting_mark":
    case "unknown":
    case "reviewing":
      return "warning";
    case "blocked":
    case "offline":
      return "critical";
    default:
      return "warning";
  }
}

export async function buildCommandDeckPayload(): Promise<CommandDeckPayload> {
  const generatedAt = new Date().toISOString();

  const [heartbeatsRes, tasksRes, caches] = await Promise.all([
    supabaseAdmin.from("agent_heartbeats").select("*").order("agent_id"),
    supabaseAdmin.from("agent_tasks").select("*").order("updated_at", { ascending: false }),
    getSyncCaches(["tasks", "todo", "activity", "proof_feed"]),
  ]);

  const heartbeats = heartbeatsRes.data ?? [];
  const agentTasks = tasksRes.data ?? [];
  const cacheMap = new Map(caches.map((row) => [row.key, row]));

  const taskCache = (cacheMap.get("tasks")?.data as { data?: Array<{ id: string; title: string; status: string; assignee_agent: string | null; blocked_reason: string | null; updated_at: string }> ; counts?: { active: number; blocked: number; completed: number; queued: number } } | undefined);
  const todoCache = (cacheMap.get("todo")?.data as { counts?: { pending: number } } | undefined);
  const activityCache = (cacheMap.get("activity")?.data as { data?: CommandDeckActivity[] } | undefined);
  const proofCache = (cacheMap.get("proof_feed")?.data as { data?: ProofFeedSummaryItem[] } | undefined);

  const syncedTasks = taskCache?.data ?? [];
  const proofAll = proofCache?.data ?? [];
  const proofLatest = proofAll.slice(0, 6);
  const proofCounts = new Map<string, number>();

  for (const proof of proofAll) {
    const lower = proof.path.toLowerCase();
    for (const hb of heartbeats) {
      const id = String(hb.agent_id).toLowerCase();
      if (lower.includes(`\\${id}`) || lower.includes(`-${id}-`) || lower.includes(`_${id}_`)) {
        proofCounts.set(id, (proofCounts.get(id) || 0) + 1);
      }
    }
  }

  const agents: CommandDeckAgent[] = heartbeats.map((hb) => {
    const currentTask = agentTasks.find((t) => t.agent_id === hb.agent_id) ?? null;
    const metaStatus = (hb.metadata as Record<string, unknown> | null)?.agentStatus;
    const freshness = minutesSince(hb.last_heartbeat ?? hb.updated_at);
    const status: AgentDeckStatus = typeof metaStatus === "string"
      ? (metaStatus as AgentDeckStatus)
      : currentTask?.stage === "execution"
        ? "active"
        : currentTask?.stage === "peer_review"
          ? "reviewing"
          : currentTask?.stage === "blocked"
            ? "blocked"
            : currentTask?.stage === "approved" || currentTask?.stage === "approval"
              ? "waiting_mark"
              : freshness !== null && freshness > 240
                ? "offline"
                : "idle";

    return {
      id: hb.agent_id,
      name: hb.agent_name,
      role: hb.role,
      currentTask: currentTask?.title ?? hb.current_task ?? null,
      freshnessMinutes: freshness,
      freshnessLabel: freshnessLabel(freshness),
      status,
      health: mapHealth(status),
      proofCount: proofCounts.get(String(hb.agent_id).toLowerCase()) || (hb.last_proof ? 1 : 0),
      lastSeenAt: hb.last_heartbeat ?? hb.updated_at ?? new Date(0).toISOString(),
    };
  });

  const priorities: CommandDeckPriority[] = syncedTasks
    .filter((task) => task.status === "active" || task.status === "queued" || task.status === "blocked")
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      title: task.title,
      owner: task.assignee_agent,
      status: task.status === "active" ? "execution" : task.status === "queued" ? "approved" : "blocked",
      whyNow:
        task.status === "blocked"
          ? task.blocked_reason || "Blocked work needs intervention"
          : task.status === "queued"
            ? "Approved and ready to move when Mark gives the nod"
            : "Active execution item on the board right now",
      action:
        task.status === "blocked"
          ? "Unblock or reroute"
          : task.status === "queued"
            ? "Approve / confirm start"
            : "Monitor progress",
      updatedAt: task.updated_at,
    }));

  const needsMark: NeedsMarkItem[] = syncedTasks
    .filter((task) => task.status === "queued" || task.status === "blocked")
    .slice(0, 8)
    .map((task) => ({
      id: `needs-${task.id}`,
      title: task.title,
      requestedBy: task.assignee_agent || "Unknown",
      category: task.status === "queued" ? "approval" : "attention",
      reason:
        task.status === "queued"
          ? "Task is sitting in approved queue and wants Mark to let it move"
          : task.blocked_reason || "Blocked item needs a decision or escalation",
      recommendedAction: task.status === "queued" ? "Confirm execution start" : "Resolve blocker or change owner/scope",
      urgency: task.status === "blocked" ? "high" : "medium",
      createdAt: task.updated_at,
    }));

  const fallbackTaskActivities: CommandDeckActivity[] = syncedTasks
    .filter((task) => task.status !== "completed")
    .slice(0, 6)
    .map((task) => ({
      id: `task-${task.id}`,
      timestamp: task.updated_at,
      type: "task",
      message:
        task.status === "blocked"
          ? `${task.assignee_agent || "An agent"} blocked ${task.title}`
          : task.status === "queued"
            ? `${task.assignee_agent || "An agent"} has ${task.title} waiting for approval`
            : `${task.assignee_agent || "An agent"} is executing ${task.title}`,
      source: "mc_sync_cache.tasks",
      needsMark: task.status !== "active",
    }));

  const activity = ((activityCache?.data ?? fallbackTaskActivities) as CommandDeckActivity[])
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 10);

  const blockedTasks = taskCache?.counts?.blocked ?? syncedTasks.filter((t) => t.status === "blocked").length;
  const approvalsWaiting = taskCache?.counts?.queued ?? syncedTasks.filter((t) => t.status === "queued").length;
  const staleAgents = agents.filter((agent) => (agent.freshnessMinutes ?? 999) > 60).length;
  const onlineAgents = agents.filter((agent) => agent.status !== "offline" && agent.status !== "unknown").length;

  return {
    generatedAt,
    agents,
    priorities,
    activity,
    needsMark,
    proofFeed: {
      total: proofAll.length,
      latest: proofLatest,
      hasMore: proofAll.length > proofLatest.length,
    },
    runtime: {
      overall: blockedTasks > 0 ? "critical" : approvalsWaiting > 0 || staleAgents > 2 ? "warning" : "healthy",
      onlineAgents,
      staleAgents,
      blockedTasks,
      approvalsWaiting,
      generatedAt,
    },
    taskSummary: {
      active: taskCache?.counts?.active ?? syncedTasks.filter((t) => t.status === "active").length,
      blocked: blockedTasks,
      queued: approvalsWaiting,
      completed: taskCache?.counts?.completed ?? syncedTasks.filter((t) => t.status === "completed").length,
      pendingTodo: todoCache?.counts?.pending ?? 0,
    },
  };
}