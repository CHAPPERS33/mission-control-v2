"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Capital Dashboard — Atlas-compiled product performance signals
const mockMetrics = [
  {
    product: "Cirrus",
    active_users: 847,
    conversion_rate: 18.4,
    revenue: 0,
    growth_signal_score: 72,
    stage: "Pre-revenue (MVP)",
    trend: "up",
    period: "Mar 2026",
    notes: "847 beta signups. Charlie TikTok driving organic. Convert on paid launch.",
  },
  {
    product: "AMC DUC App",
    active_users: 23,
    conversion_rate: 100,
    revenue: 0,
    growth_signal_score: 85,
    stage: "Internal Tooling",
    trend: "stable",
    period: "Mar 2026",
    notes: "23 active staff users. Zero churn. v2 in planning for Aug 2025.",
  },
];

const trendIcon = (trend: string) => {
  if (trend === "up") return <TrendingUp size={14} className="text-status-healthy" />;
  if (trend === "down") return <TrendingDown size={14} className="text-status-critical" />;
  return <Minus size={14} className="text-text-muted" />;
};

export default function CapitalPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Capital Dashboard</h1>
        <p className="text-xs text-text-muted mt-0.5">Product performance signals · Atlas compiled</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockMetrics.map(metric => (
          <Card key={metric.product} title={metric.product} subtitle={metric.stage}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <MetricCell label="Active Users" value={metric.active_users.toLocaleString()} />
              <MetricCell label="Conversion" value={`${metric.conversion_rate}%`} />
              <MetricCell label="Revenue" value={metric.revenue > 0 ? `£${metric.revenue.toLocaleString()}` : "Pre-revenue"} />
              <div className="p-3 bg-bg-secondary rounded border border-bg-border">
                <div className="text-xs text-text-muted mb-1">Growth Signal</div>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-mono font-semibold text-mint">{metric.growth_signal_score}</div>
                  {trendIcon(metric.trend)}
                </div>
                <div className="h-1.5 bg-bg-border rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-mint rounded-full" style={{ width: `${metric.growth_signal_score}%` }} />
                </div>
              </div>
            </div>
            <div className="p-3 bg-bg-secondary rounded border border-bg-border">
              <div className="text-xs text-text-muted mb-1">Atlas Note</div>
              <div className="text-xs text-text-primary leading-relaxed">{metric.notes}</div>
            </div>
            <div className="text-xs text-text-muted mt-2">{metric.period}</div>
          </Card>
        ))}
      </div>

      <Card title="North Star" subtitle="The goal">
        <div className="p-4 bg-mint/5 border border-mint/20 rounded-lg">
          <div className="text-sm text-mint font-semibold mb-1">Financial Freedom</div>
          <div className="text-xs text-text-secondary leading-relaxed">
            Cirrus is the current best shot. AMC DUC shows Mark can ship production systems at scale.
            The path: Cirrus paid launch → revenue → freedom. Atlas tracks all signals toward this goal.
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-bg-secondary rounded border border-bg-border">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="text-xl font-mono font-semibold text-text-primary">{value}</div>
    </div>
  );
}
