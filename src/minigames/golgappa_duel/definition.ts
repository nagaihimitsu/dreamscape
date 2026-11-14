import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `golgappa_duel` (a skin of `rhythm_tap`): the Chandni Chowk date's golgappa duel. The vendor drops a golgappa into her
 * leaf bowl, then into the player's, faster and faster; the player taps 「食べる」 as each one lands in theirs, and
 * presses 「バス」 when they have had enough. She raises her hand after her 14th (the lane's flag meets the ring then);
 * after it the vendor goes faster still and no longer waits (one missed there, the next lands on it: a choke). Raising
 * it with her (from just before her hand until the player's 16th lands) is `together`; before that, `you_first`; two
 * left in the bowl, `choke` (a bite at nothing fills the choke gauge, and a full gauge leaves one: mashing chokes);
 * after her by two or more, or never, `outlast`.
 *
 * The host's flow (docs/13 2.6): practice (a contest at a stall: no romance or route choice hangs on it; the story's
 * choices after it carry no relationship effects), the host's 3・2・1 (「よーい、どん」 of an eating contest), the scene's
 * music lowered (the landings are the beat), ★ from how cleanly the player ate (rules.ts golgappaRating), a finish word
 * per outcome and her face on the card. Her reaction lines are her first breath at the end; the story's lines follow
 * at once and are never repeated here.
 *
 * Accessibility: 「食べる」 is 64px at the bottom (thumb reach), Space and Enter eat; 「バス」 is a smaller plum button with
 * a palm above the lane (a fast thumb does not reach it by chance; on a short screen it goes up to the field's top right,
 * under her face's place, away from 「中断する」), S presses it. The lane's marks meet the ring as each one lands, so it plays with the sound off;
 * a hit lights the ring (brighter and thicker; gold and thicker still right on the landing: not colour alone), a missed
 * one turns hollow and stays in the bowl; her stop is a flag on the lane and her 「バス！」 with a palm beside her face,
 * and the stop button lights then. A tap before the first golgappa is turned away (the host's refusal). The choke
 * gauge's drops fill (shape and colour). With less motion the hand jumps to the bowl and nobody bobs (the golgappa still
 * falls). The counts are in the field and the top band; the host reads out the outcome.
 */
export const golgappaDuel = defineMiniGame({
  id: "golgappa_duel",
  engine: "rhythm_tap",
  titleJa: "ゴルガッパの勝負",
  howToJa: "屋台の男が器に置くゴルガッパを、置かれるたびに「食べる」で食べる。だんだん速くなる。彼女は14個目で「バス」と手を上げる。一緒に「バス」か、もっと食べるか（その後はさらに速く、1つ食べそびれるとむせる。約15秒）",
  outcomes: [
    // Her first breath only: the story's next lines (「引き分け！　今の、…」, 「…はい、水」, 「負けた……。」) are never said here.
    { id: "together", labelJa: "二人同時に手を上げた", noteJa: "彼女が手を上げる0.15秒前から、自分の16個目が落ちる前までに「バス」", finishJa: "同時！",
      reaction: { kind: "surprise", linesJa: ["せーの、って言ってないのに"] } },
    { id: "you_first", labelJa: "先に「バス」と言った", noteJa: "彼女が手を上げるより前に「バス」", finishJa: "バス！",
      reaction: { kind: "tease", linesJa: ["あれ、もうおしまい？", "ふふ、早い早い"] } },
    { id: "choke", labelJa: "器にたまって、むせた", noteJa: "器に2つたまった（食べそびれるか、何もない時に押して「むせ」が3つたまると1つ残る。彼女が手を上げた後は、1つ食べそびれると次が落ちてくる。連打はむせる）", finishJa: "ごほっ！",
      reaction: { kind: "oops", linesJa: ["わっ、大丈夫！？"] } },
    { id: "outlast", labelJa: "彼女より長く食べた", noteJa: "16個目が落ちた後で「バス」か、むせずに最後まで食べ続けた（彼女の後は速く、1つも食べそびれられない）", finishJa: "粘った！",
      reaction: { kind: "surprise", linesJa: ["まだ食べるの！？", "え、どこに入ってるの？"] } },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "勝負する",
  hintJa: "落ちたら「食べる」。彼女は14個目で「バス」。一緒に言うか、もっと食べるか",
  goalJa: "落ちるたびに「食べる」。彼女が手を上げる14個目で「バス」か、もっと速い残りも食べきるか",
  controls: "rhythm",
  durationSec: 15,
  practice: {},
  countdown: "host",
  music: "scene",
  timed: true,
  keysJa: "Space・Enter で食べる、S で「バス」",
  sounds: ["cork_pop", "puri_crunch", "stamp"],
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
