import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  lastRun: string | null;
  nextRun: string | null;
  status: "healthy" | "warning" | "critical" | "unknown";
  script: string;
}

// Try to read from workspace AGENTS.md / cron config, fall back to mock
function getMockJobs(): CronJob[] {
  const now = Date.now();
  return [
    {
      id: "health-check",
      name: "Health Check",
      schedule: "*/5 * * * *",
      description: "Percy system health sweep — The Beast + services",
      lastRun: new Date(now - 3 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 2 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "scripts/health-check.js",
    },
    {
      id: "missing-parcels",
      name: "Missing Parcels Processor",
      schedule: "*/2 * * * *",
      description: "Process queued missing parcel images via Gemini OCR",
      lastRun: new Date(now - 90 * 1000).toISOString(),
      nextRun: new Date(now + 30 * 1000).toISOString(),
      status: "healthy",
      script: "scripts/missing-parcels-processor.js",
    },
    {
      id: "found-parcels",
      name: "Found Parcels Processor",
      schedule: "*/2 * * * *",
      description: "Process found parcel barcode scans + recovery updates",
      lastRun: new Date(now - 2 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 0 * 1000).toISOString(),
      status: "healthy",
      script: "scripts/found-parcels-processor.js",
    },
    {
      id: "atlas-heartbeat",
      name: "Atlas Heartbeat",
      schedule: "0 */6 * * *",
      description: "Atlas strategy review — 6-hourly cycle",
      lastRun: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "crons/atlas-heartbeat",
    },
    {
      id: "bert-heartbeat",
      name: "Bert Heartbeat",
      schedule: "*/30 * * * *",
      description: "Bert main agent 30-min check cycle",
      lastRun: new Date(now - 15 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 15 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "crons/bert-heartbeat",
    },
    {
      id: "irene-scout",
      name: "Irene Opportunity Scout",
      schedule: "0 */2 * * *",
      description: "Irene 2-hourly opportunity scan",
      lastRun: new Date(now - 45 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 75 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "crons/irene-heartbeat",
    },
    {
      id: "depot-open",
      name: "Depot Open Handler",
      schedule: "0 6 * * *",
      description: "AMC depot sub-depot open time ingestion",
      lastRun: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 16 * 60 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "scripts/depot-open-handler.js",
    },
    {
      id: "scan-figures",
      name: "Scan Figures Handler",
      schedule: "*/5 * * * *",
      description: "Process inbound scan figure photos from WhatsApp",
      lastRun: new Date(now - 4 * 60 * 1000).toISOString(),
      nextRun: new Date(now + 1 * 60 * 1000).toISOString(),
      status: "healthy",
      script: "scripts/scan-figures-handler.js",
    },
  ];
}

export async function GET() {
  const jobs = getMockJobs();
  const healthy = jobs.filter(j => j.status === "healthy").length;
  const warning = jobs.filter(j => j.status === "warning").length;
  const critical = jobs.filter(j => j.status === "critical").length;
  return NextResponse.json({
    data: jobs,
    summary: { total: jobs.length, healthy, warning, critical },
  });
}
