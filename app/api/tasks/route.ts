import { NextResponse } from "next/server";
import { getSyncCache } from "@/lib/mc-sync-cache";

export const dynamic = "force-dynamic";

interface TaskRow {
  id: string;
  title: string;
  status: "active" | "blocked" | "queued" | "completed" | "peer_review";
  priority: "high" | "medium" | "low";
  assignee_agent: string | null;
  project_id: string | null;
  blocked_reason: string | null;
  updated_at: string;
}

export async function GET() {
  const cached = await getSyncCache<{ data: TaskRow[]; counts: { active: number; blocked: number; completed: number; queued: number; peer_review?: number } }>("tasks");

  if (!cached) {
    return NextResponse.json({
      data: [],
      counts: { active: 0, blocked: 0, completed: 0, queued: 0, peer_review: 0 },
      source: "mc_sync_cache",
      error: "No synced task data available",
    });
  }

  return NextResponse.json({
    ...cached.data,
    source: "mc_sync_cache",
    synced_at: cached.updated_at,
  });
}