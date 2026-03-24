/**
 * /api/health — returns Percy health data
 * Cold-start: reads from Supabase (persists across serverless instances)
 * Warm instance: reads from in-memory singleton
 * Data arrives via /api/health/push (writes to in-memory + Supabase)
 */
import { NextResponse } from "next/server";
import { getCacheOrUnknown, getCacheFromSupabase } from "@/lib/percy-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  // Fast path: in-memory cache exists (warm instance)
  let result = getCacheOrUnknown();
  if (result.data.length > 1 || result.generated_at !== null) {
    return NextResponse.json(result);
  }

  // Cold-start: try Supabase (persistent across instances)
  const fromDb = await getCacheFromSupabase();
  if (fromDb) {
    result = getCacheOrUnknown(); // re-read now that cache is populated
    return NextResponse.json(result);
  }

  // Both empty: return fallback
  return NextResponse.json(result);
}
