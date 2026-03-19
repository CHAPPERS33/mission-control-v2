import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "milestone" | "deploy" | "decision" | "system" | "agent";
  agent?: string;
}

function getMemoryEvents(): TimelineEvent[] {
  const memDir = join(
    process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
    ".openclaw/workspace/memory"
  );
  const events: TimelineEvent[] = [];

  try {
    const files = readdirSync(memDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse()
      .slice(0, 14); // last 2 weeks

    for (const file of files) {
      const date = file.replace(".md", "");
      try {
        const content = readFileSync(join(memDir, file), "utf-8");
        // Extract headings as events
        const headings = content.match(/^##\s+(.+)$/gm) || [];
        for (const h of headings.slice(0, 3)) {
          const title = h.replace(/^##\s+/, "");
          events.push({
            id: `${date}-${title.slice(0, 20)}`,
            date: `${date}T12:00:00.000Z`,
            title,
            description: `From memory log ${date}`,
            type: "system",
          });
        }
      } catch {
        // skip
      }
    }
  } catch {
    // memDir doesn't exist or no access
  }

  // Fallback milestones if memory is empty
  if (events.length === 0) {
    return [
      {
        id: "mc-v2-launch",
        date: "2026-03-19T17:00:00.000Z",
        title: "Mission Control v2 — all 9 modules deployed",
        description: "Mabel completed full build: west-ham, cron, skills, timeline, todo, system, notes, command center, dashboard enrichment.",
        type: "deploy",
        agent: "Mabel",
      },
      {
        id: "beast-migration",
        date: "2026-03-12T21:00:00.000Z",
        title: "Migration: NUC → The Beast",
        description: "Moved primary agent runtime from GMKTech NUC to Acer Nitro N50-610.",
        type: "milestone",
      },
      {
        id: "wave-automation",
        date: "2026-03-10T09:00:00.000Z",
        title: "Wave automation live",
        description: "WhatsApp→Supabase pallet count ingestion fully automated.",
        type: "deploy",
        agent: "Bert",
      },
      {
        id: "scan-figures",
        date: "2026-03-08T14:00:00.000Z",
        title: "Scan figures OCR live",
        description: "Gemini-powered scan figures reading from WhatsApp photos.",
        type: "deploy",
        agent: "Mabel",
      },
      {
        id: "mc-v2-start",
        date: "2026-03-15T10:00:00.000Z",
        title: "Mission Control v2 build started",
        description: "Mabel spun up Next.js 15 codebase with Tailwind dark theme.",
        type: "milestone",
        agent: "Mabel",
      },
    ];
  }

  return events;
}

export async function GET() {
  const events = getMemoryEvents();
  return NextResponse.json({ data: events });
}
