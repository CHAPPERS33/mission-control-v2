import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MEMORY_DIR = join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
  ".openclaw/workspace/memory"
);

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const safeDateStr = date.match(/^\d{4}-\d{2}-\d{2}$/) ? date : todayStr();
  const filePath = join(MEMORY_DIR, `${safeDateStr}.md`);

  if (!existsSync(filePath)) {
    return NextResponse.json({ content: null, date: safeDateStr, exists: false });
  }

  const content = readFileSync(filePath, "utf-8");
  return NextResponse.json({ content, date: safeDateStr, exists: true });
}
