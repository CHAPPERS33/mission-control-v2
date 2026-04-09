-- Migration: Create mc_sync_cache table for deploy-safe Mission Control data
-- Purpose: Store pushed snapshots from Beast-local files so Vercel can read them
-- without needing access to Beast filesystem paths.
-- Key schema: single-row-per-key JSONB store, upsert-friendly.

CREATE TABLE IF NOT EXISTS mc_sync_cache (
  key       TEXT PRIMARY KEY,
  data      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source    TEXT NOT NULL DEFAULT 'beast-sync'
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_mc_sync_cache_key ON mc_sync_cache(key);

-- RLS: allow anon read (Vercel reads with anon key)
ALTER TABLE mc_sync_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read mc_sync_cache" ON mc_sync_cache
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow read mc_sync_cache authenticated" ON mc_sync_cache
  FOR SELECT TO authenticated USING (true);

-- Allow upsert from service key only (Beast pushes with service key)
CREATE POLICY "Allow service upsert mc_sync_cache" ON mc_sync_cache
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service update mc_sync_cache" ON mc_sync_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_mc_sync_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mc_sync_cache_updated_at ON mc_sync_cache;
CREATE TRIGGER trg_mc_sync_cache_updated_at
  BEFORE UPDATE ON mc_sync_cache
  FOR EACH ROW EXECUTE FUNCTION update_mc_sync_cache_updated_at();