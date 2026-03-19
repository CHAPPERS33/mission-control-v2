import { NextResponse } from "next/server";
import { readFileSync } from "fs";

export const dynamic = "force-dynamic";

const JOBS_PATH = "C:\\Users\\mccha\\.openclaw\\jobs.json";

function parseCronExpr(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, , , dow] = parts;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (min.startsWith("*/") && hour === "*")
    return `Every ${min.slice(2)} min`;
  if (min === "0" && hour.startsWith("*/"))
    return `Every ${hour.slice(2)}h`;
  if (min === "0" && hour !== "*" && dow === "*")
    return `Daily ${hour.padStart(2, "0")}:00`;
  if (dow !== "*" && dow !== "1-5" && dow !== "0-5")
    return `${DAY_NAMES[parseInt(dow)] ?? dow} ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  return expr;
}

export async function GET() {
  try {
    const raw = readFileSync(JOBS_PATH);
    // Strip BOM if present
    const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
      ? raw.slice(3).toString("utf8")
      : raw.toString("utf8");
    const data = JSON.parse(text);
    const jobs = (data.jobs || []).map((j: Record<string, unknown>) => {
      const scheduleExpr = (j.schedule as Record<string, string>)?.expr || String(j.schedule || "");
      return {
        id: j.id,
        name: j.name,
        description: j.description || (j.payload as Record<string, string>)?.message?.slice(0, 60) || "",
        schedule: scheduleExpr,
        scheduleHuman: parseCronExpr(scheduleExpr),
        enabled: j.enabled !== false,
        agentId: j.agentId || null,
      };
    });
    const enabled = jobs.filter((j: { enabled: boolean }) => j.enabled).length;
    return NextResponse.json({
      data: jobs,
      summary: { total: jobs.length, enabled, disabled: jobs.length - enabled },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err), data: [], summary: { total: 0, enabled: 0, disabled: 0 } }, { status: 500 });
  }
}
