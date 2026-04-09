const projectRef = 'rnvgyuqwsduizxtozzfh';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

const statements = [
  `CREATE TABLE IF NOT EXISTS public.mc_sync_cache (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'beast-sync'
  );`,
  `CREATE OR REPLACE FUNCTION public.update_mc_sync_cache_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS trg_mc_sync_cache_updated_at ON public.mc_sync_cache;`,
  `CREATE TRIGGER trg_mc_sync_cache_updated_at
   BEFORE UPDATE ON public.mc_sync_cache
   FOR EACH ROW EXECUTE FUNCTION public.update_mc_sync_cache_updated_at();`,
  `ALTER TABLE public.mc_sync_cache ENABLE ROW LEVEL SECURITY;`,
  `CREATE POLICY "mc_sync_cache_read_anon" ON public.mc_sync_cache FOR SELECT TO anon USING (true);`,
  `CREATE POLICY "mc_sync_cache_read_auth" ON public.mc_sync_cache FOR SELECT TO authenticated USING (true);`
];

async function runStatement(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

(async () => {
  for (const [i, sql] of statements.entries()) {
    const result = await runStatement(sql);
    if (!result.ok && !/already exists|duplicate/i.test(result.text)) {
      console.error(`[FAIL ${i + 1}] HTTP ${result.status}: ${result.text}`);
      process.exit(1);
    }
    console.log(`[OK ${i + 1}] ${result.status}`);
  }
})();