import { spawn, type ChildProcess } from "node:child_process";
import { childExitCode, runTestsWithSample, stepCommand, type SampleTestStep } from "./test-with-sample";

// npm run test:with-sample -- [vitest arguments] (test-with-sample.ts). Ctrl+C reaches the running build or vitest
// as in a terminal; this process waits for it and then builds without the sample. That last build runs in its own
// process group (not on Windows), so that a second Ctrl+C does not stop it halfway.
const root = process.cwd();
const vitestArgs = process.argv.slice(2);
let interrupted = false;
let running: { step: SampleTestStep; child: ChildProcess } | undefined;
let waitNoted = false;

const onSignal = (signal: NodeJS.Signals) => {
  interrupted = true;
  // Ctrl+C can arrive more than once (pressed again, or passed on by npm and tsx too): one note is enough.
  if (running?.step === "build-without-sample") {
    if (!waitNoted) console.log("test:with-sample: 見本なしの生成が終わるのを待ってから止まります。");
    waitNoted = true;
  }
  // A signal sent to this process alone (not Ctrl+C in the terminal) is passed on.
  else if (running && running.child.exitCode === null && running.child.signalCode === null) running.child.kill(signal);
};
process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);

const run = (step: SampleTestStep) => new Promise<number>((resolve) => {
  const restore = step === "build-without-sample";
  // The last build's output only when it fails: the test results stay the last thing above the closing line.
  const child = spawn(process.execPath, stepCommand(step, vitestArgs), {
    cwd: root,
    stdio: restore ? ["ignore", "pipe", "pipe"] : "inherit",
    detached: restore && process.platform !== "win32",
  });
  running = { step, child };
  const output: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => output.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => output.push(chunk));
  child.on("error", (error) => {
    console.error(`test:with-sample: ${step === "vitest" ? "vitest" : "content:build"} を始められませんでした：${error.message}`);
    running = undefined;
    resolve(1);
  });
  child.on("close", (code, signal) => {
    running = undefined;
    const exitCode = childExitCode(code, signal);
    if (restore && exitCode !== 0) process.stderr.write(Buffer.concat(output));
    resolve(exitCode);
  });
});

process.exitCode = await runTestsWithSample(vitestArgs, { run, interrupted: () => interrupted, log: (line) => console.log(line) });
