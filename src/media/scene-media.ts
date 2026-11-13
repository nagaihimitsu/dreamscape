import type { ReactionMark } from "../content/dialogue-reactions";
import type { StoryFrame } from "../story/frame-reader";
import type { PreloadPriority, PreloadRequest } from "./preload-queue";

// What a story line puts on screen that has to be loaded (2026-11-13, the background loading: preload-ahead.ts): its
// voice, its scene's picture, the figures on stage with their expressions, the album picture it takes or recalls, the
// photo of its 旅の図鑑 card, its mini-game's pictures and its sound effect. Pure: the catalog lookups are given (preload-ahead.ts gives the content's),
// so a line read ahead (src/story/runtime.ts peekStory) names the same files its screen will load.

/** How the scene on screen dresses its stage, as its screen does. */
export type SceneLook = {
  /** The heroine's outfit is chosen by the scene and its city (CharacterPortrait's sceneId and cityId). */
  sceneId?: string;
  cityId?: string;
  /** The figure who stands for `# speaker: enemy` (the scene's `# person:` with a figure, a battle's opponent). */
  enemyFigure?: string;
  /**
   * The photo the scene shows throughout in place of its lines' backgrounds (a guide, an encounter or a battle at a
   * landmark: its photo's served path).
   */
  photo?: string;
};

/** The served paths (`assets/…`) of what a line names, from the content (undefined: nothing to load). */
export type MediaCatalog = {
  /** A `# background:`'s picture (CanalScene: its photo, else its own image). */
  background(backgroundId: string): string | undefined;
  /** A figure's standing picture with an expression, in the outfit the scene gives it (CharacterPortrait). */
  figure(characterId: string, emotion: string, look: SceneLook): string | undefined;
  /** The figure of a person who says a line in their own name (`# speaker: <person ID>`; scene-person.ts speakingPerson). */
  personFigure(frame: StoryFrame): string | undefined;
  /** An album picture (`# photo:`, `# recall:`). */
  albumImage(imageId: string): string | undefined;
  /** The photo of a 旅の図鑑 term's card (`# term:`). */
  termPhoto(termId: string): string | undefined;
  /** A mini-game picture (`# minigame:`'s `art.<slot>`). */
  miniGameArt(imageId: string): string | undefined;
  /** The mark over a figure's head of a reaction (`# reaction:`'s mark: ComicEffect). */
  reactionMark(mark: ReactionMark): string | undefined;
};

/**
 * The heroine's expression on a line as the screens show it: her reaction's, else the line's emotion when she says it or
 * the narration shows it, else her neutral face.
 */
export function heroineEmotion(frame: Pick<StoryFrame, "speaker" | "emotion" | "reactions">): string {
  return frame.reactions?.heroine?.expression ??
    (frame.speaker === "heroine" || frame.speaker === "narrator" ? frame.emotion : "neutral");
}

/** The expression of the figure opposite her: the enemy's reaction, else the line's emotion when the enemy says it. */
function enemyEmotion(frame: Pick<StoryFrame, "speaker" | "emotion" | "reactions">): string {
  return frame.reactions?.enemy?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral");
}

/**
 * The files a line puts on screen, at `priority`, in the order they matter: its voice (small, it starts with the line),
 * its reactions' marks (tiny, they pop up with it), the scene's picture, the heroine as she looks on it, the person or
 * enemy who says it or reacts, the album picture it takes or recalls, its 旅の図鑑 cards' photos (asked for whether or not
 * the save has met the term: the card shows only the first time), its mini-game's pictures, its sound effect. A
 * figure is named on every line it may show on (she stands through most scenes); a file named twice is loaded once
 * (preload-queue.ts).
 */
export function frameMedia(frame: StoryFrame, look: SceneLook, catalog: MediaCatalog, priority: PreloadPriority): PreloadRequest[] {
  const marks = [frame.reactions?.heroine?.mark, frame.reactions?.enemy?.mark].flatMap((mark) => (mark ? [catalog.reactionMark(mark)] : []));
  const images: (string | undefined)[] = [...marks, look.photo ?? catalog.background(frame.background)];
  images.push(catalog.figure("heroine", heroineEmotion(frame), look));
  const person = catalog.personFigure(frame);
  if (person) images.push(catalog.figure(person, "neutral", look));
  if (look.enemyFigure && (frame.speaker === "enemy" || frame.reactions?.enemy))
    images.push(catalog.figure(look.enemyFigure, enemyEmotion(frame), look));
  if (frame.photo) images.push(catalog.albumImage(frame.photo.imageId));
  if (frame.recall) images.push(catalog.albumImage(frame.recall));
  for (const termId of frame.termIds ?? []) images.push(catalog.termPhoto(termId));
  if (frame.minigame) {
    if (frame.minigame.bg) images.push(catalog.background(frame.minigame.bg));
    for (const imageId of Object.values(frame.minigame.art ?? {})) images.push(catalog.miniGameArt(imageId));
  }
  return [
    ...(frame.voiceId ? [{ kind: "voice" as const, key: frame.voiceId, priority }] : []),
    ...images.flatMap((path) => (path ? [{ kind: "image" as const, key: path, priority }] : [])),
    ...(frame.seId ? [{ kind: "sound" as const, key: frame.seId, priority }] : []),
  ];
}

/** A story read ahead (src/story/runtime.ts peekStory): its next lines in order, and the first lines after each choice it stops at. */
export type StoryAhead = { lines: readonly StoryFrame[]; choices: readonly (readonly StoryFrame[])[] };

/**
 * The files of the line on screen and of the lines read ahead (2026-11-13): the line on screen and the next one first
 * ("next": the screen loads the one, the reader's next tap shows the other), the lines after it "soon"; after a choice
 * nobody has made yet, the first line of each "soon" and the next ones "idle".
 */
export function aheadMedia(current: StoryFrame, ahead: StoryAhead, look: SceneLook, catalog: MediaCatalog): PreloadRequest[] {
  return [
    ...frameMedia(current, look, catalog, "next"),
    ...ahead.lines.flatMap((frame, index) => frameMedia(frame, look, catalog, index === 0 ? "next" : "soon")),
    ...ahead.choices.flatMap((lines) => lines.flatMap((frame, index) => frameMedia(frame, look, catalog, index === 0 ? "soon" : "idle"))),
  ];
}
