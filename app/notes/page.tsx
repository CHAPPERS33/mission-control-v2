"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RefreshCw, FileText, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteFile {
  name: string;
  path: string;
  lastModified: string;
  size: number;
  isMemory: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Europe/London",
  });
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function renderMarkdown(md: string): string {
  // Simple markdown → HTML (no dependency)
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-text-primary mt-4 mb-2">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-mint mt-3 mb-1.5 uppercase tracking-wide">$2</h2>'.replace("$2", "$1"))
    .replace(/^### (.+)$/gm, '<h3 class="text-xs font-semibold text-text-secondary mt-2 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-text-secondary italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-bg-border px-1 py-0.5 rounded text-mint font-mono text-xs">$1</code>')
    .replace(/^[-*] \[x\] (.+)$/gm, '<div class="flex items-start gap-2 py-0.5"><span class="text-status-healthy mt-0.5">✓</span><span class="line-through text-text-muted text-sm">$1</span></div>')
    .replace(/^[-*] \[ \] (.+)$/gm, '<div class="flex items-start gap-2 py-0.5"><span class="text-text-muted mt-0.5">□</span><span class="text-text-primary text-sm">$1</span></div>')
    .replace(/^[-*] (.+)$/gm, '<div class="flex items-start gap-2 py-0.5 text-sm"><span class="text-mint mt-1 flex-shrink-0">·</span><span class="text-text-secondary">$1</span></div>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n/g, '<div class="mt-2"></div>')
    .replace(/\n/g, '<br/>');
}

export default function NotesPage() {
  const [tab, setTab] = useState<"daily" | "files">("daily");
  const [dailyDate, setDailyDate] = useState(todayStr());
  const [dailyContent, setDailyContent] = useState<string | null>(null);
  const [dailyExists, setDailyExists] = useState(false);
  const [files, setFiles] = useState<NoteFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<NoteFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchDaily = useCallback(async (date: string) => {
    setLoading(true);
    const res = await fetch(`/api/daily-note?date=${date}`);
    const json = await res.json();
    setDailyContent(json.content || null);
    setDailyExists(json.exists || false);
    setLoading(false);
  }, []);

  const fetchFiles = useCallback(async () => {
    const res = await fetch("/api/workspace/notes");
    const json = await res.json();
    setFiles(json.data || []);
  }, []);

  const fetchFileContent = useCallback(async (file: NoteFile) => {
    setSelectedFile(file);
    setLoading(true);
    const res = await fetch(`/api/workspace/notes?file=${encodeURIComponent(file.path)}`);
    const json = await res.json();
    setFileContent(json.content || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "daily") fetchDaily(dailyDate);
    else fetchFiles();
  }, [tab, dailyDate, fetchDaily, fetchFiles]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Notes</h1>
          <p className="text-xs text-text-muted mt-0.5">Daily memory logs · workspace notes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["daily", "files"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
              tab === t ? "bg-mint/20 text-mint border border-mint/30" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            )}
          >
            {t === "daily" ? "Daily Notes" : "All Files"}
          </button>
        ))}
      </div>

      {/* Daily Notes Tab */}
      {tab === "daily" && (
        <div className="space-y-4">
          {/* Date navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDailyDate(offsetDate(dailyDate, -1))}
              className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-mint" />
              <span className="text-sm text-text-primary font-medium">
                {formatDate(dailyDate + "T12:00:00Z")}
              </span>
              {dailyDate === todayStr() && (
                <span className="text-xs text-mint bg-mint/10 border border-mint/20 px-1.5 py-0.5 rounded">Today</span>
              )}
            </div>
            <button
              onClick={() => setDailyDate(offsetDate(dailyDate, 1))}
              disabled={dailyDate >= todayStr()}
              className="p-1.5 rounded text-text-secondary hover:text-mint hover:bg-mint/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setDailyDate(todayStr())}
              className="ml-auto text-xs text-text-muted hover:text-mint transition-colors"
            >
              Today
            </button>
          </div>

          {loading && <div className="text-text-muted text-sm">Loading...</div>}

          {!loading && !dailyExists && (
            <div className="mc-card p-8 text-center">
              <FileText size={32} className="text-text-muted mx-auto mb-3" />
              <div className="text-sm text-text-muted">No memory log for {formatDate(dailyDate + "T12:00:00Z")}</div>
            </div>
          )}

          {!loading && dailyExists && dailyContent && (
            <Card title={`${formatDate(dailyDate + "T12:00:00Z")} — Memory Log`}>
              <div
                className="prose-custom text-sm leading-relaxed px-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(dailyContent) }}
              />
            </Card>
          )}
        </div>
      )}

      {/* Files Tab */}
      {tab === "files" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* File list */}
          <div className="space-y-2">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Workspace Files ({files.length})</div>
            {files.map(file => (
              <button
                key={file.path}
                onClick={() => fetchFileContent(file)}
                className={cn(
                  "w-full text-left mc-card p-3 hover:border-mint/30 transition-colors",
                  selectedFile?.path === file.path ? "border-mint/40 bg-mint/5" : ""
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText size={12} className={file.isMemory ? "text-text-muted" : "text-mint"} />
                  <span className="text-xs text-text-primary font-medium truncate">{file.name}</span>
                </div>
                {file.isMemory && <span className="text-xs text-text-muted mt-0.5 block">memory/</span>}
                <div className="text-xs text-text-muted mt-0.5">
                  {formatDate(file.lastModified)}
                </div>
              </button>
            ))}
            {files.length === 0 && (
              <div className="text-xs text-text-muted">No files found</div>
            )}
          </div>

          {/* File content */}
          <div className="lg:col-span-2">
            {loading && <div className="text-text-muted text-sm">Loading...</div>}
            {selectedFile && !loading && (
              <Card title={selectedFile.name}>
                <div
                  className="prose-custom text-sm leading-relaxed px-1 max-h-[600px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }}
                />
              </Card>
            )}
            {!selectedFile && !loading && (
              <div className="mc-card p-8 text-center text-text-muted text-sm">
                Select a file to view its content
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
