import type { SystemSoundId } from "../content/sounds";
import type { LetterKind, PhoneSide } from "../content/tags";
import type { PhoneLine, Speaker, StoryFrame } from "../story/frame-reader";

// How the dialogue screens show a line's scene tags (2026-11-11 user decision; frame-reader.ts stageFrame keeps
// them on the frame). Pure rules, apart from the components (LineStage.tsx).

/** How much slower a quiet line (`# quiet:`) is written than the reader's text speed. */
export const QUIET_TEXT_SLOWDOWN = 1.3;

/** The text speed of a line (milliseconds a character; 0 shows it at once): a quiet line is written a little slower. */
export function lineSpeed(speed: number, frame: Pick<StoryFrame, "quiet"> | null | undefined): number {
  return frame?.quiet && speed > 0 ? Math.round(speed * QUIET_TEXT_SLOWDOWN) : speed;
}

/**
 * The sounds a line's scene tags bring as its text starts (src/audio/sound-effects.ts useLineSounds): a phone message
 * received or sent, the first line of a letter (`earlier` is empty there), its speaker's name plate when it shows
 * (`nameCutIn`: the plate of `# cutin: name`, NameCutIn.tsx) and its recalled picture. None on a quiet line (`# quiet:`):
 * only the author's own `# se:` sounds there.
 */
export function lineCues(frame: Pick<StoryFrame, "quiet" | "phone" | "letter" | "recall"> | null | undefined, nameCutIn: boolean): SystemSoundId[] {
  if (!frame || frame.quiet) return [];
  const cues: SystemSoundId[] = [];
  if (frame.phone) cues.push(frame.phone.side === "received" ? "phone_receive" : "phone_send");
  if (frame.letter && !frame.letter.earlier?.length) cues.push("letter_open");
  if (nameCutIn) cues.push("name_cutin");
  if (frame.recall) cues.push("recall");
  return cues;
}

/** Whether the window's head shows the speaker's plate: a phone message names its sender itself, and a letter no one. */
export const showsSpeakerPlate = (frame: Pick<StoryFrame, "phone" | "letter"> | null | undefined): boolean =>
  !frame?.phone && !frame?.letter;

/**
 * The names a phone shows for its messages, by who speaks (a role without a name shows none: the narration);
 * `people`: a person's name by their ID, for `# speaker: <person ID>` (progression/story.json people).
 */
export type PhoneNames = Partial<Record<Exclude<Speaker, "person">, string>> & { people?: Readonly<Record<string, string>> };

/**
 * A message on a phone's screen. `name`: shown above a received message, the first of a run from the same sender;
 * `sender`: who wrote it, for screen readers where no name shows (a sent message is the protagonist's). `text` is left
 * out for the line on screen, which its DialogueText writes.
 */
export type PhoneBubble = { key: string; side: PhoneSide; name?: string; sender?: string; text?: string };

/** The bubbles of a phone line (`personId`: its person, with speaker "person"): the earlier messages of its run, oldest first, then the line on screen. */
export function phoneBubbles(phone: PhoneLine, speaker: Speaker, names: PhoneNames, personId?: string): { earlier: PhoneBubble[]; current: PhoneBubble } {
  const messages: { side: PhoneLine["side"]; speaker: Speaker; personId?: string; text?: string }[] =
    [...(phone.earlier ?? []), { side: phone.side, speaker, ...(personId ? { personId } : {}) }];
  const bubbles = messages.map((message, index): PhoneBubble => {
    const sender = message.side === "sent" ? names.player
      : message.speaker === "person" ? (message.personId ? names.people?.[message.personId] : undefined) : names[message.speaker];
    const before = messages[index - 1];
    const sameRun = !!before && before.side === message.side && before.speaker === message.speaker && before.personId === message.personId;
    const name = message.side === "received" && sender && !sameRun ? sender : undefined;
    return {
      key: `${index}`,
      side: message.side,
      ...(name ? { name } : sender ? { sender } : {}),
      ...(message.text === undefined ? {} : { text: message.text }),
    };
  });
  return { earlier: bubbles.slice(0, -1), current: bubbles.at(-1)! };
}

/** What a sheet of paper (`# letter:`) is called, for screen readers. */
export const LETTER_LABELS = { letter: "手紙", note: "メモ", card: "カード" } as const satisfies Record<LetterKind, string>;
