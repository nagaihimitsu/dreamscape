INCLUDE modules.ink
-> DONE

// ブレラ絵画館の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、特殊戦C、道中交流とデート。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== brera_case_guide ===
# scene: guide
# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で、赤と青の布を肩にかけた男が歩幅を測っていた。四歩で立ち止まり、一歩だけ戻る。
# speaker: heroine
「道に迷ってるんだったら、ずいぶん小さい範囲ですね。」
# speaker: narrator
女が布の一方を引いた。「その三歩で、客はあんたを忘れるのよ」
# speaker: narrator
二人はこちらを見ず、そのまま絵画館へ入った。
-> END

// ───── 特殊戦C（証拠連結）。battles/catalog.json の milano_brera_c01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張は手伝いの knot milano_brera_c01_claim（knot の名前＋_claim）。
=== milano_brera_c01 ===
# scene: battle
# background: milano_brera_date
# speaker: enemy
「舞台が暗いの。青い布は沈む。別れの場面は真っ赤一色。客席の後ろまで見える。」
# speaker: narrator
弟は借り物の青い布を畳もうとしなかった。二人の前にはハイエツの《接吻》がある。
# speaker: heroine
「弟さんは、どういう色にしたいんです？」
# speaker: narrator
弟「俺、衣装係なのに聞かれたの、今日それが初めてです」
# speaker: enemy
# reaction: heroine,serious
「時間がない。最後列の客が何を拾うか、絵に聞きに来たの。」
-> quiz(1) ->
# background: milano_brera_date
{ quiz_correct:
# speaker: enemy
「見る位置で、布の色より強く人を引き寄せられるのね。」
- else:
# speaker: enemy
「ずらっと奥に続く感じとは逆ね。身体を足もとから見通すから、むしろこちらへ迫る。」
}
# speaker: narrator
マンテーニャの絵の前で、二人は少し立ち止まった。近づいて見えるのは、赤く目立つからではなかった。
# speaker: enemy
「そうか、客の立つ位置まで絵に決められるのか。」
# speaker: player
「舞台なら、見る向きは選べますね。」
# speaker: narrator
弟は布を胸に当てたまま《接吻》へ戻った。
-> quiz(2) ->
# background: milano_brera_date
{ quiz_correct:
# speaker: enemy
「お客さんも、自分の時代と一緒に絵を見てたんだ。」
- else:
# speaker: enemy
「中世の二人に見えても、それを見たのは統一の闘いの進展を祝う人々。そこを取り違えてた。」
}
# speaker: enemy
「昔のお客さんが、この二人を見て恋の話をした。そこまでは私にも見える。その先は？」
# speaker: heroine
「絵の中にあるものと、その外で起きてたこと。両方持ってきます。」
-> milano_brera_c01_claim ->
# background: milano_brera_case
# speaker: heroine
「布だけ見て分かることと、当時の人だから分かったこと。分けてからつなげよう。」
- (stop)
-> reasoning ->
{ evidence_result == "failure":
    # background: milano_brera_date
    # speaker: enemy
    「片方だけでは、色選びを政治の話につなげられない。何が見えるかと、誰がいつ見たか。それぞれ知りたい。」
    -> stop
}
# background: milano_brera_date
# speaker: heroine
「二国の旗を思わせる衣装と、統一をめぐる闘いを祝った展覧会。組み合わせれば、抱き合う二人を見ながら当時の国のことも考えられます。」
-> quiz(3) ->
# background: milano_brera_date
{ quiz_correct:
# speaker: enemy
「二枚を重ねると、この青から聞こえる話が増える。」
- else:
# speaker: enemy
「国旗を思わせる色を、当時のお客は見た。恋の場面で、国のことまで思えたのね。」
}
# speaker: narrator
弟は布を肩から外し、向かい合う姉の腕にその端をかぶせた。片足だけ先に出口へ向けている。
# speaker: enemy
「……そっちへ行くんだ。」
# speaker: narrator
弟「うん。今、最後列の人にも分かった？」
# speaker: enemy
「色は残す。別れを見せるのは、あんたのその足に任せる。」
# speaker: narrator
弟が歩き出し、姉だけが布を持ったまま残った。稽古の続きだと分かるまで、彼女も少し息を止めた。
-> END

=== milano_brera_c01_claim ===
# background: milano_brera_date
# speaker: enemy
「この衣装の色が、どうして二人だけの事情より大きな話になる？　画面の中と外から一枚ずつ、根拠を借りたい。」
->->

// 道中交流「モデルは五秒」（knot の名前 brera_sitter が交流のID）。
// 今は起こらない：条件『ブレラ絵画館の特殊戦を戦った』（頭の # when: battle …）を満たすと、ブレラ絵画館の観察はもう開かないため。
// 特殊戦を戦うと、ブレラ絵画館は地図の行き先に出なくなる。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
=== brera_sitter ===
# scene: encounter
# title: モデルは五秒
# at: visit brera_case
# priority: after observe
# when: battle milano_brera_c01
# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で、素描の学生がこちらに声をかけた。「五秒だけモデル、お願いしていいですか。動く前の人の膝が描けなくて」
# speaker: heroine
「五秒なら。あ、私、もう動くつもりで膝を固めちゃった。」

* [I'll be the one about to leave. # option: pose # translation: 出ていく直前の役をやるよ。]
    # speaker: narrator
    一歩を宙に止めると、学生は鉛筆を下ろした。「もう残る人の膝です。帰っていいですよ」。歩き出した瞬間だけ、鉛筆が動いた。
    -> END

* [I'll count to five. # option: count # translation: 五秒数えるよ。]
    # speaker: narrator
    五、と言ったところで、彼女は肩を下ろした。学生「その後の六秒目、いまの膝です」。
    # speaker: heroine
    「契約延長は、一度だけですよ。」
    -> END

* [I'd rather stay out of the sketch. # option: decline # translation: 私は絵の外にいたいです。]
    # speaker: narrator
    学生はすぐスケッチ帳を閉じた。「了解。今日いちばん早く立ち去れそうな膝だったから惜しいけど」。
    # speaker: heroine
    「断った後の足が、一番描くのに向いてたね。」
    -> END

// デート（本筋）。romance/date_catalog.json の milano_brera_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_brera_date_01 ===
# scene: date
# title: 振り返る前のひとこと
# background: milano_brera_date
# speaker: narrator
ブレラの《接吻》の前。彼女は抱き合う二人を見て、片手を自分の背中へ回した。
# speaker: heroine
「二人の足元、片方だけ階段にかかってる。先に行ってしまいそうで気になる。」
# emotion: serious
「この後にひとことだけ言えるとして。「気をつけて」と「行かないで」、どっちがその人のためになるんだろ。」
# speaker: player
「二つとも言うのは？」
# speaker: heroine
「私、たぶん長く話すと最後を「じゃあね」でごまかす。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
絵を見る人が動くまで、彼女は隣を一歩あけた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の肩のすぐ横から、画面の端を指した。
}

* [「行かないで、と言ってみて」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        「今日は言ってみるだけでも重いな。絵の二人に借りておく。」
    - else:
        # speaker: heroine
        「行かないで。……あ、言ったほうが、ちゃんと送り出せそう。」
    }
    -> join_1

* [「黙って見送るのもありかな」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        「それを選べる人は強いね。私は、今日は何か言いたい。」
    - else:
        # speaker: heroine
        「うん。でも私は、何も言わなかった日のことばかり覚えてる。」
    }
    -> join_1

* [「じゃあね、にも続きがあるよ」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        「本当は続いてほしいときほど、軽く聞こえちゃう気がする。」
    - else:
        # speaker: heroine
        「次がある言い方だもんね。それなら、少し好きかも。」
    }
    -> join_1

= join_1
# speaker: narrator
衣装の色に国旗を読む人もいるという。絵の二人には街の事情もあったのかも、と彼女はつぶやいた。
# speaker: heroine
「理由をみんな知ったら、言える言葉が増えるかな。それとも減る？」

* [「僕なら、聞いてから決めたい」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        「答えるまで待たせるのも難しいよね。聞かれなくても言えるようになりたい。」
    - else:
        # speaker: heroine
        「私もそうしてほしい。事情があるなら、遠回りでも聞いて。」
    }
    -> join_2

* [「一言なら「またね」にする」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        「「またね」って約束かな。私はたまに、軽く言われると迷う。」
    - else:
        # speaker: heroine
        「いい。短いのに、もう一回分ある。」
    }
    -> join_2

* [「次に会った時の一言も予約する」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        「予約すると、違う言葉が出た日に困るよ。空けておきたい。」
    - else:
        # speaker: heroine
        「じゃあ私から。「遅い」。待ってたって伝わるでしょ。」
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
台詞を選び終えた口元を、彼女がそっと見た。
}
# speaker: narrator
次の絵に移るとき、彼女は《接吻》にだけ聞こえる声で「じゃあね」と言った。
-> END
