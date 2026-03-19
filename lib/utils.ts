import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { HealthStatus } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusColor(status: HealthStatus | string): string {
  switch (status) {
    case "healthy": return "text-status-healthy";
    case "warning": return "text-status-warning";
    case "critical": return "text-status-critical";
    default: return "text-status-unknown";
  }
}

export function statusBg(status: HealthStatus | string): string {
  switch (status) {
    case "healthy": return "bg-status-healthy/10 border-status-healthy/30";
    case "warning": return "bg-status-warning/10 border-status-warning/30";
    case "critical": return "bg-status-critical/10 border-status-critical/30";
    default: return "bg-gray-800/50 border-gray-700";
  }
}

export function statusDot(status: HealthStatus | string): string {
  switch (status) {
    case "healthy": return "bg-status-healthy";
    case "warning": return "bg-status-warning";
    case "critical": return "bg-status-critical animate-pulse";
    default: return "bg-status-unknown";
  }
}

export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function formatUKTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " UK time";
}
