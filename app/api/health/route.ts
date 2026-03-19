import { NextResponse } from "next/server";

// Mock data — replace with Supabase query when tables exist
const mockHealth = [
  { id: "1", source: "Percy", component: "OpenClaw Gateway", status: "healthy", message: "Running normally", last_checked: new Date().toISOString() },
  { id: "2", source: "Percy", component: "The Beast (mccha)", status: "healthy", message: "CPU 12%, RAM 62%", last_checked: new Date().toISOString() },
  { id: "3", source: "Percy", component: "Supabase AMC", status: "healthy", message: "Connected, 43 tables", last_checked: new Date().toISOString() },
  { id: "4", source: "Percy", component: "Supabase Cirrus", status: "healthy", message: "Connected", last_checked: new Date().toISOString() },
  { id: "5", source: "Percy", component: "Vercel (AMC DUC)", status: "healthy", message: "Deployed, all checks passing", last_checked: new Date().toISOString() },
  { id: "6", source: "Percy", component: "WhatsApp Relay", status: "healthy", message: "Online, 0 queue", last_checked: new Date().toISOString() },
  { id: "7", source: "Percy", component: "Telegram Bot", status: "healthy", message: "Active, responding", last_checked: new Date().toISOString() },
  { id: "8", source: "Percy", component: "Discord Bots", status: "healthy", message: "8/8 agents connected", last_checked: new Date().toISOString() },
];

export async function GET() {
  // TODO: when Supabase tables exist:
  // const { data, error } = await supabase.from("system_health").select("*").order("last_checked", { ascending: false });
  return NextResponse.json({ data: mockHealth });
}
