import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFlag, getRepeatedFlag } from "../src/args.js";
import { evaluateCheckout } from "../src/analyze.js";
import { prepareSubmission } from "../src/git.js";
import { buildDashboard, clearSubmissions, saveSubmission, writeDashboardData } from "../src/storage.js";

const evaluatorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const repoUrl = getFlag(args, "repo-url");
const localRepo = getFlag(args, "repo");
const baseRef = getFlag(args, "base") ?? "main";
const prSpecs = getRepeatedFlag(args, "pr");
const refSpecs = getRepeatedFlag(args, "ref");

if (!prSpecs.length && !refSpecs.length) {
  throw new Error("Provide one or more --pr <number:name> or --ref <branch:name> arguments.");
}

// A comparison run represents one cohort by default. Use --append to retain prior results.
if (!args.includes("--append")) clearSubmissions(evaluatorRoot);

for (const spec of prSpecs) {
  const [prPart, ...labelParts] = spec.split(":");
  const pr = Number(prPart);
  const label = labelParts.join(":") || `PR ${pr}`;
  const prepared = prepareSubmission({ repoUrl, localRepo, pr, baseRef });
  try {
    const result = await evaluateCheckout({ root: prepared.root, label, repo: prepared.repoLabel, sha: prepared.sha, baseRef: prepared.baseRef, pr, evaluatorRoot });
    saveSubmission(evaluatorRoot, result);
    console.log(`Evaluated ${label}`);
  } finally {
    prepared.cleanup();
  }
}

for (const spec of refSpecs) {
  const [refPart, ...labelParts] = spec.split(":");
  const ref = refPart!;
  const label = labelParts.join(":") || ref;
  const prepared = prepareSubmission({ repoUrl, localRepo, ref, baseRef });
  try {
    const result = await evaluateCheckout({ root: prepared.root, label, repo: prepared.repoLabel, sha: prepared.sha, baseRef: prepared.baseRef, ref, evaluatorRoot });
    saveSubmission(evaluatorRoot, result);
    console.log(`Evaluated ${label}`);
  } finally {
    prepared.cleanup();
  }
}

const dashboard = buildDashboard(evaluatorRoot);
const file = writeDashboardData(evaluatorRoot, dashboard);
console.log(`Dashboard data refreshed: ${file}`);
console.log(`Compared ${dashboard.submissions.length} stored submission(s).`);
