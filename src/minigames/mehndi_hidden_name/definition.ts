import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `mehndi_hidden_name` (a skin of `search`): the Jaipur hotel's night, her palm with the mehndi drawn at Jal Mahal. The
 * night is dim; a small lamp brings out the fine lines where it is held. Somewhere in the pattern there is writing that
 * pretends to be pattern (the tag's `target`: the thumb's base, the peacock feather's base, the central vine). Round 3
 * (2026-11-14) made the look a hunt: the lamp's pool is small; at each other place the fine lines curl into something that
 * looks like writing at a glance (loops and dots, never letters); the real writing glints now and then; her hand is the
 * hot and cold (her fingers curl in with the lamp near the writing, once with 「ふふ……どうかな」, or, where she does not know
 * what is there, 「ん？　そこ、何か……」; the lamp held long elsewhere, 「そこ、じっと見すぎ」). The player drags the lamp over
 * her palm and taps where the writing is (`found`). A place where there is none gets her word ("only a petal") and the look
 * goes on; finding the writing after one is `wrong_spot` (the story remembers it). From the third wrong place she only
 * hints the area (a dotted ring, 「このへん、かな」): the find is always the player's (2026-11-14).
 * Or the player presses 「明日にする」 (`later`). No time limit (2026-11-13): only those end the look, so the game does not
 * run on time (`timed: false`: a hidden page needs no 「続ける」; no `durationSec` on its card). The scene's own music goes
 * on (`music: "scene"`: the hotel night's waltz, a quiet romance scene). An attitude, not a
 * skill (it may stand for how the player looks at her hand): no rating and no practice (a practice would show the place).
 * The writing (`text`, docs/13 2.10): `player` the player's name as typed (any script, drawn as text, never as HTML);
 * `illegible` a deliberately unreadable mark under a top line, where the story says Hindi letters (no letters are made up);
 * `farhana` the Latin letters FARHANA over a row of small unreadable marks (the story's phone number, never a number).
 *
 * Accessibility: the six places are buttons (named by the pattern there, never by what hides in it) in the tab order; a
 * focused one brings the lamp to it, Enter or Space points at it; her word at a wrong place is read out (a status by it);
 * 「明日にする」 is a 56px button at the bottom. With less motion the lamp jumps instead of gliding, its light does not
 * flicker and nothing pulses. The outcome is read out by the host.
 */
/** How to play, one line for both the start and the play (2026-11-13 playtest: they said it two ways). */
export const MEHNDI_HINT_JA = "なぞって灯りを動かし、模様にまぎれた文字を押す";

export const mehndiHiddenName = defineMiniGame({
  id: "mehndi_hidden_name",
  engine: "search",
  titleJa: "手のひらの模様",
  howToJa: "暗い中で小さな灯りを動かし、手のひらの模様にまぎれた文字を探して押す。文字に見える渦巻きもある（本物は時々光る。灯りが近いと彼女の指が動く）。違う所を指すと彼女が答え、3回目からはだいたいの場所を教えてくれる（見つけるのは自分）。「明日にする」でやめる（時間の制限は無い）",
  // An attitude more than a skill: no finish word, flash or sound, no ★, no practice (a practice would show the place). Her
  // face on the result card only: the story goes on with her own words about what was written.
  outcomes: [
    { id: "found", labelJa: "見つけた", noteJa: "隠した文字の所を押した", finishJa: null, reaction: { kind: "cheer" } },
    { id: "wrong_spot", labelJa: "違う所も指して、見つけた", noteJa: "文字の無い模様を押してから、文字を見つけた（3回目からは彼女がだいたいの場所を教える。見つけるのはいつも遊ぶ人）。物語は過去のこととして書く",
      finishJa: null, reaction: { kind: "tease" } },
    { id: "later", labelJa: "明日にする", noteJa: "「明日にする」を押した", finishJa: null, reaction: { kind: "tease" } },
  ],
  defaultAuto: "found",
  params: () => z.object({
    target: z.enum(["thumb", "peacock", "vine"]).default("thumb")
      .describe("文字を隠した所（thumb 親指の付け根の蔓・peacock 孔雀の羽の付け根・vine 真ん中の蔓。書かなければ thumb）"),
    text: z.enum(["player", "illegible", "farhana"]).default("player")
      .describe("隠した文字（player 主人公の名前を入れたとおりに・illegible 読めない線〈ヒンディー語の文字と書かれた所。字は作らない〉・farhana FARHANA と読めない小さな印の列。書かなければ player）"),
  }).strict(),
  examples: [{ target: "thumb", text: "player" }, { target: "peacock", text: "illegible" }, { target: "vine", text: "farhana" }],
  startJa: "手のひらを見る",
  hintJa: MEHNDI_HINT_JA,
  goalJa: "指でなぞって灯りを動かし、模様にまぎれた文字を見つけて押す",
  controls: "drag",
  // A quiet night for two: the scene's waltz goes on (docs/13 2.11).
  music: "scene",
  // The result card high, over the fingertips: the writing (in the palm and at the thumb) stays in view below it.
  resultAnchor: "top",
  timed: false,
  keysJa: "Tab で模様を選び（灯りが来る）、Enter・Space で指す",
  sounds: ["clue_new", "ui_tap"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "palm", kind: "sprite", labelJa: "差し出されたヒロインの右の手のひらと手首、メヘンディの模様（文字は描かない。背景は透明）" },
    { id: "lamp", kind: "sprite", labelJa: "手に持つ小さな真鍮のランプ（灯りの輪の右上に出る。背景は透明）" },
  ],
  load: () => import("./play"),
});
