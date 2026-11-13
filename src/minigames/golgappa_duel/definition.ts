import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `golgappa_duel` (a skin of `rhythm_tap`): the Chandni Chowk date's golgappa duel. The vendor drops a golgappa into her
 * leaf bowl, then into the player's, faster and faster; the player taps 「食べる」 as each one lands in theirs, and
 * presses 「バス」 when they have had enough. She raises her hand after her 14th (the lane's flag meets the ring then);
 * after it the vendor goes faster still. Raising it with her (from just before her hand until the player's 16th lands) is
 * `together`; before that, `you_first`; two left in the bowl, `choke` (a bite at nothing fills the choke gauge, and a
 * full gauge leaves one: mashing chokes); after her by two or more, or never, `outlast`.
 *
 * Accessibility: 「食べる」 is 64px at the bottom (thumb reach), Space and Enter eat; 「バス」 is a smaller plum button with
 * a palm above the lane (a fast thumb does not reach it by chance; on a short screen it goes to the field's top left,
 * away from 「中断する」), S presses it. The lane's marks meet the ring as each one lands, so it plays with the sound off;
 * a hit lights the ring (brighter and thicker; gold and thicker still right on the landing: not colour alone), a missed
 * one turns hollow and stays in the bowl; her stop is a flag on the lane and her 「バス！」 with a palm beside her face,
 * and the stop button lights then. The choke gauge's drops fill (shape and colour). With less motion the hand jumps to
 * the bowl and nobody bobs (the golgappa still falls). The counts are in the field and the top band; the host reads out
 * the outcome.
 */
export const golgappaDuel = defineMiniGame({
  id: "golgappa_duel",
  engine: "rhythm_tap",
  titleJa: "ゴルガッパの勝負",
  howToJa: "屋台の男が器に置くゴルガッパを、置かれるたびに「食べる」で食べる。だんだん速くなる。彼女は14個目で「バス」と手を上げる。一緒に「バス」か、もっと食べるか（約15秒）",
  outcomes: [
    { id: "together", labelJa: "二人同時に手を上げた", noteJa: "彼女が手を上げる0.15秒前から、自分の16個目が落ちる前までに「バス」" },
    { id: "you_first", labelJa: "先に「バス」と言った", noteJa: "彼女が手を上げるより前に「バス」" },
    { id: "choke", labelJa: "器にたまって、むせた", noteJa: "器に2つたまった（食べそびれるか、何もない時に押して「むせ」が3つたまると1つ残る。連打はむせる）" },
    { id: "outlast", labelJa: "彼女より長く食べた", noteJa: "16個目が落ちた後で「バス」か、むせずに最後まで食べ続けた（彼女の後は速くなる）" },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "勝負する",
  hintJa: "落ちたら「食べる」。彼女は14個目で「バス」。一緒に言うか、もっと食べるか",
  timed: true,
  keysJa: "Space・Enter で食べる、S で「バス」",
  sounds: ["cork_pop", "puri_crunch", "stamp", "applause"],
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
