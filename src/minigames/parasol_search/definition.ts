import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `parasol_search` (a skin of `search`): Hawa Mahal's upper floor, a lattice window over the old city's street. Looking
 * down, the street is full of round umbrellas and parasols: five stalls on each pavement, three people walking with them,
 * a cow, an auto-rickshaw and a cycle-rickshaw. Three rounds, the three things the heroine later tells the vegetable
 * seller she saw (2026-11-13 playtest): her old parasol (the tag's `at`: left, middle or right on the near pavement; two
 * other old parasols and two other vegetable stalls make the player look at both clues), the customer arguing with her
 * over the price, the child she gave a tomato to. The player taps to look (a wrong one is only looked at, and the round
 * goes on), or presses 「どこ？」, or does nothing until she points it out (the next round comes either way). Outcomes:
 * all three found by the player with at most one wrong look in all (`found`), with more (`found_slow`), or any of them
 * pointed out by her (`pointed`). Nothing is random (the seed only shuffles which other stall stands where); the street
 * claims nothing about the place (an ordinary street from above).
 *
 * Accessibility: each round's things are buttons in the tab order (the next round's first takes the focus), named by what
 * is drawn there (an umbrella's colour and the stall or walker under it; a customer's stall and what they do; what a
 * child holds), the same clues the picture gives, never by whose it is; Enter or Space looks at it; 「どこ？」 is a 56px
 * button at the bottom; the top band says the round and the looks. With less motion the walkers, children and traffic
 * stand still, and a looked-at umbrella moves aside at once instead of sliding. The outcome is read out by the host.
 */
export const parasolSearch = defineMiniGame({
  id: "parasol_search",
  engine: "search",
  titleJa: "日傘を探す",
  howToJa: "格子の窓から見下ろした通りで、古い日傘・値段で揉める客・トマトをもらった子どもを順に押して見つける。「どこ？」で彼女に教えてもらう（15〜25秒）",
  // The finish word for the player's own find; her face (and a word that does not get ahead of the story's next lines: the
  // narration of what the seller did, then her thought about the window) on the result card.
  outcomes: [
    { id: "found", labelJa: "すぐに見つけた", noteJa: "3つとも自分で見つけ、違うものを見たのは合わせて1つまで", finishJa: "見つけた！",
      reaction: { kind: "cheer", linesJa: ["ちゃんと、見えたね"] } },
    { id: "found_slow", labelJa: "何本か見て見つけた", noteJa: "3つとも自分で見つけ、違うものを2つ以上見た", finishJa: "見つけた！",
      reaction: { kind: "cheer", linesJa: ["ふう……やっと、全部見えた"] } },
    // Her name in the label: two women are on the scene (the heroine and the seller).
    { id: "pointed", labelJa: "{heroine_name}と一緒に見つけた", noteJa: "どれかで「どこ？」を押したか、8秒何もしなかった（彼女が指さして、次へ進む）",
      finishJa: null, reaction: { kind: "tease" } },
  ],
  defaultAuto: "found",
  params: () => z.object({
    at: z.enum(["left", "middle", "right"]).default("middle")
      .describe("古い日傘の場所（手前の歩道の left 左・middle 真ん中・right 右。書かなければ middle）"),
    rounds: z.coerce.number().int().min(1).max(3).default(3)
      .describe("見つける物の数（1 古い日傘だけ・2 値段で揉める客まで・3 トマトをもらう子どもまで。書かなければ 3）"),
  }).strict(),
  examples: [{}, { at: "left" }, { at: "right" }, { at: "left", rounds: "1" }],
  startJa: "見下ろす",
  hintJa: "格子の窓から、古い日傘から順に3つ見つけて押す",
  goalJa: "古い日傘、値段で揉める客、トマトをもらった子どもを、順に押して見つける",
  controls: "tap-target",
  durationSec: 20,
  // The practice: the old parasol only, at the left stall (the real look's round 1 elsewhere, unless the tag says left).
  practice: { params: { at: "left", rounds: "1" } },
  // The ★ counts the time: the host's 3・2・1 starts it for everyone alike.
  countdown: "host",
  music: "calm",
  // The result card high, over the far pavement: the find (her stall, the customer, the child, near the window) stays in view.
  resultAnchor: "top",
  timed: true,
  keysJa: "Tab で選び、Enter・Space で見る",
  sounds: ["clue_new", "ui_tap"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "street", kind: "backdrop", labelJa: "格子の窓から真下に見下ろす旧市街の通り（上から、向かいの店先・歩道・車道・手前の歩道。傘・屋台・人・子どもはゲームが描くので描かない。窓はおよそ 4:5 の縦長で、横長の絵は左右が切れる）" },
  ],
  load: () => import("./play"),
});
