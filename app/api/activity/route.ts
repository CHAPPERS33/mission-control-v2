import { NextResponse } from "next/server";
import { getSyncCache } from "@/lib/mc-sync-cache";

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "memory" | "file" | "script" | "commit";
  message: string;
  source: string;
}

export async function GET() {
  const cached = await getSyncCache<{ data: ActivityEntry[] }>("activity");

  if (!cached) {
    return NextResponse.json({
      data: [],
      source: "mc_sync_cache",
      error: "No synced activity data available",
    });
  }

  return NextResponse.json({
    data: cached.data.data,
    source: "mc_sync_cache",
    synced_at: cached.updated_at,
  });
}