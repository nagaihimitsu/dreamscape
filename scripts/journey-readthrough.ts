import { Story } from "inkjs";
import type { GeneratedScenes, SceneEntry } from "../src/content/scene-schemas";
import { knotAddress } from "../src/content/story-address";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import { bindItemReader } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";

// journey:readthrough (the unified event design, stage 3a, 3.3): a tool for reading a journey's
// script, not a build check. For every landmark visit (and, stage 4, every other moment a scene is
// placed at: a date, the finale, the epilogue, the hotel, a trip…): the order table of its moment (the inserted
// scenes before the main part, the main part, those while observing, those after it) and, for every
// scene in that order, its lines path by path (each choice taken; every cond("…") read false, then
// true; at most `maxPaths` paths a scene), so a reader can follow a play order and find what one
// scene says that another contradicts. Pure: it reads the generated scene list and stories.

export type ReadthroughInput = {
  scenes: GeneratedScenes["scenes"];
  stories: Readonly<Record<string, string>>;
  landmarks: readonly { id: string; cityId: string; nameJa: string; guideStoryId?: string; battleId: string }[];
  cityIds: readonly string[];
  context: TagContext;
  maxPaths?: number;
};

const position = (scene: SceneEntry) =>
  typeof scene.priority === "string" ? scene.priority : typeof scene.priority === "number" ? (scene.priority > 0 ? `+${scene.priority}` : String(scene.priority)) : "0";

/** The order of a landmark's visit: negative, then while observing, then positive (the same priority: file, then written order). */
export function visitTable(scenes: readonly SceneEntry[], landmarkId: string): SceneEntry[] {
  const own = scenes.filter((scene) => scene.at.some((moment) => "visit" in moment && (moment.visit === landmarkId || moment.visit === "any")));
  const rank = (scene: SceneEntry) => (typeof scene.priority === "number" ? scene.priority : 0);
  return [...own].sort((left, right) => rank(left) - rank(right) || (left.story.storyId < right.story.storyId ? -1 : left.story.storyId > right.story.storyId ? 1 : left.order - right.order));
}

/** A scene's lines, path by path (choices labelled), with every cond text false and then true. */
export function scenePaths(scene: SceneEntry, compiled: string, context: TagContext, maxPaths: number): string[][] {
  const paths: string[][] = [];
  for (const value of [false, true]) {
    const make = () => {
      const story = new Story(compiled);
      story.onError = (message) => { throw new Error(message); };
      story.BindExternalFunction("cond", () => value, true);
      bindItemReader(story, {}, []);
      bindMemoryReader(story, [], []);
      return story;
    };
    const first = make();
    for (const [name, text] of Object.entries({ player_name: "（主人公）", heroine_name: "（ヒロイン）", player_address: "（主人公の呼び名）" }))
      if (first.variablesState.GlobalVariableExistsWithName(name)) first.variablesState.$(name, text);
    if (scene.story.knot) first.ChoosePathString(scene.story.knot);
    const walk = (saved: string, lines: string[], depth: number) => {
      if (paths.length >= maxPaths) return;
      const story = make();
      story.state.LoadJson(saved);
      const read = [...lines];
      let speaker = "narrator";
      for (let guard = 0; story.canContinue && guard < 1000; guard++) {
        const text = story.Continue()?.trim() ?? "";
        speaker = parseStoryTags(story.currentTags ?? [], context).speaker ?? speaker;
        if (text) read.push(`${speaker === "narrator" ? "" : `${speaker}: `}${text}`);
      }
      if (!story.currentChoices.length || depth > 20) { paths.push(read); return; }
      const checkpoint = story.state.ToJson();
      for (const choice of story.currentChoices) {
        const branch = make();
        branch.state.LoadJson(checkpoint);
        branch.ChooseChoiceIndex(choice.index);
        walk(branch.state.ToJson(), [...read, `▶ ${choice.text.trim()}`], depth + 1);
      }
    };
    walk(first.state.ToJson(), [], 0);
    if (!scene.conds.length) break;
  }
  return paths;
}

/** The readthrough of a journey's cities: order tables and every scene's paths, as text lines. */
export function journeyReadthrough(input: ReadthroughInput): string[] {
  const out: string[] = [];
  const max = input.maxPaths ?? 12;
  for (const cityId of input.cityIds) for (const landmark of input.landmarks.filter((item) => item.cityId === cityId)) {
    const order = visitTable(input.scenes, landmark.id);
    out.push(`${landmark.nameJa}  visit ${landmark.id}`);
    const show = (scene: SceneEntry) => out.push(`  ${position(scene).padStart(13)}  ${scene.id}  ${scene.kind}` +
      `${scene.when ? `  when: ${JSON.stringify(scene.when)}` : ""}${scene.repeat === "always" ? "  repeat: always" : ""}`);
    for (const scene of order.filter((item) => typeof item.priority === "number" && item.priority < 0)) show(scene);
    if (landmark.guideStoryId) out.push(`              0  〔案内〕${landmark.guideStoryId}  初めての訪問だけ`);
    out.push("              0  〔観察〕「進む」まで止まる");
    for (const scene of order.filter((item) => item.priority === "after observe")) show(scene);
    out.push(`              0  〔バトル〕${landmark.battleId}`);
    for (const scene of order.filter((item) => typeof item.priority === "number" && item.priority > 0)) show(scene);
    out.push(`  本筋の前に流れうる差し込みの場面：${order.filter((item) => typeof item.priority === "number" && item.priority < 0).length}`, "");
    for (const scene of order) {
      const compiled = input.stories[scene.story.storyId];
      if (!compiled) continue;
      out.push(`  ── ${scene.id}（${scene.story.knot ? knotAddress(scene.story.storyId, scene.story.knot) : scene.story.storyId}）`);
      scenePaths(scene, compiled, input.context, max).forEach((path, index) => {
        out.push(`    〔道 ${index + 1}〕`, ...path.map((line) => `      ${line}`));
      });
      out.push("");
    }
  }
  // Stage 4: the other moments of each city (a date, the finale, the epilogue, the departure, an arrival, the hotel, a trip, a ticket counter).
  for (const cityId of input.cityIds) {
    const moments = new Map<string, SceneEntry[]>();
    for (const scene of input.scenes.filter((item) => item.cityId === cityId)) for (const at of scene.at) {
      if ("visit" in at) continue;
      const key = Object.entries(at).map(([name, value]) => `${name} ${value}`).join(" ");
      moments.set(key, [...(moments.get(key) ?? []), scene]);
    }
    const main: Record<string, string> = { date: "〔デート〕（告白なら「交際開始」の画面）", finale: "〔フィナーレのバトル〕", epilogue: "〔エピローグ〕", depart: "〔出発：品物を置いていく → 次の都市〕",
      arrive: "〔ロゴ〕→〔到着の会話〕", hotel: "〔眠る〕", trip: "〔移動〕", ticket: "〔入場〕", place: "〔その場所の観光地・デート・フィナーレの本筋〕" };
    for (const [key, own] of moments) {
      const rank = (scene: SceneEntry) => (typeof scene.priority === "number" ? scene.priority : 0);
      const order = [...own].sort((left, right) => rank(left) - rank(right) || (left.story.storyId < right.story.storyId ? -1 : left.story.storyId > right.story.storyId ? 1 : left.order - right.order));
      out.push(`${cityId}  ${key}`);
      const show = (scene: SceneEntry) => out.push(`  ${position(scene).padStart(13)}  ${scene.id}  ${scene.kind}` +
        `${scene.when ? `  when: ${JSON.stringify(scene.when)}` : ""}${scene.then ? `  then: ${JSON.stringify(scene.then)}` : ""}${scene.repeat === "always" ? "  repeat: always" : ""}`);
      for (const scene of order.filter((item) => typeof item.priority === "number" && item.priority < 0)) show(scene);
      out.push(`              0  ${main[key.split(" ")[0]] ?? ""}`);
      for (const scene of order.filter((item) => typeof item.priority === "string")) show(scene);
      for (const scene of order.filter((item) => typeof item.priority === "number" && item.priority > 0)) show(scene);
      out.push("");
      for (const scene of order) {
        const compiled = input.stories[scene.story.storyId];
        if (!compiled) continue;
        out.push(`  ── ${scene.id}（${scene.story.knot ? knotAddress(scene.story.storyId, scene.story.knot) : scene.story.storyId}）`);
        scenePaths(scene, compiled, input.context, max).forEach((path, index) => out.push(`    〔道 ${index + 1}〕`, ...path.map((line) => `      ${line}`)));
        out.push("");
      }
    }
  }
  return out;
}
