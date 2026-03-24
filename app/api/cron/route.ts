import { NextResponse } from "next/server";
import { readFileSync } from "fs";

export const dynamic = "force-dynamic";

// NOTE: Brief specified openclaw.json crons array, but openclaw.json cron field is empty ({}).
// Actual cron jobs live in jobs.json (the OpenClaw job scheduler file).
// Reading from jobs.json as the authoritative source. Deviation logged.
const JOBS_PATH = "C:\\Users\\mccha\\.openclaw\\jobs.json";

interface CronRow {
  id: string | null;
  name: string;
  description: string;
  schedule: string;
  scheduleHuman: string;
  agentId: string | null;
  enabled: boolean;
  tz: string;
}

function parseCronExpr(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, , , dow] = parts;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (min.startsWith("*/") && hour === "*") return `Every ${min.slice(2)} min`;
  if (min === "0" && hour.startsWith("*/")) return `Every ${hour.slice(2)}h`;
  if (min === "0" && hour !== "*" && dow === "*") return `Daily ${hour.padStart(2, "0")}:00`;
  if (dow !== "*" && dow !== "1-5" && dow !== "0-5") {
    const dayNum = parseInt(dow);
    const dayName = isNaN(dayNum) ? dow : (DAY_NAMES[dayNum] ?? dow);
    return `${dayName} ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }
  return expr;
}

export async function GET() {
  try {
    const raw = readFileSync(JOBS_PATH);
    // Strip BOM if present
    const text =
      raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
        ? raw.slice(3).toString("utf8")
        : raw.toString("utf8");

    const parsed = JSON.parse(text);
    const jobs: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.jobs)
      ? parsed.jobs
      : [];

    const data: CronRow[] = jobs.map(j => {
      const scheduleObj = j.schedule as Record<string, string> | string | null;
      const scheduleExpr =
        typeof scheduleObj === "object" && scheduleObj !== null
          ? scheduleObj.expr || ""
          : String(scheduleObj || "");
      const tz =
        typeof scheduleObj === "object" && scheduleObj !== null
          ? scheduleObj.tz || "Europe/London"
          : "Europe/London";

      return {
        id: (j.id as string) || null,
        name: (j.name as string) || "Unnamed",
        description:
          (j.description as string) ||
          ((j.payload as Record<string, string>)?.message?.slice(0, 80)) ||
          "",
        schedule: scheduleExpr,
        scheduleHuman: parseCronExpr(scheduleExpr),
        agentId: (j.agentId as string) || null,
        enabled: j.enabled !== false,
        tz,
      };
    });

    const enabled = data.filter(j => j.enabled).length;
    return NextResponse.json({
      data,
      summary: { total: data.length, enabled, disabled: data.length - enabled },
    });
  } catch {
    return NextResponse.json({
      data: [],
      summary: { total: 0, enabled: 0, disabled: 0 },
    });
  }
}
