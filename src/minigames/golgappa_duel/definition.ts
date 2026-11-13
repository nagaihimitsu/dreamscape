import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `golgappa_duel` (a skin of `rhythm_tap`): the Chandni Chowk date's golgappa duel. The vendor drops a golgappa into her
 * leaf bowl, then into the player's, faster and faster; the player taps 「食べる」 as each one lands in theirs, and
 * presses 「バス」 when they have had enough. She raises her hand after her 14th. Raising it at about the same time
 * (13th to 15th) is `together`; before that, `you_first`; two left in the bowl, `choke`; after her, or never, `outlast`.
 *
 * Accessibility: 「食べる」 is 64px at the bottom (thumb reach), Space and Enter eat; 「バス」 is a smaller button above
 * the lane (a fast thumb does not reach it by chance), S presses it. The lane's marks meet the ring as each one lands,
 * so it plays with the sound off; a hit lights the ring (brighter and thicker, not colour alone), a missed one turns
 * hollow and stays in the bowl. With less motion the hand jumps to the bowl and nobody bobs (the golgappa still falls).
 * The counts are in the field and the top band; the outcome is read out by the host.
 */
export const golgappaDuel = defineMiniGame({
  id: "golgappa_duel",
  engine: "rhythm_tap",
  titleJa: "ゴルガッパの勝負",
  howToJa: "屋台の男が器に置くゴルガッパを、置かれるたびに「食べる」で食べる。だんだん速くなる。もう無理なら「バス」（約15秒）",
  outcomes: [
    { id: "together", labelJa: "二人同時に手を上げた", noteJa: "彼女が手を上げる14個目の前後（13〜15個目）で「バス」" },
    { id: "you_first", labelJa: "先に「バス」と言った", noteJa: "12個目までに「バス」" },
    { id: "choke", labelJa: "器にたまって、むせた", noteJa: "食べそびれて、器に2つたまった" },
    { id: "outlast", labelJa: "彼女より長く食べた", noteJa: "16個目より後で「バス」か、最後まで食べきった" },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "勝負する",
  hintJa: "器に落ちたら「食べる」。もう無理なら「バス」",
  timed: true,
  keysJa: "Space・Enter で食べる、S で「バス」",
  sounds: ["puri_crunch", "applause"],
  quietScene: true,
  art: [],
  artSlots: [
    { id: "stall", kind: "backdrop", labelJa: "客の目から見たゴルガッパの屋台（手前に木の台、奥に緑の水の鍋と揚げた玉の山）" },
    { id: "heroine", kind: "sprite", labelJa: "葉の器を持って、頬をふくらませたヒロインの上半身（立ち絵の画風、背景は透明）" },
    { id: "bowl", kind: "sprite", labelJa: "葉を固めて作った小さな器（上から少し斜めに見た形、背景は透明）" },
    { id: "puri", kind: "sprite", labelJa: "ゴルガッパ一つ（穴に具と緑の水が入った揚げた玉、背景は透明）" },
  ],
  load: () => import("./play"),
});
