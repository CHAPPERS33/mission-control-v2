import { NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") || "beast";

  const cmd = target === "nuc"
    ? `ssh remoteuser@devbox.tail06d4d3.ts.net "openclaw gateway restart"`
    : "openclaw gateway restart";

  return new Promise<NextResponse>((resolve) => {
    const proc = exec(cmd, { timeout: 15000 });
    let stderr = "";
    proc.stderr?.on("data", (d: string) => { stderr += d; });
    proc.on("close", (code) => {
      if (code === 0 || code === null) {
        resolve(NextResponse.json({ ok: true, target }));
      } else {
        resolve(NextResponse.json({ ok: false, target, error: stderr || `Exit ${code}` }, { status: 500 }));
      }
    });
    proc.on("error", (err) => {
      resolve(NextResponse.json({ ok: false, target, error: err.message }, { status: 500 }));
    });
  });
}
