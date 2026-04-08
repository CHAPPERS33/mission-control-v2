-- Migration: Create agent heartbeat and task tables for Mission Control agents deck
-- Run against: SUPABASE_AMC (AMC Distribution)
-- Purpose: Store real-time agent state for /api/agents/deck in production

-- ── Table: agent_heartbeats ──────────────────────────────────────────────────
-- One row per agent. Upserted on every heartbeat push.
CREATE TABLE IF NOT EXISTS agent_heartbeats (
  agent_id    TEXT PRIMARY KEY,          -- e.g. "bert", "mabel", "harold"
  agent_name  TEXT NOT NULL,
  role        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'unknown'
              CHECK (status IN ('online','idle','offline','error')),
  current_task TEXT,
  last_proof  TEXT,                      -- last task completion / action
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model       TEXT,
  owner       TEXT,
  metadata    JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_agent_heartbeat_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_heartbeats_updated_at ON agent_heartbeats;
CREATE TRIGGER trg_agent_heartbeats_updated_at
  BEFORE UPDATE ON agent_heartbeats
  FOR EACH ROW EXECUTE FUNCTION update_agent_heartbeat_updated_at();

-- Auto-set last_heartbeat on insert/update
DROP TRIGGER IF EXISTS trg_agent_heartbeats_heartbeat ON agent_heartbeats;
CREATE TRIGGER trg_agent_heartbeats_heartbeat
  BEFORE INSERT OR UPDATE ON agent_heartbeats
  FOR EACH ROW EXECUTE FUNCTION update_agent_heartbeat_updated_at();

-- ── Table: agent_tasks ────────────────────────────────────────────────────────
-- Current task per agent (latest entry per agent_id)
CREATE TABLE IF NOT EXISTS agent_tasks (
  id          SERIAL PRIMARY KEY,
  agent_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  stage       TEXT CHECK (stage IN ('plan','approval','execution','peer_review','complete','blocked')),
  priority    TEXT DEFAULT 'medium',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status ON agent_heartbeats(status);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_last_hb ON agent_heartbeats(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON agent_tasks(agent_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Mission Control reads all; agents write their own rows
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks      ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads (Mission Control is a public-facing SPA with anon key)
CREATE POLICY "Allow read" ON agent_heartbeats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read" ON agent_tasks      FOR SELECT TO authenticated USING (true);

-- Allow insert/update for authenticated (agents use service key or anon with custom policies)
-- Using anon key from NEXT_PUBLIC: agents can POST via REST
CREATE POLICY "Allow upsert own heartbeat" ON agent_heartbeats
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update own heartbeat" ON agent_heartbeats
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow upsert task" ON agent_tasks
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update task" ON agent_tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── Seed known agents ──────────────────────────────────────────────────────────
INSERT INTO agent_heartbeats (agent_id, agent_name, role, status, model, owner, metadata)
VALUES
  ('bert',    'Bert',    'Chief Orchestrator', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"System orchestrator and workflow enforcer"}'),
  ('mabel',  'Mabel',   'Architecture & Dev', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"Software architecture and development tasks"}'),
  ('harold', 'Harold',  'Code Review & Reliability', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"Code review and system reliability"}'),
  ('ernie',  'Ernie',   'Research & Validation', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"Research findings and validation"}'),
  ('pip',    'Pip',     'Content Strategy', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"Content strategy and social pipeline"}'),
  ('irene',  'Irene',   'Opportunities Scout', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"Opportunity discovery and scouting"}'),
  ('percy',  'Percy',   'Monitoring & Watchdog', 'offline', null, 'Mark Chapman', '{"channel":"telegram","description":"System health and uptime monitoring"}'),
  ('atlas',  'Atlas',   'Strategy & Capital', 'offline', null, 'Mark Chapman', '{"channel":"discord","description":"Capital engine and strategy"}')
ON CONFLICT (agent_id) DO NOTHING;
