import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `nahargarh_hide_seek` (a skin of `search`): the Nahargarh Fort date's hide-and-seek. A corridor of identical arched doors
 * runs on to the side (it scrolls, twelve doors); she hides behind one of them (the tag's `hide`, 7 in the date:
 * 「七つ目の扉」). She plays too (round 3, 2026-11-14): now and then she peeks out of her door and ducks back, leaving it
 * ajar a while (「ちらっ」 at the corridor's edge when it is out of view), and each empty room's small event leans toward
 * her door (the room next to hers: her gasp through the wall). The player opens doors (an empty room each, until hers),
 * presses 「名前を呼ぶ」 (her name echoes back from every door, and from hers a giggle, louder the second time: an ear can
 * find her; the third call ends the play, and before it the button says 「最後に呼ぶ」), or, before doing either, does
 * nothing (her 「……まだかな」 at 6 s) until she peeks out from the corner. Finding her is the climax (a success chime after
 * the creak, her surprised face, a large ring and stars). Once the player has opened a door or called, stopping to think
 * never ends the play: after a while she giggles and her door's handles rattle (a hint), and the search goes on
 * (「中断する」 leaves it). Outcomes are how the player searched: found her among the first two doors opened
 * (`door_quick`: a bold player who caught her peek, or a lucky one), later (`door_by_door`), called (`call_her_name`),
 * waited (`just_wait`). An attitude, not a skill: no rating and no practice (it stands in for the date's choice). No
 * names on the doors (the palace's door names are not confirmed; the game shows none).
 *
 * Accessibility: each door is a button (「扉1」〜「扉12」, the label never tells which one hides her) in the tab order, and
 * focus scrolls the corridor to it; Enter or Space opens it; an opened empty room's name says which way it leans
 * (「扉3：空っぽの部屋。絵の目が右を見ている」), so a screen-reader player can follow it to her; 「名前を呼ぶ」 is a 56px
 * button at the bottom (its name says 「最後に呼ぶ」 before the call that ends the play, and the top band 「次で出てくる」).
 * The echo's giggle, her peeks and the hint are seen, not read out. With less motion the doors open at once, the echoes,
 * giggles and rooms show still (each room at its lean) and she does not slide in. The outcome is read out by the host.
 */
export const nahargarhHideSeek = defineMiniGame({
  id: "nahargarh_hide_seek",
  engine: "search",
  titleJa: "かくれんぼ",
  howToJa: "同じ形の扉が12並ぶ廊下で、隠れた彼女を探す。彼女は時々扉から顔をのぞかせ、空っぽの部屋は彼女の方へなびく。扉を開ける・「名前を呼ぶ」（こだまに彼女の笑い声がまじる）・初めから何もしないで待つ、のどれでもよい（5〜20秒）",
  // An attitude, not a skill: no finish word, flash or sound, no ★, no practice. Her face on the result card only: the story
  // goes on at once with her own first words (in both of its romance branches), so the card never speaks for her.
  outcomes: [
    { id: "call_her_name", labelJa: "名前を呼んだ", noteJa: "「名前を呼ぶ」を3回押した", finishJa: null, reaction: { kind: "tease" } },
    { id: "door_by_door", labelJa: "一つずつ開けて見つけた", noteJa: "3つ目以降に開けた扉で見つけた", finishJa: null, reaction: { kind: "oops" } },
    { id: "door_quick", labelJa: "すぐに見つけた", noteJa: "1つ目か2つ目に開けた扉で見つけた（彼女がのぞいた扉を開ければ、すぐ）", finishJa: null, reaction: { kind: "surprise" } },
    { id: "just_wait", labelJa: "廊下で待った", noteJa: "扉を開けたり呼んだり、廊下を扉1枚分より先へ動かしたりする前に、何もしないで9秒たった（3秒で彼女が扉からのぞき、6秒で「……まだかな」。その後で手を止めても終わらない。6秒ごとに彼女の扉から笑い声）",
      finishJa: null, reaction: { kind: "oops" } },
  ],
  defaultAuto: "door_by_door",
  params: () => z.object({
    hide: z.coerce.number().int().min(1).max(12).default(7).describe("彼女が隠れる扉（手前から数えて1〜12。書かなければ7）"),
  }).strict(),
  examples: [{}, { hide: "2" }],
  startJa: "探しに行く",
  hintJa: "扉を押して彼女を探す（名前を呼んでも、待ってもいい）",
  goalJa: "扉を押して彼女を探す（名前を呼んでも、待ってもいい）",
  controls: "tap-target",
  durationSec: 15,
  music: "calm",
  // The result card high, over the wall and the ceiling: her in her door stays in view below it.
  resultAnchor: "top",
  timed: true,
  keysJa: "Tab で扉を選び、Enter・Space で開ける",
  sounds: ["door_creak", "ui_tap", "pigeon_flutter", "quiz_correct"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "bay", kind: "backdrop", labelJa: "廊下の壁の一区画と、その戸口1つ（横に並べるとつながる絵。扉の板は場が上に描いて開ける）" },
    { id: "room", kind: "backdrop", labelJa: "開いた扉の奥に見える、誰もいない部屋（壁の絵と、小さな窓の光）" },
    { id: "peek", kind: "sprite", labelJa: "廊下の角から、そっと顔を出すヒロイン（上半身、立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
