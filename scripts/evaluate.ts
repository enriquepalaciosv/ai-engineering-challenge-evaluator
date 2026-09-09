import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFlag } from "../src/args.js";
import { evaluateCheckout } from "../src/analyze.js";
import { prepareSubmission } from "../src/git.js";
import { buildDashboard, saveSubmission, writeDashboardData } from "../src/storage.js";

const evaluatorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const repoUrl = getFlag(args, "repo-url");
const localRepo = getFlag(args, "repo");
const prRaw = getFlag(args, "pr");
const ref = getFlag(args, "ref");
const label = getFlag(args, "name") ?? ref ?? (prRaw ? `PR ${prRaw}` : "Submission");
const baseRef = getFlag(args, "base") ?? "main";
const pr = prRaw ? Number(prRaw) : undefined;

const prepared = prepareSubmission({ repoUrl, localRepo, pr, ref, baseRef });
try {
  const result = await evaluateCheckout({
    root: prepared.root,
    label,
    repo: prepared.repoLabel,
    sha: prepared.sha,
    baseRef: prepared.baseRef,
    ref,
    pr,
    evaluatorRoot,
  });
  const file = saveSubmission(evaluatorRoot, result);
  writeDashboardData(evaluatorRoot, buildDashboard(evaluatorRoot));
  console.log(`Saved evaluation: ${file}`);
  console.log(`${result.label}: ${result.correctness.hiddenPassed}/${result.correctness.hiddenTotal} hidden checks passed; workflow log ${result.workflow.completenessPercent}% complete.`);
} finally {
  prepared.cleanup();
}
