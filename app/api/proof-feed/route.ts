import { NextResponse } from "next/server";
import { buildCommandDeckPayload } from "@/lib/command-deck";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await buildCommandDeckPayload();
  return NextResponse.json({
    generatedAt: payload.generatedAt,
    total: payload.proofFeed.total,
    data: payload.proofFeed.latest,
  });
}
