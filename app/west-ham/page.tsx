"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RefreshCw, Shield, Calendar, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Fixture {
  date: string;
  opponent: string;
  venue: string;
  competition: string;
  result?: string;
  score?: string;
}

interface LeagueRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  points: number;
}

const FIXTURES: Fixture[] = [
  { date: "2026-03-22", opponent: "Manchester City", venue: "H", competition: "Premier League" },
  { date: "2026-03-29", opponent: "Arsenal", venue: "A", competition: "Premier League" },
  { date: "2026-04-05", opponent: "Brentford", venue: "H", competition: "Premier League" },
  { date: "2026-04-12", opponent: "Fulham", venue: "A", competition: "Premier League" },
  { date: "2026-04-19", opponent: "Crystal Palace", venue: "H", competition: "Premier League" },
];

const RESULTS: Fixture[] = [
  { date: "2026-03-15", opponent: "Everton", venue: "H", competition: "Premier League", result: "W", score: "2–0" },
  { date: "2026-03-08", opponent: "Wolves", venue: "A", competition: "Premier League", result: "D", score: "1–1" },
  { date: "2026-03-01", opponent: "Leicester", venue: "H", competition: "Premier League", result: "W", score: "3–1" },
  { date: "2026-02-22", opponent: "Tottenham", venue: "A", competition: "Premier League", result: "L", score: "0–2" },
  { date: "2026-02-15", opponent: "Southampton", venue: "H", competition: "Premier League", result: "W", score: "4–1" },
];

const TABLE: LeagueRow[] = [
  { position: 1, team: "Liverpool", played: 28, won: 20, drawn: 5, lost: 3, gd: 42, points: 65 },
  { position: 2, team: "Arsenal", played: 28, won: 18, drawn: 6, lost: 4, gd: 31, points: 60 },
  { position: 3, team: "Man City", played: 28, won: 16, drawn: 5, lost: 7, gd: 22, points: 53 },
  { position: 4, team: "Chelsea", played: 28, won: 15, drawn: 6, lost: 7, gd: 18, points: 51 },
  { position: 9, team: "West Ham ⚒️", played: 28, won: 11, drawn: 7, lost: 10, gd: 2, points: 40 },
];

const resultColor: Record<string, string> = {
  W: "text-status-healthy bg-status-healthy/10",
  D: "text-status-warning bg-status-warning/10",
  L: "text-status-critical bg-status-critical/10",
};

export default function WestHamPage() {
  const [tab, setTab] = useState<"fixtures" | "results" | "table">("fixtures");

  const nextFixture = FIXTURES[0];

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <span>West Ham United</span>
            <span className="text-2xl">⚒️</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Irons tracker · Premier League 2025/26</p>
        </div>
        <div className="text-xs text-text-muted font-mono">
          9th · 40 pts
        </div>
      </div>

      {/* Next fixture banner */}
      {nextFixture && (
        <div className="mc-card p-4 border-mint/30 bg-mint/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mint/10 border border-mint/20 flex items-center justify-center">
                <Calendar size={18} className="text-mint" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide">Next Match</div>
                <div className="text-sm font-semibold text-text-primary mt-0.5">
                  West Ham {nextFixture.venue === "H" ? "vs" : "@"} {nextFixture.opponent}
                </div>
                <div className="text-xs text-text-muted">
                  {nextFixture.competition} · {new Date(nextFixture.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-mint">{daysUntil(nextFixture.date)}</div>
              <div className="text-xs text-text-muted">days away</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["fixtures", "results", "table"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
              tab === t ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Fixtures */}
      {tab === "fixtures" && (
        <Card title="Upcoming Fixtures">
          <div className="space-y-0">
            {FIXTURES.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded font-medium",
                    f.venue === "H" ? "bg-mint/10 text-mint border border-mint/20" : "bg-bg-border text-text-secondary"
                  )}>
                    {f.venue === "H" ? "HOME" : "AWAY"}
                  </div>
                  <div>
                    <div className="text-sm text-text-primary font-medium">{f.opponent}</div>
                    <div className="text-xs text-text-muted">{f.competition}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-primary">
                    {new Date(f.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                  <div className="text-xs text-text-muted">{daysUntil(f.date)}d away</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      {tab === "results" && (
        <Card title="Recent Results">
          <div className="space-y-0">
            {RESULTS.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded font-bold", resultColor[r.result!] || "")}>
                    {r.result}
                  </span>
                  <div>
                    <div className="text-sm text-text-primary font-medium">
                      {r.venue === "H" ? "vs" : "@"} {r.opponent}
                    </div>
                    <div className="text-xs text-text-muted">{r.competition}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-text-primary">{r.score}</div>
                  <div className="text-xs text-text-muted">
                    {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      {tab === "table" && (
        <Card title="Premier League Table (excerpt)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-4">Team</th>
                  <th className="text-right py-2 pr-2">P</th>
                  <th className="text-right py-2 pr-2">W</th>
                  <th className="text-right py-2 pr-2">D</th>
                  <th className="text-right py-2 pr-2">L</th>
                  <th className="text-right py-2 pr-2">GD</th>
                  <th className="text-right py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map((row) => (
                  <tr
                    key={row.team}
                    className={cn(
                      "border-t border-bg-border",
                      row.team.includes("West Ham") ? "bg-mint/5 text-mint font-semibold" : "text-text-primary"
                    )}
                  >
                    <td className="py-2.5 pr-2 font-mono">{row.position}</td>
                    <td className="py-2.5 pr-4">{row.team}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">{row.played}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">{row.won}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">{row.drawn}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">{row.lost}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                    <td className="py-2.5 text-right font-mono font-bold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
