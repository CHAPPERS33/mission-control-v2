const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_AMC_URL;
const SUPABASE_KEY = process.env.SUPABASE_AMC_SERVICE_KEY;

const TASKBOARD_PATH = 'C:\\Users\\mccha\\.openclaw\\workspace\\TASKBOARD.md';
const SESSION_REGISTRY_PATH = 'C:\\Users\\mccha\\.openclaw\\workspace\\memory\\session-registry.json';
const ARTIFACTS_ROOT = 'C:\\Users\\mccha\\.openclaw\\workspace\\artifacts';

const ROSTER = [
  { id: 'bert', name: 'Bert', role: 'Chief Orchestrator', owner: 'Mark Chapman' },
  { id: 'atlas', name: 'Atlas', role: 'Head of Strategy', owner: 'Mark Chapman' },
  { id: 'mabel', name: 'Mabel', role: 'Head of Software Dev', owner: 'Mark Chapman' },
  { id: 'harold', name: 'Harold', role: 'Head Software Engineer', owner: 'Mark Chapman' },
  { id: 'ernie', name: 'Ernie', role: 'Head of Research', owner: 'Mark Chapman' },
  { id: 'pip', name: 'Pip', role: 'Head of Social Media', owner: 'Mark Chapman' },
  { id: 'irene', name: 'Irene', role: 'Head Scout', owner: 'Mark Chapman' },
  { id: 'percy', name: 'Percy', role: 'Head of Site Reliability', owner: 'Mark Chapman' },
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function parseTaskboard(raw) {
  if (!raw) return [];
  const sections = raw.split(/^## STAGE:/m);
  const tasks = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const header = (lines[0] || '').trim().toUpperCase();
    let stage = null;
    if (header.startsWith('EXECUTION — AUTONOMOUS')) continue;
    if (header.startsWith('EXECUTION')) stage = 'execution';
    else if (header.startsWith('APPROVED')) stage = 'approval';
    else if (header.startsWith('BLOCKED')) stage = 'blocked';
    else if (header.startsWith('PEER REVIEW')) stage = 'peer_review';
    else if (header.startsWith('COMPLETE')) stage = 'complete';
    else continue;

    let currentHeading = null;
    let body = [];

    const flush = () => {
      if (!currentHeading || !stage) return;
      const headingText = currentHeading.replace(/^###\s+/, '').trim();
      const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)\s*(?:—|-|:)?\s*/);
      const taskboardId = idMatch ? idMatch[1] : null;  // canonical id e.g. MC-V1-AGENTS-LIVEDATA-001
      const id = (idMatch ? idMatch[1] : headingText).toLowerCase();
      const title = idMatch ? headingText.slice(idMatch[0].length).trim() : headingText;
      const ownerLine = body.find((line) => /\*\*Owner:\*\*/i.test(line)) || '';
      const owner = ownerLine.match(/\*\*Owner:\*\*\s+([A-Za-z]+)/)?.[1] || null;
      tasks.push({ id, taskboardId, title, owner, stage });
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('### ')) {
        flush();
        currentHeading = line;
        body = [];
      } else if (currentHeading) {
        body.push(line);
      }
    }
    flush();
  }

  return tasks;
}

function walk(dir, files = []) {
  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, files);
      else files.push({ full, stat, name: entry });
    }
  } catch {}
  return files;
}

function findLatestProof(agentId) {
  const files = walk(ARTIFACTS_ROOT);
  const matches = files.filter((f) => {
    const lower = f.full.toLowerCase();
    return lower.includes(`\\${agentId}`) || lower.includes(`-${agentId}-`) || lower.includes(`_${agentId}_`) || lower.includes(`-${agentId}.`) || lower.includes(`_${agentId}.`);
  }).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (matches.length === 0) return null;
  return {
    title: matches[0].name,
    timestamp: matches[0].stat.mtime.toISOString(),
  };
}

function deriveLastHeartbeat(agentId, registryEntry) {
  if (!registryEntry) return null;
  return registryEntry.last_complete_time || registryEntry.last_ack_time || registryEntry.last_ready_time || null;
}

function deriveModel(registryEntry) {
  if (!registryEntry || !registryEntry.model) return null;
  return registryEntry.model.primary || registryEntry.model.heartbeat || null;
}

async function upsert(table, row, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${table} upsert failed: HTTP ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const registry = readJson(SESSION_REGISTRY_PATH)?.agents || {};
  const tasks = parseTaskboard(readText(TASKBOARD_PATH));

  for (const agent of ROSTER) {
    const registryEntry = registry[agent.id] || null;
    const task = tasks.find((t) => (t.owner || '').toLowerCase() === agent.name.toLowerCase() && ['execution', 'blocked', 'approved', 'peer_review'].includes(t.stage)) || null;
    const latestProof = findLatestProof(agent.id);
    const lastHeartbeat = deriveLastHeartbeat(agent.id, registryEntry) || new Date().toISOString();
    const model = deriveModel(registryEntry);

    let status = 'idle';
    if (task?.stage === 'blocked') status = 'blocked';
    else if (task?.stage === 'approval') status = 'waiting_mark';
    else if (task?.stage === 'peer_review') status = 'reviewing';
    else if (task?.stage === 'execution') status = 'active';
    else if (!registryEntry) status = 'idle';

    await upsert('agent_heartbeats', {
      agent_id: agent.id,
      agent_name: agent.name,
      role: agent.role,
      status: ['active','blocked','waiting_mark','reviewing'].includes(status) ? 'online' : 'idle',
      current_task: task?.title || null,
      last_proof: latestProof?.title || null,
      last_heartbeat: lastHeartbeat,
      model,
      owner: agent.owner,
      metadata: {
        source: 'sync-agent-data',
        agentStatus: status,
        proofTimestamp: latestProof?.timestamp || null,
      },
      updated_at: new Date().toISOString(),
    }, 'agent_id');

    if (task) {
      await upsert('agent_tasks', {
        agent_id: agent.id,
        taskboard_id: task.taskboardId || null,
        title: task.title,
        stage: task.stage,
        priority: 'medium',
        updated_at: new Date().toISOString(),
      }, 'agent_id');
    }

    console.log(`Synced ${agent.id}: status=${status}, task=${task?.title || 'none'}, proof=${latestProof?.title || 'none'}, model=${model || 'none'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
