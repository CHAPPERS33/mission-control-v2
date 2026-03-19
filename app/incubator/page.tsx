"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

// Incubator data sourced from /vault/incubator files
// TODO: wire to API route that reads vault/incubator markdown files

const mockIdeas = [
  { id: "1", title: "AI Parcel Labelling System", stage: "Researching", owner: "Atlas", summary: "Automated label verification using computer vision for AMC sorting line.", created_at: "2026-03-10" },
  { id: "2", title: "Cirrus B2B Licensing", stage: "Validating", owner: "Atlas", summary: "License Cirrus tech to other companies for employee wellness programmes.", created_at: "2026-03-12" },
  { id: "3", title: "WhatsApp Logistics Bot SaaS", stage: "Captured", owner: "Irene", summary: "Package the existing WA automation into a SaaS product for other depots.", created_at: "2026-03-15" },
  { id: "4", title: "DUC App White-label", stage: "Captured", owner: "Atlas", summary: "White-label the AMC DUC App for other courier sorting operations.", created_at: "2026-03-18" },
];

const stages = ["Captured", "Researching", "Validating", "Prototyping", "Approved", "Rejected"];

const stageColor: Record<string, string> = {
  Captured: "border-text-muted text-text-muted",
  Researching: "border-mint/50 text-mint",
  Validating: "border-status-warning/50 text-status-warning",
  Prototyping: "border-status-healthy/50 text-status-healthy",
  Approved: "border-status-healthy text-status-healthy bg-status-healthy/10",
  Rejected: "border-bg-border text-text-muted opacity-50",
};

export default function IncubatorPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Idea Incubator</h1>
        <p className="text-xs text-text-muted mt-0.5">Ideas under evaluation · sourced from /vault/incubator</p>
      </div>

      {/* Stage summary */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => {
          const count = mockIdeas.filter(i => i.stage === stage).length;
          return (
            <div key={stage} className={cn("px-3 py-1.5 rounded border text-xs font-medium", stageColor[stage])}>
              {stage} ({count})
            </div>
          );
        })}
      </div>

      {/* Kanban-style lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.filter(s => mockIdeas.some(i => i.stage === s)).map(stage => {
          const ideas = mockIdeas.filter(i => i.stage === stage);
          return (
            <Card key={stage} title={stage} subtitle={`${ideas.length} idea${ideas.length !== 1 ? "s" : ""}`}>
              <div className="space-y-3">
                {ideas.map(idea => (
                  <div key={idea.id} className="p-3 bg-bg-secondary rounded border border-bg-border hover:border-mint/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <Lightbulb size={14} className="text-mint mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-text-primary font-medium">{idea.title}</div>
                        <div className="text-xs text-text-muted mt-1 leading-relaxed">{idea.summary}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-muted">by {idea.owner}</span>
                          <span className="text-xs text-text-muted">· {idea.created_at}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
