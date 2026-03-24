import { NextResponse } from "next/server";
import { readFileSync, statSync } from "fs";

export const dynamic = "force-dynamic";

const TASKBOARD_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\TASKBOARD.md";

type TaskStatus = "active" | "blocked" | "queued" | "completed";
type TaskPriority = "high" | "medium" | "low";

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_agent: string | null;
  project_id: string | null;
  blocked_reason: string | null;
  updated_at: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function deriveProjectId(taskId: string, title: string): string | null {
  const combined = (taskId + " " + title).toUpperCase();
  if (combined.includes("CIR-") || combined.startsWith("CIR")) return "cirrus";
  if (combined.includes("MCO-") || combined.includes("MC-")) return "mission-control";
  if (combined.includes("DUC-")) return "amc-duc";
  if (combined.includes("INFRA-")) return "infra";
  if (combined.includes("ARCH-")) return "arch";
  if (combined.includes("ERNIE-")) return "ernie";
  if (combined.includes("PERCY-")) return "percy";
  if (combined.includes("ACTION-")) return "ops";
  return null;
}

function derivePriority(title: string): TaskPriority {
  if (/BST|deadline/i.test(title)) return "high";
  if (/^CIR-/i.test(title)) return "high";
  return "medium";
}

function extractFirstName(ownerLine: string): string | null {
  // "- **Owner:** Harold (builds), Mabel (reviews)" → "Harold"
  const match = ownerLine.match(/\*\*Owner:\*\*\s+([A-Z][a-z]+)/);
  return match ? match[1] : null;
}

function parseTaskboard(): { data: TaskRow[]; counts: { active: number; blocked: number; completed: number; queued: number } } {
  const EMPTY = { data: [], counts: { active: 0, blocked: 0, completed: 0, queued: 0 } };
  try {
    const raw = readFileSync(TASKBOARD_PATH, "utf-8");
    const mtime = statSync(TASKBOARD_PATH).mtime.toISOString();
    const tasks: TaskRow[] = [];

    // Split into stage sections
    const sections = raw.split(/^## STAGE:/m);

    for (const section of sections) {
      const lines = section.split("\n");
      const stageHeaderLine = lines[0]?.trim().toUpperCase() || "";

      let status: TaskStatus | null = null;
      if (stageHeaderLine.startsWith("EXECUTION — AUTONOMOUS OPS") || stageHeaderLine.startsWith("EXECUTION — AUTONOMOUS")) {
        continue; // Skip autonomous ops section
      } else if (stageHeaderLine.startsWith("EXECUTION")) {
        status = "active";
      } else if (stageHeaderLine.startsWith("BLOCKED")) {
        status = "blocked";
      } else if (stageHeaderLine.startsWith("APPROVED")) {
        status = "queued";
      } else if (stageHeaderLine.startsWith("COMPLETE")) {
        status = "completed";
      } else {
        continue; // Not a recognised stage
      }

      // Find task blocks starting with "### "
      let currentTask: { headingLine: string; bodyLines: string[] } | null = null;

      const flushTask = (t: { headingLine: string; bodyLines: string[] }) => {
        // Skip date sub-headers (e.g. "### Today (22 Mar 2026)", "### 21 Mar 2026")
        // Real tasks always have an Owner line; date headers never do.
        const hasOwner = t.bodyLines.some(l => /\*\*Owner:\*\*/i.test(l));
        if (!hasOwner) return;
        const task = buildTask(t.headingLine, t.bodyLines, status, mtime);
        if (task) tasks.push(task);
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("### ")) {
          if (currentTask) flushTask(currentTask);
          currentTask = { headingLine: line, bodyLines: [] };
        } else if (currentTask) {
          currentTask.bodyLines.push(line);
        }
      }
      // Flush last task
      if (currentTask) flushTask(currentTask);
    }

    const counts = {
      active: tasks.filter(t => t.status === "active").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
      completed: tasks.filter(t => t.status === "completed").length,
      queued: tasks.filter(t => t.status === "queued").length,
    };

    return { data: tasks, counts };
  } catch {
    return EMPTY;
  }
}

function buildTask(
  headingLine: string,
  bodyLines: string[],
  status: TaskStatus,
  mtime: string
): TaskRow | null {
  // "### MC-WIRING-001 — Mission Control Wiring Sprint Phase 1"
  // "### ACTION-MARK-001 — WhatsApp Number Registry"
  // "### Some heading with no ID"
  const headingText = headingLine.replace(/^###\s+/, "").trim();

  // Try to extract task ID (e.g. MC-WIRING-001, CIR-001, ACTION-MARK-001)
  const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)\s*(?:—|-|:)?\s*/);
  const taskId = idMatch ? idMatch[1] : slugify(headingText);
  const titleText = idMatch
    ? headingText.slice(idMatch[0].length).trim() || headingText
    : headingText;

  // Extract owner from body
  let owner: string | null = null;
  let blockedReason: string | null = null;

  for (const line of bodyLines) {
    if (/\*\*Owner:\*\*/i.test(line)) {
      owner = extractFirstName(line);
    }
    if (/\*\*Blocked reason:\*\*|\*\*Reason:\*\*/i.test(line)) {
      const m = line.match(/\*\*(?:Blocked reason|Reason):\*\*\s*(.+)/i);
      if (m) blockedReason = m[1].trim();
    }
  }

  return {
    id: taskId.toLowerCase(),
    title: titleText || headingText,
    status,
    priority: derivePriority(headingText),
    assignee_agent: owner,
    project_id: deriveProjectId(taskId, titleText),
    blocked_reason: blockedReason,
    updated_at: mtime,
  };
}

export async function GET() {
  const result = parseTaskboard();
  return NextResponse.json(result);
}
