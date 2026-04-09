"use client";

import { useEffect, useState, useCallback } from "react";
import { relativeTime } from "@/lib/utils";

interface ProjectMetric {
  label: string;
  value: string;
}

interface ProjectRow {
  id: string;
  name: string;
  category: string;
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
  metrics: ProjectMetric[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects", { cache: "no-store" });
    const json = await res.json();
    setProjects(json.data || []);
  }, []);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 300000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  const categories = ["Active", "Paused", "Archived"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Project Portfolio</h1>
        <p className="text-xs text-text-muted mt-0.5">Live filesystem and taskboard data · 5min refresh</p>
      </div>

      {categories.map((cat) => {
        const catProjects = projects.filter((p) => p.category === cat);
        if (catProjects.length === 0) return null;

        return (
          <div key={cat}>
            <h2 className="text-xs text-text-muted uppercase tracking-wide mb-3">
              {cat} — {catProjects.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catProjects.map((project) => (
                <div key={project.id} className="mc-card p-4 hover:border-mint/20 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">{project.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded border border-bg-border text-text-muted">
                      {project.repo_exists ? "repo live" : "repo missing"}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">{project.summary}</p>

                  {project.metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {project.metrics.map((metric) => (
                        <div key={`${project.id}-${metric.label}`} className="rounded border border-bg-border px-2 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-text-muted">{metric.label}</div>
                          <div className="text-sm font-medium text-text-primary">{metric.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-text-secondary">
                    {project.latest_task_title && (
                      <div>
                        <span className="text-text-muted">Latest task:</span> {project.latest_task_title}
                      </div>
                    )}
                    {project.path && (
                      <div className="break-all">
                        <span className="text-text-muted">Path:</span> {project.path}
                      </div>
                    )}
                    <div>
                      <span className="text-text-muted">Updated:</span> {relativeTime(project.last_updated)}
                    </div>
                  </div>

                  {project.source_labels.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1">Sources</div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.source_labels.map((source) => (
                          <span
                            key={`${project.id}-${source}`}
                            className="text-[11px] px-2 py-0.5 rounded bg-bg-border text-text-secondary"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.notes.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1">Registry notes</div>
                      <ul className="space-y-1 text-xs text-text-secondary list-disc pl-4">
                        {project.notes.map((note, index) => (
                          <li key={`${project.id}-note-${index}`}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
