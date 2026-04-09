import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xozyfywslxhjnziozzli.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_CIRRUS_ANON_KEY || '';

// UK timezone helpers
function startOfDayUK(): Date {
  const now = new Date();
  const ukDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return new Date(ukDate + 'T00:00:00.000Z');
}

function startOfWeekUK(): Date {
  const start = startOfDayUK();
  // Monday is start of week in UK convention
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

export const revalidate = 60; // revalidate every 60s

export async function GET() {
  try {
    // Fetch ALL rows for accurate counts (table is small — 34 entries and growing slowly)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist?select=id,email,source,position,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: Array<{
      id: string;
      email: string;
      source: string;
      position: number;
      created_at: string;
    }> = await res.json();

    const total = rows.length;

    // Time-based counts (UK timezone)
    const startOfToday = startOfDayUK();
    const startOfWeek = startOfWeekUK();

    const newToday = rows.filter(r => new Date(r.created_at) >= startOfToday).length;
    const newThisWeek = rows.filter(r => new Date(r.created_at) >= startOfWeek).length;

    // Source breakdown — only real data, no decoration
    const sourceBreakdown: Record<string, number> = {};
    for (const r of rows) {
      const src = r.source || 'unknown';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    }

    // Recent signups (last 15)
    const recent = rows.slice(0, 15).map(r => ({
      email: r.email,
      position: r.position,
      source: r.source || 'unknown',
      joinedAt: r.created_at,
      isNew: new Date(r.created_at) >= startOfToday,
      isThisWeek: new Date(r.created_at) >= startOfWeek,
    }));

    return NextResponse.json({
      total,
      newToday,
      newThisWeek,
      sourceBreakdown,
      recent,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}