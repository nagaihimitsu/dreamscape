import { constants } from "node:os";

// npm run test:with-sample -- [vitest arguments]: content:build with the sample journey, the unit tests (`vitest run`
// with the arguments passed through), then content:build without the sample whatever happened before (tests that
// fail, Ctrl+C), so the generated content does not stay with the sample: the dev server, npm run build and the next
// tests read the same folder. The order of the steps and what they print are here; test-with-sample-cli.ts runs each
// step as a child process.

export type SampleTestStep = "build-with-sample" | "vitest" | "build-without-sample";

const name = "test:with-sample";

/** The arguments of each step's child process (after `node`), relative to the repository root. */
export function stepCommand(step: SampleTestStep, vitestArgs: readonly string[]): string[] {
  if (step === "vitest") return ["node_modules/vitest/vitest.mjs", "run", ...vitestArgs];
  return ["--import", "tsx", "scripts/build-content.ts", ...(step === "build-with-sample" ? ["--with-sample"] : [])];
}

/** A child process's exit code: its own, or 128 + the signal's number when a signal ended it (130 for SIGINT). */
export function childExitCode(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  return signal ? 128 + (constants.signals[signal] ?? 0) : 1;
}

export interface SampleTestRun {
  /** Runs a step to its end and gives its exit code. */
  run(step: SampleTestStep): Promise<number>;
  /** Whether Ctrl+C (SIGINT) or SIGTERM has reached the command. */
  interrupted(): boolean;
  log(line: string): void;
}

/**
 * The steps in order: the build with the sample, the tests only when that build succeeded and nothing interrupted
 * it, and the build without the sample always. The exit code is vitest's; without a vitest run it is 130 after an
 * interruption and the build's code otherwise. When the build without the sample fails after tests that passed, it
 * is 1, so that a script sees that the generated content still holds the sample.
 */
export async function runTestsWithSample(vitestArgs: readonly string[], { run, interrupted, log }: SampleTestRun): Promise<number> {
  const shown = ["vitest", "run", ...vitestArgs].join(" ");
  log(`${name}: 見本の編を入れて生成し、単体テスト（${shown}）を流し、最後に見本なしで生成し直します。`);
  const sampleCode = await run("build-with-sample");
  const testCode = sampleCode === 0 && !interrupted() ? await run("vitest") : undefined;
  log(`${name}: 見本なしで生成し直しています…`);
  const restoreCode = await run("build-without-sample");
  const restored = restoreCode === 0
    ? "生成物は見本なしに戻しました。"
    : "生成物を見本なしに戻せませんでした（上に生成の出力があります）。npm run content:build を実行してください。";
  if (testCode === undefined) {
    const why = interrupted() ? "途中で止めたので" : "見本の編を入れた生成に失敗したので";
    log(`${name}: ${why}、単体テストは流していません。${restored}${interrupted() ? "" : "上のエラーを直してから、もう一度実行してください。"}`);
    return interrupted() ? 130 : sampleCode;
  }
  const outcome = testCode === 0 ? "単体テストが通りました。"
    : interrupted() ? `単体テストを途中で止めました（vitest の終了コード ${testCode}）。`
      : `単体テストが失敗しました（vitest の終了コード ${testCode}）。`;
  log(`${name}: ${outcome}${restored}`);
  return testCode === 0 && restoreCode !== 0 ? 1 : testCode;
}
