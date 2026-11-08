VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> s_intro }
{ battle_scene == "after_1": -> s_after_1 }
{ battle_scene == "after_2": -> s_after_2 }
{ battle_scene == "outro": -> s_outro }
{ battle_scene == "claim": -> s_claim }
{ battle_scene == "evidence_failure": -> s_evidence_failure }
{ battle_scene == "evidence_success": -> s_evidence_success }
-> END

=== s_intro ===
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
-> END

=== s_after_1 ===
# background: milano_brera_date
{ answer_correct:
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
-> END

=== s_after_2 ===
# background: milano_brera_date
{ answer_correct:
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
-> END

=== s_outro ===
# background: milano_brera_date
{ answer_correct:
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

=== s_claim ===
# background: milano_brera_date
# speaker: enemy
「この衣装の色が、どうして二人だけの事情より大きな話になる？　画面の中と外から一枚ずつ、根拠を借りたい。」
-> END

=== s_evidence_failure ===
# background: milano_brera_date
# speaker: enemy
「片方だけでは、色選びを政治の話につなげられない。何が見えるかと、誰がいつ見たか。それぞれ知りたい。」
-> END

=== s_evidence_success ===
# background: milano_brera_date
# speaker: heroine
「二国の旗を思わせる衣装と、統一をめぐる闘いを祝った展覧会。組み合わせれば、抱き合う二人を見ながら当時の国のことも考えられます。」
-> END
