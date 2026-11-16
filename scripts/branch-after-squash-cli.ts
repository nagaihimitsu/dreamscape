import { spawnSync } from "node:child_process";
import { errorText } from "./cli-error";
import { parseAfterSquashArgs, syncAfterSquash, type Git } from "./branch-after-squash";

// npm run branch:after-squash -- <merged head SHA> [-m <paragraph>]... (branch-after-squash.ts), in the current directory.
// File names as they are (not quoted in octal), so that Japanese names read in the messages.
const git: Git = (args) => {
  const result = spawnSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8" });
  return { ok: result.status === 0, stdout: result.stdout ?? "", stderr: result.stderr ?? result.error?.message ?? "" };
};
try {
  const { ok, lines } = syncAfterSquash(git, parseAfterSquashArgs(process.argv.slice(2)));
  (ok ? console.log : console.error)(lines.join("\n"));
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error(errorText(error));
  process.exitCode = 1;
}
