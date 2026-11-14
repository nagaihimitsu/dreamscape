import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `say_together` (a skin of `rhythm_tap`): saying the words at the same moment as her. She counts 「せー」「の」 on a steady
 * beat and says the four words on the next four beats, one a beat; the player taps 「言う」 on each (group2 S4,
 * 2026-11-14: four words, not one tap). The story takes the first word, as it always did: on her beat (`together`),
 * before it (`early`: the player's voice alone first), after it (`late`: hers alone first), or no tap at all (`silent`:
 * she says them alone). The result card counts the words said together (★). Timing, not volume (2026-11-13 user
 * decision). A tap while she takes her breath, before 「せー」, does not count. First use: the Lodhi Garden date's
 * 「一緒に言おう」.
 *
 * The host's flow (docs/13 2.6): practice before the real one, no 3・2・1 (her 「せー」「の」 is the count), the play ends
 * on the last word (its peak when the two voices meet on it; the finish 「デーン！」 is that word); ★ from the four words
 * (all four together ★3; together ★2; early or late ★2 with two or more of the others together, else ★1; silent none);
 * an early or late start's finish is the plain end whistle (group2 N8); her face. No mini-game track: her count is the
 * beat, so the scene's music stays, lowered (group2 N4: a 134 BPM track for 4 s clashed with her 92).
 *
 * Accessibility: 「言う」 is 64px at the bottom (thumb reach), Space and Enter say a word; the beat reads without sound (her
 * bubble shows 「せー」「の」 and a word a beat; the lane shows her count as crosses and each word as a mark meeting the
 * ring) and with sound (a tick on each count, a chime with each word, brighter when the voices meet); a word on her beat
 * is gold with a thicker edge in both bubbles (not colour alone: a word off it is plain and lighter). With less motion she
 * does not nod and the bubbles appear without popping (the lane, the words still move). The outcome is read out by the
 * host.
 */
export const sayTogether = defineMiniGame({
  id: "say_together",
  engine: "rhythm_tap",
  titleJa: "一緒に言う",
  howToJa: "彼女の「せー」「の」の次の拍から、4つの言葉を1つずつ拍に合わせて「言う」を押し、声をそろえる。物語の結果は最初の言葉で決まる（約5秒）",
  // Her face only, no line on the result card: her first words follow at once in the story, and differ with the mood of
  // the choice before (delighted, or quiet and a little embarrassed); a line here would get ahead of one or the other.
  outcomes: [
    { id: "together", labelJa: "声がそろった", noteJa: "最初の言葉を、彼女と同じ拍で言った（「の」の次の拍）", finishJa: "デーン！", reaction: { kind: "surprise" } },
    { id: "early", labelJa: "先に言ってしまった", noteJa: "最初の言葉を、その拍より前に言った（「せー」から）", finishJa: "フライング！", finishTone: "plain",
      reaction: { kind: "surprise" } },
    { id: "late", labelJa: "出遅れた", noteJa: "最初の言葉を、その拍より後に言った（終わるまで）", finishJa: "出遅れ！", finishTone: "plain", reaction: { kind: "oops" } },
    // No call: she says them alone, and turns to look at the player.
    { id: "silent", labelJa: "言わなかった", noteJa: "最後まで押さなかった（彼女だけが言う）", finishJa: null, reaction: { kind: "oops" } },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "息を吸う",
  hintJa: "「せー」「の」の次の拍から、拍ごとに「言う」",
  goalJa: "「せー」「の」の後、拍ごとに4回「言う」で声をそろえる",
  controls: "rhythm",
  durationSec: 5,
  practice: {},
  // Her 「せー」「の」 is the count.
  countdown: "own",
  // Her count is the beat (about 92 a minute): the scene's track stays, lowered (quietScene).
  music: "scene",
  timed: true,
  keysJa: "Space・Enter で言う",
  sounds: ["ui_tap", "local_word"],
  quietScene: true,
  art: [],
  artSlots: [
    { id: "lawn", kind: "backdrop", labelJa: "二人が立つ所から見た、朝の広い芝生と、左の奥の石の墓（右半分と上の方は、人物と吹き出しが重なる）" },
    { id: "heroine", kind: "sprite", labelJa: "片手を口の横に添え、こちらを見て「せーの」の合図をするヒロインの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
