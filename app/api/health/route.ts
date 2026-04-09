import { NextResponse } from "next/server";
import { getCacheOrUnknown, getCacheFromSupabase } from "@/lib/percy-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  await getCacheFromSupabase();
  const result = getCacheOrUnknown();

  return NextResponse.json({
    ...result,
    freshness: {
      generated_at: result.generated_at,
      cache_age_seconds: result.cache_age_seconds,
      stale: result.stale,
      trusted: !result.stale,
    },
    source: "percy_health_cache",
  });
}