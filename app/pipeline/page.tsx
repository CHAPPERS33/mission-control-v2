"use client";

import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

const mockOpportunities = [
  { id: "1", title: "NHS Employee Wellness Cirrus Deal", source: "Irene", stage: "Discovery", value_estimate: 50000, notes: "NHS trust exploring vaping cessation for staff. Irene flagged via LinkedIn signal.", created_at: "2026-03-18" },
  { id: "2", title: "Evri Tier 2 Depot Expansion", source: "Atlas", stage: "Validation", value_estimate: 120000, notes: "Additional depot contract opportunity. AMC track record strong.", created_at: "2026-03-15" },
  { id: "3", title: "SaaS WA Logistics Bot", source: "Ernie", stage: "Strategic Review", value_estimate: 80000, notes: "Ernie validated market. 40+ depots without automation. Low build cost.", created_at: "2026-03-12" },
  { id: "4", title: "DUC App White-label (Incubating)", source: "Atlas", stage: "Incubation", value_estimate: 200000, notes: "Moved to incubator for full spec. High potential but 6+ month horizon.", created_at: "2026-03-10" },
];

const stages = ["Discovery", "Validation", "Strategic Review", "Incubation"];

const stageColor: Record<string, string> = {
  Discovery: "border-text-muted/40 bg-bg-secondary",
  Validation: "border-mint/30 bg-mint/5",
  "Strategic Review": "border-status-warning/30 bg-status-warning/5",
  Incubation: "border-status-healthy/30 bg-status-healthy/5",
};

const sourceColor: Record<string, string> = {
  Irene: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  Ernie: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Atlas: "text-mint bg-mint/10 border-mint/30",
};

export default function PipelinePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Opportunity Pipeline</h1>
        <p className="text-xs text-text-muted mt-0.5">Discovered by Irene · Validated by Ernie · Strategy by Atlas</p>
      </div>

      {/* Pipeline stages */}
      <div className="space-y-6">
        {stages.map(stage => {
          const opps = mockOpportunities.filter(o => o.stage === stage);
          if (opps.length === 0) return null;
          const totalValue = opps.reduce((sum, o) => sum + (o.value_estimate || 0), 0);
          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs text-text-muted uppercase tracking-wide">{stage} — {opps.length}</h2>
                <span className="text-xs text-mint font-mono">£{totalValue.toLocaleString()} est.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opps.map(opp => (
                  <div key={opp.id} className={cn("mc-card p-4 border", stageColor[stage])}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <TrendingUp size={14} className="text-mint mt-0.5 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-text-primary">{opp.title}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed mb-3">{opp.notes}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", sourceColor[opp.source] || "text-text-muted")}>
                        {opp.source}
                      </span>
                      {opp.value_estimate && (
                        <span className="text-xs text-mint font-mono">£{opp.value_estimate.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
