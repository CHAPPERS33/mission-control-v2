"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Bell } from "lucide-react";

export function TopBar() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => {
      setNow(
        new Date().toLocaleString("en-GB", {
          timeZone: "Europe/London",
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UK"
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-bg-secondary border-b border-bg-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="text-text-muted text-xs font-mono">{now}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button className="relative p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors">
          <Bell size={14} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-status-critical rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-bg-border">
          <div className="w-6 h-6 rounded bg-mint/20 border border-mint/30 flex items-center justify-center">
            <span className="text-mint text-xs font-bold">M</span>
          </div>
          <span className="hidden lg:block text-xs text-text-secondary">Mark</span>
        </div>
      </div>
    </header>
  );
}
