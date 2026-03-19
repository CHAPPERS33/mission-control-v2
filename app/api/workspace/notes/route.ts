import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const WORKSPACE = join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
  ".openclaw/workspace"
);

interface NoteFile {
  name: string;
  path: string;
  lastModified: string;
  size: number;
  isMemory: boolean;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  if (file) {
    // Sanitize: only allow .md files within workspace
    const safeName = file.replace(/\.\./g, "").replace(/[\\]/g, "/");
    const fullPath = join(WORKSPACE, safeName);
    if (!fullPath.startsWith(WORKSPACE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const content = readFileSync(fullPath, "utf-8");
      return NextResponse.json({ content, name: safeName });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // List markdown files in workspace root + memory dir
  const files: NoteFile[] = [];

  const scanDir = (dir: string, subPath: string) => {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          files.push({
            name: entry,
            path: join(subPath, entry).replace(/\\/g, "/"),
            lastModified: stat.mtime.toISOString(),
            size: stat.size,
            isMemory: subPath.includes("memory"),
          });
        } catch {}
      }
    } catch {}
  };

  scanDir(WORKSPACE, "");
  scanDir(join(WORKSPACE, "memory"), "memory");

  files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  return NextResponse.json({ data: files });
}
