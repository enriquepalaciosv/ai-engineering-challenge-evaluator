import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import type { DashboardData, Evaluation, Recommendation } from "./types";

type StepKind = "explore" | "plan" | "implement" | "test" | "verify" | "other";

interface WorkflowStep {
  label: string;
  note?: string;
  kind: StepKind;
}

const KIND_KEYWORDS: [StepKind, string[]][] = [
  ["test", ["tdd", "test"]],
  ["plan", ["plan", "spec", "design", "proposal"]],
  ["explore", ["explore", "ask", "research"]],
  ["verify", ["verify", "review", "trace", "log"]],
  ["implement", ["implement", "agent", "code"]],
];

function hasKeyword(label: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`, "i").test(label);
}

function classifyStepKind(label: string): StepKind {
  for (const [kind, keywords] of KIND_KEYWORDS) {
    if (keywords.some((keyword) => hasKeyword(label, keyword))) return kind;
  }
  return "other";
}

function parseWorkflowSteps(raw: string): WorkflowStep[] {
  const trimmed = raw.trim();
  if (!trimmed || /^(missing|unknown)$/i.test(trimmed)) return [];
  return trimmed.split(/\s*(?:->|→)\s*/).flatMap((part) => {
    const token = part.trim();
    if (!token) return [];
    const match = token.match(/^(.+?)\s*\((.+)\)\s*$/);
    const label = (match?.[1] ?? token).trim();
    const note = match?.[2]?.trim();
    return [{ label, note: note || undefined, kind: classifyStepKind(label) }];
  });
}

function WorkflowStepper({ workflow, density }: { workflow: string; density: "compact" | "comfortable" }) {
  const steps = parseWorkflowSteps(workflow);
  if (!steps.length) return <span className="muted">—</span>;
  const showNotes = density === "comfortable";
  return (
    <ol className={`workflow-stepper workflow-stepper-${density}`} aria-label="Workflow">
      {steps.map((step, index) => {
        const full = step.note ? `${step.label} (${step.note})` : step.label;
        const last = index === steps.length - 1;
        return (
          <li key={`${step.label}-${index}`} className={last ? "workflow-step is-last" : "workflow-step"}>
            <span className="workflow-rail">
              <span className="workflow-node" data-kind={step.kind}>{String(index + 1).padStart(2, "0")}</span>
            </span>
            <span className="workflow-copy" title={full}>
              <span className="workflow-label">{step.label}</span>
              {showNotes && step.note ? <span className="workflow-note">{step.note}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ label, value, good }: { label: string; value: React.ReactNode; good?: boolean }) {
  return <div className="metric"><span>{label}</span><strong className={good ? "good" : ""}>{value}</strong></div>;
}

function SubmissionCard({ item }: { item: Evaluation }) {
  return (
    <article className="card submission-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Approach</p>
          <h3>{item.label}</h3>
        </div>
      </div>
      <WorkflowStepper workflow={item.workflow.primaryWorkflow} density="comfortable" />
      <div className="metric-grid">
        <Metric label="Correctness" value={`${item.correctness.hiddenPercent}%`} good={item.correctness.hiddenPercent === 100} />
        <Metric label="Added tests" value={item.regressionProtection.addedTestCases} />
        <Metric label="Workflow steps" value={item.workflow.timelineSteps} />
        <Metric label="Rework signals" value={item.workflow.reworkItems} />
        <Metric label="Log completeness" value={`${item.workflow.completenessPercent}%`} good={item.workflow.completenessPercent >= 88} />
        <Metric label="Human steering" value={item.workflow.humanInterventionItems} />
      </div>
      <div className="split">
        <section>
          <h4>Worked well</h4>
          <ul>{item.signals.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section>
          <h4>Could improve</h4>
          <ul>{item.signals.improvements.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      </div>
      <section className="takeaway">
        <h4>What to take from this approach</h4>
        {item.signals.takeaways.length ? <ul>{item.signals.takeaways.map((x) => <li key={x}>{x}</li>)}</ul> : <p>Collect another sample before standardizing a practice from this approach.</p>}
      </section>
      <details>
        <summary>Evidence & workflow context</summary>
        <p><strong>Tools:</strong> {item.workflow.tools.join(", ") || "unknown"}</p>
        <p><strong>Models:</strong> {item.workflow.models.join(", ") || "unknown"}</p>
        <p><strong>Active time:</strong> {item.workflow.activeTimeBand}</p>
        <p><strong>Static checks:</strong> typecheck {item.maintainability.typecheckPass ? "✓" : "✗"} · lint {item.maintainability.lintPass ? "✓" : "✗"}</p>
        {item.signals.evidence.map((x) => <p key={x}>• {x}</p>)}
      </details>
    </article>
  );
}

function RecommendationColumn({ title, items }: { title: string; items: Recommendation[] }) {
  return <section className="recommendation-column"><h3>{title}</h3>{items.length ? items.map((item) => <article key={item.title} className="recommendation"><h4>{item.title}</h4><p>{item.rationale}</p><details><summary>Evidence</summary>{item.evidence.map((x) => <p key={x}>• {x}</p>)}</details></article>) : <p className="muted">No strong signal yet.</p>}</section>;
}

function ComparisonTable({ items }: { items: Evaluation[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Dimension</th>{items.map((x) => <th key={x.id}>{x.label}</th>)}</tr></thead><tbody>
    <tr><td>Correctness</td>{items.map((x) => <td key={x.id}>{x.correctness.hiddenPercent}%</td>)}</tr>
    <tr><td>Regression tests added</td>{items.map((x) => <td key={x.id}>{x.regressionProtection.addedTestCases}</td>)}</tr>
    <tr><td>Typecheck / lint</td>{items.map((x) => <td key={x.id}>{x.maintainability.typecheckPass ? "✓" : "✗"} / {x.maintainability.lintPass ? "✓" : "✗"}</td>)}</tr>
    <tr><td>Workflow</td>{items.map((x) => <td key={x.id}><WorkflowStepper workflow={x.workflow.primaryWorkflow} density="compact" /></td>)}</tr>
    <tr><td>AI workflow steps</td>{items.map((x) => <td key={x.id}>{x.workflow.timelineSteps}</td>)}</tr>
    <tr><td>Rework signals</td>{items.map((x) => <td key={x.id}>{x.workflow.reworkItems}</td>)}</tr>
    <tr><td>Human steering</td>{items.map((x) => <td key={x.id}>{x.workflow.humanInterventionItems}</td>)}</tr>
    <tr><td>Active time band</td>{items.map((x) => <td key={x.id}>{x.workflow.activeTimeBand}</td>)}</tr>
  </tbody></table></div>;
}

function App() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { fetch("/data/dashboard.json").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then(setData).catch((e) => setError(String(e))); }, []);
  if (error) return <main className="shell"><h1>Unable to load dashboard</h1><p>{error}</p></main>;
  if (!data) return <main className="shell"><p>Loading evaluation data…</p></main>;
  return <main className="shell">
    <header className="hero"><div><p className="eyebrow">{__CHALLENGE_REF__ || "AI Engineering Challenge"}</p><h1>Patterns, not rankings.</h1><p className="lede">Compare PR approaches, preserve what worked, identify unnecessary AI overhead, and build the next team workflow from evidence.</p></div><div className="hero-stat"><strong>{data.submissions.length}</strong><span>approaches analyzed</span></div></header>
    {!data.submissions.length ? <section className="empty card"><h2>No submissions evaluated yet</h2><p>Run the evaluator against one or more PRs, then refresh this dashboard.</p><code>npm run compare -- --repo-url &lt;repo&gt; --pr 12:Enrique --pr 15:Alex --pr 18:Sebastian</code></section> : <>
      <section><div className="section-head"><div><p className="eyebrow">Side by side</p><h2>Comparable dimensions</h2></div><p>No overall score is calculated.</p></div><ComparisonTable items={data.submissions} /></section>
      <section><div className="section-head"><div><p className="eyebrow">Per approach</p><h2>What each workflow teaches us</h2></div></div><div className="cards">{data.submissions.map((item) => <SubmissionCard key={item.id} item={item} />)}</div></section>
      <section><div className="section-head"><div><p className="eyebrow">Team synthesis</p><h2>Playbook candidates</h2></div></div><div className="recommendation-grid"><RecommendationColumn title="Adopt" items={data.recommendations.adopt} /><RecommendationColumn title="Avoid" items={data.recommendations.avoid} /><RecommendationColumn title="Experiment next" items={data.recommendations.experimentNext} /></div></section>
      <footer>{data.notes.map((note) => <p key={note}>{note}</p>)}<p>Generated {new Date(data.generatedAt).toLocaleString()}.</p></footer>
    </>}
  </main>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
