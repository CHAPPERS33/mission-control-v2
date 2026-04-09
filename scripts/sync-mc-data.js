const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_AMC_URL;
const SUPABASE_KEY = process.env.SUPABASE_AMC_SERVICE_KEY;

const HOME = process.env.USERPROFILE || process.env.HOME || 'C:/Users/mccha';
const WORKSPACE = path.join(HOME, '.openclaw', 'workspace');
const TASKBOARD_PATH = path.join(WORKSPACE, 'TASKBOARD.md');
const PROJECTS_MD_PATH = path.join(WORKSPACE, 'projects.md');
const TODO_PATH = path.join(WORKSPACE, 'TODO.md');
const DECISIONS_PATH = path.join(WORKSPACE, 'decisions.json');
const JOBS_PATH = path.join(HOME, '.openclaw', 'jobs.json');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const ARTIFACTS_DIR = path.join(WORKSPACE, 'artifacts');

const PROJECT_CONFIG = [
  {
    id: 'cirrus',
    name: 'Cirrus',
    category: 'Active',
    path: 'C:\\Users\\mccha\\OneDrive\\Documents\\cirrus_landingpage',
    summary: 'Cirrus public web presence on this machine. Source: synced repo facts + Cirrus waitlist Supabase.'
  },
  {
    id: 'amc-duc',
    name: 'AMC DUC App',
    category: 'Active',
    path: 'C:\\Users\\mccha\\OneDrive\\Documents\\amcducapp',
    summary: 'Production DUC operations app. Source: synced repo facts from Beast.'
  },
  {
    id: 'mission-control',
    name: 'Mission Control v2',
    category: 'Active',
    path: 'C:\\Users\\mccha\\OneDrive\\Documents\\mission-control-v2',
    summary: 'Internal dashboard. Source: synced repo facts + synced taskboard state.'
  },
];

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function statIso(file) {
  try { return fs.statSync(file).mtime.toISOString(); } catch { return new Date(0).toISOString(); }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function deriveProjectId(taskId, title) {
  const combined = `${taskId} ${title}`.toUpperCase();
  if (combined.includes('CIR-') || combined.startsWith('CIR')) return 'cirrus';
  if (combined.includes('MCO-') || combined.includes('MC-')) return 'mission-control';
  if (combined.includes('DUC-')) return 'amc-duc';
  if (combined.includes('INFRA-')) return 'infra';
  if (combined.includes('ARCH-')) return 'arch';
  if (combined.includes('ERNIE-')) return 'ernie';
  if (combined.includes('PERCY-')) return 'percy';
  if (combined.includes('ACTION-')) return 'ops';
  return null;
}

function derivePriority(title) {
  if (/BST|deadline/i.test(title)) return 'high';
  if (/^CIR-/i.test(title)) return 'high';
  return 'medium';
}

function extractFirstName(ownerLine) {
  const match = ownerLine.match(/\*\*Owner:\*\*\s+([A-Z][a-z]+)/);
  return match ? match[1] : null;
}

function parseTaskboard() {
  const raw = readText(TASKBOARD_PATH);
  if (!raw) return { data: [], counts: { active: 0, blocked: 0, completed: 0, queued: 0, peer_review: 0 }, updated_at: null };

  const mtime = statIso(TASKBOARD_PATH);
  const tasks = [];
  const sections = raw.split(/^## STAGE:/m);

  for (const section of sections) {
    const lines = section.split('\n');
    const stageHeaderLine = (lines[0] || '').trim().toUpperCase();

    let status = null;
    if (stageHeaderLine.startsWith('EXECUTION — AUTONOMOUS OPS') || stageHeaderLine.startsWith('EXECUTION — AUTONOMOUS')) continue;
    else if (stageHeaderLine.startsWith('EXECUTION')) status = 'active';
    else if (stageHeaderLine.startsWith('BLOCKED')) status = 'blocked';
    else if (stageHeaderLine.startsWith('APPROVED')) status = 'queued';
    else if (stageHeaderLine.startsWith('PEER REVIEW')) status = 'peer_review';
    else if (stageHeaderLine.startsWith('COMPLETE')) status = 'completed';
    else continue;

    let currentTask = null;

    const flushTask = (t) => {
      const hasOwner = t.bodyLines.some(l => /\*\*Owner:\*\*/i.test(l));
      if (!hasOwner) return;

      const headingText = t.headingLine.replace(/^###\s+/, '').trim();
      const idMatch = headingText.match(/^([A-Z][A-Z0-9-]+-\d+)\s*(?:—|-|:)?\s*/);
      const taskId = idMatch ? idMatch[1] : slugify(headingText);
      const titleText = idMatch ? headingText.slice(idMatch[0].length).trim() || headingText : headingText;

      let owner = null;
      let blockedReason = null;
      for (const line of t.bodyLines) {
        if (/\*\*Owner:\*\*/i.test(line)) owner = extractFirstName(line);
        if (/\*\*(Blocked reason|Reason):\*\*/i.test(line)) {
          const m = line.match(/\*\*(?:Blocked reason|Reason):\*\*\s*(.+)/i);
          if (m) blockedReason = m[1].trim();
        }
      }

      tasks.push({
        id: taskId.toLowerCase(),
        taskboard_id: idMatch ? idMatch[1] : null,
        title: titleText || headingText,
        status,
        priority: derivePriority(headingText),
        assignee_agent: owner,
        project_id: deriveProjectId(taskId, titleText),
        blocked_reason: blockedReason,
        updated_at: mtime,
      });
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('### ')) {
        if (currentTask) flushTask(currentTask);
        currentTask = { headingLine: line, bodyLines: [] };
      } else if (currentTask) {
        currentTask.bodyLines.push(line);
      }
    }
    if (currentTask) flushTask(currentTask);
  }

  return {
    data: tasks,
    counts: {
      active: tasks.filter(t => t.status === 'active').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      queued: tasks.filter(t => t.status === 'queued').length,
      peer_review: tasks.filter(t => t.status === 'peer_review').length,
    },
    updated_at: mtime,
  };
}

function parseTodo() {
  const content = readText(TODO_PATH) || '';
  const lines = content.split('\n');
  const items = [];
  let section = 'General';
  let idx = 0;

  for (const line of lines) {
    if (line.startsWith('# ') || line.startsWith('## ')) {
      section = line.replace(/^#+\s*/, '');
      continue;
    }
    const doneMatch = line.match(/^[-*]\s+\[x\]\s+(.+)$/i);
    const todoMatch = line.match(/^[-*]\s+\[ \]\s+(.+)$/);
    const plainMatch = line.match(/^[-*]\s+(?!\[)(.+)$/);

    let text = '';
    let done = false;
    if (doneMatch) { text = doneMatch[1]; done = true; }
    else if (todoMatch) { text = todoMatch[1]; done = false; }
    else if (plainMatch) { text = plainMatch[1]; done = false; }
    else continue;

    let priority = 'none';
    if (/🔴|high|urgent|critical|\[H\]/i.test(text)) priority = 'high';
    else if (/🟡|medium|\[M\]/i.test(text)) priority = 'medium';
    else if (/🟢|low|\[L\]/i.test(text)) priority = 'low';

    items.push({
      id: `todo-${idx++}`,
      text: text.replace(/\*\*/g, '').trim(),
      done,
      priority,
      section,
      raw: line,
    });
  }

  return {
    data: items,
    raw: content,
    sections: [...new Set(items.map(i => i.section))],
    counts: {
      total: items.length,
      done: items.filter(i => i.done).length,
      pending: items.filter(i => !i.done).length,
      high: items.filter(i => i.priority === 'high' && !i.done).length,
    },
    updated_at: statIso(TODO_PATH),
  };
}

function parseProjectRegistryNotes(projectId) {
  const raw = readText(PROJECTS_MD_PATH);
  if (!raw) return [];

  const headingMap = {
    cirrus: '## Cirrus',
    'amc-duc': '## AMC DUC App',
    'mission-control': '## Mission Control',
  };

  const heading = headingMap[projectId];
  if (!heading) return [];
  const start = raw.indexOf(heading);
  if (start === -1) return [];
  const nextHeading = raw.indexOf('\n## ', start + heading.length);
  const section = raw.slice(start, nextHeading === -1 ? undefined : nextHeading);

  return section.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- **Status:**') || line.startsWith('- **Stack:**') || line.startsWith('- **Path:**'))
    .map(line => line.replace(/^-\s*/, ''));
}

function runGit(args, cwd) {
  try {
    const { execFileSync } = require('child_process');
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
    }).trim();
  } catch {
    return null;
  }
}

function getRepoFacts(repoPath) {
  const pathExists = fs.existsSync(repoPath);
  const repoExists = pathExists && fs.existsSync(path.join(repoPath, '.git'));
  if (!repoExists) {
    const lastUpdated = pathExists ? fs.statSync(repoPath).mtime.toISOString() : new Date(0).toISOString();
    return { pathExists, repoExists, lastUpdated, repoLastCommitAt: null, repoBranch: null, commitCount: null };
  }

  const repoLastCommitAt = runGit(['log', '-1', '--format=%cI'], repoPath);
  const repoBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);
  const commitCountRaw = runGit(['rev-list', '--count', 'HEAD'], repoPath);
  const commitCount = commitCountRaw ? Number(commitCountRaw) : null;

  return {
    pathExists,
    repoExists,
    lastUpdated: repoLastCommitAt || fs.statSync(repoPath).mtime.toISOString(),
    repoLastCommitAt,
    repoBranch,
    commitCount: Number.isFinite(commitCount) ? commitCount : null,
  };
}

async function getCirrusWaitlistCount() {
  const supaUrl = process.env.SUPABASE_CIRRUS_URL;
  const supaKey = process.env.SUPABASE_CIRRUS_ANON_KEY;
  if (!supaUrl || !supaKey) return null;

  try {
    const res = await fetch(`${supaUrl}/rest/v1/waitlist?select=id`, {
      headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : null;
  } catch {
    return null;
  }
}

async function buildProjects() {
  const tasksPayload = parseTaskboard();
  const tasks = tasksPayload.data;
  const cirrusWaitlistCount = await getCirrusWaitlistCount();

  const data = PROJECT_CONFIG.map(project => {
    const repo = getRepoFacts(project.path);
    const projectTasks = tasks.filter(task => task.project_id === project.id);
    const activeTasks = projectTasks.filter(task => task.status === 'active');
    const blockedTasks = projectTasks.filter(task => task.status === 'blocked');
    const queuedTasks = projectTasks.filter(task => task.status === 'queued');
    const completedTasks = projectTasks.filter(task => task.status === 'completed' || task.status === 'peer_review');

    const metrics = [];
    if (repo.repoBranch) metrics.push({ label: 'Branch', value: repo.repoBranch });
    if (repo.commitCount !== null) metrics.push({ label: 'Commits', value: String(repo.commitCount) });
    if (project.id === 'cirrus' && cirrusWaitlistCount !== null) metrics.push({ label: 'Waitlist', value: String(cirrusWaitlistCount) });
    metrics.push({ label: 'Active tasks', value: String(activeTasks.length) });
    if (blockedTasks.length > 0) metrics.push({ label: 'Blocked', value: String(blockedTasks.length) });
    if (queuedTasks.length > 0) metrics.push({ label: 'Queued', value: String(queuedTasks.length) });

    const notes = [
      ...parseProjectRegistryNotes(project.id),
      ...(repo.pathExists ? [] : ['Path not found on Beast during sync']),
      ...(repo.repoExists ? [] : ['Git repo not found at configured path during sync']),
    ];

    return {
      id: project.id,
      name: project.name,
      category: project.category,
      summary: project.summary,
      path: project.path,
      path_exists: repo.pathExists,
      repo_exists: repo.repoExists,
      last_updated: repo.lastUpdated,
      repo_last_commit_at: repo.repoLastCommitAt,
      repo_branch: repo.repoBranch,
      open_tasks: activeTasks.length,
      queued_tasks: queuedTasks.length,
      blocked_tasks: blockedTasks.length,
      completed_tasks: completedTasks.length,
      latest_task_title: activeTasks[0]?.title || queuedTasks[0]?.title || blockedTasks[0]?.title || completedTasks[0]?.title || null,
      source_labels: project.id === 'cirrus'
        ? ['beast repo sync', 'workspace projects.md sync', 'Cirrus Supabase waitlist', 'taskboard sync']
        : ['beast repo sync', 'workspace projects.md sync', 'taskboard sync'],
      notes,
      metrics,
    };
  });

  return { data, updated_at: new Date().toISOString() };
}

function listMarkdownFiles() {
  const files = [];
  const scanDir = (dir, subPath) => {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry,
          path: path.join(subPath, entry).replace(/\\/g, '/'),
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
          isMemory: subPath.includes('memory'),
        });
      }
    } catch {}
  };
  scanDir(WORKSPACE, '');
  scanDir(MEMORY_DIR, 'memory');
  files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  return { data: files, updated_at: new Date().toISOString() };
}

function buildActivity() {
  const activities = [];
  try {
    const memFiles = fs.readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(MEMORY_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5);
    for (const f of memFiles) {
      activities.push({
        id: `mem-${f.name}`,
        timestamp: f.mtime.toISOString(),
        type: 'memory',
        message: `Memory updated: ${f.name.replace('.md', '')}`,
        source: 'workspace/memory',
      });
    }
  } catch {}

  try {
    const rootFiles = fs.readdirSync(WORKSPACE)
      .filter(f => f.endsWith('.md'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(WORKSPACE, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5);
    for (const f of rootFiles) {
      activities.push({
        id: `ws-${f.name}`,
        timestamp: f.mtime.toISOString(),
        type: 'file',
        message: `Workspace file updated: ${f.name}`,
        source: 'workspace',
      });
    }
  } catch {}

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { data: activities.slice(0, 20), updated_at: new Date().toISOString() };
}

function parseCronExpr(expr) {
  const parts = String(expr || '').trim().split(/\s+/);
  if (parts.length !== 5) return String(expr || '');
  const [min, hour, , , dow] = parts;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (min.startsWith('*/') && hour === '*') return `Every ${min.slice(2)} min`;
  if (min === '0' && hour.startsWith('*/')) return `Every ${hour.slice(2)}h`;
  if (min === '0' && hour !== '*' && dow === '*') return `Daily ${hour.padStart(2, '0')}:00`;
  if (dow !== '*' && dow !== '1-5' && dow !== '0-5') {
    const dayNum = parseInt(dow, 10);
    const dayName = Number.isNaN(dayNum) ? dow : (DAY_NAMES[dayNum] ?? dow);
    return `${dayName} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return String(expr || '');
}

function parseCronJobs() {
  try {
    const raw = fs.readFileSync(JOBS_PATH);
    const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? raw.slice(3).toString('utf8') : raw.toString('utf8');
    const parsed = JSON.parse(text);
    const jobs = Array.isArray(parsed) ? parsed : Array.isArray(parsed.jobs) ? parsed.jobs : [];
    const data = jobs.map(j => {
      const scheduleObj = j.schedule;
      const scheduleExpr = typeof scheduleObj === 'object' && scheduleObj !== null ? scheduleObj.expr || '' : String(scheduleObj || '');
      const tz = typeof scheduleObj === 'object' && scheduleObj !== null ? scheduleObj.tz || 'Europe/London' : 'Europe/London';
      return {
        id: j.id || null,
        name: j.name || 'Unnamed',
        description: j.description || j.payload?.message?.slice(0, 80) || '',
        schedule: scheduleExpr,
        scheduleHuman: parseCronExpr(scheduleExpr),
        agentId: j.agentId || null,
        enabled: j.enabled !== false,
        tz,
      };
    });
    const enabled = data.filter(j => j.enabled).length;
    return { data, summary: { total: data.length, enabled, disabled: data.length - enabled }, updated_at: statIso(JOBS_PATH) };
  } catch {
    return { data: [], summary: { total: 0, enabled: 0, disabled: 0 }, updated_at: null };
  }
}

function parseDecisions() {
  const fallback = [
    {
      id: 'd-001',
      title: 'Stay on Supabase for all projects',
      description: 'Do not swap Supabase out without exceptional reason. Confirmed cross-project.',
      madeBy: 'Mark',
      impact: 'high',
      createdAt: '2026-03-10T10:00:00.000Z',
    },
    {
      id: 'd-002',
      title: 'Mission Control v2 — Vercel deploy',
      description: 'MC v2 deploys to Vercel via git push to main. Next.js + Tailwind.',
      madeBy: 'Mabel',
      impact: 'medium',
      createdAt: '2026-03-15T14:00:00.000Z',
    },
    {
      id: 'd-003',
      title: 'Percy stays on NUC, not The Beast',
      description: 'Percy is independent watchdog — must remain on NUC. Do not migrate.',
      madeBy: 'Mark',
      impact: 'high',
      createdAt: '2026-03-12T21:00:00.000Z',
    },
  ];
  return { data: readJson(DECISIONS_PATH, fallback), updated_at: statIso(DECISIONS_PATH) };
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

function buildProofFeed() {
  const files = walk(ARTIFACTS_DIR).filter(f => /\.(md|txt|json|png|jpg|jpeg|webp)$/i.test(f.name));
  const data = files.map(f => ({
    id: f.full.toLowerCase(),
    title: f.name,
    type: /\.(md|txt|json)$/i.test(f.name) ? 'note' : 'artifact',
    relatedTo: f.full.includes('mission-control') ? 'Mission Control' : 'Workspace artifact',
    timestamp: f.stat.mtime.toISOString(),
    path: f.full,
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { data, updated_at: new Date().toISOString() };
}

async function upsert(key, data, source = 'beast-sync') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mc_sync_cache?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ key, data, source }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`mc_sync_cache ${key} upsert failed: HTTP ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

(async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_AMC_URL and SUPABASE_AMC_SERVICE_KEY required');

  const taskboard = parseTaskboard();
  const todo = parseTodo();
  const projects = await buildProjects();
  const notes = listMarkdownFiles();
  const activity = buildActivity();
  const cron = parseCronJobs();
  const decisions = parseDecisions();
  const proofFeed = buildProofFeed();

  await upsert('tasks', taskboard);
  await upsert('taskboard', taskboard);
  await upsert('todo', todo);
  await upsert('projects', projects);
  await upsert('notes', notes);
  await upsert('activity', activity);
  await upsert('cron', cron);
  await upsert('decisions', decisions);
  await upsert('proof_feed', proofFeed);

  console.log(`Synced: tasks=${taskboard.data.length}, projects=${projects.data.length}, todo=${todo.counts.pending} pending, notes=${notes.data.length}, activity=${activity.data.length}, cron=${cron.summary.total}`);
})();