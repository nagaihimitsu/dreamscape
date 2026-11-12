// The voices of lines (2026-11-12): a recording of one line, one file each at a journey's
// `public/assets/voice/<ID>.mp3`, served at `assets/voice/<ID>.mp3` (all journeys' public/ folders are served as one,
// so an ID names one file in the whole build). The file name without `.mp3` is the ID a line's `# voice:` names
// (src/content/tags.ts). Nothing registers them: content:build checks the tags against the files
// (scripts/voice-files.ts), and the game derives a voice's URL from its ID (src/components/useVoice.ts).

/** A voice's ID: its file name without `.mp3`. */
export const VOICE_ID = /^[a-z0-9_]+$/u;
/** The folder below a journey's `public/` that holds its voices (served at the same path). */
export const VOICE_FOLDER = "assets/voice";
const VOICE_EXTENSION = ".mp3";

/** The served path of a voice (`assets/voice/<ID>.mp3`). */
export const voicePath = (voiceId: string): string => `${VOICE_FOLDER}/${voiceId}${VOICE_EXTENSION}`;

/** The ID of a served path that names a voice (`assets/voice/<ID>.mp3`, directly in the folder), or undefined for any other path. */
export function voiceIdOf(assetPath: string): string | undefined {
  const prefix = `${VOICE_FOLDER}/`;
  if (!assetPath.startsWith(prefix) || !assetPath.endsWith(VOICE_EXTENSION)) return undefined;
  const id = assetPath.slice(prefix.length, -VOICE_EXTENSION.length);
  return VOICE_ID.test(id) ? id : undefined;
}
