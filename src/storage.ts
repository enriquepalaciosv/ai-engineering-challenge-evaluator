import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DashboardData, SubmissionEvaluation } from "./types.js";
import { buildRecommendations } from "./recommendations.js";

export function saveSubmission(root: string, result: SubmissionEvaluation): string {
  const dir = path.join(root, "data", "submissions");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${result.id}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));
  return file;
}

export function clearSubmissions(root: string): void {
  const dir = path.join(root, "data", "submissions");
  mkdirSync(dir, { recursive: true });
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".json")) rmSync(path.join(dir, file));
  }
}

export function loadSubmissions(root: string): SubmissionEvaluation[] {
  const dir = path.join(root, "data", "submissions");
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as SubmissionEvaluation)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildDashboard(root: string): DashboardData {
  const submissions = loadSubmissions(root);
  return {
    generatedAt: new Date().toISOString(),
    submissions,
    recommendations: buildRecommendations(submissions),
    notes: [
      "Dimensions are intentionally shown separately; there is no overall winner score.",
      "Cross-submission recommendations describe observed signals, not causal proof.",
      "Hidden test names and failure details should remain private during the challenge window.",
    ],
  };
}

export function writeDashboardData(root: string, data: DashboardData): string {
  const file = path.join(root, "apps", "dashboard", "public", "data", "dashboard.json");
  mkdirSync(path.dirname(file), { recursive: true });
  // Never ship hidden case names or failure details to the browser-facing dashboard JSON.
  const sanitized: DashboardData = {
    ...data,
    submissions: data.submissions.map((submission) => ({
      ...submission,
      correctness: { ...submission.correctness, cases: [] },
    })),
  };
  writeFileSync(file, JSON.stringify(sanitized, null, 2));
  return file;
}
