-- Migration: Add taskboard_id column to agent_tasks
-- Carries the canonical taskboard id (e.g. MC-V1-AGENTS-LIVEDATA-001)
-- through the live-data pipeline so /api/agents/deck can surface it.

ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS taskboard_id TEXT;

-- Populate from existing rows (backfill the SERIAL id as a fallback)
-- The canonical id lives in the sync script; this just ensures the column
-- exists and is typed correctly for the API route.