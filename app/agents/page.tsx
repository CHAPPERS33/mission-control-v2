"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime, cn } from "@/lib/utils";
import { RefreshCw, Bot } from "lucide-react";

interface AgentRow {
  id: string;
  name: string;
  role: string;
  current_task: string | null;
  last_activity: string;
  heartbeat_status: string;
  online: boolean;
}

const agentEmoji: Record<string, string> = {
  bert: "🤖", atlas: "🗺️", mabel: "🏗️", harold: "🔍",
  ernie: "🔬", pip: "📣", irene: "🎯", percy: "👁️",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/agents");
    const json = await res.json();
    setAgents(json.data || []);
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const online = agents.filter(a => a.online);
  const offline = agents.filter(a => !a.online);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Agent Status</h1>
          <p className="text-xs text-text-muted mt-0.5">{online.length}/{agents.length} agents online · Last: {lastRefresh}</p>
        </div>
        <button onClick={fetchAgents} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading && <div className="text-text-muted text-sm">Loading...</div>}

      {/* Online agents */}
      {online.length > 0 && (
        <div>
          <h2 className="text-xs text-text-muted uppercase tracking-wide mb-3">Online — {online.length}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {online.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </div>
      )}

      {/* Offline agents */}
      {offline.length > 0 && (
        <div>
          <h2 className="text-xs text-text-muted uppercase tracking-wide mb-3">Offline — {offline.length}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offline.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentRow }) {
  const emoji = agentEmoji[agent.id] || "🤖";
  return (
    <div className="mc-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-mint/10 border border-mint/20 flex items-center justify-center text-lg">
              {emoji}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-card",
              agent.online ? "bg-status-healthy" : "bg-status-unknown"
            )} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">{agent.name}</div>
            <div className="text-xs text-text-muted">{agent.role}</div>
          </div>
        </div>
        <StatusBadge status={agent.heartbeat_status} label={agent.online ? "Online" : "Offline"} />
      </div>

      <div className="mt-3 pt-3 border-t border-bg-border">
        <div className="text-xs text-text-muted">Current Task</div>
        <div className="text-xs text-text-primary mt-0.5">
          {agent.current_task ?? <span className="text-text-muted italic">Idle</span>}
        </div>
      </div>

      <div className="mt-2 text-xs text-text-muted">
        Last activity: {relativeTime(agent.last_activity)}
      </div>
    </div>
  );
}
