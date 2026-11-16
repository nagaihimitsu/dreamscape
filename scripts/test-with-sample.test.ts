import { describe, expect, it } from "vitest";
import { childExitCode, runTestsWithSample, stepCommand, type SampleTestStep } from "./test-with-sample";

/** Runs the steps with the given exit codes (0 for a step not listed); `interruptAt` sets the interruption during that step. */
async function simulate(codes: Partial<Record<SampleTestStep, number>>, interruptAt?: SampleTestStep) {
  const steps: SampleTestStep[] = [];
  const lines: string[] = [];
  let interrupted = false;
  const exitCode = await runTestsWithSample(["tests/journeys/sample_trip/"], {
    run: async (step) => {
      steps.push(step);
      if (step === interruptAt) interrupted = true;
      return codes[step] ?? 0;
    },
    interrupted: () => interrupted,
    log: (line) => lines.push(line),
  });
  return { steps, lines, exitCode };
}

describe("test:with-sample", () => {
  it("builds with the sample, runs vitest with the arguments, and builds without the sample", async () => {
    const { steps, lines, exitCode } = await simulate({});
    expect(steps).toEqual(["build-with-sample", "vitest", "build-without-sample"]);
    expect(exitCode).toBe(0);
    expect(lines[0]).toBe("test:with-sample: 見本の編を入れて生成し、単体テスト（vitest run tests/journeys/sample_trip/）を流し、最後に見本なしで生成し直します。");
    expect(lines.at(-1)).toBe("test:with-sample: 単体テストが通りました。生成物は見本なしに戻しました。");
  });

  it("rebuilds without the sample after failing tests and exits with vitest's code", async () => {
    const { steps, lines, exitCode } = await simulate({ vitest: 1 });
    expect(steps.at(-1)).toBe("build-without-sample");
    expect(exitCode).toBe(1);
    expect(lines.at(-1)).toBe("test:with-sample: 単体テストが失敗しました（vitest の終了コード 1）。生成物は見本なしに戻しました。");
  });

  it("rebuilds without the sample after Ctrl+C during the tests", async () => {
    const { steps, lines, exitCode } = await simulate({ vitest: 130 }, "vitest");
    expect(steps).toEqual(["build-with-sample", "vitest", "build-without-sample"]);
    expect(exitCode).toBe(130);
    expect(lines.at(-1)).toContain("単体テストを途中で止めました（vitest の終了コード 130）。生成物は見本なしに戻しました。");
  });

  it("skips the tests when the build with the sample fails or is interrupted, and still rebuilds without it", async () => {
    const failed = await simulate({ "build-with-sample": 1 });
    expect(failed.steps).toEqual(["build-with-sample", "build-without-sample"]);
    expect(failed.exitCode).toBe(1);
    expect(failed.lines.at(-1)).toContain("見本の編を入れた生成に失敗したので、単体テストは流していません。生成物は見本なしに戻しました。上のエラーを直して");
    const stopped = await simulate({ "build-with-sample": 130 }, "build-with-sample");
    expect(stopped.steps).toEqual(["build-with-sample", "build-without-sample"]);
    expect(stopped.exitCode).toBe(130);
    expect(stopped.lines.at(-1)).toBe("test:with-sample: 途中で止めたので、単体テストは流していません。生成物は見本なしに戻しました。");
  });

  it("says when the build without the sample fails, and exits 1 even though the tests passed", async () => {
    const { lines, exitCode } = await simulate({ "build-without-sample": 1 });
    expect(exitCode).toBe(1);
    expect(lines.at(-1)).toContain("生成物を見本なしに戻せませんでした（上に生成の出力があります）。npm run content:build を実行してください。");
    expect((await simulate({ vitest: 2, "build-without-sample": 1 })).exitCode).toBe(2);
  });

  it("gives each step's command and a signal's exit code", () => {
    expect(stepCommand("build-with-sample", [])).toEqual(["--import", "tsx", "scripts/build-content.ts", "--with-sample"]);
    expect(stepCommand("build-without-sample", ["x"])).toEqual(["--import", "tsx", "scripts/build-content.ts"]);
    expect(stepCommand("vitest", ["--project", "quick", "a.test.ts"])).toEqual(["node_modules/vitest/vitest.mjs", "run", "--project", "quick", "a.test.ts"]);
    expect(childExitCode(3, null)).toBe(3);
    expect(childExitCode(null, "SIGINT")).toBe(130);
    expect(childExitCode(null, "SIGTERM")).toBe(143);
  });
});
