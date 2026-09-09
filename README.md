# AI Challenge Evaluator (Private)

Private companion project for the AI Engineering Challenge. Keep this repository inaccessible to challenge participants while the challenge is open.

It evaluates submitted PRs/branches using hidden functional checks, visible CI checks, diff analysis, and the submitted `AI_WORKFLOW.md`, then builds a comparison dashboard focused on **team learning rather than ranking developers**.

## What it intentionally does not do

- It does not calculate an overall winner score.
- It does not expose hidden test source to the challenge repository.
- It does not assume that correlation proves a workflow caused a better result.
- It does not require an LLM to produce the first version of the dashboard.

## Setup

```bash
npm install
```

The evaluator requires `git`, Node.js 20+, and npm. The account/machine running it must have read access to the challenge repository.

## Evaluate one PR

```bash
npm run evaluate -- \
  --repo-url git@github.com:YOUR_ORG/ai-engineering-challenge.git \
  --pr 12 \
  --name Enrique
```

Or evaluate a branch/ref:

```bash
npm run evaluate -- \
  --repo-url git@github.com:YOUR_ORG/ai-engineering-challenge.git \
  --ref challenge/enrique \
  --name Enrique
```

For a local repository:

```bash
npm run evaluate -- \
  --repo ../ai-engineering-challenge \
  --ref challenge/enrique \
  --name Enrique
```

## Compare several PRs

```bash
npm run compare -- \
  --repo-url git@github.com:YOUR_ORG/ai-engineering-challenge.git \
  --pr 12:Enrique \
  --pr 15:Alex \
  --pr 18:Sebastian
```

Branch-based comparison is also supported:

```bash
npm run compare -- \
  --repo-url git@github.com:YOUR_ORG/ai-engineering-challenge.git \
  --ref challenge/enrique:Enrique \
  --ref challenge/alex:Alex \
  --ref challenge/sebastian:Sebastian
```

Each comparison run replaces the previous dashboard cohort by default. Pass `--append` if you intentionally want to retain earlier stored submissions. Evaluation details are saved under `data/submissions/` and the browser-facing dashboard dataset is regenerated without hidden case names or failure details.

## Open the dashboard

```bash
npm run dashboard
```

Then open the Vite URL shown in the terminal (default port `4173`).

The dashboard includes:

- Side-by-side dimensions without a total score
- Correctness
- Regression-test signals
- Static verification
- Workflow shape, AI steps and rework
- What worked well per approach
- Areas to improve per approach
- What the team should take from each approach
- Evidence-backed `Adopt`, `Avoid`, and `Experiment next` recommendations

## Hidden evaluation model

The hidden runner imports the exact submitted `src/pricing.ts` from a temporary checkout. It never copies the hidden tests into the challenge repository. Failure details remain in this private evaluator process.

During the challenge window, avoid posting hidden case names/failure messages back to participant PRs. It is safer to publish only a coarse check result such as "Private evaluation completed" and retain detailed evidence here.

## Data philosophy

Deterministic signals produce the evaluation facts. The recommendation layer uses conservative heuristics and phrases conclusions as observed signals rather than causal claims.

A future LLM synthesis adapter can consume the same structured JSON, but it should never overwrite deterministic measurements or create a winner ranking.

## Optional GitHub Check integration

The evaluator is designed so the evaluation step can be called from a private CI runner or GitHub App. If you publish GitHub Check Runs, use a GitHub App/installation token with `Checks: write`. Keep hidden failure details private until the challenge window closes.

## Recommended operating model

1. Challenge repository is accessible to participants.
2. Evaluator repository is private to leads/evaluator service.
3. Each developer opens a normal PR to `main`.
4. Run `npm run compare` for the submitted PRs from this private project.
5. Review the dashboard with the team.
6. Convert `Adopt` / `Experiment next` findings into an AI Engineering Playbook.
7. Repeat with a second small challenge before making strong team-wide policy decisions.
