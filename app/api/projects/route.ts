import { NextResponse } from "next/server";
import { getSyncCache } from "@/lib/mc-sync-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const cached = await getSyncCache<{ data: unknown[] }>("projects");

  if (!cached) {
    return NextResponse.json({
      data: [],
      source: "mc_sync_cache",
      error: "No synced project data available",
    });
  }

  return NextResponse.json({
    ...cached.data,
    source: "mc_sync_cache",
    synced_at: cached.updated_at,
  });
}