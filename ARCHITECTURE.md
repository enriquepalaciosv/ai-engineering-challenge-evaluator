# Evaluator Architecture

```text
Challenge PRs / branches
        │
        ▼
Temporary private checkout
        │
        ├── visible npm tests
        ├── typecheck + lint
        ├── private hidden runner
        ├── git diff/test analysis
        └── AI_WORKFLOW.md parser
                │
                ▼
       SubmissionEvaluation JSON
                │
                ▼
      Cross-submission synthesis
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
      Adopt    Avoid   Experiment next
                │
                ▼
          React/Vite dashboard
```

## Trust boundaries

### Participant-visible repository

Contains the task, visible tests, Cursor rule, and workflow-log template. It contains no hidden evaluator code or hidden test cases.

### Private evaluator

Contains hidden checks and evaluation heuristics. Run it only on infrastructure that challenge participants and their Cursor agents cannot inspect.

### Dashboard

Shows metrics and evidence-backed synthesis. It intentionally omits a total score and winner ranking.

## Future extensions

- GitHub App webhook receiver to evaluate PR SHAs automatically
- Cursor team usage API integration where account plan/API access permits it
- Optional model/provider-neutral LLM synthesis over structured evaluation JSON
- Mutation testing for stronger test-quality analysis
- Sandbox/container hardening for untrusted challenge code
- Challenge-run grouping so multiple benchmark rounds can be compared over time
