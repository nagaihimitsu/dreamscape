import { describe, expect, it } from "vitest";
import {
  filesNotOnMain, mergeTitle, parseAfterSquashArgs, pushLines, squashedPullRequest, syncAfterSquash, type GitResult,
} from "./branch-after-squash";

const sha = "87e1266aaaabbbbccccddddeeeeffff000011112";
const ok = (stdout = ""): GitResult => ({ ok: true, stdout, stderr: "" });
const failed = (stderr = ""): GitResult => ({ ok: false, stdout: "", stderr });

/** A git that answers by the start of the command (the overrides replace the answers of a clean sync); it records every call. */
function fakeGit(overrides: Record<string, GitResult> = {}) {
  const answers: Record<string, GitResult> = {
    "rev-parse --is-inside-work-tree": ok("true\n"),
    "symbolic-ref --quiet --short HEAD": ok("tmp\n"),
    "status --porcelain --untracked-files=no": ok(""),
    [`rev-parse --verify --quiet ${sha.slice(0, 7)}^{commit}`]: ok(`${sha}\n`),
    "rev-parse HEAD": ok(`${sha}\n`),
    "fetch origin main": ok(),
    "merge-base HEAD origin/main": ok("996c3f7000\n"),
    "diff --name-only --no-renames 996c3f7000 HEAD": ok("docs/12_DEVELOPMENT.md\nscripts/a.ts\n"),
    "diff --name-only --no-renames HEAD origin/main": ok(""),
    "log --format=%s 996c3f7000..origin/main": ok("Credits are written once (#145)\n"),
    "checkout --no-track -B tmp origin/main": ok(),
    "merge -s ours": ok(),
    "rev-parse --short origin/main": ok("aaa1111\n"),
    "rev-parse --short HEAD": ok("bbb2222\n"),
    "for-each-ref": ok("claude/dreamscape-code-refactor-3dp0r3\n"),
    ...overrides,
  };
  const calls: string[][] = [];
  const git = (args: readonly string[]) => {
    calls.push([...args]);
    const command = args.join(" ");
    const key = Object.keys(answers).find((start) => command.startsWith(start));
    if (!key) throw new Error(`unexpected git ${command}`);
    return answers[key];
  };
  return { git, calls };
}

describe("branch:after-squash arguments", () => {
  it("takes one SHA and -m paragraphs in order", () => {
    expect(parseAfterSquashArgs([sha.slice(0, 7), "-m", "Co-Authored-By: X", "-m", "Claude-Session: Y"]))
      .toEqual({ sha: sha.slice(0, 7), paragraphs: ["Co-Authored-By: X", "Claude-Session: Y"] });
    expect(parseAfterSquashArgs(["-m", "p", sha])).toEqual({ sha, paragraphs: ["p"] });
  });

  it("refuses a missing or malformed SHA, an empty -m and unknown options, in Japanese", () => {
    expect(() => parseAfterSquashArgs([])).toThrow(/^使い方: npm run branch:after-squash/u);
    expect(() => parseAfterSquashArgs(["main"])).toThrow("main はコミットの SHA の形（7〜40桁の16進数）ではありません。");
    expect(() => parseAfterSquashArgs([sha, "-m"])).toThrow("-m の後に段落の文を書きます。");
    expect(() => parseAfterSquashArgs([sha, "--push"])).toThrow("知らない指定です: --push。");
  });
});

describe("branch:after-squash helpers", () => {
  it("lists the changed files that differ on origin/main", () => {
    expect(filesNotOnMain(["b.ts", "a.ts", "c.ts"], ["c.ts", "z.ts", "a.ts"])).toEqual(["a.ts", "c.ts"]);
    expect(filesNotOnMain(["a.ts"], ["z.ts"])).toEqual([]);
  });

  it("names the pull request in the first line when origin/main gained exactly one squash commit", () => {
    expect(squashedPullRequest(["Docs (#144)", "Fix a typo"])).toBe(144);
    expect(squashedPullRequest(["A (#144)", "B (#145)"])).toBeUndefined();
    expect(squashedPullRequest(["Merge pull request #3 from x"])).toBeUndefined();
    expect(mergeTitle("tmp", sha)).toBe("Merge branch head 87e1266 into tmp after the squash merge");
    expect(mergeTitle("tmp", sha, 145)).toBe("Merge branch head 87e1266 into tmp after the squash merge of #145");
  });

  it("prints the push to the pull request's branch, which may have another name", () => {
    expect(pushLines("tmp", sha, ["claude/x"]).at(-1)).toBe("  git push origin tmp:claude/x");
    expect(pushLines("feat", sha, ["feat"]).at(-1)).toBe("  git push origin feat");
    expect(pushLines("tmp", sha, ["a", "b"]).slice(1)).toEqual(["  git push origin tmp:a", "  git push origin tmp:b"]);
    const none = pushLines("tmp", sha, []);
    expect(none[0]).toContain("origin で 87e1266 を指すブランチが見つかりませんでした。");
    expect(none.at(-1)).toBe("  git push origin tmp");
  });
});

describe("branch:after-squash steps", () => {
  it("fetches, checks, puts the branch on origin/main without changing its upstream, and merges -s ours with the paragraphs", () => {
    const { git, calls } = fakeGit();
    const result = syncAfterSquash(git, { sha: sha.slice(0, 7), paragraphs: ["Co-Authored-By: X"] });
    expect(result.ok).toBe(true);
    expect(calls).toContainEqual(["checkout", "--no-track", "-B", "tmp", "origin/main"]);
    expect(calls).toContainEqual(["merge", "-s", "ours", "--no-edit", "-m", "Merge branch head 87e1266 into tmp after the squash merge of #145",
      "-m", "Co-Authored-By: X", sha]);
    expect(calls.some((call) => call[0] === "push")).toBe(false);
    expect(result.lines).toEqual([
      "branch:after-squash: tmp を origin/main（aaa1111）に合わせ、合流した 87e1266 を履歴としてつなぎました（git merge -s ours。中身は origin/main のまま）。",
      "新しい HEAD：bbb2222（変えたファイル 2 件が、すべて origin/main と同じ内容でした）",
      "次は push です（push はしていません。PR のブランチへの fast-forward になります）：",
      "  git push origin tmp:claude/dreamscape-code-refactor-3dp0r3",
    ]);
  });

  it("refuses uncommitted changes, before fetching", () => {
    const { git, calls } = fakeGit({ "status --porcelain --untracked-files=no": ok(" M scripts/a.ts\nA  b.ts\n") });
    const result = syncAfterSquash(git, { sha, paragraphs: [] });
    expect(result).toEqual({ ok: false, lines: ["branch:after-squash: 合わせ直しをやめました。", "コミットしていない変更があります（2 件）：",
      "  - M scripts/a.ts", "  - A  b.ts", "コミットするか元に戻してから、もう一度実行してください。"] });
    expect(calls.some((call) => call[0] === "fetch")).toBe(false);
  });

  it("refuses a HEAD that is not the given SHA, so that no local commit is thrown away", () => {
    const { git, calls } = fakeGit({ "rev-parse HEAD": ok("ccc3333dddd\n") });
    const result = syncAfterSquash(git, { sha: sha.slice(0, 7), paragraphs: [] });
    expect(result.ok).toBe(false);
    expect(result.lines[1]).toBe("HEAD（ccc3333）が、渡したコミット（87e1266）ではありません。HEAD にしかないコミットを失わないよう、止めました。");
    expect(result.lines[2]).toContain("git log --oneline 87e1266..HEAD");
    expect(calls.some((call) => call[0] === "checkout")).toBe(false);
  });

  it("refuses when a changed file differs on origin/main, and lists those files", () => {
    const { git, calls } = fakeGit({ "diff --name-only --no-renames HEAD origin/main": ok("scripts/a.ts\nother.ts\n") });
    const result = syncAfterSquash(git, { sha: sha.slice(0, 7), paragraphs: [] });
    expect(result.ok).toBe(false);
    expect(result.lines.slice(1, 3)).toEqual(["このブランチで変えたファイルのうち 1 件が、origin/main では違う内容です：", "  - scripts/a.ts"]);
    expect(result.lines[3]).toContain("git diff 87e1266 origin/main -- <ファイル>");
    expect(calls.some((call) => call[0] === "checkout")).toBe(false);
  });

  it("refuses detached HEAD, main, an unknown SHA, a failed fetch and a branch without changes", () => {
    const reasonOf = (overrides: Record<string, GitResult>) => syncAfterSquash(fakeGit(overrides).git, { sha: sha.slice(0, 7), paragraphs: [] }).lines[1];
    expect(reasonOf({ "symbolic-ref --quiet --short HEAD": failed() })).toContain("detached HEAD");
    expect(reasonOf({ "symbolic-ref --quiet --short HEAD": ok("main\n") })).toBe("main ブランチでは使えません。PR を出した作業ブランチで実行してください。");
    expect(reasonOf({ [`rev-parse --verify --quiet ${sha.slice(0, 7)}^{commit}`]: failed() })).toContain("87e1266 というコミットが手元にありません。");
    expect(reasonOf({ "fetch origin main": failed("fatal: unable to access 'https://github.com/x/'\n") }))
      .toBe("git fetch origin main に失敗しました：fatal: unable to access 'https://github.com/x/'");
    expect(reasonOf({ "diff --name-only --no-renames 996c3f7000 HEAD": ok("") })).toContain("合わせ直すものはありません。");
  });

  it("says how to go back when the merge fails after the checkout", () => {
    const result = syncAfterSquash(fakeGit({ "merge -s ours": failed("error: x\n") }).git, { sha: sha.slice(0, 7), paragraphs: [] });
    expect(result.ok).toBe(false);
    expect(result.lines.slice(1)).toEqual(["git merge に失敗しました：error: x", "tmp は origin/main の位置にあります。元に戻すには git reset --hard 87e1266 を実行します。"]);
  });
});
