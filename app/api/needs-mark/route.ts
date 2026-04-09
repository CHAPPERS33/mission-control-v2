import { NextResponse } from "next/server";
import { buildCommandDeckPayload } from "@/lib/command-deck";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await buildCommandDeckPayload();
  return NextResponse.json({
    generatedAt: payload.generatedAt,
    data: payload.needsMark,
    counts: {
      total: payload.needsMark.length,
      high: payload.needsMark.filter((item) => item.urgency === "high").length,
      medium: payload.needsMark.filter((item) => item.urgency === "medium").length,
      low: payload.needsMark.filter((item) => item.urgency === "low").length,
    },
  });
}
