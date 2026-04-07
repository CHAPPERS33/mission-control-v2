import { readFileSync, statSync, readdirSync } from "fs";

const TASKBOARD_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\TASKBOARD.md";
const PROOF_ROOT = "C:\\Users\\mccha\\.openclaw\\workspace\\artifacts";

// ── Types ──────────────────────────────────────────────────────────

export type AgentStatus =
  | "active"
  | "planning"
  | "reviewing"
  | "waiting_mark"
  | "waiting_external"
  | "blocked"
  | "idle"
  | "offline"
  | "unknown";

export type AgentHealth = "healthy" | "warning" | "critical" | "unknown";

export interface AgentTask {
  id: string;
  title: string;
  stage: "execution" | "approved" | "blocked" | "complete";
  blockedReason: string | null;
  updatedAt: string;
}

export interface AgentProofItem {
  id: string;
  title: string;
  type: "artifact" | "note";
  timestamp: string;
}

export interface AgentAction {
  id: string;
  timestamp: string;
  type: "task" | "proof" | "status";
  message: string;
}

export interface AgentBlockerState {
  isBlocked: boolean;
  isWaitingMark: boolean;
  isNeedsReview: boolean;
  summary: string | null;
}

export interface AgentOpportunity {
  id: string;
  title: string;
  status: string;
}

export interface AgentListItem {
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
}

export interface AgentDetail extends AgentListItem {
  allTasks: AgentTask[];
  allProofs: AgentProofItem[];
  fullActions: AgentAction[];
}

export interface AgentsDeckPayload {
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

// ── Roster ─────────────────────────────────────────────────────────

const BASE_ROSTER = [
  { id: "bert", name: "Bert", role: "Chief Orchestrator" },
  { id: "atlas", name: "Atlas", role: "Head of Strategy" },
  { id: "mabel", name: "Mabel", role: "Head of Software Dev" },
  { id: "harold", name: "Harold", role: "Head Software Engineer" },
  { id: "ernie", name: "Ernie", role: "Head of Research" },
  { id: "pip", name: "Pip", role: "Head of Social Media" },
  { id: "irene", name: "Irene", role: "Head Scout" },
  { id: "percy", name: "Percy", role: "Head of Site Reliability" },
];

// ── Helpers ────────────────────────────────────────────────────────

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function safeMtime(path: string): string {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
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

function mapStatus(taskStage: AgentTask["stage"] | null, freshness: number | null): AgentStatus {
  if (freshness === null) return "unknown";
  if (freshness > 240) return "offline";
  if (!taskStage) return freshness <= 60 ? "idle" : "unknown";
  if (taskStage === "blocked") return "blocked";
  if (taskStage === "approved") return "waiting_mark";
  if (taskStage === "execution") return "active";
  return "idle";
}

function mapHealth(status: AgentStatus): AgentHealth {
  switch (status) {
    case "active":
      return "healthy";
    case "idle":
    case "waiting_mark":
    case "unknown":
      return "warning";
    case "blocked":
    case "offline":
      return "critical";
    default:
      return "warning";
  }
}

// ── Taskboard parsing ──────────────────────────────────────────────

interface RawTask {
  id: string;
  title: string;
  stage: "execution" | "approved" | "blocked" | "complete";
  owner: string | null;
  updatedAt: string;
  blockedReason: string | null;
  projectId: string | null;
}

function parseOwner(line: string): string | null {
  const match = line.match(/\*\*Owner:\*\*\s+([A-Z][a-z]+)/);
  return match ? match[1] : null;
}

function deriveProjectId(taskId: string, title: string): string | null {
  const combined = (taskId + " " + title).toUpperCase();
  if (combined.includes("CIR-") || combined.startsWith("CIR")) return "cirrus";
  if (combined.includes("MCO-") || combined.includes("MC-")) return "mission-control";
  if (combined.includes("DUC-")) return "amc-duc";
  if (combined.includes("INFRA-")) return "infra";
  return null;
}

function parseTaskboard(): RawTask[] {
  const raw = safeRead(TASKBOARD_PATH);
  if (!raw) return [];
  const mtime = safeMtime(TASKBOARD_PATH);
  const sections = raw.split(/^## STAGE:/m);
  const tasks: RawTask[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const header = (lines[0] || "").trim().toUpperCase();
    let stage: RawTask["stage"] | null = null;

    if (header.startsWith("EXECUTION — AUTONOMOUS")) continue;
    if (header.startsWith("EXECUTION")) stage = "execution";
    else if (header.startsWith("APPROVED")) stage = "approved";
    else if (header.startsWith("BLOCKED")) stage = "blocked";
    else if (header.startsWith("COMPLETE")) stage = "complete";
    else continue;

    let currentHeading: string | null = null;
    let body: string[] = [];

    const flush = () => {
      if (!currentHeading || !stage) return;
      if (!body.some((line) => /\*\*Owner:\*\*/i.test(line))) return;
      const headingText = currentHeading.replace(/^###\s+/, "").trim();
      const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)\s*(?:—|-|:)?\s*/);
      const id = (idMatch ? idMatch[1] : headingText).toLowerCase();
      const title = idMatch ? headingText.slice(idMatch[0].length).trim() : headingText;
      const owner = body.map(parseOwner).find(Boolean) || null;
      const blockedLine = body.find((line) => /\*\*(Blocked reason|Reason):\*\*/i.test(line)) || null;
      const blockedReason = blockedLine?.replace(/^.*\*\*(?:Blocked reason|Reason):\*\*\s*/i, "").trim() || null;
      const projectId = deriveProjectId(id, title);

      tasks.push({ id, title, stage, owner, updatedAt: mtime, blockedReason, projectId });
    };

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith("### ")) {
        flush();
        currentHeading = line;
        body = [];
      } else if (currentHeading) {
        body.push(line);
      }
    }

    flush();
  }

  return tasks;
}

// ── Proof scanning ─────────────────────────────────────────────────

interface RawProof {
  id: string;
  title: string;
  type: "artifact" | "note";
  timestamp: string;
  path: string;
}

function collectProofs(): RawProof[] {
  const results: RawProof[] = [];

  function walk(dir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = `${dir}\\${entry}`;
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      const lower = entry.toLowerCase();
      if (![".md", ".txt", ".json", ".png", ".jpg", ".jpeg", ".webp"].some((ext) => lower.endsWith(ext))) {
        continue;
      }
      results.push({
        id: full.toLowerCase(),
        title: entry,
        type: lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".json") ? "note" : "artifact",
        timestamp: stat.mtime.toISOString(),
        path: full,
      });
    }
  }

  walk(PROOF_ROOT);
  return results.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

function inferProofAgent(path: string): string | null {
  const lower = path.toLowerCase();
  for (const agent of BASE_ROSTER) {
    if (
      lower.includes(`\\${agent.id}`) ||
      lower.includes(`-${agent.id}-`) ||
      lower.includes(`_${agent.id}_`) ||
      lower.includes(`-${agent.id}.`) ||
      lower.includes(`_${agent.id}.`)
    ) {
      return agent.id;
    }
  }
  return null;
}

// ── Objective derivation ───────────────────────────────────────────

function deriveObjective(task: RawTask | null): string | null {
  if (!task) return null;
  if (task.stage === "blocked") return `Unblock: ${task.title}`;
  if (task.stage === "approved") return `Awaiting approval to start: ${task.title}`;
  return `Execute: ${task.title}`;
}

// ── Opportunity derivation ─────────────────────────────────────────

function deriveOpportunity(task: RawTask | null): AgentOpportunity | null {
  if (!task?.projectId) return null;
  const labels: Record<string, string> = {
    cirrus: "Cirrus platform",
    "mission-control": "Mission Control V1",
    "amc-duc": "AMC DUC project",
    infra: "Infrastructure",
  };
  return {
    id: task.projectId,
    title: labels[task.projectId] || task.projectId,
    status: task.stage === "complete" ? "complete" : "active",
  };
}

// ── Build actions ──────────────────────────────────────────────────

function buildAgentActions(
  agentName: string,
  agentTasks: RawTask[],
  agentProofs: RawProof[],
  limit: number
): AgentAction[] {
  const actions: AgentAction[] = [];

  for (const task of agentTasks) {
    const verb =
      task.stage === "blocked"
        ? "blocked on"
        : task.stage === "approved"
          ? "has approval pending for"
          : task.stage === "complete"
            ? "completed"
            : "is executing";
    actions.push({
      id: `action-task-${task.id}`,
      timestamp: task.updatedAt,
      type: "task",
      message: `${agentName} ${verb} ${task.title}`,
    });
  }

  for (const proof of agentProofs) {
    actions.push({
      id: `action-proof-${proof.id}`,
      timestamp: proof.timestamp,
      type: "proof",
      message: `${agentName} produced ${proof.title}`,
    });
  }

  return actions
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, limit);
}

// ── Public API ─────────────────────────────────────────────────────

export function buildAgentsDeckPayload(): AgentsDeckPayload {
  const generatedAt = new Date().toISOString();
  const allTasks = parseTaskboard();
  const allProofs = collectProofs();

  // Group proofs by agent
  const proofsByAgent = new Map<string, RawProof[]>();
  for (const proof of allProofs) {
    const agentId = inferProofAgent(proof.path);
    if (!agentId) continue;
    const list = proofsByAgent.get(agentId) || [];
    list.push(proof);
    proofsByAgent.set(agentId, list);
  }

  const agents: AgentListItem[] = BASE_ROSTER.map((roster) => {
    const agentTasks = allTasks.filter(
      (t) => t.owner?.toLowerCase() === roster.name.toLowerCase()
    );
    const activeTask =
      agentTasks.find((t) => t.stage === "execution") ||
      agentTasks.find((t) => t.stage === "blocked") ||
      agentTasks.find((t) => t.stage === "approved") ||
      null;
    const agentProofs = proofsByAgent.get(roster.id) || [];

    const lastSeenAt = activeTask?.updatedAt || safeMtime(TASKBOARD_PATH);
    const freshness = minutesSince(lastSeenAt);
    const status = mapStatus(activeTask?.stage || null, freshness);

    const isBlocked = agentTasks.some((t) => t.stage === "blocked");
    const isWaitingMark = agentTasks.some((t) => t.stage === "approved");
    const isNeedsReview = status === "reviewing";

    let blockerSummary: string | null = null;
    if (isBlocked) {
      const blockedTask = agentTasks.find((t) => t.stage === "blocked");
      blockerSummary = blockedTask?.blockedReason || `Blocked on ${blockedTask?.title || "unknown task"}`;
    } else if (isWaitingMark) {
      blockerSummary = "Waiting for Mark's approval";
    }

    const currentTaskObj: AgentTask | null = activeTask
      ? {
          id: activeTask.id,
          title: activeTask.title,
          stage: activeTask.stage,
          blockedReason: activeTask.blockedReason,
          updatedAt: activeTask.updatedAt,
        }
      : null;

    const latestProof: AgentProofItem | null =
      agentProofs.length > 0
        ? {
            id: agentProofs[0].id,
            title: agentProofs[0].title,
            type: agentProofs[0].type,
            timestamp: agentProofs[0].timestamp,
          }
        : null;

    const recentActions = buildAgentActions(roster.name, agentTasks, agentProofs, 5);

    return {
      id: roster.id,
      name: roster.name,
      role: roster.role,
      status,
      health: mapHealth(status),
      freshnessMinutes: freshness,
      freshnessLabel: freshnessLabel(freshness),
      currentTask: currentTaskObj,
      currentObjective: deriveObjective(activeTask),
      latestProof,
      proofCount: agentProofs.length,
      blockerState: {
        isBlocked,
        isWaitingMark,
        isNeedsReview,
        summary: blockerSummary,
      },
      linkedOpportunity: deriveOpportunity(activeTask),
      recentActions,
      lastSeenAt,
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

  return { generatedAt, agents, summary };
}

export function buildAgentDetail(agentId: string): AgentDetail | null {
  const allTasks = parseTaskboard();
  const allProofs = collectProofs();

  const roster = BASE_ROSTER.find((r) => r.id === agentId);
  if (!roster) return null;

  const agentTasks = allTasks.filter(
    (t) => t.owner?.toLowerCase() === roster.name.toLowerCase()
  );
  const agentProofs = allProofs.filter(
    (p) => inferProofAgent(p.path) === agentId
  );

  const activeTask =
    agentTasks.find((t) => t.stage === "execution") ||
    agentTasks.find((t) => t.stage === "blocked") ||
    agentTasks.find((t) => t.stage === "approved") ||
    null;

  const lastSeenAt = activeTask?.updatedAt || safeMtime(TASKBOARD_PATH);
  const freshness = minutesSince(lastSeenAt);
  const status = mapStatus(activeTask?.stage || null, freshness);

  const isBlocked = agentTasks.some((t) => t.stage === "blocked");
  const isWaitingMark = agentTasks.some((t) => t.stage === "approved");
  const isNeedsReview = status === "reviewing";

  let blockerSummary: string | null = null;
  if (isBlocked) {
    const blockedTask = agentTasks.find((t) => t.stage === "blocked");
    blockerSummary = blockedTask?.blockedReason || `Blocked on ${blockedTask?.title || "unknown task"}`;
  } else if (isWaitingMark) {
    blockerSummary = "Waiting for Mark's approval";
  }

  const currentTaskObj: AgentTask | null = activeTask
    ? {
        id: activeTask.id,
        title: activeTask.title,
        stage: activeTask.stage,
        blockedReason: activeTask.blockedReason,
        updatedAt: activeTask.updatedAt,
      }
    : null;

  const latestProof: AgentProofItem | null =
    agentProofs.length > 0
      ? {
          id: agentProofs[0].id,
          title: agentProofs[0].title,
          type: agentProofs[0].type,
          timestamp: agentProofs[0].timestamp,
        }
      : null;

  const allTaskObjs: AgentTask[] = agentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    stage: t.stage,
    blockedReason: t.blockedReason,
    updatedAt: t.updatedAt,
  }));

  const allProofObjs: AgentProofItem[] = agentProofs.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    timestamp: p.timestamp,
  }));

  const recentActions = buildAgentActions(roster.name, agentTasks, agentProofs, 5);
  const fullActions = buildAgentActions(roster.name, agentTasks, agentProofs, 50);

  return {
    id: roster.id,
    name: roster.name,
    role: roster.role,
    status,
    health: mapHealth(status),
    freshnessMinutes: freshness,
    freshnessLabel: freshnessLabel(freshness),
    currentTask: currentTaskObj,
    currentObjective: deriveObjective(activeTask),
    latestProof,
    proofCount: agentProofs.length,
    blockerState: {
      isBlocked,
      isWaitingMark,
      isNeedsReview,
      summary: blockerSummary,
    },
    linkedOpportunity: deriveOpportunity(activeTask),
    recentActions,
    lastSeenAt,
    allTasks: allTaskObjs,
    allProofs: allProofObjs,
    fullActions,
  };
}
