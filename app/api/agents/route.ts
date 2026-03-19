import { NextResponse } from "next/server";

const mockAgents = [
  { id: "bert", name: "Bert", role: "Chief Orchestrator", current_task: "Monitoring & Delegating", last_activity: new Date(Date.now() - 120000).toISOString(), heartbeat_status: "healthy", online: true },
  { id: "atlas", name: "Atlas", role: "Strategy & Capital", current_task: "Weekly strategy review", last_activity: new Date(Date.now() - 360000).toISOString(), heartbeat_status: "healthy", online: true },
  { id: "mabel", name: "Mabel", role: "Head of Software Dev", current_task: "Building Mission Control v2", last_activity: new Date().toISOString(), heartbeat_status: "healthy", online: true },
  { id: "harold", name: "Harold", role: "Code Review", current_task: null, last_activity: new Date(Date.now() - 7200000).toISOString(), heartbeat_status: "healthy", online: false },
  { id: "ernie", name: "Ernie", role: "Research & Validation", current_task: null, last_activity: new Date(Date.now() - 3600000).toISOString(), heartbeat_status: "healthy", online: false },
  { id: "pip", name: "Pip", role: "Content Strategy", current_task: null, last_activity: new Date(Date.now() - 14400000).toISOString(), heartbeat_status: "healthy", online: false },
  { id: "irene", name: "Irene", role: "Opportunity Scouting", current_task: "Scanning for opportunities", last_activity: new Date(Date.now() - 5400000).toISOString(), heartbeat_status: "healthy", online: true },
  { id: "percy", name: "Percy", role: "Watchdog / Reliability", current_task: "Monitoring The Beast", last_activity: new Date(Date.now() - 60000).toISOString(), heartbeat_status: "healthy", online: true },
];

export async function GET() {
  return NextResponse.json({ data: mockAgents });
}
