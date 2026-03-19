import { NextResponse } from "next/server";

const mockProjects = [
  {
    id: "cirrus",
    name: "Cirrus",
    category: "Active",
    current_milestone: "MVP — Puff Logging + Coach Chat",
    milestone_progress: 65,
    summary: "Expo cessation app. Dual-track (vaping/smoking). Charlie's platform.",
    risk_level: "low",
    last_updated: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "amc-duc",
    name: "AMC DUC App",
    category: "Active",
    current_milestone: "v1 Production — v2 Planning",
    milestone_progress: 100,
    summary: "67 API routes, 43+ tables, real-time scanning. v2 target Aug 2025.",
    risk_level: "low",
    last_updated: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mission-control",
    name: "Mission Control v2",
    category: "Active",
    current_milestone: "Phase 2 Build — 9 Modules",
    milestone_progress: 20,
    summary: "Real-time AI ops dashboard. Next.js 15 + Supabase + Vercel.",
    risk_level: "low",
    last_updated: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ data: mockProjects });
}
