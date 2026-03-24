/**
 * /api/alerts — system alerts from Percy health data + TASKBOARD + proposals
 * No local exec. Percy data comes from shared cache.
 */
import { NextResponse } from "next/server";
import { readFileSync, statSync } from "fs";
import { getCacheOrUnknown } from "@/lib/percy-cache";

export const dynamic = "force-dynamic";

const PROPOSALS_FILE = "C:\\Users\\mccha\\.openclaw\\workspace\\proposals.json";
const TASKBOARD_PATH = "C:\\Users\\mccha\\.openclaw\\workspace\\TASKBOARD.md";

interface AlertRow {
  id: string;
  type: string;
  source: string;
  severity: "critical" | "warning" | "info";
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  suggested_action?: string;
}

// Map component → suggested_action
const SUGGESTED_ACTIONS: Record<string, string> = {
  gateway:       'Check Beast power/network. Run `openclaw gateway status` on The Beast. If gateway is down, run `openclaw gateway restart`.',
  whatsapp:      'Check WhatsApp on phone. If session stale, run `openclaw channels login --channel whatsapp` then restart gateway.',
  amcducapp:     'Check Vercel dashboard for deployment status. Verify Supabase project is active.',
  cirrusapp:     'Check Vercel dashboard. Verify Expo/EAS build status.',
  ram:           'Check for runaway processes on The Beast. Restart gateway if needed.',
  'OpenClaw Gateway': 'Check Beast power/network. Run `openclaw gateway status` on The Beast. If gateway is down, run `openclaw gateway restart`.',
  'WhatsApp Relay':   'Check WhatsApp on phone. If session stale, run `openclaw channels login --channel whatsapp` then restart gateway.',
  'The Beast (RAM)':  'Check for runaway processes on The Beast. Restart gateway if needed.',
  'AMC DUC App':      'Check Vercel dashboard for deployment status. Verify Supabase project is active.',
  'Cirrus App':       'Check Vercel dashboard. Verify Expo/EAS build status.',
};

function getPercyAlerts(): AlertRow[] {
  const { data, stale, generated_at } = getCacheOrUnknown();
  const now = new Date().toISOString();
  const alerts: AlertRow[] = [];

  for (const row of data) {
    if (row.status === "warning" || row.status === "critical") {
      alerts.push({
        id: `percy-${row.id}`,
        type: "system_incident",
        source: "Percy",
        severity: row.status as "warning" | "critical",
        message: stale
          ? `[STALE] ${row.component} is ${row.status} — last update ${generated_at || "unknown"}`
          : `${row.component} is ${row.status}`,
        created_at: row.last_checked || now,
        acknowledged_at: null,
        suggested_action: SUGGESTED_ACTIONS[row.id] ?? SUGGESTED_ACTIONS[row.component] ?? 'Investigate this component.',
      });
    }
  }

  // If cache is empty/stale and no alerts, add a "no data" notice
  if (alerts.length === 0 && stale) {
    alerts.push({
      id: "percy-stale",
      type: "system_incident",
      source: "Percy",
      severity: "warning",
      message: "Percy health data is stale — last update may be old",
      created_at: now,
      acknowledged_at: null,
    });
  }

  return alerts;
}

function getBlockedTasks(): Array<{ id: string; title: string; mtime: string }> {
  try {
    const raw = readFileSync(TASKBOARD_PATH, "utf-8");
    const mtime = statSync(TASKBOARD_PATH).mtime.toISOString();
    const blocked: Array<{ id: string; title: string; mtime: string }> = [];
    const sections = raw.split(/^## STAGE:/m);
    for (const section of sections) {
      const lines = section.split("\n");
      const stageHeader = lines[0]?.trim().toUpperCase() || "";
      if (!stageHeader.startsWith("BLOCKED")) continue;
      for (const line of lines) {
        if (line.startsWith("### ")) {
          const headingText = line.replace(/^###\s+/, "").trim();
          const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)/);
          const id = idMatch ? idMatch[1].toLowerCase() : headingText.toLowerCase().slice(0, 30);
          blocked.push({ id, title: headingText, mtime });
        }
      }
    }
    return blocked;
  } catch {
    return [];
  }
}

interface Proposal { id: string; task: string; agent: string; status: string; createdAt: string; }

function getPendingOldProposals(): Proposal[] {
  try {
    const raw = readFileSync(PROPOSALS_FILE, "utf-8");
    const proposals: Proposal[] = JSON.parse(raw);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return proposals.filter(p => p.status === "pending" && new Date(p.createdAt).getTime() < cutoff);
  } catch {
    return [];
  }
}

export async function GET() {
  const alerts: AlertRow[] = [];

  // Source A — Percy alerts
  alerts.push(...getPercyAlerts());

  // Source B — proposals pending > 24h
  for (const proposal of getPendingOldProposals()) {
    alerts.push({
      id: `prop-${proposal.id}`,
      type: "blocked_task",
      source: "Proposals",
      severity: "warning",
      message: `Proposal pending approval: ${proposal.task}`,
      created_at: proposal.createdAt,
      acknowledged_at: null,
    });
  }

  // Source C — BLOCKED tasks
  for (const task of getBlockedTasks()) {
    alerts.push({
      id: `blocked-${task.id}`,
      type: "blocked_task",
      source: "TASKBOARD",
      severity: "warning",
      message: `Task blocked: ${task.title}`,
      created_at: task.mtime,
      acknowledged_at: null,
    });
  }

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    const sa = order[a.severity] ?? 99;
    const sb = order[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ data: alerts });
}
