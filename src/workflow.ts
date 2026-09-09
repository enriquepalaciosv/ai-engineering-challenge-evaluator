import { readFileSync } from "node:fs";
import path from "node:path";
import type { WorkflowData } from "./types.js";

function lineValue(markdown: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`- ${escaped}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.replace(/<!--.*?-->/g, "").replace(/`/g, "").trim() || "unknown";
}

function section(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\s*([\\s\\S]*?)(?=\\n## |$)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function tableRows(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell && cell.toLowerCase() !== "unknown"));
}

export function parseWorkflow(root: string): WorkflowData {
  let markdown = "";
  try {
    markdown = readFileSync(path.join(root, "AI_WORKFLOW.md"), "utf8");
  } catch {
    return {
      activeTimeBand: "missing",
      primaryWorkflow: "missing",
      aiCostUsd: null,
      tools: [],
      models: [],
      timelineSteps: 0,
      hasReviewStep: false,
      hasTddSignal: false,
      hasPlanSignal: false,
      hasDebugSignal: false,
      reworkItems: 0,
      modelSwitches: 0,
      humanInterventionItems: 0,
      completenessPercent: 0,
    };
  }

  const activeTimeBand = lineValue(markdown, "Active time band");
  const primaryWorkflow = lineValue(markdown, "Primary workflow");
  const rawCost = lineValue(markdown, "Approx. AI cost (USD)");
  const aiCostUsd = /^\d+(\.\d+)?$/.test(rawCost.replace("$", ""))
    ? Number(rawCost.replace("$", ""))
    : null;

  const toolsRows = tableRows(section(markdown, "Tools and Models"));
  const timelineRows = tableRows(section(markdown, "Session Timeline"));
  const allText = markdown.toLowerCase();

  const tools = [...new Set(toolsRows.map((row) => row[0]).filter((v): v is string => Boolean(v && v !== "unknown")))];
  const models = [...new Set(toolsRows.map((row) => row[1]).filter((v): v is string => Boolean(v && v !== "unknown")))];
  const reworkSection = section(markdown, "Rework and Corrections");
  const reworkItems = reworkSection
    .split("\n")
    .filter((line) => line.trim().startsWith("-") && !/none yet|unknown/i.test(line)).length;
  const humanInterventionItems = timelineRows.filter((row) => {
    const action = row[4]?.toLowerCase() ?? "";
    return action && !/none|unknown|accepted as-is/.test(action);
  }).length;
  const modelSwitches = (allText.match(/model (?:escalation|switch)|switched model|changed model/g) ?? []).length;

  const requiredSignals = [
    activeTimeBand !== "unknown",
    primaryWorkflow !== "unknown",
    toolsRows.length > 0,
    timelineRows.length > 0,
    /commands\/checks run:\s*(?!`?not recorded yet)/i.test(markdown),
    !/### What worked well\s*\n\s*- TBD/i.test(markdown),
    !/### What I would change next time\s*\n\s*- TBD/i.test(markdown),
    !/### Practice I would recommend to the team\s*\n\s*- TBD/i.test(markdown),
  ];

  return {
    activeTimeBand,
    primaryWorkflow,
    aiCostUsd,
    tools,
    models,
    timelineSteps: timelineRows.length,
    hasReviewStep: /review/.test(allText),
    hasTddSignal: /\btdd\b|test[- ]first|failing (?:regression )?test/.test(allText),
    hasPlanSignal: /\bplan(?:ning)?\b/.test(allText),
    hasDebugSignal: /debug|root cause|systematic debugging/.test(allText),
    reworkItems,
    modelSwitches,
    humanInterventionItems,
    completenessPercent: Math.round((requiredSignals.filter(Boolean).length / requiredSignals.length) * 100),
  };
}
