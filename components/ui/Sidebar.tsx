"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckSquare,
  FolderOpen,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Bot,
  Bell,
  LayoutDashboard,
  Clock,
  Puzzle,
  ListTodo,
  Monitor,
  FileText,
  Terminal,
  Shield,
  GitBranch,
  Zap,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/health", label: "System Health", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/tokens", label: "Tokens", icon: Zap },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/incubator", label: "Incubator", icon: Lightbulb },
  { href: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { href: "/capital", label: "Capital", icon: DollarSign },
  { href: "/waitlist", label: "Waitlist", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/command", label: "Command", icon: Terminal },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/west-ham", label: "West Ham ⚒️", icon: Shield },
  { href: "/cron", label: "Cron Jobs", icon: Clock },
  { href: "/skills", label: "Skills", icon: Puzzle },
  { href: "/timeline", label: "Timeline", icon: GitBranch },
  { href: "/todo", label: "Todo", icon: ListTodo },
  { href: "/system", label: "System", icon: Monitor },
  { href: "/notes", label: "Notes", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 lg:w-56 bg-bg-secondary border-r border-bg-border z-40 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-mint/20 border border-mint/40 flex items-center justify-center flex-shrink-0">
            <span className="text-mint text-xs font-bold">MC</span>
          </div>
          <span className="hidden lg:block text-sm font-semibold text-text-primary tracking-wide">
            Mission Control
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-mint/15 text-mint border border-mint/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-bg-border">
        <div className="hidden lg:flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-status-healthy animate-pulse-slow" />
          <span className="text-xs text-text-muted">System Online</span>
        </div>
      </div>
    </aside>
  );
}
