import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join } from "path";

interface Skill {
  name: string;
  description: string;
  location: string;
  hasSkillMd: boolean;
}

function getSkillsFromPath(skillsPath: string, type: string): Skill[] {
  try {
    const entries = readdirSync(skillsPath);
    return entries
      .filter(e => {
        try {
          return statSync(join(skillsPath, e)).isDirectory();
        } catch {
          return false;
        }
      })
      .map(name => {
        const fullPath = join(skillsPath, name);
        let hasSkillMd = false;
        let description = "";
        try {
          const { readFileSync } = require("fs");
          const md = readFileSync(join(fullPath, "SKILL.md"), "utf-8");
          hasSkillMd = true;
          const descMatch = md.match(/^##?\s+.*?\n+(.*?)(\n|$)/m);
          description = descMatch ? descMatch[1].slice(0, 120) : "";
        } catch {
          hasSkillMd = false;
        }
        return { name, description, location: fullPath, hasSkillMd };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const globalPath = join(
    process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
    "AppData/Roaming/npm/node_modules/openclaw/skills"
  );
  const workspacePath = join(
    process.env.USERPROFILE || process.env.HOME || "C:/Users/mccha",
    ".openclaw/workspace/skills"
  );

  const globalSkills = getSkillsFromPath(globalPath, "global");
  const workspaceSkills = getSkillsFromPath(workspacePath, "workspace");

  return NextResponse.json({
    data: { global: globalSkills, workspace: workspaceSkills },
    counts: {
      global: globalSkills.length,
      workspace: workspaceSkills.length,
      total: globalSkills.length + workspaceSkills.length,
    },
  });
}
