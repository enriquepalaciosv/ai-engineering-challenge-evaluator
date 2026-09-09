import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "./process.js";

export interface PreparedSubmission {
  root: string;
  cleanup: () => void;
  repoLabel: string;
  sha: string;
  baseRef: string;
}

export function prepareSubmission(input: {
  repoUrl?: string;
  localRepo?: string;
  pr?: number;
  ref?: string;
  baseRef: string;
}): PreparedSubmission {
  if (!input.repoUrl && !input.localRepo) {
    throw new Error("Provide --repo-url or --repo");
  }
  if (!input.pr && !input.ref) {
    throw new Error("Provide --pr or --ref");
  }

  const tmp = mkdtempSync(path.join(os.tmpdir(), "ai-challenge-"));
  const source = input.repoUrl ?? input.localRepo!;
  const clone = run("git", ["clone", "--quiet", source, tmp], process.cwd(), { quiet: true });
  if (!clone.ok) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(`Unable to clone ${source}: ${clone.stderr || clone.stdout}`);
  }

  run("git", ["fetch", "origin", input.baseRef], tmp, { quiet: true });

  if (input.pr) {
    const fetched = run(
      "git",
      ["fetch", "origin", `pull/${input.pr}/head:challenge-submission`],
      tmp,
      { quiet: true },
    );
    if (!fetched.ok) throw new Error(`Unable to fetch PR #${input.pr}`);
    const checkout = run("git", ["checkout", "--quiet", "challenge-submission"], tmp, { quiet: true });
    if (!checkout.ok) throw new Error(`Unable to checkout PR #${input.pr}`);
  } else {
    const checkout = run("git", ["checkout", "--quiet", input.ref!], tmp, { quiet: true });
    if (!checkout.ok) throw new Error(`Unable to checkout ref ${input.ref}`);
  }

  const sha = run("git", ["rev-parse", "HEAD"], tmp, { quiet: true }).stdout.trim();
  return {
    root: tmp,
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
    repoLabel: source,
    sha,
    baseRef: `origin/${input.baseRef}`,
  };
}

export function diffText(root: string, baseRef: string, pathspec?: string): string {
  const args = ["diff", `${baseRef}...HEAD`, "--unified=0"];
  if (pathspec) args.push("--", pathspec);
  return run("git", args, root, { quiet: true }).stdout;
}

export function changedFiles(root: string, baseRef: string): string[] {
  return run("git", ["diff", "--name-only", `${baseRef}...HEAD`], root, { quiet: true })
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function numstat(root: string, baseRef: string, pathspec: string): { added: number; deleted: number } {
  const output = run("git", ["diff", "--numstat", `${baseRef}...HEAD`, "--", pathspec], root, { quiet: true }).stdout;
  let added = 0;
  let deleted = 0;
  for (const line of output.split("\n")) {
    const [a, d] = line.split("\t");
    if (a && /^\d+$/.test(a)) added += Number(a);
    if (d && /^\d+$/.test(d)) deleted += Number(d);
  }
  return { added, deleted };
}
