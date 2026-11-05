// TEMPORARY equivalence harness for the journey-folder refactor (phases P2-P9).
// Delete together with src/refactor-equivalence.test.ts in phase P10.
//
// Usage: npx tsx scripts/dev/refactor-baseline.ts write|check [options]
//   --dist                      also build with Vite into $SCRATCH/dist-check and hash the output
//   --skip-build                do not run `npm run content:build` first
//   --content-source auto|content|mirror
//                               auto (default): src/content/generated/content/ when it exists, else content/
//   --public-root DIR           served static files (default: src/content/generated/public/ when it exists, else public/)
//   --baseline DIR              baseline directory (default: $SCRATCH/refactor-baseline)
// write captures into the baseline directory; check captures into $SCRATCH/refactor-check and compares.
// The runtime part (exports, fingerprints, storage keys) is captured by src/refactor-equivalence.test.ts.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scratch = process.env.REFACTOR_SCRATCH ??
  "/tmp/claude-0/-home-user-dreamscape/166acf5d-4176-5db4-b7ac-26f10be92c60/scratchpad";
const checkDir = path.join(scratch, "refactor-check");
const distDir = path.join(scratch, "dist-check");
const mirrorDir = path.join(root, "src/content/generated/content");
const generatedPublicDir = path.join(root, "src/content/generated/public");

const journeyIds = ["golden_triangle", "uzbekistan", "luang_prabang"];
const cliCommands: { name: string; args: string[] }[] = [
  ...journeyIds.flatMap((journey) => [
    { name: `journey-readiness__${journey}`, args: ["journey:readiness", "--", "--journey", journey] },
    // Without a mode the scaffold tool only prints a usage error, so its read-only report mode is captured.
    { name: `journey-scaffold__${journey}`, args: ["journey:scaffold", "--", "--requirements", "--journey", journey] },
    { name: `journey-transit__${journey}`, args: ["journey:transit", "--", "--journey", journey] },
  ]),
  { name: "india-check", args: ["india:check"] },
];

function parseArgs(argv: string[]) {
  const [mode, ...rest] = argv;
  if (mode !== "write" && mode !== "check")
    throw new Error("Usage: refactor-baseline.ts write|check [--dist] [--skip-build] [--content-source auto|content|mirror] [--public-root DIR] [--baseline DIR]");
  const options = { mode, dist: false, skipBuild: false, contentSource: "auto", publicRoot: "", baseline: path.join(scratch, "refactor-baseline") };
  for (let index = 0; index < rest.length; index++) {
    const flag = rest[index];
    const value = () => {
      const next = rest[++index];
      if (!next) throw new Error(`${flag} needs a value`);
      return next;
    };
    if (flag === "--dist") options.dist = true;
    else if (flag === "--skip-build") options.skipBuild = true;
    else if (flag === "--content-source") options.contentSource = value();
    else if (flag === "--public-root") options.publicRoot = path.resolve(root, value());
    else if (flag === "--baseline") options.baseline = path.resolve(root, value());
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!["auto", "content", "mirror"].includes(options.contentSource)) throw new Error("--content-source must be auto, content or mirror");
  return options;
}

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const pretty = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const toPosix = (file: string) => file.split(path.sep).join("/");

function listFiles(dir: string, rel = ""): string[] {
  if (!existsSync(path.join(dir, rel))) return [];
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((entry) => {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      return entry.isDirectory() ? listFiles(dir, child) : [child];
    })
    .sort();
}

function writeFile(file: string, text: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 });
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// --- content view -------------------------------------------------------------------------

function resolveContentSource(source: string): "content" | "mirror" {
  if (source === "content" || source === "mirror") return source;
  return existsSync(mirrorDir) ? "mirror" : "content";
}

/** Every JSON file of the merged content view, as normalized JSON (key order kept, formatting dropped). */
function captureContent(target: string, source: "content" | "mirror") {
  const dir = source === "mirror" ? mirrorDir : path.join(root, "content");
  const files = listFiles(dir).filter((file) => file.endsWith(".json"));
  for (const file of files) writeFile(path.join(target, "content", file), pretty(JSON.parse(readFileSync(path.join(dir, file), "utf8"))));
  return files.length;
}

// --- generated / static files -------------------------------------------------------------

function captureGenerated(target: string) {
  const generated = Object.fromEntries(["stories.json", "quizzes.json"].map((name) =>
    [name, sha256(readFileSync(path.join(root, "src/content/generated", name)))]));
  writeFile(path.join(target, "generated.json"), pretty(generated));
}

function hashTree(dir: string): Record<string, string> {
  return Object.fromEntries(listFiles(dir).map((file) => [file, sha256(readFileSync(path.join(dir, file)))]));
}

function capturePublic(target: string, publicRoot: string) {
  const hashes = hashTree(publicRoot);
  writeFile(path.join(target, "public.json"), pretty(hashes));
  return Object.keys(hashes).length;
}

const hashedName = /^assets\/([^/]+)-[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/;

/** Vite output: static copies and other files by sha256; content-hashed bundle names normalized. */
function captureDist(target: string, publicRoot: string) {
  const build = run("npx", ["vite", "build", "--outDir", distDir, "--emptyOutDir"]);
  if (build.status !== 0) throw new Error(`vite build failed:\n${build.stdout}\n${build.stderr}`);
  const publicFiles = new Set(listFiles(publicRoot));
  const entries: Record<string, string> = {};
  for (const file of listFiles(distDir)) {
    const data = readFileSync(path.join(distDir, file));
    const hashed = publicFiles.has(file) ? null : hashedName.exec(file);
    if (file === "index.html") {
      const html = data.toString("utf8").replace(/(assets\/[^"'\s]+?)-[A-Za-z0-9_-]{8}\.(js|css)/g, "$1-[hash].$2");
      writeFile(path.join(target, "dist-index.html"), html);
      entries[file] = sha256(html);
    } else if (hashed) {
      let key = `assets/${hashed[1]}-[hash]${hashed[2]}`;
      for (let n = 2; Object.hasOwn(entries, key); n++) key = `assets/${hashed[1]}-[hash]${hashed[2]}#${n}`;
      // Code bundles change with any source refactor; only their presence is compared.
      entries[key] = /\.(js|css)$/.test(file) ? "(bundle: content not compared)" : sha256(data);
    } else entries[file] = sha256(data);
  }
  writeFile(path.join(target, "dist.json"), pretty(Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))));
  return Object.keys(entries).length;
}

// --- CLI output ---------------------------------------------------------------------------

const absolutePath = /(^|[\s"'(=:,[])\/(home|tmp|root|usr|var|private|Users|opt)\//;
const longHex = /\b(?=[0-9a-f]*[a-f])[0-9a-f]{12,}\b/;

/** Drop machine-specific lines (absolute paths, long hex fingerprints, Node process warnings). */
function stableLines(text: string): string[] {
  return text.split("\n").filter((line) => !line.includes(root) && !absolutePath.test(line) &&
    !longHex.test(line) && !/^\(node:\d+\)/.test(line) && !line.includes("node --trace-"));
}

/** A thrown error is recorded by its message only; source excerpts and stack frames follow the code. */
function stableStderr(text: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => /^[A-Za-z]*Error\b/.test(line));
  if (start === -1) return stableLines(text);
  const end = lines.findIndex((line, index) => index > start && /^\s+at /.test(line));
  return stableLines(lines.slice(start, end === -1 ? undefined : end).join("\n"));
}

function captureCli(target: string) {
  for (const command of cliCommands) {
    const result = run("npm", ["run", "-s", ...command.args]);
    const text = [`$ npm run -s ${command.args.join(" ")}`, `exit: ${result.status}`, "--- stdout",
      ...stableLines(result.stdout), "--- stderr", ...stableStderr(result.stderr)].join("\n");
    writeFile(path.join(target, "cli", `${command.name}.txt`), `${text.trimEnd()}\n`);
    console.log(`  cli ${command.name}: exit ${result.status}`);
  }
}

// --- comparison ---------------------------------------------------------------------------

function describeJsonDiff(expected: unknown, actual: unknown): string {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const first = expected.findIndex((item, index) => JSON.stringify(item) !== JSON.stringify(actual[index]));
    return `array length ${expected.length} -> ${actual.length}; first differing index ${first === -1 ? expected.length : first}`;
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const before = expected as Record<string, unknown>, after = actual as Record<string, unknown>;
    const removed = Object.keys(before).filter((key) => !Object.hasOwn(after, key));
    const added = Object.keys(after).filter((key) => !Object.hasOwn(before, key));
    const changed = Object.keys(before).filter((key) => Object.hasOwn(after, key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const order = removed.length + added.length + changed.length === 0 ? " (key order only)" : "";
    const show = (keys: string[]) => keys.slice(0, 30).join(", ") + (keys.length > 30 ? ` …(+${keys.length - 30})` : "");
    return `removed [${show(removed)}] added [${show(added)}] changed [${show(changed)}]${order}`;
  }
  return `${JSON.stringify(expected)?.slice(0, 200)} -> ${JSON.stringify(actual)?.slice(0, 200)}`;
}

function describeTextDiff(expected: string, actual: string): string {
  const a = expected.split("\n"), b = actual.split("\n");
  const line = a.findIndex((text, index) => text !== b[index]);
  const at = line === -1 ? a.length : line;
  return `first difference at line ${at + 1}: ${JSON.stringify(a[at] ?? "<end>")} -> ${JSON.stringify(b[at] ?? "<end>")}`;
}

function compareFile(rel: string, baseline: string, actual: string): string | null {
  const expectedPath = path.join(baseline, rel), actualPath = path.join(actual, rel);
  if (!existsSync(expectedPath)) return `${rel}: no baseline`;
  if (!existsSync(actualPath)) return `${rel}: not captured`;
  const expected = readFileSync(expectedPath, "utf8"), current = readFileSync(actualPath, "utf8");
  if (expected === current) return null;
  return `${rel}: ${rel.endsWith(".json") ? describeJsonDiff(JSON.parse(expected), JSON.parse(current)) : describeTextDiff(expected, current)}`;
}

function compareTree(dir: string, baseline: string, actual: string, optional: (file: string) => boolean = () => false) {
  const expectedFiles = listFiles(path.join(baseline, dir)), actualFiles = new Set(listFiles(path.join(actual, dir)));
  const differences: string[] = [];
  let exempt = 0;
  for (const file of expectedFiles) {
    if (!actualFiles.has(file)) {
      if (optional(file)) exempt++;
      else differences.push(`${dir}/${file}: missing`);
      continue;
    }
    const difference = compareFile(`${dir}/${file}`, baseline, actual);
    if (difference) differences.push(difference);
  }
  const expectedSet = new Set(expectedFiles);
  for (const file of actualFiles) if (!expectedSet.has(file)) differences.push(`${dir}/${file}: unexpected new file`);
  if (expectedFiles.length === 0) differences.push(`${dir}: no baseline`);
  return { differences, compared: expectedFiles.length - exempt, exempt };
}

// --- main ---------------------------------------------------------------------------------

function main() {
  const options = parseArgs(process.argv.slice(2));
  const target = options.mode === "write" ? options.baseline : checkDir;
  if (options.mode === "check" && !existsSync(path.join(options.baseline, "BASELINE_SHA")))
    throw new Error(`No baseline at ${options.baseline}; run write mode first.`);

  if (!options.skipBuild) {
    console.log("content:build …");
    const build = run("npm", ["run", "-s", "content:build"]);
    if (build.status !== 0) throw new Error(`content:build failed:\n${build.stdout}\n${build.stderr}`);
  }
  // Clear previous output, but keep nothing stale: the capture is the whole directory.
  for (const entry of ["content", "cli", "runtime", "generated.json", "public.json", "dist.json", "dist-index.html"])
    rmSync(path.join(target, entry), { recursive: true, force: true });

  const contentSource = resolveContentSource(options.contentSource);
  const publicRoot = options.publicRoot || (existsSync(generatedPublicDir) ? generatedPublicDir : path.join(root, "public"));
  console.log(`content (${contentSource}): ${captureContent(target, contentSource)} JSON files`);
  captureGenerated(target);
  console.log(`public (${toPosix(path.relative(root, publicRoot))}): ${capturePublic(target, publicRoot)} files`);
  if (options.dist) console.log(`dist: ${captureDist(target, publicRoot)} files`);
  captureCli(target);

  console.log(`runtime (vitest) …`);
  const vitest = spawnSync("npx", ["vitest", "run", "src/refactor-equivalence.test.ts"], {
    cwd: root, stdio: "inherit",
    env: { ...process.env, REFACTOR_BASELINE: options.mode, REFACTOR_BASELINE_DIR: options.baseline, REFACTOR_ACTUAL_DIR: checkDir },
  });

  const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const dirty = run("git", ["status", "--porcelain"]).stdout.split("\n").filter(Boolean);
  if (options.mode === "write") {
    writeFile(path.join(target, "BASELINE_SHA"), `${head}\n`);
    writeFile(path.join(target, "capture-info.json"), pretty({ sha: head, dirty, contentSource,
      publicRoot: toPosix(path.relative(root, publicRoot)), dist: options.dist, capturedAt: new Date().toISOString() }));
    writeFile(path.join(target, "README.md"), readme(head));
    if (dirty.length) console.warn(`WARNING: working tree is not clean; BASELINE_SHA ${head} does not fully describe the capture:\n${dirty.join("\n")}`);
    if (vitest.status !== 0) throw new Error("runtime capture failed");
    console.log(`Baseline written to ${target} (BASELINE_SHA ${head})`);
    return;
  }

  const baselineSha = readFileSync(path.join(options.baseline, "BASELINE_SHA"), "utf8").trim();
  const differences: string[] = [];
  const quizzesInMirror = contentSource === "mirror";
  const content = compareTree("content", options.baseline, target,
    // Quiz files are compiled into generated/quizzes.json, which is compared byte for byte.
    (file) => quizzesInMirror && file.startsWith("quizzes/"));
  differences.push(...content.differences);
  console.log(`content: ${content.compared} files compared${content.exempt ? `, ${content.exempt} quiz files not mirrored (covered by quizzes.json)` : ""}`);
  for (const file of ["generated.json", "public.json"]) {
    const difference = compareFile(file, options.baseline, target);
    if (difference) differences.push(difference);
  }
  if (options.dist) {
    for (const file of ["dist.json", "dist-index.html"]) {
      const difference = compareFile(file, options.baseline, target);
      if (difference) differences.push(difference);
    }
  } else console.log("dist: skipped (use --dist)");
  differences.push(...compareTree("cli", options.baseline, target).differences);
  if (vitest.status !== 0) differences.push("runtime: vitest check failed (see output above; files in refactor-check/runtime)");

  console.log(`\nBaseline ${baselineSha} vs HEAD ${head}${dirty.length ? " (+ uncommitted changes)" : ""}`);
  if (differences.length === 0) {
    console.log("EQUIVALENT: no differences.");
    return;
  }
  console.log(`DIFFERENCES (${differences.length}); captured files are in ${target}:`);
  for (const difference of differences) console.log(`  - ${difference}`);
  process.exitCode = 1;
}

function readme(sha: string): string {
  return `# Refactor equivalence baseline

Captured by \`scripts/dev/refactor-baseline.ts\` + \`src/refactor-equivalence.test.ts\` (temporary harness,
deleted in phase P10) at commit \`${sha}\` (see BASELINE_SHA, capture-info.json).

## Commands (run in /home/user/dreamscape)

- write: \`npx tsx scripts/dev/refactor-baseline.ts write --dist\`
- check: \`npx tsx scripts/dev/refactor-baseline.ts check --dist\`
  (exit 1 and a list of differences when anything differs; the fresh capture is left in
  \`${checkDir}\` for \`diff -r\`). Runtime part only:
  \`REFACTOR_BASELINE=check npx vitest run src/refactor-equivalence.test.ts\`.
- Options: \`--skip-build\` (no content:build first), \`--content-source auto|content|mirror\`,
  \`--public-root DIR\`, \`--baseline DIR\`.

## Contents

- \`content/<relative path>.json\`: every JSON of the merged content view, normalized with
  \`JSON.stringify(JSON.parse(text), null, 2)\` (deep equality incl. key order; formatting ignored).
  Source: \`content/**/*.json\` today; \`src/content/generated/content/**\` once it exists (auto). In mirror
  mode, baseline \`quizzes/*.json\` may be absent (they are compiled into quizzes.json).
- \`generated.json\`: sha256 of \`src/content/generated/stories.json\` and \`quizzes.json\`.
- \`public.json\`: sha256 by URL path of every served static file (public/ today; the assembled
  src/content/generated/public/ once it exists).
- \`dist.json\` + \`dist-index.html\` (--dist): \`vite build --outDir ${distDir}\`; static copies and
  index.html (hashed bundle names replaced by [hash]) by sha256; JS/CSS bundles by presence only.
- \`cli/*.txt\`: exit code, stdout and stderr error message of \`npm run -s journey:readiness|journey:scaffold
  (--requirements)|journey:transit -- --journey golden_triangle|uzbekistan|luang_prabang\` and
  \`npm run -s india:check\`; lines with absolute paths, long hex strings, Node warnings and stack frames removed.
- \`runtime/\` (vitest): \`exports/<module>/<export>.json\` for src/content/index.ts, journeys.ts, encounters.ts
  (\`_exports.json\` lists every export and its type); \`cities/get-cities.json\` (getCities() order),
  \`cities/tag-context.json\`; \`fingerprints/{battles,tourism,stories,encounters}.json\`;
  \`persistence/journey-storage.json\` (save, backup prefix and learning physical keys per journey).

## Regenerating this baseline from BASELINE_SHA

\`\`\`sh
SP=${scratch}
SHA=$(cat $SP/refactor-baseline/BASELINE_SHA)
git -C /home/user/dreamscape worktree add --detach $SP/baseline-regen-wt $SHA
ln -s /home/user/dreamscape/node_modules $SP/baseline-regen-wt/node_modules
cd $SP/baseline-regen-wt && npx tsx scripts/dev/refactor-baseline.ts write --dist --baseline $SP/refactor-baseline-regen
git -C /home/user/dreamscape worktree remove --force $SP/baseline-regen-wt
\`\`\`
`;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
