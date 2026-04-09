import { NextResponse } from "next/server";
import { buildCommandDeckPayload } from "@/lib/command-deck";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await buildCommandDeckPayload());
}