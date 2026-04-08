// Run this ONCE to create the agent tables in Supabase AMC
// Usage: node scripts/create-agent-tables.js
// Requires: SUPABASE_ACCESS_TOKEN (PAT), SUPABASE_AMC_URL, SUPABASE_AMC_SERVICE_KEY (for REST)

const url = process.env.SUPABASE_AMC_URL;
const serviceKey = process.env.SUPABASE_AMC_SERVICE_KEY;
const pat = process.env.SUPABASE_ACCESS_TOKEN;

const projectRef = 'rnvgyuqwsduizxtozzfh';

const statements = [
  // 0: Create heartbeat table
  `CREATE TABLE IF NOT EXISTS public.agent_heartbeats (
    agent_id        TEXT PRIMARY KEY,
    agent_name      TEXT NOT NULL,
    role            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (status IN ('online','idle','offline','error')),
    current_task    TEXT,
    last_proof      TEXT,
    last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model           TEXT,
    owner           TEXT,
    metadata        JSONB DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // 1: Trigger fn
  `CREATE OR REPLACE FUNCTION public.update_hb_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;`,

  // 2: Trigger
  `DROP TRIGGER IF EXISTS trg_hb_updated ON public.agent_heartbeats;`,

  // 3: Trigger create
  `CREATE TRIGGER trg_hb_updated
    BEFORE UPDATE ON public.agent_heartbeats
    FOR EACH ROW EXECUTE FUNCTION public.update_hb_updated_at();`,

  // 4: Tasks table
  `CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id          SERIAL PRIMARY KEY,
    agent_id    TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    stage       TEXT DEFAULT 'execution'
                CHECK (stage IN ('plan','approval','execution','peer_review','complete','blocked')),
    priority    TEXT DEFAULT 'medium',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // 5: Indexes
  `CREATE INDEX IF NOT EXISTS idx_hb_status ON public.agent_heartbeats(status);`,

  // 6: Indexes
  `CREATE INDEX IF NOT EXISTS idx_hb_heartbeat ON public.agent_heartbeats(last_heartbeat);`,

  // 7: Indexes
  `CREATE INDEX IF NOT EXISTS idx_tasks_agent ON public.agent_tasks(agent_id);`,

  // 8: RLS on heartbeats
  `ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;`,

  // 9: RLS on tasks
  `ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;`,

  // 10: Policies - read
  `CREATE POLICY "heartbeats_read" ON public.agent_heartbeats FOR SELECT TO anon USING (true);`,

  // 11: Policies - insert
  `CREATE POLICY "heartbeats_insert" ON public.agent_heartbeats FOR INSERT TO anon WITH CHECK (true);`,

  // 12: Policies - update
  `CREATE POLICY "heartbeats_update" ON public.agent_heartbeats FOR UPDATE TO anon USING (true) WITH CHECK (true);`,

  // 13: Policies - tasks read
  `CREATE POLICY "tasks_read" ON public.agent_tasks FOR SELECT TO anon USING (true);`,

  // 14: Policies - tasks insert
  `CREATE POLICY "tasks_insert" ON public.agent_tasks FOR INSERT TO anon WITH CHECK (true);`,

  // 15: Policies - tasks update
  `CREATE POLICY "tasks_update" ON public.agent_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);`,

  // 16: Seed agents
  `INSERT INTO public.agent_heartbeats (agent_id, agent_name, role, status, model, owner, metadata)
  VALUES
    ('bert',    'Bert',    'Chief Orchestrator', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"System orchestrator and workflow enforcer"}'),
    ('mabel',  'Mabel',   'Architecture & Dev', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"Software architecture and development tasks"}'),
    ('harold', 'Harold',  'Code Review & Reliability', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"Code review and system reliability"}'),
    ('ernie',  'Ernie',   'Research & Validation', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"Research findings and validation"}'),
    ('pip',    'Pip',     'Content Strategy', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"Content strategy and social pipeline"}'),
    ('irene',  'Irene',   'Opportunities Scout', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"Opportunity discovery and scouting"}'),
    ('percy',  'Percy',   'Monitoring & Watchdog', 'offline', NULL, 'Mark Chapman', '{"channel":"telegram","description":"System health and uptime monitoring"}'),
    ('atlas',  'Atlas',   'Strategy & Capital', 'offline', NULL, 'Mark Chapman', '{"channel":"discord","description":"Capital engine and strategy"}')
  ON CONFLICT (agent_id) DO NOTHING;`,
];

async function runStatement(sql) {
  const body = JSON.stringify({ query: sql });
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function run() {
  let passed = 0, failed = 0;
  for (const [i, sql] of statements.entries()) {
    try {
      const result = await runStatement(sql);
      if (!result.ok) {
        // 409 = already exists (OK), others might be real errors
        if (result.status === 409 || result.text.includes('already exists') || result.text.includes('duplicate')) {
          console.log(`[SKIP ${i+1}] already exists`);
          passed++;
        } else {
          console.error(`[FAIL ${i+1}/${statements.length}] HTTP ${result.status}: ${result.text.slice(0, 300)}`);
          console.error(`  SQL: ${sql.slice(0, 100)}`);
          failed++;
        }
      } else {
        console.log(`[OK   ${i+1}/${statements.length}] passed`);
        passed++;
      }
    } catch (e) {
      console.error(`[ERR  ${i+1}] ${e.message}`);
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\nResult: ${passed} ok, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
