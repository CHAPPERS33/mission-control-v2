import { supabaseAdmin } from "@/lib/supabase-admin";

export interface SyncCacheRow<T = unknown> {
  key: string;
  data: T;
  updated_at: string;
  source: string;
}

export async function getSyncCache<T = unknown>(key: string): Promise<SyncCacheRow<T> | null> {
  const { data, error } = await supabaseAdmin
    .from("mc_sync_cache")
    .select("key,data,updated_at,source")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  return data as SyncCacheRow<T>;
}

export async function getSyncCaches(keys: string[]) {
  const { data, error } = await supabaseAdmin
    .from("mc_sync_cache")
    .select("key,data,updated_at,source")
    .in("key", keys);

  if (error || !data) return [];
  return data as SyncCacheRow[];
}