import { BGM_DEFAULT, BGM_STOP } from "../src/content/music";
import type { SceneAudio } from "../src/content/scene-audio";
import { isPlaceStory } from "../src/content/story-address";
import { taggedLines } from "./line-tag-text";

// content:build's index of what each scene lets the player hear (2026-11-13, 旅の音楽室; src/content/scene-audio.ts):
// the `# voice:` lines with their text and the tracks `# bgm:` names, read statically from each story's source
// (line-tag-text.ts), so a line in a branch no walk takes counts too. A place file's tags go under their knot's address
// (`places/<file>.<knot>`, a helper knot's under its own: the scene table lists the knots each scene calls); a one-scene
// file's all go under the file. Pure; light module.

/** The index of `stories` (each story's ID and its authored source), only the stories with a voice or a track. */
export function sceneAudioOf(stories: readonly { id: string; source: string }[]): SceneAudio {
  const index: SceneAudio["stories"] = {};
  for (const { id, source } of stories) {
    const place = isPlaceStory(id);
    for (const tag of taggedLines(source, ["voice", "bgm"])) {
      if (!tag.value) continue;
      const address = place && tag.knot ? `${id}.${tag.knot}` : id;
      const entry = index[address] ??= { voices: [], bgm: [] };
      if (tag.key === "voice") {
        if (!entry.voices.some((voice) => voice.id === tag.value)) entry.voices.push({ id: tag.value, textJa: tag.text ?? "" });
      } else if (tag.value !== BGM_STOP && tag.value !== BGM_DEFAULT && !entry.bgm.includes(tag.value)) entry.bgm.push(tag.value);
    }
  }
  return { schemaVersion: 1, stories: index };
}
