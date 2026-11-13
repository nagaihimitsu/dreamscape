import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `mehndi_hidden_name` (a skin of `search`): the Jaipur hotel's night, her palm with the mehndi drawn at Jal Mahal. The
 * night is dim; a small lamp brings out the fine lines where it is held. Somewhere in the pattern there is writing that
 * pretends to be pattern (the tag's `target`: the thumb's base, the peacock feather's base, the central vine). The player
 * drags the lamp over her palm and taps where the writing is (`found`), or taps a place where there is none
 * (`wrong_spot`), or presses 「明日にする」 (`later`). No time limit (2026-11-13): only those three end the look, so the
 * game does not run on time (`timed: false`: a hidden page needs no 「続ける」).
 * The writing (`text`, docs/13 2.10): `player` the player's name as typed (any script, drawn as text, never as HTML);
 * `illegible` a deliberately unreadable mark under a top line, where the story says Hindi letters (no letters are made up);
 * `farhana` the Latin letters FARHANA over a row of small unreadable marks (the story's phone number, never a number).
 *
 * Accessibility: the six places are buttons (named by the pattern there, never by what hides in it) in the tab order; a
 * focused one brings the lamp to it, Enter or Space points at it; 「明日にする」 is a 56px button at the bottom. With less
 * motion the lamp jumps instead of gliding and nothing pulses. The outcome is read out by the host.
 */
export const mehndiHiddenName = defineMiniGame({
  id: "mehndi_hidden_name",
  engine: "search",
  titleJa: "手のひらの模様",
  howToJa: "暗い中で灯りを動かし、手のひらの模様にまぎれた文字を探して押す。「明日にする」でやめる（時間の制限は無い）",
  outcomes: [
    { id: "found", labelJa: "見つけた", noteJa: "隠した文字の所を押した" },
    { id: "wrong_spot", labelJa: "違う所を指した", noteJa: "文字の無い模様を押した" },
    { id: "later", labelJa: "明日にする", noteJa: "「明日にする」を押した" },
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
  hintJa: "灯りを動かして、模様にまぎれた文字を探す",
  timed: false,
  keysJa: "Tab で模様を選び（灯りが来る）、Enter・Space で指す",
  sounds: ["clue_new"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "palm", kind: "sprite", labelJa: "差し出されたヒロインの右の手のひらと手首、メヘンディの模様（文字は描かない。背景は透明）" },
    { id: "lamp", kind: "sprite", labelJa: "手に持つ小さな真鍮のランプ（灯りの輪の右上に出る。背景は透明）" },
  ],
  load: () => import("./play"),
});
