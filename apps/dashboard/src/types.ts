declare global {
  const __CHALLENGE_REF__: string;
}

export interface Evaluation {
  id: string;
  label: string;
  source: { pr?: number; ref?: string; sha: string };
  correctness: { hiddenPassed: number; hiddenTotal: number; hiddenPercent: number };
  regressionProtection: { visibleTestsPass: boolean; addedTestCases: number; bugRegressionSignal: boolean; featureRegressionSignal: boolean };
  maintainability: { typecheckPass: boolean; lintPass: boolean; productionLinesAdded: number; productionLinesDeleted: number; pricingFunctionApproxLines: number | null };
  workflow: { activeTimeBand: string; primaryWorkflow: string; aiCostUsd: number | null; tools: string[]; models: string[]; timelineSteps: number; hasReviewStep: boolean; hasTddSignal: boolean; hasPlanSignal: boolean; reworkItems: number; humanInterventionItems: number; completenessPercent: number };
  signals: { strengths: string[]; improvements: string[]; takeaways: string[]; evidence: string[] };
}

export interface Recommendation { title: string; rationale: string; evidence: string[] }
export interface DashboardData {
  generatedAt: string;
  submissions: Evaluation[];
  recommendations: { adopt: Recommendation[]; avoid: Recommendation[]; experimentNext: Recommendation[] };
  notes: string[];
}
