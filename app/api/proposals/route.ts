// DISPATCH GAP: The approve action in the Command Center updates proposal status in proposals.json
// but does NOT dispatch to any agent. Dispatching requires sessions_send to the agent's live
// session key, which requires OpenClaw gateway API access not currently exposed to Mission Control.
// Until a /api/gateway/sessions-send endpoint exists, dispatch remains manual (via Bert on Telegram).

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PROPOSALS_FILE = join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
  ".openclaw/workspace/proposals.json"
);

interface Proposal {
  id: string;
  task: string;
  agent: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

function loadProposals(): Proposal[] {
  try {
    return JSON.parse(readFileSync(PROPOSALS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveProposals(proposals: Proposal[]) {
  writeFileSync(PROPOSALS_FILE, JSON.stringify(proposals, null, 2));
}

export async function GET() {
  const proposals = loadProposals();
  return NextResponse.json({
    data: proposals,
    counts: {
      total: proposals.length,
      pending: proposals.filter(p => p.status === "pending").length,
      approved: proposals.filter(p => p.status === "approved").length,
      rejected: proposals.filter(p => p.status === "rejected").length,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const proposals = loadProposals();

  if (body.action === "add") {
    const newProposal: Proposal = {
      id: `prop-${Date.now()}`,
      task: body.task || "",
      agent: body.agent || "bert",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: body.notes || "",
    };
    proposals.push(newProposal);
    saveProposals(proposals);
    return NextResponse.json({ success: true, data: newProposal });
  }

  if (body.action === "update") {
    const idx = proposals.findIndex(p => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    proposals[idx] = { ...proposals[idx], ...body.updates, updatedAt: new Date().toISOString() };
    saveProposals(proposals);
    return NextResponse.json({ success: true, data: proposals[idx] });
  }

  if (body.action === "delete") {
    const filtered = proposals.filter(p => p.id !== body.id);
    saveProposals(filtered);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
