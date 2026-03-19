"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { relativeTime, cn } from "@/lib/utils";
import { RefreshCw, Send, Plus, Check, X, Trash2 } from "lucide-react";

interface Proposal {
  id: string;
  task: string;
  agent: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  madeBy: string;
  impact: "high" | "medium" | "low";
  createdAt: string;
}

const AGENTS = ["bert", "atlas", "mabel", "harold", "ernie", "pip", "irene", "percy"];

const impactColor: Record<string, string> = {
  high: "text-status-critical bg-status-critical/10 border-status-critical/30",
  medium: "text-status-warning bg-status-warning/10 border-status-warning/30",
  low: "text-status-healthy bg-status-healthy/10 border-status-healthy/30",
};

const statusColor: Record<string, string> = {
  pending: "text-status-warning bg-status-warning/10 border-status-warning/30",
  approved: "text-status-healthy bg-status-healthy/10 border-status-healthy/30",
  rejected: "text-status-critical bg-status-critical/10 border-status-critical/30",
};

export default function CommandPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [propCounts, setPropCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskAgent, setTaskAgent] = useState("bert");
  const [taskNotes, setTaskNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Decision modal
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decTitle, setDecTitle] = useState("");
  const [decDesc, setDecDesc] = useState("");
  const [decMadeBy, setDecMadeBy] = useState("Mark");
  const [decImpact, setDecImpact] = useState<"high" | "medium" | "low">("medium");

  const fetchAll = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch("/api/proposals"),
      fetch("/api/decisions"),
    ]);
    const p = await pRes.json();
    const d = await dRes.json();
    setProposals(p.data || []);
    setPropCounts(p.counts || { pending: 0, approved: 0, rejected: 0, total: 0 });
    setDecisions(d.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const submitTask = async () => {
    if (!taskText.trim()) return;
    setSubmitting(true);
    await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", task: taskText, agent: taskAgent, notes: taskNotes }),
    });
    setTaskText(""); setTaskAgent("bert"); setTaskNotes("");
    setShowTaskModal(false);
    setSubmitting(false);
    await fetchAll();
  };

  const updateProposal = async (id: string, status: "approved" | "rejected") => {
    await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, updates: { status } }),
    });
    await fetchAll();
  };

  const deleteProposal = async (id: string) => {
    await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await fetchAll();
  };

  const submitDecision = async () => {
    if (!decTitle.trim()) return;
    setSubmitting(true);
    await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", title: decTitle, description: decDesc, madeBy: decMadeBy, impact: decImpact }),
    });
    setDecTitle(""); setDecDesc(""); setDecMadeBy("Mark"); setDecImpact("medium");
    setShowDecisionModal(false);
    setSubmitting(false);
    await fetchAll();
  };

  const deleteDecision = async (id: string) => {
    await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await fetchAll();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Command Center</h1>
          <p className="text-xs text-text-muted mt-0.5">Task dispatch · proposals · executive decisions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDecisionModal(true)}
            className="px-3 py-1.5 rounded text-xs bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary hover:border-mint/30 transition-colors"
          >
            + Decision
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-3 py-1.5 rounded text-xs bg-mint/20 border border-mint/30 text-mint hover:bg-mint/30 transition-colors flex items-center gap-1.5"
          >
            <Send size={12} />
            Send Task
          </button>
          <button onClick={fetchAll} className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Proposal KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-status-warning">{propCounts.pending}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Pending</div>
        </div>
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-status-healthy">{propCounts.approved}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Approved</div>
        </div>
        <div className="mc-card p-3 text-center">
          <div className="text-2xl font-mono font-semibold text-status-critical">{propCounts.rejected}</div>
          <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">Rejected</div>
        </div>
      </div>

      {/* Proposals */}
      <Card
        title="Task Proposals"
        subtitle={`${propCounts.total} total`}
        action={
          <button
            onClick={() => setShowTaskModal(true)}
            className="text-xs text-mint hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Add task
          </button>
        }
      >
        <div className="space-y-0">
          {proposals.map(p => (
            <div key={p.id} className="flex items-start justify-between py-3 border-b border-bg-border last:border-0 gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary">{p.task}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">→ {p.agent}</span>
                  {p.notes && <span className="text-xs text-text-muted">· {p.notes}</span>}
                  <span className="text-xs text-text-muted">· {relativeTime(p.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn("text-xs px-1.5 py-0.5 rounded border", statusColor[p.status])}>
                  {p.status}
                </span>
                {p.status === "pending" && (
                  <>
                    <button onClick={() => updateProposal(p.id, "approved")} className="p-1 rounded hover:bg-status-healthy/10 text-text-muted hover:text-status-healthy transition-colors">
                      <Check size={12} />
                    </button>
                    <button onClick={() => updateProposal(p.id, "rejected")} className="p-1 rounded hover:bg-status-critical/10 text-text-muted hover:text-status-critical transition-colors">
                      <X size={12} />
                    </button>
                  </>
                )}
                <button onClick={() => deleteProposal(p.id)} className="p-1 rounded hover:bg-bg-border text-text-muted hover:text-status-critical transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {proposals.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">No proposals yet — send a task to an agent</div>
          )}
        </div>
      </Card>

      {/* Executive Decisions */}
      <Card
        title="Executive Decisions"
        subtitle="Logged architectural choices"
        action={
          <button
            onClick={() => setShowDecisionModal(true)}
            className="text-xs text-mint hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        }
      >
        <div className="space-y-0">
          {decisions.map(d => (
            <div key={d.id} className="flex items-start justify-between py-3 border-b border-bg-border last:border-0 gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary">{d.title}</div>
                {d.description && (
                  <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{d.description}</div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">by {d.madeBy}</span>
                  <span className="text-xs text-text-muted">· {relativeTime(d.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn("text-xs px-1.5 py-0.5 rounded border", impactColor[d.impact])}>
                  {d.impact}
                </span>
                <button onClick={() => deleteDecision(d.id)} className="p-1 rounded hover:bg-bg-border text-text-muted hover:text-status-critical transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {decisions.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">No decisions logged yet</div>
          )}
        </div>
      </Card>

      {/* Task Modal */}
      {showTaskModal && (
        <Modal title="Send Task to Agent" onClose={() => setShowTaskModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Task description</label>
              <textarea
                value={taskText}
                onChange={e => setTaskText(e.target.value)}
                placeholder="Describe the task..."
                rows={3}
                className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-mint/40 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Assign to agent</label>
              <select
                value={taskAgent}
                onChange={e => setTaskAgent(e.target.value)}
                className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint/40"
              >
                {AGENTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Notes (optional)</label>
              <input
                type="text"
                value={taskNotes}
                onChange={e => setTaskNotes(e.target.value)}
                placeholder="Priority, context..."
                className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-mint/40"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={submitTask}
                disabled={!taskText.trim() || submitting}
                className="px-4 py-2 rounded text-sm bg-mint/20 border border-mint/30 text-mint hover:bg-mint/30 transition-colors disabled:opacity-40"
              >
                {submitting ? "Queuing..." : "Queue as Proposal"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <Modal title="Log Executive Decision" onClose={() => setShowDecisionModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Decision title</label>
              <input
                type="text"
                value={decTitle}
                onChange={e => setDecTitle(e.target.value)}
                placeholder="Short title..."
                className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-mint/40"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Description</label>
              <textarea
                value={decDesc}
                onChange={e => setDecDesc(e.target.value)}
                placeholder="Context and rationale..."
                rows={2}
                className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-mint/40 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Made by</label>
                <input
                  type="text"
                  value={decMadeBy}
                  onChange={e => setDecMadeBy(e.target.value)}
                  className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint/40"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Impact</label>
                <select
                  value={decImpact}
                  onChange={e => setDecImpact(e.target.value as "high" | "medium" | "low")}
                  className="w-full bg-bg-border border border-bg-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint/40"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDecisionModal(false)} className="px-4 py-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={submitDecision}
                disabled={!decTitle.trim() || submitting}
                className="px-4 py-2 rounded text-sm bg-mint/20 border border-mint/30 text-mint hover:bg-mint/30 transition-colors disabled:opacity-40"
              >
                {submitting ? "Saving..." : "Log Decision"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="mc-card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
