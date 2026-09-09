import { readFileSync } from "node:fs";
import path from "node:path";
import { run } from "./process.js";
import { changedFiles, diffText, numstat } from "./git.js";
import { parseWorkflow } from "./workflow.js";
import type { HiddenCaseResult, SubmissionEvaluation } from "./types.js";

function countAddedTests(diff: string): number {
  return diff
    .split("\n")
    .filter((line) => /^\+\s*(?:it|test)\s*\(/.test(line)).length;
}

function pricingFunctionLines(root: string): number | null {
  try {
    const text = readFileSync(path.join(root, "src", "pricing.ts"), "utf8");
    const start = text.indexOf("export function priceOrder");
    if (start < 0) return null;
    const slice = text.slice(start);
    let depth = 0;
    let started = false;
    let lines = 0;
    for (const line of slice.split("\n")) {
      if (line.includes("{")) started = true;
      if (started) lines += 1;
      depth += (line.match(/{/g) ?? []).length;
      depth -= (line.match(/}/g) ?? []).length;
      if (started && depth === 0) return lines;
    }
    return lines || null;
  } catch {
    return null;
  }
}

function buildSignals(input: Omit<SubmissionEvaluation, "signals">): SubmissionEvaluation["signals"] {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const takeaways: string[] = [];
  const evidence: string[] = [];

  if (input.correctness.hiddenPercent === 100) {
    strengths.push("Full hidden functional coverage for the challenge requirements.");
    evidence.push(`${input.correctness.hiddenPassed}/${input.correctness.hiddenTotal} hidden checks passed.`);
  } else if (input.correctness.hiddenPercent >= 75) {
    strengths.push("Most hidden functional scenarios are correct.");
    improvements.push("Review the missed edge cases before standardizing this approach.");
    evidence.push(`${input.correctness.hiddenPassed}/${input.correctness.hiddenTotal} hidden checks passed.`);
  } else {
    improvements.push("Correctness needs more verification before this workflow is reused.");
  }

  if (input.regressionProtection.addedTestCases >= 2 && input.regressionProtection.bugRegressionSignal && input.regressionProtection.featureRegressionSignal) {
    strengths.push("The submitted tests explicitly protect both the bug fix and the new feature.");
    takeaways.push("Keep explicit regression tests for both repaired behavior and new behavior.");
  } else {
    improvements.push("Regression protection could be more explicit for both requested behaviors.");
  }

  if (input.maintainability.typecheckPass && input.maintainability.lintPass) {
    strengths.push("The change passes static verification cleanly.");
  }

  if (input.workflow.hasPlanSignal && input.correctness.hiddenPercent === 100) {
    takeaways.push("Planning before implementation is a candidate practice to retain for multi-concern changes.");
  }
  if (input.workflow.hasTddSignal && input.regressionProtection.addedTestCases >= 2) {
    takeaways.push("The test-first/TDD signal aligns with strong explicit regression protection in this submission.");
  }
  if (input.workflow.hasReviewStep && input.correctness.hiddenPercent === 100) {
    takeaways.push("Independent AI review is worth testing as a standard pre-PR step.");
  }
  if (input.workflow.completenessPercent < 75) {
    improvements.push("The workflow log is incomplete, which limits how confidently the team can learn from the approach.");
  }
  if (input.workflow.timelineSteps >= 8 && input.workflow.reworkItems >= 2) {
    improvements.push("The workflow shows substantial AI iteration/rework; look for opportunities to reduce repeated context and retries.");
  }

  return { strengths, improvements, takeaways, evidence };
}

export async function evaluateCheckout(input: {
  root: string;
  label: string;
  repo: string;
  sha: string;
  baseRef: string;
  ref?: string;
  pr?: number;
  evaluatorRoot: string;
}): Promise<SubmissionEvaluation> {
  const install = run("npm", ["install", "--silent", "--ignore-scripts"], input.root, { quiet: true });
  if (!install.ok) {
    throw new Error(`Dependency install failed for ${input.label}: ${install.stderr || install.stdout}`);
  }

  const visibleTests = run("npm", ["test"], input.root, { quiet: true });
  const typecheck = run("npm", ["run", "typecheck"], input.root, { quiet: true });
  const lint = run("npm", ["run", "lint"], input.root, { quiet: true });

  const hidden = run(
    "npx",
    ["tsx", path.join(input.evaluatorRoot, "hidden-tests", "run-hidden.ts"), input.root],
    input.evaluatorRoot,
    { quiet: true },
  );
  let hiddenCases: HiddenCaseResult[] = [];
  try {
    hiddenCases = JSON.parse(hidden.stdout).results as HiddenCaseResult[];
  } catch {
    throw new Error(`Hidden evaluator failed for ${input.label}: ${hidden.stderr || hidden.stdout}`);
  }

  const files = changedFiles(input.root, input.baseRef);
  const testDiff = diffText(input.root, input.baseRef, "tests");
  const testDiffLower = testDiff.toLowerCase();
  const stats = numstat(input.root, input.baseRef, "src");
  const workflow = parseWorkflow(input.root);
  const hiddenPassed = hiddenCases.filter((test) => test.passed).length;

  const base: Omit<SubmissionEvaluation, "signals"> = {
    id: `${input.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.sha.slice(0, 8)}`,
    label: input.label,
    createdAt: new Date().toISOString(),
    source: {
      repo: input.repo,
      ref: input.ref,
      pr: input.pr,
      sha: input.sha,
      baseRef: input.baseRef,
    },
    correctness: {
      hiddenPassed,
      hiddenTotal: hiddenCases.length,
      hiddenPercent: hiddenCases.length ? Math.round((hiddenPassed / hiddenCases.length) * 100) : 0,
      cases: hiddenCases,
    },
    regressionProtection: {
      visibleTestsPass: visibleTests.ok,
      changedTestFiles: files.filter((file) => file.startsWith("tests/")).length,
      addedTestCases: countAddedTests(testDiff),
      bugRegressionSignal: /percent|percentage|shipping|discount/.test(testDiffLower),
      featureRegressionSignal: /premium|free.*shipping|shipping.*free/.test(testDiffLower),
    },
    maintainability: {
      typecheckPass: typecheck.ok,
      lintPass: lint.ok,
      changedSourceFiles: files.filter((file) => file.startsWith("src/")).length,
      productionLinesAdded: stats.added,
      productionLinesDeleted: stats.deleted,
      pricingFunctionApproxLines: pricingFunctionLines(input.root),
    },
    workflow,
  };

  return { ...base, signals: buildSignals(base) };
}
