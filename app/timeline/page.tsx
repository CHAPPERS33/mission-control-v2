"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, GitCommit, Rocket, Lightbulb, Activity, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "milestone" | "deploy" | "decision" | "system" | "agent";
  agent?: string;
}

const typeConfig: Record<string, { icon: React.FC<{ size?: number; className?: string }>; color: string; label: string }> = {
  milestone: { icon: Rocket, color: "text-mint border-mint/40 bg-mint/10", label: "Milestone" },
  deploy: { icon: GitCommit, color: "text-status-healthy border-status-healthy/40 bg-status-healthy/10", label: "Deploy" },
  decision: { icon: Lightbulb, color: "text-status-warning border-status-warning/40 bg-status-warning/10", label: "Decision" },
  system: { icon: Activity, color: "text-text-secondary border-bg-border bg-bg-card", label: "System" },
  agent: { icon: Bot, color: "text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10", label: "Agent" },
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/timeline");
    const json = await res.json();
    const sorted = (json.data || []).sort(
      (a: TimelineEvent, b: TimelineEvent) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setEvents(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/London",
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Timeline</h1>
          <p className="text-xs text-text-muted mt-0.5">System milestones · deploys · decisions</p>
        </div>
        <button onClick={fetch_} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading && <div className="text-text-muted text-sm">Loading timeline...</div>}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <span key={type} className={cn("text-xs px-2 py-0.5 rounded border", cfg.color)}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-bg-border" />

        <div className="space-y-6 pl-14">
          {events.map((event, i) => {
            const cfg = typeConfig[event.type] || typeConfig.system;
            const Icon = cfg.icon;
            return (
              <div key={event.id} className="relative">
                {/* dot */}
                <div className={cn(
                  "absolute -left-9 w-8 h-8 rounded-full border flex items-center justify-center",
                  cfg.color
                )}>
                  <Icon size={14} />
                </div>

                {/* card */}
                <div className="mc-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{event.title}</div>
                      {event.description && (
                        <div className="text-xs text-text-muted mt-1 leading-relaxed">{event.description}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-text-muted">{formatDate(event.date)}</div>
                      {event.agent && (
                        <div className="text-xs text-mint mt-0.5">{event.agent}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && events.length === 0 && (
          <div className="py-8 text-center text-text-muted text-sm">No timeline events found</div>
        )}
      </div>
    </div>
  );
}
