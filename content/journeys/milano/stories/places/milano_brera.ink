INCLUDE modules.ink
-> DONE

// ブレラ絵画館の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内と特殊戦C。

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
