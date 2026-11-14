import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `parasol_search` (a skin of `search`): Hawa Mahal's upper floor, a lattice window over the old city's street. Looking
 * down, the street is full of round umbrellas and parasols: five stalls on each pavement, three people walking with them,
 * a cow, an auto-rickshaw and a cycle-rickshaw. Three rounds, the three things the heroine later tells the vegetable
 * seller she saw (2026-11-13 playtest), each a different kind of looking (round 3, 2026-11-14: 「難しく、楽しく」):
 * compare — her old parasol (the tag's `at`: left, middle or right on the near pavement; two other old parasols and two
 * other vegetable stalls make the player look at both clues); watch — the customer arguing with her over the price, whose
 * argument comes in bursts (arms up and the ₹! burst) while three others throw an arm or both up about them, two of them
 * shouting in the same burst with no ₹ (the feints, the first before the first burst); catch, the climax — she hands a
 * tomato to the child in front of her stall, and the children run off (red balls and flowers about it), the tomato child
 * to the side street's mouth at 4.3 s (the round's own time: 「あ、行っちゃう！」, she points it out). The hints never say where. The player taps to look (a wrong one is only looked at, and the
 * round goes on), or presses 「どこ？」, or does nothing until she points it out (8 s; 4 s in the rounds after one the
 * player left to her), and the next round comes either way. Outcomes: all three found by the player with at most one
 * wrong look in all (`found`), with more (`found_slow`), or any of them pointed out by her (`pointed`). ★3 asks for no
 * wrong look and the whole look within 5.1 s (the search bot, bot.test.ts: about 3 in 10 average players, 7 in 10
 * skilled ones, under 1 in 10 careless ones). Nothing is random (the seed only shuffles which other stall stands where
 * and who does what); the street claims nothing about the place (an ordinary street from above).
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
  howToJa: "格子の窓から見下ろした通りで、古い日傘（似た傘がある）・値段で揉める客（言い争いは時々。₹ の印が目じるしで、腕を上げて叫ぶだけの人もいる）・トマトをもらった子ども（走って通りを出ていく）を順に押して見つける。「どこ？」で彼女に教えてもらう（約10秒）",
  // The finish word for the player's own find; her face (and a word that does not get ahead of the story's next lines: the
  // narration of what the seller did, then her thought about the window) on the result card.
  outcomes: [
    { id: "found", labelJa: "すぐに見つけた", noteJa: "3つとも自分で見つけ、違うものを見たのは合わせて1つまで", finishJa: "見つけた！",
      reaction: { kind: "cheer", linesJa: ["ちゃんと、見えたね"] } },
    // Found all the same (★1 for the wrong looks): 「見つけた！」 finishes as a good end, not the whistle (docs/13 2.6).
    { id: "found_slow", labelJa: "何度か見間違えて見つけた", noteJa: "3つとも自分で見つけ、違うものを2つ以上見た", finishJa: "見つけた！",
      finishTone: "good", reaction: { kind: "cheer", linesJa: ["ふう……目がまわりそう"] } },
    // Her name in the label: two women are on the scene (the heroine and the seller).
    { id: "pointed", labelJa: "{heroine_name}と一緒に見つけた", noteJa: "どれかで「どこ？」を押したか、8秒何もしなかったか、トマトの子が横道の入口まで行った（4.3秒。彼女が「あ、行っちゃう！」と指さす）。彼女が指さすと次へ進む（任せた次からは4秒）",
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
  durationSec: 10,
  // The practice: the whole look at the left stall (the bursts, the feints and the handover can be learned; the real
  // look's stall is elsewhere unless the tag says left).
  practice: { params: { at: "left" } },
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
