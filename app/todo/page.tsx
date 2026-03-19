"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RefreshCw, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low" | "none";
  section: string;
}

interface Counts {
  total: number;
  done: number;
  pending: number;
  high: number;
}

const priorityBadge: Record<string, string> = {
  high: "text-status-critical bg-status-critical/10 border-status-critical/30",
  medium: "text-status-warning bg-status-warning/10 border-status-warning/30",
  low: "text-status-healthy bg-status-healthy/10 border-status-healthy/30",
  none: "",
};

export default function TodoPage() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, done: 0, pending: 0, high: 0 });
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/workspace/todo");
    const json = await res.json();
    setItems(json.data || []);
    setSections(json.sections || []);
    setCounts(json.counts || { total: 0, done: 0, pending: 0, high: 0 });
    if (json.error) setError(json.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = items
    .filter(i => filter === "all" ? true : filter === "pending" ? !i.done : i.done)
    .filter(i => activeSection === "all" ? true : i.section === activeSection);

  const groupedBySection = filtered.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, TodoItem[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Todo</h1>
          <p className="text-xs text-text-muted mt-0.5">From TODO.md · workspace</p>
        </div>
        <button onClick={fetch_} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-text-primary">{counts.total}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Total</div>
        </div>
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-mint">{counts.pending}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Pending</div>
        </div>
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-status-critical">{counts.high}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">High Pri</div>
        </div>
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-status-healthy">{counts.done}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Done</div>
        </div>
      </div>

      {/* Progress bar */}
      {counts.total > 0 && (
        <div className="mc-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Progress</span>
            <span className="text-xs text-text-primary font-mono">{Math.round((counts.done / counts.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-mint transition-all duration-500 rounded-full"
              style={{ width: `${(counts.done / counts.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mc-card p-3 border-status-warning/30 bg-status-warning/5 flex items-center gap-2">
          <AlertTriangle size={14} className="text-status-warning" />
          <span className="text-xs text-status-warning">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {(["pending", "all", "done"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection("all")}
            className={cn(
              "px-2 py-1 rounded text-xs transition-colors",
              activeSection === "all" ? "text-mint bg-mint/10" : "text-text-muted hover:text-text-primary"
            )}
          >
            All sections
          </button>
          {sections.map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                activeSection === s ? "text-mint bg-mint/10" : "text-text-muted hover:text-text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-text-muted text-sm">Loading...</div>}

      {/* Items */}
      {Object.entries(groupedBySection).map(([section, sectionItems]) => (
        <div key={section}>
          <h2 className="text-xs text-text-muted uppercase tracking-wide mb-3">{section}</h2>
          <Card>
            <div className="space-y-0">
              {sectionItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-bg-border last:border-0">
                  {item.done
                    ? <CheckSquare size={14} className="text-status-healthy mt-0.5 flex-shrink-0" />
                    : <Square size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm", item.done ? "line-through text-text-muted" : "text-text-primary")}>
                      {item.text}
                    </span>
                  </div>
                  {item.priority !== "none" && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border flex-shrink-0", priorityBadge[item.priority])}>
                      {item.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}

      {!loading && Object.keys(groupedBySection).length === 0 && (
        <div className="py-8 text-center text-text-muted text-sm">No items found</div>
      )}
    </div>
  );
}
