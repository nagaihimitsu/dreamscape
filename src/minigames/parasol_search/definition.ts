import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `parasol_search` (a skin of `search`): Hawa Mahal's upper floor, a lattice window over the old city's street. Looking
 * down, the street is full of round umbrellas and parasols: stalls on both pavements, two people walking with them, a cow,
 * an auto-rickshaw and a cycle-rickshaw. One of them is the old parasol of the vegetable seller below (the tag's `at`:
 * left, middle or right on the near pavement). The player taps umbrellas to look (a wrong one is only looked at, and the
 * search goes on), or presses 「どこ？」, or does nothing until she points it out. Outcomes: found among the first two
 * looked at (`found`), found later (`found_slow`), or pointed out by her (`pointed`). Nothing is random; the street claims
 * nothing about the place (an ordinary street from above).
 *
 * Accessibility: each umbrella is a button in the tab order, named by what is drawn there (its colour and the stall or
 * walker under it), the same clues the picture gives, never by whose it is; Enter or Space looks at it; 「どこ？」 is a
 * 56px button at the bottom. With less motion the walkers and the traffic stand still, and a looked-at umbrella moves aside
 * at once instead of sliding. The outcome is read out by the host.
 */
export const parasolSearch = defineMiniGame({
  id: "parasol_search",
  engine: "search",
  titleJa: "日傘を探す",
  howToJa: "格子の窓から見下ろした通りで、傘を押して古い日傘を探す。「どこ？」で彼女に教えてもらう（約10秒）",
  outcomes: [
    { id: "found", labelJa: "すぐに見つけた", noteJa: "違う傘を1本まで見て、古い日傘を押した" },
    { id: "found_slow", labelJa: "何本か見て見つけた", noteJa: "違う傘を2本以上見てから、古い日傘を押した" },
    { id: "pointed", labelJa: "彼女が見つけた", noteJa: "「どこ？」を押したか、8秒何もしなかった" },
  ],
  defaultAuto: "found",
  params: () => z.object({
    at: z.enum(["left", "middle", "right"]).default("middle")
      .describe("古い日傘の場所（手前の歩道の left 左・middle 真ん中・right 右。書かなければ middle）"),
  }).strict(),
  examples: [{}, { at: "left" }, { at: "right" }],
  startJa: "見下ろす",
  hintJa: "格子の窓から、通りの古い日傘を探す",
  timed: true,
  keysJa: "Tab で傘を選び、Enter・Space で見る",
  sounds: ["clue_new", "ui_tap"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "street", kind: "backdrop", labelJa: "格子の窓から真下に見下ろす旧市街の通り（向かいの店先・歩道・車道と、立ち止まった牛・停めたオートリキシャ・手前の歩道。傘・屋台・人はゲームが描くので描かない。横長 17:10）" },
  ],
  load: () => import("./play"),
});
