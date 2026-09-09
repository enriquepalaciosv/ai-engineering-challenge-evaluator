import type { DashboardData, SubmissionEvaluation, TeamRecommendation } from "./types.js";

function bestBy<T>(items: T[], score: (item: T) => number): T | undefined {
  return [...items].sort((a, b) => score(b) - score(a))[0];
}

export function buildRecommendations(submissions: SubmissionEvaluation[]): DashboardData["recommendations"] {
  const adopt: TeamRecommendation[] = [];
  const avoid: TeamRecommendation[] = [];
  const experimentNext: TeamRecommendation[] = [];
  if (!submissions.length) return { adopt, avoid, experimentNext };

  const fullCorrect = submissions.filter((s) => s.correctness.hiddenPercent === 100);
  const strongestTests = bestBy(submissions, (s) => s.regressionProtection.addedTestCases + (s.regressionProtection.bugRegressionSignal ? 2 : 0) + (s.regressionProtection.featureRegressionSignal ? 2 : 0));
  const leanCorrect = bestBy(fullCorrect.length ? fullCorrect : submissions, (s) => 100 - s.workflow.timelineSteps - s.workflow.reworkItems * 2);
  const reviewedCorrect = fullCorrect.find((s) => s.workflow.hasReviewStep);
  const plannedCorrect = fullCorrect.find((s) => s.workflow.hasPlanSignal);

  if (strongestTests && strongestTests.regressionProtection.addedTestCases >= 2) {
    adopt.push({
      title: "Keep explicit regression protection",
      rationale: `${strongestTests.label}'s submission provides the strongest visible test signal while preserving ${strongestTests.correctness.hiddenPercent}% hidden correctness.`,
      evidence: [
        `${strongestTests.regressionProtection.addedTestCases} added test cases detected.`,
        `Bug regression signal: ${strongestTests.regressionProtection.bugRegressionSignal ? "yes" : "no"}.`,
        `Feature regression signal: ${strongestTests.regressionProtection.featureRegressionSignal ? "yes" : "no"}.`,
      ],
    });
  }

  if (reviewedCorrect) {
    adopt.push({
      title: "Test an independent AI review step before PR submission",
      rationale: `${reviewedCorrect.label} recorded a review step and achieved full hidden correctness. This is an observed association, not proof of causation, so it is a good practice to standardize experimentally.`,
      evidence: ["Independent review signal found in AI_WORKFLOW.md.", "100% hidden checks passed."],
    });
  }

  if (plannedCorrect) {
    adopt.push({
      title: "Retain lightweight planning for multi-concern changes",
      rationale: `${plannedCorrect.label} used a planning step and still completed the functional requirements cleanly.`,
      evidence: ["Planning signal found in the workflow log.", "100% hidden checks passed."],
    });
  }

  const highIteration = submissions.find((s) => s.workflow.timelineSteps >= 8 && s.workflow.reworkItems >= 2);
  if (highIteration) {
    avoid.push({
      title: "Avoid repeated AI passes without a new hypothesis",
      rationale: `${highIteration.label}'s log shows comparatively high iteration and rework. Preserve the useful reasoning steps, but reduce repeated context discovery or retries that do not change the hypothesis.`,
      evidence: [`${highIteration.workflow.timelineSteps} timeline steps.`, `${highIteration.workflow.reworkItems} rework items.`],
    });
  }

  const incomplete = submissions.filter((s) => s.workflow.completenessPercent < 75);
  if (incomplete.length) {
    avoid.push({
      title: "Do not sacrifice workflow traceability",
      rationale: "Incomplete logs make it harder to distinguish an efficient workflow from a lucky result.",
      evidence: incomplete.map((s) => `${s.label}: ${s.workflow.completenessPercent}% workflow-log completeness.`),
    });
  }

  if (leanCorrect && strongestTests) {
    experimentNext.push({
      title: "Combine the leanest successful flow with the strongest regression strategy",
      rationale: `Try the low-iteration structure observed in ${leanCorrect.label} while explicitly adopting the regression-protection behavior observed in ${strongestTests.label}.`,
      evidence: [
        `${leanCorrect.label}: ${leanCorrect.workflow.timelineSteps} logged AI workflow steps, ${leanCorrect.correctness.hiddenPercent}% hidden correctness.`,
        `${strongestTests.label}: ${strongestTests.regressionProtection.addedTestCases} added test cases detected.`,
      ],
    });
  }

  return { adopt, avoid, experimentNext };
}
