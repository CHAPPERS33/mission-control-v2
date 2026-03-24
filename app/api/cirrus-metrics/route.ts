import { NextResponse } from "next/server";

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  const supaUrl = process.env.SUPABASE_CIRRUS_URL;
  const supaKey = process.env.SUPABASE_CIRRUS_ANON_KEY;

  if (!supaUrl || !supaKey) {
    return NextResponse.json({ waitlist_count: null, error: "Cirrus Supabase env vars not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${supaUrl}/rest/v1/waitlist?select=id`, {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ waitlist_count: null, error: `Supabase returned ${res.status}` }, { status: 502 });
    }

    const rows = await res.json();
    return NextResponse.json({ waitlist_count: Array.isArray(rows) ? rows.length : 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ waitlist_count: null, error: message }, { status: 500 });
  }
}
