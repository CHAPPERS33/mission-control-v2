/**
 * /api/health/push — POST endpoint for Beast to push Percy health snapshots
 * Health snapshot data is not sensitive — no auth required on POST.
 * GET requires auth if PUSH_SECRET is set (for debugging).
 */
import { NextRequest, NextResponse } from "next/server";
import { setCache, getCacheOrUnknown } from "@/lib/percy-cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    if (!raw || !raw.timestamp) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    setCache(raw as Parameters<typeof setCache>[0]);
    const result = getCacheOrUnknown();

    return NextResponse.json({
      ok: true,
      cached: result.data.length,
      generated_at: result.generated_at,
    });
  } catch (err) {
    console.error("health/push error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const PUSH_SECRET = process.env.PERCY_PUSH_SECRET || "";
  const auth = request.headers.get("Authorization") || "";
  if (PUSH_SECRET && auth !== `Bearer ${PUSH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getCacheOrUnknown());
}
