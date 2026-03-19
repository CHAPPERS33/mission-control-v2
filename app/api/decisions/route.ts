import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DECISIONS_FILE = join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
  ".openclaw/workspace/decisions.json"
);

interface Decision {
  id: string;
  title: string;
  description: string;
  madeBy: string;
  impact: "high" | "medium" | "low";
  createdAt: string;
}

function loadDecisions(): Decision[] {
  try {
    return JSON.parse(readFileSync(DECISIONS_FILE, "utf-8"));
  } catch {
    return [
      {
        id: "d-001",
        title: "Stay on Supabase for all projects",
        description: "Do not swap Supabase out without exceptional reason. Confirmed cross-project.",
        madeBy: "Mark",
        impact: "high",
        createdAt: "2026-03-10T10:00:00.000Z",
      },
      {
        id: "d-002",
        title: "Mission Control v2 — Vercel deploy",
        description: "MC v2 deploys to Vercel via git push to main. Next.js 15 + Tailwind.",
        madeBy: "Mabel",
        impact: "medium",
        createdAt: "2026-03-15T14:00:00.000Z",
      },
      {
        id: "d-003",
        title: "Percy stays on NUC, not The Beast",
        description: "Percy is independent watchdog — must remain on NUC. Do not migrate.",
        madeBy: "Mark",
        impact: "high",
        createdAt: "2026-03-12T21:00:00.000Z",
      },
    ];
  }
}

function saveDecisions(decisions: Decision[]) {
  writeFileSync(DECISIONS_FILE, JSON.stringify(decisions, null, 2));
}

export async function GET() {
  return NextResponse.json({ data: loadDecisions() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const decisions = loadDecisions();

  if (body.action === "add") {
    const d: Decision = {
      id: `d-${Date.now()}`,
      title: body.title || "",
      description: body.description || "",
      madeBy: body.madeBy || "Mark",
      impact: body.impact || "medium",
      createdAt: new Date().toISOString(),
    };
    decisions.unshift(d);
    saveDecisions(decisions);
    return NextResponse.json({ success: true, data: d });
  }

  if (body.action === "delete") {
    const filtered = decisions.filter(d => d.id !== body.id);
    saveDecisions(filtered);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
