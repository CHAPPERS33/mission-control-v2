import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "fs";
import { execFileSync } from "child_process";

export const dynamic = "force-dynamic";

const TASKBOARD_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\TASKBOARD.md";
const PROJECTS_MD_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\projects.md";

const MISSION_CONTROL_PATH = "C:\\Users\\mccha\\OneDrive\\Documents\\mission-control-v2";
const AMC_DUC_PATH = "C:\\Users\\mccha\\OneDrive\\Documents\\amcducapp";
const CIRRUS_LANDING_PATH = "C:\\Users\\mccha\\OneDrive\\Documents\\cirrus_landingpage";

const PROJECT_CONFIG = [
  {
    id: "cirrus",
    name: "Cirrus",
    category: "Active" as const,
    path: CIRRUS_LANDING_PATH,
    summary: "Cirrus public web presence on this machine. Source: local cirrus_landingpage repo + Cirrus waitlist Supabase.",
  },
  {
    id: "amc-duc",
    name: "AMC DUC App",
    category: "Active" as const,
    path: AMC_DUC_PATH,
    summary: "Production DUC operations app. Source: local amcducapp repo on this machine.",
  },
  {
    id: "mission-control",
    name: "Mission Control v2",
    category: "Active" as const,
    path: MISSION_CONTROL_PATH,
    summary: "Internal dashboard. Source: local mission-control-v2 repo + protected TASKBOARD.md execution state.",
  },
];

type ProjectCategory = "Active" | "Paused" | "Archived";

type ProjectRow = {
  id: string;
  name: string;
  category: ProjectCategory;
  summary: string;
  path: string | null;
  path_exists: boolean;
  repo_exists: boolean;
  last_updated: string;
  repo_last_commit_at: string | null;
  repo_branch: string | null;
  open_tasks: number;
  queued_tasks: number;
  blocked_tasks: number;
  completed_tasks: number;
  latest_task_title: string | null;
  source_labels: string[];
  notes: string[];
  metrics: Array<{ label: string; value: string }>;
};

type TaskStatus = "active" | "blocked" | "queued" | "completed";

type TaskRow = {
  title: string;
  status: TaskStatus;
  project_id: string | null;
};

function runGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    }).trim();
  } catch {
    return null;
  }
}

function getRepoFacts(path: string) {
  const pathExists = existsSync(path);
  const repoExists = pathExists && existsSync(`${path}\\.git`);

  if (!repoExists) {
    const lastUpdated = pathExists ? statSync(path).mtime.toISOString() : new Date(0).toISOString();
    return {
      pathExists,
      repoExists,
      lastUpdated,
      repoLastCommitAt: null as string | null,
      repoBranch: null as string | null,
      commitCount: null as number | null,
    };
  }

  const repoLastCommitAt = runGit(["log", "-1", "--format=%cI"], path);
  const repoBranch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], path);
  const commitCountRaw = runGit(["rev-list", "--count", "HEAD"], path);
  const commitCount = commitCountRaw ? Number(commitCountRaw) : null;

  return {
    pathExists,
    repoExists,
    lastUpdated: repoLastCommitAt || statSync(path).mtime.toISOString(),
    repoLastCommitAt,
    repoBranch,
    commitCount: Number.isFinite(commitCount) ? commitCount : null,
  };
}

function parseProjectRegistryNotes(projectId: string): string[] {
  try {
    const raw = readFileSync(PROJECTS_MD_PATH, "utf-8");
    const headingMap: Record<string, string> = {
      cirrus: "## Cirrus",
      "amc-duc": "## AMC DUC App",
      "mission-control": "## Mission Control",
    };

    const heading = headingMap[projectId];
    if (!heading) return [];

    const start = raw.indexOf(heading);
    if (start === -1) return [];

    const nextHeading = raw.indexOf("\n## ", start + heading.length);
    const section = raw.slice(start, nextHeading === -1 ? undefined : nextHeading);

    return section
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.startsWith("- **Status:**") || line.startsWith("- **Stack:**") || line.startsWith("- **Path:**"))
      .map(line => line.replace(/^-\s*/, ""));
  } catch {
    return [];
  }
}

function deriveProjectId(taskId: string, title: string): string | null {
  const combined = `${taskId} ${title}`.toUpperCase();
  if (combined.includes("CIR-") || combined.startsWith("CIR")) return "cirrus";
  if (combined.includes("MCO-") || combined.includes("MC-")) return "mission-control";
  if (combined.includes("DUC-")) return "amc-duc";
  return null;
}

function parseTaskboard(): TaskRow[] {
  try {
    const raw = readFileSync(TASKBOARD_PATH, "utf-8");
    const tasks: TaskRow[] = [];
    const sections = raw.split(/^## STAGE:/m);

    for (const section of sections) {
      const lines = section.split("\n");
      const stageHeaderLine = lines[0]?.trim().toUpperCase() || "";

      let status: TaskStatus | null = null;
      if (stageHeaderLine.startsWith("EXECUTION — AUTONOMOUS OPS") || stageHeaderLine.startsWith("EXECUTION — AUTONOMOUS")) {
        continue;
      } else if (stageHeaderLine.startsWith("EXECUTION")) {
        status = "active";
      } else if (stageHeaderLine.startsWith("BLOCKED")) {
        status = "blocked";
      } else if (stageHeaderLine.startsWith("APPROVED")) {
        status = "queued";
      } else if (stageHeaderLine.startsWith("COMPLETE") || stageHeaderLine.startsWith("PEER REVIEW")) {
        status = "completed";
      } else {
        continue;
      }

      let currentHeading: string | null = null;
      let currentBody: string[] = [];

      const flush = () => {
        if (!currentHeading || !status) return;
        const hasOwner = currentBody.some(line => /\*\*Owner:\*\*/i.test(line));
        if (!hasOwner) return;

        const headingText = currentHeading.replace(/^###\s+/, "").trim();
        const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)\s*(?:—|-|:)?\s*/);
        const taskId = idMatch ? idMatch[1] : headingText;
        const title = idMatch ? headingText.slice(idMatch[0].length).trim() || headingText : headingText;

        tasks.push({
          title,
          status,
          project_id: deriveProjectId(taskId, title),
        });
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("### ")) {
          flush();
          currentHeading = line;
          currentBody = [];
        } else if (currentHeading) {
          currentBody.push(line);
        }
      }

      flush();
    }

    return tasks;
  } catch {
    return [];
  }
}

async function getCirrusWaitlistCount(): Promise<number | null> {
  const supaUrl = process.env.SUPABASE_CIRRUS_URL;
  const supaKey = process.env.SUPABASE_CIRRUS_ANON_KEY;

  if (!supaUrl || !supaKey) return null;

  try {
    const res = await fetch(`${supaUrl}/rest/v1/waitlist?select=id`, {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const tasks = parseTaskboard();
  const cirrusWaitlistCount = await getCirrusWaitlistCount();

  const data: ProjectRow[] = PROJECT_CONFIG.map(project => {
    const repo = getRepoFacts(project.path);
    const projectTasks = tasks.filter(task => task.project_id === project.id);

    const activeTasks = projectTasks.filter(task => task.status === "active");
    const blockedTasks = projectTasks.filter(task => task.status === "blocked");
    const queuedTasks = projectTasks.filter(task => task.status === "queued");
    const completedTasks = projectTasks.filter(task => task.status === "completed");

    const metrics: Array<{ label: string; value: string }> = [];

    if (repo.repoBranch) metrics.push({ label: "Branch", value: repo.repoBranch });
    if (repo.commitCount !== null) metrics.push({ label: "Commits", value: String(repo.commitCount) });
    if (project.id === "cirrus" && cirrusWaitlistCount !== null) {
      metrics.push({ label: "Waitlist", value: String(cirrusWaitlistCount) });
    }
    metrics.push({ label: "Active tasks", value: String(activeTasks.length) });
    if (blockedTasks.length > 0) metrics.push({ label: "Blocked", value: String(blockedTasks.length) });
    if (queuedTasks.length > 0) metrics.push({ label: "Queued", value: String(queuedTasks.length) });

    const notes = [
      ...parseProjectRegistryNotes(project.id),
      ...(repo.pathExists ? [] : ["Path not found on this machine"]),
      ...(repo.repoExists ? [] : ["Git repo not found at configured path"]),
    ];

    return {
      id: project.id,
      name: project.name,
      category: project.category,
      summary: project.summary,
      path: project.path,
      path_exists: repo.pathExists,
      repo_exists: repo.repoExists,
      last_updated: repo.lastUpdated,
      repo_last_commit_at: repo.repoLastCommitAt,
      repo_branch: repo.repoBranch,
      open_tasks: activeTasks.length,
      queued_tasks: queuedTasks.length,
      blocked_tasks: blockedTasks.length,
      completed_tasks: completedTasks.length,
      latest_task_title: activeTasks[0]?.title || queuedTasks[0]?.title || blockedTasks[0]?.title || completedTasks[0]?.title || null,
      source_labels: project.id === "cirrus"
        ? ["local git repo", "workspace projects.md", "Cirrus Supabase waitlist", "TASKBOARD.md"]
        : ["local git repo", "workspace projects.md", "TASKBOARD.md"],
      notes,
      metrics,
    };
  });

  return NextResponse.json({ data });
}
