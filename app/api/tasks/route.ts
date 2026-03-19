import { NextResponse } from "next/server";

const mockTasks = [
  { id: "mco-001", title: "Mission Control Phase 2", status: "active", priority: "high", assignee_agent: "Mabel", project_id: "mission-control", blocked_reason: null, updated_at: new Date().toISOString() },
  { id: "mco-002", title: "Cirrus Landing Page Updates", status: "active", priority: "medium", assignee_agent: "Mabel", project_id: "cirrus", blocked_reason: null, updated_at: new Date().toISOString() },
  { id: "cir-001", title: "Cirrus MVP — Puff Logging", status: "active", priority: "high", assignee_agent: "Mabel", project_id: "cirrus", blocked_reason: null, updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "amc-001", title: "AMC DUC v2 Planning", status: "active", priority: "medium", assignee_agent: "Atlas", project_id: "amc-duc", blocked_reason: null, updated_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "sys-001", title: "Beast Health Check Cron", status: "completed", priority: "low", assignee_agent: "Percy", project_id: null, blocked_reason: null, updated_at: new Date(Date.now() - 86400000).toISOString() },
];

export async function GET() {
  const active = mockTasks.filter(t => t.status === "active").length;
  const blocked = mockTasks.filter(t => t.status === "blocked").length;
  const completed = mockTasks.filter(t => t.status === "completed").length;
  return NextResponse.json({ data: mockTasks, counts: { active, blocked, completed } });
}
