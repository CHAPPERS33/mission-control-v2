import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TODO_PATH = join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
  ".openclaw/workspace/TODO.md"
);

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low" | "none";
  section: string;
  raw: string;
}

function parseTodo(content: string): TodoItem[] {
  const lines = content.split("\n");
  const items: TodoItem[] = [];
  let section = "General";
  let idx = 0;

  for (const line of lines) {
    if (line.startsWith("# ") || line.startsWith("## ")) {
      section = line.replace(/^#+\s*/, "");
      continue;
    }

    const doneMatch = line.match(/^[-*]\s+\[x\]\s+(.+)$/i);
    const todoMatch = line.match(/^[-*]\s+\[ \]\s+(.+)$/);
    const plainMatch = line.match(/^[-*]\s+(?!\[)(.+)$/);

    let text = "";
    let done = false;

    if (doneMatch) { text = doneMatch[1]; done = true; }
    else if (todoMatch) { text = todoMatch[1]; done = false; }
    else if (plainMatch) { text = plainMatch[1]; done = false; }
    else continue;

    // Priority detection
    let priority: "high" | "medium" | "low" | "none" = "none";
    if (/🔴|high|urgent|critical|\[H\]/i.test(text)) priority = "high";
    else if (/🟡|medium|\[M\]/i.test(text)) priority = "medium";
    else if (/🟢|low|\[L\]/i.test(text)) priority = "low";

    items.push({
      id: `todo-${idx++}`,
      text: text.replace(/\*\*/g, "").trim(),
      done,
      priority,
      section,
      raw: line,
    });
  }

  return items;
}

export async function GET() {
  try {
    const content = readFileSync(TODO_PATH, "utf-8");
    const items = parseTodo(content);
    const sections = [...new Set(items.map(i => i.section))];
    return NextResponse.json({
      data: items,
      raw: content,
      sections,
      counts: {
        total: items.length,
        done: items.filter(i => i.done).length,
        pending: items.filter(i => !i.done).length,
        high: items.filter(i => i.priority === "high" && !i.done).length,
      },
    });
  } catch {
    return NextResponse.json({
      data: [],
      raw: "",
      sections: [],
      counts: { total: 0, done: 0, pending: 0, high: 0 },
      error: "TODO.md not found",
    });
  }
}
