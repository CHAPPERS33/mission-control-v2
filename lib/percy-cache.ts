/**
 * lib/percy-cache.ts
 * Shared singleton for Percy health data with Supabase-backed persistence.
 * - setCache() writes to in-memory + Supabase (percy_health_cache table)
 * - getCache() reads in-memory first, falls back to Supabase on cold-starts
 * - Supabase survives serverless cold-starts — any instance can read/write
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

export interface HealthRow {
  id: string;
  component: string;
  status: "healthy" | "warning" | "critical" | "unknown" | "redirect";
  message: string;
  source: string;
  last_checked: string;
}

export interface PercyRaw {
  type: string;
  timestamp: string;
  gateway: string;
  whatsapp: string;
  amcducapp: number;
  cirrusapp: number;
  ram_pct: number;
  alerts: number;
  error?: string;
  changes_since_last?: ChangeEntry[];
  downtime_seconds?: number;
  whatsapp_last_message_seconds_ago?: number;
  last_activity?: string;
  alerts_detail?: AlertDetail[];
}

export interface ChangeEntry {
  component: string;
  from: string;
  to: string;
  at: string;
}

export interface AlertDetail {
  component: string;
  cron?: string;
  type: string;
  schedule?: string;
  interval_min?: number;
  last_run?: string;
  elapsed_min?: number;
  downtime_seconds?: number;
  state?: string;
  status?: number;
  ms?: number;
  ram_pct?: number;
  suggested_action?: string;
}

interface CacheEntry {
  data: HealthRow[];
  fetchedAt: number;
  raw: PercyRaw;
}

const SB_KEY = process.env.SUPABASE_AMC_SERVICE_KEY ?? "";
const SB_URL = "https://rnvgyuqwsduizxtozzfh.supabase.co";
const sb = SB_KEY ? createClient(SB_URL, SB_KEY, { global: { fetch: fetch as unknown as typeof globalThis.fetch } }) : null;

let cache: CacheEntry | null = null;

export function setCache(raw: PercyRaw): void {
  const ts = raw.timestamp || new Date().toISOString();
  // Build enriched health rows
  const gw = String(raw.gateway || "unknown");
  const wa = String(raw.whatsapp || "unknown");
  const ram = Number(raw.ram_pct ?? -1);
  const amc = Number(raw.amcducapp ?? 0);
  const cir = Number(raw.cirrusapp ?? 0);

  const gwHealth: HealthRow["status"] =
    gw === "healthy" ? "healthy" : gw === "degraded" ? "warning" : "critical";
  const waHealth: HealthRow["status"] =
    wa === "healthy" ? "healthy" : wa === "stalled" ? "warning" : wa === "idle" ? "healthy" : "unknown";
  const ramHealth: HealthRow["status"] =
    ram < 0 ? "unknown" : ram < 75 ? "healthy" : ram <= 85 ? "warning" : "critical";
  const amcHealth: HealthRow["status"] =
    amc >= 200 && amc <= 299 ? "healthy" : amc === 301 ? "redirect" : amc >= 300 && amc <= 399 ? "warning" : "critical";
  const cirHealth: HealthRow["status"] =
    cir >= 200 && cir <= 299 ? "healthy" : cir === 307 ? "redirect" : cir >= 300 && cir <= 399 ? "warning" : "critical";

  const gwMessage = raw.downtime_seconds
    ? `Gateway: ${gw} (downtime: ${raw.downtime_seconds}s)`
    : gw === "healthy" ? "Running normally" : `Gateway: ${gw}`;

  const data: HealthRow[] = [
    { id: "gateway", component: "OpenClaw Gateway", status: gwHealth, message: gwMessage, source: "Percy", last_checked: ts },
    { id: "whatsapp", component: "WhatsApp Relay", status: waHealth, message: wa === "stalled" ? "WhatsApp relay stalled" : wa === "idle" ? "WhatsApp idle (outside active hours)" : wa === "healthy" ? "Online" : `Status: ${wa}`, source: "Percy", last_checked: ts },
    { id: "ram", component: "The Beast (RAM)", status: ramHealth, message: ram < 0 ? "RAM: unknown" : `RAM ${ram}% used`, source: "Percy", last_checked: ts },
    { id: "amcducapp", component: "AMC DUC App", status: amcHealth, message: (amc >= 200 && amc <= 299) || amc === 301 ? `HTTP ${amc} — OK` : `HTTP ${amc}`, source: "Percy", last_checked: ts },
    { id: "cirrusapp", component: "Cirrus App", status: cirHealth, message: (cir >= 200 && cir <= 299) || cir === 307 ? `HTTP ${cir} — OK` : `HTTP ${cir}`, source: "Percy", last_checked: ts },
  ];

  // Enrich raw with changes_since_last before storing
  const alertsDetail: AlertDetail[] = (raw as PercyRaw & { alerts_detail?: AlertDetail[] }).alerts_detail ?? [];
  const rawEnriched: PercyRaw = {
    ...raw,
    changes_since_last: raw.changes_since_last ?? [],
    downtime_seconds: raw.downtime_seconds,
    whatsapp_last_message_seconds_ago: raw.whatsapp_last_message_seconds_ago,
    last_activity: raw.last_activity,
    alerts_detail: alertsDetail.map(a => ({ ...a, suggested_action: a.suggested_action ?? '' })),
  };

  cache = { data, fetchedAt: Date.now(), raw: rawEnriched };

  // Persist to Supabase — survives serverless cold-starts
  if (sb) {
    const upsertData = { key: "health", data: { data, fetchedAt: cache.fetchedAt, raw: rawEnriched }, updated_at: new Date().toISOString() };
    Promise.resolve(sb.from("percy_health_cache").upsert(upsertData)).then(
      () => {},
      (err: unknown) => { console.error("[percy-cache] Supabase upsert error:", err); }
    );
  }
}

export function getCache(): CacheEntry | null {
  return cache;
}

/**
 * Reads from Supabase if in-memory cache is empty.
 * Used by GET /api/health to survive cold-start instances.
 */
export async function getCacheFromSupabase(): Promise<CacheEntry | null> {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("percy_health_cache")
      .select("key,data,updated_at")
      .eq("key", "health")
      .single();

    if (error || !data) return null;

    const entry = data.data as CacheEntry;
    if (!entry || !entry.data || !entry.fetchedAt) return null;

    // Use Supabase data as cache if memory is empty
    if (!cache) {
      cache = entry;
      console.log("[percy-cache] Rehydrated from Supabase (age " + Math.round((Date.now() - entry.fetchedAt) / 1000) + "s)");
    }
    return entry;
  } catch (err) {
    console.error("[percy-cache] Supabase read error:", err);
    return null;
  }
}

export function getCacheOrUnknown(): {
  data: HealthRow[];
  stale: boolean;
  generated_at: string | null;
  source: string;
  cache_age_seconds: number | null;
  changes_since_last: ChangeEntry[];
  alerts_detail: AlertDetail[];
  downtime_seconds: number | null;
} {
  if (!cache) {
    return {
      data: [{
        id: "percy",
        component: "Percy",
        status: "unknown",
        message: "No health data received yet",
        source: "Percy",
        last_checked: new Date().toISOString(),
      }],
      stale: true,
      generated_at: null,
      source: "percy",
      cache_age_seconds: null,
      changes_since_last: [],
      alerts_detail: [],
      downtime_seconds: null,
    };
  }

  const age = Date.now() - cache.fetchedAt;
  const STALE_MS = 10 * 60 * 1000;
  const isStale = age > STALE_MS;
  const raw = cache.raw as PercyRaw | undefined;

  return {
    data: isStale
      ? cache.data.map(row => ({
          ...row,
          status: (row.status === "healthy" ? "unknown" : row.status) as HealthRow["status"],
          message: row.status === "healthy"
            ? `[Possibly stale — ${Math.round(age / 60000)} min old] ${row.message}`
            : row.message,
        }))
      : cache.data,
    stale: isStale,
    generated_at: new Date(cache.fetchedAt).toISOString(),
    source: "percy",
    cache_age_seconds: Math.round(age / 1000),
    changes_since_last: raw?.changes_since_last ?? [],
    alerts_detail: raw?.alerts_detail ?? [],
    downtime_seconds: raw?.downtime_seconds ?? null,
  };
}
