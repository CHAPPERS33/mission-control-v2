import { NextResponse } from "next/server";
import { readFileSync } from "fs";

export const dynamic = "force-dynamic";

const REGISTRY_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\memory\\session-registry.json";

interface AgentRow {
  id: string;
  name: string;
  role: string;
  current_task: string | null;
  last_activity: string;
  online: boolean;
  heartbeat_status: string;
}

const BASE_ROSTER = [
  { id: "bert",   name: "Bert",   role: "Chief Orchestrator" },
  { id: "atlas",  name: "Atlas",  role: "Head of Strategy" },
  { id: "mabel",  name: "Mabel",  role: "Head of Software Dev" },
  { id: "harold", name: "Harold", role: "Head Software Engineer" },
  { id: "ernie",  name: "Ernie",  role: "Head of Research" },
  { id: "pip",    name: "Pip",    role: "Head of Social Media" },
  { id: "irene",  name: "Irene",  role: "Head Scout" },
  { id: "percy",  name: "Percy",  role: "Head of Site Reliability" },
];

function mapState(state: string): { heartbeat_status: string; online: boolean } {
  switch (state) {
    case "OPERATIONAL":
    case "SESSION_READY":
      return { heartbeat_status: "healthy", online: true };
    case "TASK_ACKNOWLEDGED":
      return { heartbeat_status: "working", online: true };
    case "PEER_REVIEW":
      return { heartbeat_status: "reviewing", online: true };
    case "STALL_DETECTED":
      return { heartbeat_status: "blocked", online: true };
    case "UNKNOWN":
    default:
      return { heartbeat_status: "unknown", online: false };
  }
}

function fallbackTime(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  let registry: Record<string, Record<string, unknown>> = {};

  try {
    const raw = readFileSync(REGISTRY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    registry = parsed.agents || {};
  } catch {
    // Registry unreadable — return full roster as unregistered
    const fallback: AgentRow[] = BASE_ROSTER.map(a => ({
      ...a,
      current_task: null,
      last_activity: fallbackTime(),
      online: false,
      heartbeat_status: "unregistered",
    }));
    return NextResponse.json({ data: fallback });
  }

  const data: AgentRow[] = BASE_ROSTER.map(base => {
    const entry = registry[base.id] as Record<string, unknown> | undefined;

    if (!entry) {
      return {
        ...base,
        current_task: null,
        last_activity: fallbackTime(),
        online: false,
        heartbeat_status: "unregistered",
      };
    }

    const state = (entry.state as string) || "UNKNOWN";
    const { heartbeat_status, online } = mapState(state);

    const current_task =
      state === "TASK_ACKNOWLEDGED"
        ? ((entry.last_task_id as string) || null)
        : null;

    const last_activity =
      (entry.last_complete_time as string) ||
      (entry.last_ack_time as string) ||
      (entry.last_ready_time as string) ||
      fallbackTime();

    return {
      ...base,
      current_task,
      last_activity,
      online,
      heartbeat_status,
    };
  });

  return NextResponse.json({ data });
}
