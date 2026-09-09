export interface HiddenCaseResult {
  id: string;
  title: string;
  passed: boolean;
  message?: string;
}

export interface WorkflowData {
  activeTimeBand: string;
  primaryWorkflow: string;
  aiCostUsd: number | null;
  tools: string[];
  models: string[];
  timelineSteps: number;
  hasReviewStep: boolean;
  hasTddSignal: boolean;
  hasPlanSignal: boolean;
  hasDebugSignal: boolean;
  reworkItems: number;
  modelSwitches: number;
  humanInterventionItems: number;
  completenessPercent: number;
}

export interface SubmissionEvaluation {
  id: string;
  label: string;
  createdAt: string;
  source: {
    repo: string;
    ref?: string;
    pr?: number;
    sha: string;
    baseRef: string;
  };
  correctness: {
    hiddenPassed: number;
    hiddenTotal: number;
    hiddenPercent: number;
    cases: HiddenCaseResult[];
  };
  regressionProtection: {
    visibleTestsPass: boolean;
    changedTestFiles: number;
    addedTestCases: number;
    bugRegressionSignal: boolean;
    featureRegressionSignal: boolean;
  };
  maintainability: {
    typecheckPass: boolean;
    lintPass: boolean;
    changedSourceFiles: number;
    productionLinesAdded: number;
    productionLinesDeleted: number;
    pricingFunctionApproxLines: number | null;
  };
  workflow: WorkflowData;
  signals: {
    strengths: string[];
    improvements: string[];
    takeaways: string[];
    evidence: string[];
  };
}

export interface TeamRecommendation {
  title: string;
  rationale: string;
  evidence: string[];
}

export interface DashboardData {
  generatedAt: string;
  demo?: boolean;
  submissions: SubmissionEvaluation[];
  recommendations: {
    adopt: TeamRecommendation[];
    avoid: TeamRecommendation[];
    experimentNext: TeamRecommendation[];
  };
  notes: string[];
}
