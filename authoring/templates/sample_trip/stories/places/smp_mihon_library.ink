// 【任意：特殊戦C】【場所のファイル】見本の図書室（stories/places/<接頭辞>_<都市ID>_<場所>.ink）。見本の図書室と人物は架空。
// - この1本に、図書室の観光案内と特殊戦C・証拠連結の会話を書く。書き方は朝市の場所のファイル（places/smp_mihon_market.ink）と同じ。
//   knot の名前＝場面のID。本筋の knot の頭の札は # scene: だけ。1行目は INCLUDE modules.ink、次の行は -> DONE（VAR は書かない）。
// - 本筋は、カタログ（tourism/catalog.json の guideStoryId、battles/catalog.json の storyId）が「places/smp_mihon_library.<knot>」の住所で指す。
// - 特殊戦Cを外すときは、このファイルごと外す（README の「任意の部分」）。
INCLUDE modules.ink
-> DONE

// ───── 案内（本筋。tourism/catalog.json の guideStoryId がこの住所を指す）。
// - 規則は通常の観光案内と同じ：選択肢・# effect なし、日本語、表示される行は40行以内。
// - 最初の行の # photo: は、図書室の絵（public/assets/album/smp_album_library.webp）をアルバムに入れる例（説明の札なし）。
=== smp_mihon_library_guide ===
# scene: guide
# background: smp_bg_mihon_library
# speaker: narrator
# photo: smp_album_library
図書室の棚には、街の日誌が年ごとに並んでいる。いちばん古い背表紙は、手ずれで丸くなっていた。
# speaker: heroine
「時計が止まった年の日誌も、ここにあるのかな」
-> END

// ───── 特殊戦C・証拠連結（本筋。battles/catalog.json の format: "C"、reasoning.kind: "connection"。storyId がこの住所を指す）。
// - knot の名前はバトルID。1本の流れ（段階5）。書き方は朝市の特殊戦Bと同じで、C には追及がない（reasoning_action は
//   いつも "evidence"）。reasoning.roundIndex（ここでは2）のとおり、第2問の後・第3問の前に、資料を2枚組み合わせて示す。
//   主張は手伝いの knot <バトル>_claim（<バトル> は、この knot の名前）。
// - 正しい資料（correctClueIds）は異なる2枚で、順不同。1枚だけでは言えないことが2枚で言えるようにする。
// - 観察できる事実と、そこからの解釈を台詞で区別する。
=== smp_mihon_special_c_library ===
# scene: battle
# background: smp_bg_mihon_library
# speaker: enemy
「三時の言い伝え？　記録にないことは、起きていないのと同じです」
# speaker: narrator
司書のイオは、日誌の背表紙を指でそろえた。一冊だけ、少し奥に押し込まれている。
# speaker: heroine
「記録なら、ここにたくさんありますよね。一緒に読んでもいいですか」
# speaker: enemy
「どうぞ。読めば分かります。言い伝えなんて、あとから付けた飾りだって」
-> quiz(1) ->
# background: smp_bg_mihon_library
{ quiz_correct:
    # speaker: enemy
    「鐘の修理は何度も。……鐘を直す職人は、この街にいたわけですね」
- else:
    # speaker: enemy
    「日誌に何度も出てくるのは、鐘の修理です。時計の修理は……見当たりません」
}
-> quiz(2) ->
# background: smp_bg_mihon_library
{ quiz_correct:
    # speaker: enemy
    「『三時に広場で』。招待状なんて、ただの私信だと思っていました」
- else:
    # speaker: enemy
    「古い招待状には、『三時に広場で』とあります。何通も、同じ書き方で」
}
-> smp_mihon_special_c_library_claim ->
- (stop)
-> reasoning ->
{ evidence_result == "failure":
    # background: smp_bg_mihon_library
    # speaker: enemy
    「その二枚では、わざとだとは言えませんね。偶然という説明で足ります」
    # speaker: heroine
    「直せたのに直さなかったこと、それから三時の使われ方。その二つを並べてみよう」
    -> stop
}
# background: smp_bg_mihon_library
# speaker: narrator
イオは二枚の資料を並べ、しばらく黙って見比べた。
# speaker: enemy
「……一枚ずつなら、どちらも偶然で片付けられたのに。では、二枚から何が言えますか」
-> quiz(3) ->
# background: smp_bg_mihon_library
{ quiz_correct:
    # speaker: enemy
    「直せたのに直さず、三時を誘いに使った。わざと、と考えるのが自然ですね」
- else:
    # speaker: enemy
    「鐘は直したのに時計は直さず、三時の招待状が残る。わざと止めたままにした、と考えられます」
}
{
- battle_score == 3:
    # speaker: enemy
    「書かれていないことは起きていない……昔、それで言い伝えを笑われたんです。今日は、わたしが読み落としていました」
    # speaker: heroine
    「読み落としてたのは、わたしたちも同じです。二枚並べて、やっと見えたので」
- battle_score == 2:
    # speaker: enemy
    「一問は外れましたね。でも、この二枚は同じ棚に並べ直しておきます」
- else:
    # speaker: enemy
    「記録は逃げません。次に来るときまでに、索引を作っておきます」
    # speaker: heroine
    「助かります。次は、わたしも最初から一緒に探させてください」
}
-> END

=== smp_mihon_special_c_library_claim ===
# background: smp_bg_mihon_library
# speaker: enemy
「時計が止まったままなのは、ただの偶然です。わざと残したという記録は、一つもありません」
->->
