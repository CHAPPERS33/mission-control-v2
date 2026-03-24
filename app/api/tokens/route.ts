import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const AGENTS_BASE = "C:\\Users\\mccha\\.openclaw\\agents";
const AGENT_IDS = ["bert", "atlas", "mabel", "harold", "ernie", "pip", "irene", "percy"];
const CACHE_TTL_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenResponse {
  source: "session_jsonl";
  is_estimate: boolean;
  partial: boolean;
  cache_age_ms: number;
  data_from: string;
  today: {
    date: string;
    tokens_in: number;
    tokens_out: number;
    tokens_cached: number;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
    most_expensive_session: {
      session_id: string;
      agent: string;
      model: string;
      cost_usd: number;
      tokens_total: number;
    } | null;
  };
  trend: Array<{
    date: string;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  by_agent: Array<{
    agent: string;
    model: string;
    provider: string;
    tokens_in: number;
    tokens_out: number;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    tokens_total: number;
    cost_usd: number;
    session_count: number;
  }>;
  recent_events: Array<{
    ts: string;
    agent: string;
    model: string;
    provider: string;
    tokens_total: number;
    cost_usd: number;
    session_id: string;
  }>;
}

let cache: { data: TokenResponse; fetchedAt: number } | null = null;

function isoDate(ts: string | number | undefined): string {
  if (!ts) return "";
  if (typeof ts === "number") {
    // Unix ms
    return new Date(ts).toISOString().slice(0, 10);
  }
  // ISO string
  return String(ts).slice(0, 10);
}

function toISO(ts: string | number | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "number") return new Date(ts).toISOString();
  return String(ts);
}

async function scanTokens(): Promise<TokenResponse> {
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const cutoff = now - SEVEN_DAYS_MS;

  // date → aggregated daily totals
  const dailyMap = new Map<string, {
    tokens_in: number; tokens_out: number; tokens_cached: number;
    tokens_total: number; cost_usd: number; sessions: Set<string>;
  }>();

  // agentId → today totals
  const agentMap = new Map<string, {
    model: string; provider: string;
    tokens_in: number; tokens_out: number;
    tokens_total: number; cost_usd: number;
    sessions: Set<string>;
  }>();

  // modelKey → today totals
  const modelMap = new Map<string, {
    model: string; provider: string;
    tokens_total: number; cost_usd: number;
    sessions: Set<string>;
  }>();

  // today session cost tracking: sessionId → { agent, model, cost, tokens }
  const sessionCostMap = new Map<string, {
    agent: string; model: string; cost_usd: number; tokens_total: number;
  }>();

  const recentEvents: Array<{
    ts: string; agent: string; model: string; provider: string;
    tokens_total: number; cost_usd: number; session_id: string;
    _sortTs: number;
  }> = [];

  let is_estimate = false;
  let partial = false;

  for (const agentId of AGENT_IDS) {
    const sessionsDir = join(AGENTS_BASE, agentId, "sessions");
    let files: string[];
    try {
      files = await readdir(sessionsDir);
    } catch {
      // Agent dir may not exist — skip silently
      continue;
    }

    const jsonlFiles = files.filter(f => f.endsWith(".jsonl"));

    for (const filename of jsonlFiles) {
      const filePath = join(sessionsDir, filename);

      // Coarse mtime filter
      try {
        const st = await stat(filePath);
        if (st.mtimeMs < cutoff) continue;
      } catch {
        partial = true;
        continue;
      }

      // The session_id is the filename without extension
      const sessionId = filename.replace(".jsonl", "");

      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        partial = true;
        continue;
      }

      const lines = content.split("\n").filter(l => l.trim());
      const seenIds = new Set<string>();

      for (const line of lines) {
        let record: any;
        try {
          record = JSON.parse(line);
        } catch {
          // Bad line — skip
          continue;
        }

        // Filter: type=message, role=assistant, usage exists
        if (
          record.type !== "message" ||
          record.message?.role !== "assistant" ||
          !record.message?.usage
        ) continue;

        // Deduplication within file
        const recordId = record.id;
        if (recordId && seenIds.has(recordId)) continue;
        if (recordId) seenIds.add(recordId);

        const usage = record.message.usage;
        const tokens_in = usage.input ?? 0;
        const tokens_out = usage.output ?? 0;
        const tokens_cached = usage.cacheRead ?? 0;
        const tokens_total = usage.totalTokens ?? (tokens_in + tokens_out);
        const cost_usd = usage.cost?.total ?? 0;
        const model: string = record.message.model ?? "unknown";
        const provider: string = record.message.provider ?? "unknown";

        // Timestamp for bucketing — prefer outer timestamp
        const tsStr = record.timestamp ?? record.message?.timestamp;
        const dateStr = isoDate(tsStr);
        const isoStr = toISO(tsStr);
        const sortTs = tsStr
          ? (typeof tsStr === "number" ? tsStr : new Date(tsStr).getTime())
          : now;

        if (!dateStr) continue;

        // is_estimate: cost=0 but provider is anthropic/openai
        if (cost_usd === 0 && (provider === "anthropic" || provider === "openai")) {
          is_estimate = true;
        }

        // Daily map (7-day window)
        if (sortTs >= cutoff) {
          if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, {
              tokens_in: 0, tokens_out: 0, tokens_cached: 0,
              tokens_total: 0, cost_usd: 0, sessions: new Set(),
            });
          }
          const day = dailyMap.get(dateStr)!;
          day.tokens_in += tokens_in;
          day.tokens_out += tokens_out;
          day.tokens_cached += tokens_cached;
          day.tokens_total += tokens_total;
          day.cost_usd += cost_usd;
          day.sessions.add(sessionId);
        }

        // Today-only aggregations
        if (dateStr === todayStr) {
          // By agent
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              model, provider,
              tokens_in: 0, tokens_out: 0, tokens_total: 0,
              cost_usd: 0, sessions: new Set(),
            });
          }
          const ag = agentMap.get(agentId)!;
          ag.tokens_in += tokens_in;
          ag.tokens_out += tokens_out;
          ag.tokens_total += tokens_total;
          ag.cost_usd += cost_usd;
          ag.sessions.add(sessionId);
          // Update model to latest seen
          ag.model = model;
          ag.provider = provider;

          // By model
          const modelKey = `${provider}:${model}`;
          if (!modelMap.has(modelKey)) {
            modelMap.set(modelKey, {
              model, provider,
              tokens_total: 0, cost_usd: 0, sessions: new Set(),
            });
          }
          const md = modelMap.get(modelKey)!;
          md.tokens_total += tokens_total;
          md.cost_usd += cost_usd;
          md.sessions.add(sessionId);

          // Session cost tracking (today)
          const existing = sessionCostMap.get(sessionId);
          if (!existing) {
            sessionCostMap.set(sessionId, { agent: agentId, model, cost_usd, tokens_total });
          } else {
            existing.cost_usd += cost_usd;
            existing.tokens_total += tokens_total;
          }
        }

        // Recent events (collect all, trim later)
        recentEvents.push({
          ts: isoStr,
          agent: agentId,
          model,
          provider,
          tokens_total,
          cost_usd,
          session_id: sessionId,
          _sortTs: sortTs,
        });
      }
    }
  }

  // Build trend (sorted by date ascending)
  const trendDates = Array.from(dailyMap.keys()).sort();
  const trend = trendDates.map(date => {
    const d = dailyMap.get(date)!;
    return {
      date,
      tokens_total: d.tokens_total,
      cost_usd: Math.round(d.cost_usd * 10000) / 10000,
      session_count: d.sessions.size,
    };
  });

  const data_from = trendDates[0] ?? todayStr;

  // Today summary — all six fields from dailyMap for a single consistent source
  const todayDay = dailyMap.get(todayStr);
  const todayTokensIn = todayDay?.tokens_in ?? 0;
  const todayTokensOut = todayDay?.tokens_out ?? 0;
  const todayTokensCached = todayDay?.tokens_cached ?? 0;
  const todayTokensTotal = todayDay?.tokens_total ?? 0;
  const todayCost = todayDay?.cost_usd ?? 0;
  const todaySessions = todayDay?.sessions.size ?? 0;

  // Most expensive session today
  let mostExpensive: { session_id: string; agent: string; model: string; cost_usd: number; tokens_total: number; } | null = null;
  sessionCostMap.forEach((v, session_id) => {
    if (!mostExpensive || v.cost_usd > mostExpensive.cost_usd) {
      mostExpensive = { session_id, agent: v.agent, model: v.model, cost_usd: v.cost_usd, tokens_total: v.tokens_total };
    }
  });

  // By agent (sorted by tokens_total desc)
  const by_agent = Array.from(agentMap.entries())
    .map(([agent, v]) => ({
      agent,
      model: v.model,
      provider: v.provider,
      tokens_in: v.tokens_in,
      tokens_out: v.tokens_out,
      tokens_total: v.tokens_total,
      cost_usd: Math.round(v.cost_usd * 10000) / 10000,
      session_count: v.sessions.size,
    }))
    .sort((a, b) => b.tokens_total - a.tokens_total);

  // By model (sorted by cost_usd desc)
  const by_model = Array.from(modelMap.entries())
    .map(([, v]) => ({
      model: v.model,
      provider: v.provider,
      tokens_total: v.tokens_total,
      cost_usd: Math.round(v.cost_usd * 10000) / 10000,
      session_count: v.sessions.size,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd);

  // Recent events: sort desc, take top 20
  recentEvents.sort((a, b) => b._sortTs - a._sortTs);
  const recent_events = recentEvents.slice(0, 20).map(({ _sortTs, ...rest }) => rest);

  return {
    source: "session_jsonl",
    is_estimate,
    partial,
    cache_age_ms: 0,
    data_from,
    today: {
      date: todayStr,
      tokens_in: todayTokensIn,
      tokens_out: todayTokensOut,
      tokens_cached: todayTokensCached,
      tokens_total: todayTokensTotal,
      cost_usd: Math.round(todayCost * 10000) / 10000,
      session_count: todaySessions,
      most_expensive_session: mostExpensive,
    },
    trend,
    by_agent,
    by_model,
    recent_events,
  };
}

export async function GET() {
  try {
    const now = Date.now();

    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cache.data,
        cache_age_ms: now - cache.fetchedAt,
      });
    }

    const data = await scanTokens();
    cache = { data, fetchedAt: now };

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { source: "session_jsonl", partial: true, cache_age_ms: 0, error: err?.message ?? "Unknown error" },
      { status: 200 }
    );
  }
}
