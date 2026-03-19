"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { relativeTime, cn } from "@/lib/utils";

interface ProjectRow {
  id: string;
  name: string;
  category: string;
  current_milestone: string;
  milestone_progress: number;
  summary: string;
  risk_level: string;
  last_updated: string;
}

const riskColor: Record<string, string> = {
  low: "text-status-healthy bg-status-healthy/10 border-status-healthy/30",
  medium: "text-status-warning bg-status-warning/10 border-status-warning/30",
  high: "text-status-critical bg-status-critical/10 border-status-critical/30",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
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
        <p className="text-xs text-text-muted mt-0.5">Atlas strategy data · 5min refresh</p>
      </div>

      {categories.map(cat => {
        const catProjects = projects.filter(p => p.category === cat);
        if (catProjects.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="text-xs text-text-muted uppercase tracking-wide mb-3">{cat} — {catProjects.length}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catProjects.map(project => (
                <div key={project.id} className="mc-card p-4 hover:border-mint/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary">{project.name}</h3>
                    <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", riskColor[project.risk_level])}>
                      {project.risk_level} risk
                    </span>
                  </div>

                  <p className="text-xs text-text-muted mb-3 leading-relaxed">{project.summary}</p>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-secondary">{project.current_milestone}</span>
                      <span className="text-xs text-mint font-mono">{project.milestone_progress}%</span>
                    </div>
                    <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-mint rounded-full transition-all duration-500"
                        style={{ width: `${project.milestone_progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-text-muted">Updated {relativeTime(project.last_updated)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
