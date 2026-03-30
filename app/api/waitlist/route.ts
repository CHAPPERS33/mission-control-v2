import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xozyfywslxhjnziozzli.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_CIRRUS_ANON_KEY || '';

export async function GET() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist?select=id,email,source,position,created_at&order=created_at.desc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: Array<{ id: string; email: string; source: string; position: number; created_at: string }> = await res.json();

    const now = new Date();
    const startOfToday = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) + 'T00:00:00.000Z');

    const newToday = rows.filter(r => new Date(r.created_at) >= startOfToday);
    const total = rows.length;

    return NextResponse.json({
      total,
      newToday: newToday.length,
      recent: rows.slice(0, 10).map(r => ({
        email: r.email,
        position: r.position,
        source: r.source,
        joinedAt: r.created_at,
        isNew: new Date(r.created_at) >= startOfToday,
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
