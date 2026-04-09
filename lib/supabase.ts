import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching the Mission Control schema
export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export interface SystemHealthRow {
  id: string;
  source: string;
  component: string;
  status: HealthStatus;
  message: string;
  last_checked: string;
  details: Record<string, unknown> | null;
}

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  current_task: string | null;
  last_activity: string;
  heartbeat_status: HealthStatus;
  online: boolean;
}

export interface TaskRow {
  id: string;
  title: string;
  status: "active" | "blocked" | "completed";
  priority: string;
  assignee_agent: string | null;
  project_id: string | null;
  blocked_reason: string | null;
  updated_at: string;
}

export interface ProjectMetricRow {
  label: string;
  value: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  category: "Active" | "Paused" | "Archived";
  summary: string;
  path: string | null;
  path_exists: boolean;
  repo_exists: boolean;
  last_updated: string;
  repo_last_commit_at: string | null;
  repo_branch: string | null;
  open_tasks: number;
  queued_tasks: number;
  blocked_tasks: number;
  completed_tasks: number;
  latest_task_title: string | null;
  source_labels: string[];
  notes: string[];
  metrics: ProjectMetricRow[];
}

export interface AlertRow {
  id: string;
  type: "system_incident" | "blocked_task" | "strategic_risk" | "critical_failure";
  source: string;
  severity: "info" | "warning" | "critical";
  message: string;
  created_at: string;
  acknowledged_at: string | null;
}

export interface IncubatorIdeaRow {
  id: string;
  title: string;
  stage: "Captured" | "Researching" | "Validating" | "Prototyping" | "Approved" | "Rejected";
  summary: string;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityRow {
  id: string;
  title: string;
  source: string;
  stage: "Discovery" | "Validation" | "Strategic Review" | "Incubation";
  value_estimate: number | null;
  notes: string | null;
  created_at: string;
}

export interface CapitalMetricRow {
  id: string;
  product: string;
  active_users: number;
  conversion_rate: number;
  revenue: number;
  growth_signal_score: number;
  period_start: string;
  last_updated: string;
}
