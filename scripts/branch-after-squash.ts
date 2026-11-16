// npm run branch:after-squash -- <merged head SHA> [-m <paragraph>]...: after GitHub squash-merged a pull request from
// the work branch, put the local branch back on origin/main and join the merged head to it with `git merge -s ours`
// (the tree stays origin/main's), so the history is kept and the next push to the pull request's branch is a
// fast-forward. It replaces the by-hand steps
//   git fetch origin main; git checkout -B <branch> origin/main; git merge -s ours <sha> -m … -m <trailer>
// and checks first that nothing is lost: a clean working tree, HEAD exactly at the merged head, and every file the
// branch changed since it forked from origin/main the same on origin/main (the squash landed). It uses
// `checkout --no-track`, so the branch keeps its upstream (a plain `checkout -B … origin/main` sets it to main). It
// never pushes; it prints the push command. The steps are here with git injected; branch-after-squash-cli.ts runs git.

export interface GitResult { ok: boolean; stdout: string; stderr: string }
/** Runs git with the arguments in the repository. */
export type Git = (args: readonly string[]) => GitResult;

export interface AfterSquashArgs { sha: string; paragraphs: string[] }

const name = "branch:after-squash";
const usage = `使い方: npm run ${name} -- <合流した PR の最後のコミットの SHA> [-m <コミットメッセージに足す段落>]...`;

/** One SHA (7 to 40 hex digits) and any number of `-m <paragraph>`, in any order. */
export function parseAfterSquashArgs(argv: readonly string[]): AfterSquashArgs {
  const paragraphs: string[] = [];
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "-m") {
      const paragraph = argv[index + 1];
      if (paragraph === undefined || !paragraph.trim()) throw new Error(`-m の後に段落の文を書きます。${usage}`);
      paragraphs.push(paragraph);
      index++;
    } else if (arg.startsWith("-")) throw new Error(`知らない指定です: ${arg}。${usage}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) throw new Error(usage);
  const [sha] = positional;
  if (!/^[0-9a-f]{7,40}$/iu.test(sha)) throw new Error(`${sha} はコミットの SHA の形（7〜40桁の16進数）ではありません。${usage}`);
  return { sha, paragraphs };
}

/**
 * The first line of the merge commit's message, before the caller's paragraphs, with the pull request's number when
 * one is known (authoring/AI_DELEGATION_GUIDE.md, 公開の流れ).
 */
export function mergeTitle(branch: string, sha: string, pullRequest?: number): string {
  return `Merge branch head ${sha.slice(0, 7)} into ${branch} after the squash merge${pullRequest ? ` of #${pullRequest}` : ""}`;
}

/**
 * The pull request's number, from the subjects of the commits origin/main gained since the fork point: GitHub ends a
 * squash commit's subject with 「(#<number>)」. Undefined unless exactly one subject does (other pull requests merged
 * meanwhile make it unclear which one is this branch's).
 */
export function squashedPullRequest(subjects: readonly string[]): number | undefined {
  const numbers = subjects.flatMap((subject) => /\(#(\d+)\)$/u.exec(subject.trim())?.[1] ?? []);
  return numbers.length === 1 ? Number(numbers[0]) : undefined;
}

/** The files the branch changed (`changed`) that are not the same on origin/main (`differing`: those that differ between HEAD and it). */
export function filesNotOnMain(changed: readonly string[], differing: readonly string[]): string[] {
  const differ = new Set(differing);
  return [...new Set(changed)].filter((file) => differ.has(file)).sort();
}

/**
 * The push command after the sync. `remoteBranches` are the branches of origin whose tip is the merged head (the
 * pull request's branch, found by `git for-each-ref --points-at`); its name may differ from the local branch's.
 */
export function pushLines(branch: string, sha: string, remoteBranches: readonly string[]): string[] {
  const command = (remote: string) => (remote === branch ? `  git push origin ${branch}` : `  git push origin ${branch}:${remote}`);
  if (remoteBranches.length === 1) return ["次は push です（push はしていません。PR のブランチへの fast-forward になります）：", command(remoteBranches[0])];
  if (remoteBranches.length > 1)
    return [`次は push です（push はしていません）。origin で ${sha.slice(0, 7)} を指すブランチが ${remoteBranches.length} つあるので、PR のブランチのものを使います：`,
      ...remoteBranches.map(command)];
  return [`次は push です（push はしていません）。origin で ${sha.slice(0, 7)} を指すブランチが見つかりませんでした。`
    + `PR のブランチ名が ${branch} と違うときは、git push origin ${branch}:<PR のブランチ名> にします：`, command(branch)];
}

const lines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
const firstLine = (result: GitResult) => lines(result.stderr)[0] ?? lines(result.stdout)[0] ?? "理由は出ませんでした";
const listed = (files: readonly string[], limit = 20) =>
  [...files.slice(0, limit).map((file) => `  - ${file}`), ...(files.length > limit ? [`  ほか ${files.length - limit} 件`] : [])];

/** Checks, then syncs the branch; `ok` false with the reason and what to do when it refuses or a git step fails. */
export function syncAfterSquash(git: Git, { sha, paragraphs }: AfterSquashArgs): { ok: boolean; lines: string[] } {
  const refuse = (...reason: string[]) => ({ ok: false, lines: [`${name}: 合わせ直しをやめました。`, ...reason] });
  if (!git(["rev-parse", "--is-inside-work-tree"]).ok) return refuse("git のリポジトリの中で実行してください。");
  const branchResult = git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (!branchResult.ok) return refuse("HEAD がブランチを指していません（detached HEAD）。PR を出した作業ブランチに切り替えてから実行してください。");
  const branch = branchResult.stdout.trim();
  if (branch === "main") return refuse("main ブランチでは使えません。PR を出した作業ブランチで実行してください。");
  // Untracked files are left alone: the checkout keeps them, or stops without losing them.
  const changes = lines(git(["status", "--porcelain", "--untracked-files=no"]).stdout);
  if (changes.length) return refuse(`コミットしていない変更があります（${changes.length} 件）：`, ...listed(changes),
    "コミットするか元に戻してから、もう一度実行してください。");
  const resolved = git(["rev-parse", "--verify", "--quiet", `${sha}^{commit}`]);
  if (!resolved.ok) return refuse(`${sha} というコミットが手元にありません。GitHub の PR に出ている最後のコミットの SHA を確かめてください。`);
  const merged = resolved.stdout.trim();
  const short = merged.slice(0, 7);
  const head = git(["rev-parse", "HEAD"]).stdout.trim();
  if (head !== merged) return refuse(`HEAD（${head.slice(0, 7)}）が、渡したコミット（${short}）ではありません。`
    + "HEAD にしかないコミットを失わないよう、止めました。",
  `合流した PR の最後のコミットが HEAD のときに実行します。${short} の後のコミットは git log --oneline ${short}..HEAD で確かめられます。`);
  const fetched = git(["fetch", "origin", "main"]);
  if (!fetched.ok) return refuse(`git fetch origin main に失敗しました：${firstLine(fetched)}`, "ネットワークと origin の設定を確かめてください。");
  const baseResult = git(["merge-base", "HEAD", "origin/main"]);
  if (!baseResult.ok) return refuse("HEAD と origin/main に共通の祖先がありません。PR を出したブランチか確かめてください。");
  const base = baseResult.stdout.trim();
  const changed = lines(git(["diff", "--name-only", "--no-renames", base, "HEAD"]).stdout);
  if (!changed.length) return refuse(`${short} には、origin/main から分かれた所（${base.slice(0, 7)}）から変えたファイルがありません。合わせ直すものはありません。`);
  const missing = filesNotOnMain(changed, lines(git(["diff", "--name-only", "--no-renames", "HEAD", "origin/main"]).stdout));
  if (missing.length) return refuse(`このブランチで変えたファイルのうち ${missing.length} 件が、origin/main では違う内容です：`, ...listed(missing),
    "スカッシュがまだ main に入っていないか、合流の後に main でそのファイルが変わりました。"
    + `違いは git diff ${short} origin/main -- <ファイル> で確かめられます。`);

  const pullRequest = squashedPullRequest(lines(git(["log", "--format=%s", `${base}..origin/main`]).stdout));
  const checkout = git(["checkout", "--no-track", "-B", branch, "origin/main"]);
  if (!checkout.ok) return refuse(`git checkout に失敗しました：${firstLine(checkout)}`, `${branch} は元のまま（${short}）です。`);
  const merge = git(["merge", "-s", "ours", "--no-edit", "-m", mergeTitle(branch, merged, pullRequest), ...paragraphs.flatMap((paragraph) => ["-m", paragraph]), merged]);
  if (!merge.ok) return refuse(`git merge に失敗しました：${firstLine(merge)}`,
    `${branch} は origin/main の位置にあります。元に戻すには git reset --hard ${short} を実行します。`);
  const main = git(["rev-parse", "--short", "origin/main"]).stdout.trim();
  const result = git(["rev-parse", "--short", "HEAD"]).stdout.trim();
  const remoteBranches = lines(git(["for-each-ref", "--points-at", merged, "--format=%(refname:lstrip=3)", "refs/remotes/origin/"]).stdout)
    .filter((remote) => remote !== "HEAD" && remote !== "main");
  return {
    ok: true,
    lines: [
      `${name}: ${branch} を origin/main（${main}）に合わせ、合流した ${short} を履歴としてつなぎました（git merge -s ours。中身は origin/main のまま）。`,
      `新しい HEAD：${result}（変えたファイル ${changed.length} 件が、すべて origin/main と同じ内容でした）`,
      ...pushLines(branch, merged, remoteBranches),
    ],
  };
}
