import { NextResponse } from "next/server";

const mockAlerts = [
  {
    id: "a1",
    type: "system_incident",
    source: "Percy",
    severity: "warning",
    message: "Mission Control v1 (NUC) not accessible — v2 build in progress",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    acknowledged_at: null,
  },
];

export async function GET() {
  return NextResponse.json({ data: mockAlerts });
}
