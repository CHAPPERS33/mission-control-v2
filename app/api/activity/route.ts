import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "memory" | "file" | "script" | "commit";
  message: string;
  source: string;
}

export async function GET() {
  const workspace = join(
    process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
    ".openclaw/workspace"
  );
  const activities: ActivityEntry[] = [];

  // Check memory files for recent activity
  try {
    const memDir = join(workspace, "memory");
    const files = readdirSync(memDir)
      .filter(f => f.endsWith(".md"))
      .map(f => {
        try {
          const stat = statSync(join(memDir, f));
          return { name: f, mtime: stat.mtime };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, 5);

    for (const f of files as any[]) {
      activities.push({
        id: `mem-${f.name}`,
        timestamp: f.mtime.toISOString(),
        type: "memory",
        message: `Memory updated: ${f.name.replace(".md", "")}`,
        source: "workspace/memory",
      });
    }
  } catch {}

  // Check workspace root md files
  try {
    const files = readdirSync(workspace)
      .filter(f => f.endsWith(".md"))
      .map(f => {
        try {
          const stat = statSync(join(workspace, f));
          return { name: f, mtime: stat.mtime };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, 5);

    for (const f of files as any[]) {
      activities.push({
        id: `ws-${f.name}`,
        timestamp: f.mtime.toISOString(),
        type: "file",
        message: `Workspace file updated: ${f.name}`,
        source: "workspace",
      });
    }
  } catch {}

  // Sort all by time desc
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ data: activities.slice(0, 20) });
}
