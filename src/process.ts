import { spawnSync } from "node:child_process";

export interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
}

export function run(
  command: string,
  args: string[],
  cwd: string,
  options: { quiet?: boolean } = {},
): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    maxBuffer: 10 * 1024 * 1024,
  });

  if (!options.quiet && result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    if (detail) console.error(detail);
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}
