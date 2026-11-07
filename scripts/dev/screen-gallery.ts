/**
 * The screen gallery for people checking screens by eye (`npm run screens`,
 * docs/10「人が画面を確かめる」). Pure: the runner (screens.ts) reads and writes files.
 */
import { parseDebugQuery } from "../../src/dev/debug-query";

/** One captured screen, as tests/screens/screens.spec.ts records it next to its image. */
export interface Shot {
  /** Scene ID, the same for every width. */
  scene: string;
  titleJa: string;
  /** How the screen was reached: the real flow from the title, or a Debug launch URL (search part). */
  route: { kind: "flow"; descriptionJa: string } | { kind: "debug"; url: string };
  /** Viewport width in CSS pixels. */
  width: number;
  /** Image path relative to the gallery folder. */
  file: string;
  /** SHA-256 of the image bytes. */
  sha256: string;
}

export type ShotChange = "new" | "changed" | "slight" | "same";
export interface ComparedShot extends Shot {
  /** Compared with an earlier gallery; absent when none was given. */
  change?: ShotChange;
  /** Share of pixels that differ from the earlier image (0–1), when both images could be compared. */
  difference?: number;
}

/** Below this share of differing pixels a change is shown as slight (for example the phase of a dotted underline). */
export const slightDifference = 0.001;
export const shotKey = (shot: Pick<Shot, "scene" | "width">) => `${shot.scene}@${shot.width}`;

/**
 * Mark each shot against an earlier gallery's shots (same scene and width): byte-equal
 * images are the same; otherwise `differences` (by shotKey, share of differing pixels)
 * tells a slight change from a real one. Without a measured difference it is changed.
 */
export function compareShots(current: readonly Shot[], previous?: readonly Shot[], differences: ReadonlyMap<string, number> = new Map()): ComparedShot[] {
  if (!previous) return current.map((shot) => ({ ...shot }));
  const earlier = new Map(previous.map((shot) => [shotKey(shot), shot.sha256]));
  return current.map((shot) => {
    const before = earlier.get(shotKey(shot));
    if (before === undefined) return { ...shot, change: "new" };
    if (before === shot.sha256) return { ...shot, change: "same" };
    const difference = differences.get(shotKey(shot));
    return difference === undefined ? { ...shot, change: "changed" }
      : { ...shot, difference, change: difference < slightDifference ? "slight" : "changed" };
  });
}

/** The Debug example URLs of docs/10 that the normal development server opens (not the sample journey's). */
export function debugExampleUrls(docs: string): { titleJa: string; url: string }[] {
  const start = docs.indexOf("### URLの例");
  const end = docs.indexOf("### 人が画面を確かめるときの使い方");
  if (start < 0 || end < start) throw new Error("docs/10 の「### URLの例」が見つかりません。");
  return [...docs.slice(start, end).matchAll(/^\| ([^|]+?) \| `\/(\?debug&[^`]+)` \|$/gmu)]
    .filter((match) => !match[1].includes("dev:sample"))
    .map((match) => ({ titleJa: match[1].trim(), url: match[2] }));
}

/**
 * The examples that open a Debug session with a game state, the monkey's Debug start points
 * (docs/10「モンキー」): every example but a prototype city's map check (scene=map), which shows
 * the city's data without a game state.
 */
export function debugSessionExampleUrls(docs: string): { titleJa: string; url: string }[] {
  return debugExampleUrls(docs).filter(({ url }) => {
    const parsed = parseDebugQuery(url);
    return parsed.kind === "launch" && parsed.query.scene !== "map";
  });
}

const escape = (text: string) => text.replace(/[&<>"']/gu, (char) => `&#${char.charCodeAt(0)};`);
const changeLabels: Record<ShotChange, string> = { new: "新規", changed: "変更あり", slight: "ごく小さな差", same: "変更なし" };
const percent = (share: number) => `${(share * 100).toFixed(share < 0.0001 ? 3 : 2)}%`;

/** A self-contained HTML page: every scene with its widths side by side, changed screens first in the summary. */
export function galleryHtml(shots: readonly ComparedShot[], info: { createdAt: string; previous?: string; checklist: string }): string {
  const scenes = [...new Map(shots.map((shot) => [shot.scene, shot])).values()];
  const compared = shots.some((shot) => shot.change);
  const scenesWith = (changes: ShotChange[]) =>
    scenes.filter((scene) => shots.some((shot) => shot.scene === scene.scene && shot.change && changes.includes(shot.change)));
  const links = (list: ComparedShot[]) => `<ul>${list.map((scene) => `<li><a href="#${escape(scene.scene)}">${escape(scene.titleJa)}</a></li>`).join("")}</ul>`;
  const changedScenes = scenesWith(["changed", "new"]);
  const slightScenes = scenesWith(["slight"]).filter((scene) => !changedScenes.includes(scene));
  const summary = !compared
    ? "<p>以前の一覧と比べていません（<code>npm run screens -- --previous &lt;以前の一覧のフォルダ&gt;</code> で比べられます）。</p>"
    : [
      changedScenes.length
        ? `<p>以前の一覧（${escape(info.previous ?? "")}）から変わった場面: ${changedScenes.length}件</p>${links(changedScenes)}`
        : `<p>以前の一覧（${escape(info.previous ?? "")}）からの変更はありません。</p>`,
      slightScenes.length ? `<p>ごく小さな差だけの場面（線の点の位置など。念のため確認）: ${slightScenes.length}件</p>${links(slightScenes)}` : "",
    ].join("");
  const sections = scenes.map((scene) => {
    const route = scene.route.kind === "flow"
      ? `通常の操作: ${escape(scene.route.descriptionJa)}`
      : `Debug起動URL: <code>${escape(scene.route.url)}</code>`;
    const figures = shots.filter((shot) => shot.scene === scene.scene).sort((left, right) => left.width - right.width).map((shot) => {
      const share = shot.difference === undefined || shot.change === "same" ? "" : `（${percent(shot.difference)}）`;
      const mark = shot.change ? `<span class="mark ${shot.change}">${changeLabels[shot.change]}${share}</span>` : "";
      return `<figure><figcaption>${shot.width}px ${mark}</figcaption><a href="${escape(shot.file)}"><img src="${escape(shot.file)}" alt="${escape(scene.titleJa)}（${shot.width}px）" loading="lazy"></a></figure>`;
    }).join("");
    return `<section id="${escape(scene.scene)}"><h2>${escape(scene.titleJa)}</h2><p class="route">${route}</p><div class="shots">${figures}</div></section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dreamscape 画面一覧</title>
<style>
body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #f6f1e7; color: #2c2620; line-height: 1.6; }
h1 { font-size: 22px; margin: 0 0 8px; } h2 { font-size: 18px; margin: 0 0 4px; }
section { margin: 24px 0; padding: 16px; background: #fffaf1; border-radius: 8px; }
.route { margin: 0 0 12px; font-size: 14px; overflow-wrap: anywhere; }
.shots { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
figure { margin: 0; } figcaption { font-size: 14px; margin-bottom: 4px; }
img { display: block; max-width: min(100%, 390px); border: 1px solid #d8cdb9; }
.mark { padding: 0 6px; border-radius: 4px; font-weight: 600; }
.mark.changed { background: #f3d9a4; } .mark.new { background: #cfe3d2; } .mark.slight, .mark.same { background: #ece6da; font-weight: 400; }
code { overflow-wrap: anywhere; }
</style>
</head>
<body>
<h1>Dreamscape 画面一覧</h1>
<p>作成: ${escape(info.createdAt)}。合否の判定ではありません。確かめ方: ${escape(info.checklist)}</p>
${summary}
${sections}
</body>
</html>
`;
}
