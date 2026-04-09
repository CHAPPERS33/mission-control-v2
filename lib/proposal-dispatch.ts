import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { spawn } from "child_process";

const HOME = process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha";
const NPM_BIN = process.env.APPDATA ? join(process.env.APPDATA, "npm") : join(HOME, "AppData/Roaming/npm");
const OPENCLAW_BIN = process.platform === "win32"
  ? join(NPM_BIN, "openclaw.cmd")
  : "openclaw";

export const PROPOSALS_FILE = join(HOME, ".openclaw/workspace/proposals.json");
const AUDIT_FILE = join(HOME, ".openclaw/workspace/artifacts/mission-control/proposal-dispatch-log.jsonl");

export interface ProposalDispatchRecord {
  status: "queued" | "sent" | "failed";
  requestedAt: string;
  attemptedAt?: string;
  completedAt?: string;
  command?: string;
  targetAgent?: string;
  targetSessionId?: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface Proposal {
  id: string;
  task: string;
  agent: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  notes?: string;
  dispatch?: ProposalDispatchRecord;
}

export function ensureParent(path: string) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadProposals(): Proposal[] {
  try {
    return JSON.parse(readFileSync(PROPOSALS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveProposals(proposals: Proposal[]) {
  ensureParent(PROPOSALS_FILE);
  writeFileSync(PROPOSALS_FILE, JSON.stringify(proposals, null, 2));
}

const AGENT_ALIASES: Record<string, string> = {
  bert: "bert",
  atlas: "atlas",
  mabel: "mabel",
  harold: "harold",
  ernie: "ernie",
  pip: "pip",
  irene: "irene",
  percy: "percy",
};

export function normalizeAgent(agent: string): string | null {
  const key = String(agent || "").trim().toLowerCase();
  return AGENT_ALIASES[key] || null;
}

function appendAudit(event: Record<string, unknown>) {
  ensureParent(AUDIT_FILE);
  appendFileSync(AUDIT_FILE, `${JSON.stringify(event)}\n`, "utf-8");
}

function parseSessionId(stdout: string): string | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed.sessionId || parsed.session_id || parsed.result?.sessionId || parsed.result?.session_id;
  } catch {
    const match = trimmed.match(/session(?:\s+id)?[:=]\s*([\w:-]+)/i);
    return match?.[1];
  }
}

export async function dispatchProposal(proposal: Proposal): Promise<ProposalDispatchRecord> {
  const targetAgent = normalizeAgent(proposal.agent);
  const requestedAt = new Date().toISOString();

  if (!targetAgent) {
    const failed: ProposalDispatchRecord = {
      status: "failed",
      requestedAt,
      attemptedAt: requestedAt,
      completedAt: requestedAt,
      error: `Unknown agent: ${proposal.agent}`,
    };
    appendAudit({ proposalId: proposal.id, task: proposal.task, agent: proposal.agent, dispatch: failed });
    return failed;
  }

  const attemptedAt = new Date().toISOString();
  const commandArgs = ["agent", "--agent", targetAgent, "--message", proposal.task, "--json"];
  const command = `openclaw ${commandArgs.map(arg => arg.includes(" ") ? JSON.stringify(arg) : arg).join(" ")}`;

  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const child = isWindows
      ? spawn(`${JSON.stringify(OPENCLAW_BIN)} ${commandArgs.map(arg => arg.includes(" ") ? JSON.stringify(arg) : arg).join(" ")}`, {
          shell: true,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn(OPENCLAW_BIN, commandArgs, {
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (record: ProposalDispatchRecord) => {
      if (settled) return;
      settled = true;
      appendAudit({ proposalId: proposal.id, task: proposal.task, agent: proposal.agent, dispatch: record });
      resolve(record);
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish({
        status: "failed",
        requestedAt,
        attemptedAt,
        completedAt: new Date().toISOString(),
        command,
        targetAgent,
        stdout: stdout.trim() || undefined,
        stderr: stderr.trim() || undefined,
        error: "Dispatch timed out after 120000ms",
      });
    }, 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish({
        status: "failed",
        requestedAt,
        attemptedAt,
        completedAt: new Date().toISOString(),
        command,
        targetAgent,
        stdout: stdout.trim() || undefined,
        stderr: stderr.trim() || undefined,
        error: error.message,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      const completedAt = new Date().toISOString();

      if ((code ?? 1) !== 0) {
        finish({
          status: "failed",
          requestedAt,
          attemptedAt,
          completedAt,
          command,
          targetAgent,
          exitCode: code,
          stdout: stdout.trim() || undefined,
          stderr: stderr.trim() || undefined,
          error: stderr.trim() || `Dispatch failed with exit code ${code}`,
        });
        return;
      }

      finish({
        status: "sent",
        requestedAt,
        attemptedAt,
        completedAt,
        command,
        targetAgent,
        targetSessionId: parseSessionId(stdout || ""),
        exitCode: code ?? 0,
        stdout: stdout.trim() || undefined,
        stderr: stderr.trim() || undefined,
      });
    });
  });
}
