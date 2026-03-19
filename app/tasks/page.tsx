"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, cn } from "@/lib/utils";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_agent: string | null;
  project_id: string | null;
  blocked_reason: string | null;
  updated_at: string;
}

const priorityColor: Record<string, string> = {
  high: "text-status-critical",
  medium: "text-status-warning",
  low: "text-text-muted",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [counts, setCounts] = useState({ active: 0, blocked: 0, completed: 0 });
  const [filter, setFilter] = useState<string>("all");

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const json = await res.json();
    setTasks(json.data || []);
    setCounts(json.counts || { active: 0, blocked: 0, completed: 0 });
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Task Overview</h1>
        <p className="text-xs text-text-muted mt-0.5">Execution progress · 60s refresh</p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="mc-card p-4 text-center cursor-pointer hover:border-mint/30 transition-colors" onClick={() => setFilter("active")}>
          <div className="text-3xl font-mono font-semibold text-mint">{counts.active}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Active</div>
        </div>
        <div className="mc-card p-4 text-center cursor-pointer hover:border-status-critical/30 transition-colors" onClick={() => setFilter("blocked")}>
          <div className="text-3xl font-mono font-semibold text-status-critical">{counts.blocked}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Blocked</div>
        </div>
        <div className="mc-card p-4 text-center cursor-pointer hover:border-status-healthy/30 transition-colors" onClick={() => setFilter("completed")}>
          <div className="text-3xl font-mono font-semibold text-status-healthy">{counts.completed}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Completed</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "active", "blocked", "completed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors",
              filter === f ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Card title={`Tasks — ${filtered.length}`}>
        <div className="space-y-0">
          {filtered.map(task => (
            <div key={task.id} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">
                  <StatusBadge status={task.status} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-text-primary font-medium">{task.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted font-mono">{task.id}</span>
                    {task.assignee_agent && <span className="text-xs text-text-muted">· {task.assignee_agent}</span>}
                    {task.project_id && <span className="text-xs text-text-muted">· {task.project_id}</span>}
                  </div>
                  {task.blocked_reason && (
                    <div className="text-xs text-status-critical mt-1">⚠ {task.blocked_reason}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className={cn("text-xs font-medium", priorityColor[task.priority] || "text-text-muted")}>
                  {task.priority}
                </span>
                <span className="text-xs text-text-muted">{relativeTime(task.updated_at)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">No tasks found</div>
          )}
        </div>
      </Card>
    </div>
  );
}
