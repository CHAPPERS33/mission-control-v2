import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  memory: { total: number; free: number; usedPercent: number };
  cpu: string;
  gatewayStatus: "running" | "stopped" | "unknown";
  recentLogs: string[];
}

function tryExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 3000 }).trim();
  } catch {
    return "";
  }
}

function getGatewayLogs(): string[] {
  // Try openclaw log path
  const logPaths = [
    join(process.env.USERPROFILE || "C:/Users/mccha", ".openclaw/logs/gateway.log"),
    join(process.env.USERPROFILE || "C:/Users/mccha", ".openclaw/gateway.log"),
  ];

  for (const p of logPaths) {
    try {
      const content = readFileSync(p, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      return lines.slice(-50); // last 50 lines
    } catch {}
  }

  return [];
}

export async function GET() {
  const os = require("os");

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const gatewayCheck = tryExec("openclaw gateway status");
  const gatewayStatus = gatewayCheck.toLowerCase().includes("running")
    ? "running"
    : gatewayCheck.toLowerCase().includes("stopped") || gatewayCheck
    ? "stopped"
    : "unknown";

  const recentLogs = getGatewayLogs();

  // CPU info
  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : "Unknown";

  const info: SystemInfo = {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: Math.floor(os.uptime()),
    memory: { total: totalMem, free: freeMem, usedPercent },
    cpu: cpuModel,
    gatewayStatus,
    recentLogs,
  };

  return NextResponse.json({ data: info });
}
