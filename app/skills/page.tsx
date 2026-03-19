"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RefreshCw, Package, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill {
  name: string;
  description: string;
  location: string;
  hasSkillMd: boolean;
}

interface SkillsData {
  global: Skill[];
  workspace: Skill[];
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillsData>({ global: [], workspace: [] });
  const [counts, setCounts] = useState({ global: 0, workspace: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "workspace">("workspace");
  const [query, setQuery] = useState("");

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/skills");
    const json = await res.json();
    setData(json.data || { global: [], workspace: [] });
    setCounts(json.counts || { global: 0, workspace: 0, total: 0 });
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const skills = tab === "global" ? data.global : data.workspace;
  const filtered = query
    ? skills.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase()))
    : skills;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Agent Skills</h1>
          <p className="text-xs text-text-muted mt-0.5">{counts.total} skills installed · global + workspace</p>
        </div>
        <button onClick={fetch_} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-mint">{counts.total}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Total</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-text-primary">{counts.global}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Global</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-mono font-semibold text-text-primary">{counts.workspace}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wide">Workspace</div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {(["workspace", "global"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
                tab === t ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              )}
            >
              {t} ({t === "global" ? counts.global : counts.workspace})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search skills..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="ml-auto bg-bg-card border border-bg-border rounded px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-mint/40 w-48"
        />
      </div>

      {loading && <div className="text-text-muted text-sm">Loading skills...</div>}

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(skill => (
          <div key={skill.name} className="mc-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-mint/10 border border-mint/20 flex items-center justify-center flex-shrink-0">
                <Package size={14} className="text-mint" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-text-primary">{skill.name}</div>
                  {skill.hasSkillMd && (
                    <CheckCircle size={12} className="text-status-healthy flex-shrink-0" />
                  )}
                </div>
                {skill.description ? (
                  <div className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                    {skill.description}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted mt-1 italic">No description</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-text-muted text-sm">
            {query ? `No skills matching "${query}"` : "No skills found"}
          </div>
        )}
      </div>
    </div>
  );
}
