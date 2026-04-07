import { NextResponse } from "next/server";
import { buildAgentsDeckPayload } from "@/lib/agents-deck";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildAgentsDeckPayload());
}
