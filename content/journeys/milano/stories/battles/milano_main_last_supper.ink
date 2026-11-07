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
-> END

=== s_intro ===
# background: milano_refectory
# speaker: heroine
「お水、いりますか？」
# speaker: narrator
男は片手を上げた。彼女がもう一歩寄ると、連れの女性が二人の間に入った。
# speaker: enemy
# reaction: heroine,surprised
「兄には声を休める約束があるの。夕方、小さな舞台が一本。聞き返されると、この人は絶対しゃべっちゃう。」
# speaker: narrator
兄は唇を結んだままうなずいた。
# speaker: heroine
「あの手、助けてっていう意味かと……。」
# speaker: enemy
# reaction: heroine,shy
「それ、私に「あと五分」の手。子どもの頃、風呂から出ないときも同じ手だった。」
-> END

=== s_after_1 ===
# background: milano_refectory
{ answer_correct:
# speaker: heroine
「描いた光が、こちらの壁まで届いたみたい。」
- else:
# speaker: heroine
「ランプを探してた。こっちの部屋の窓と、絵の光を合わせたんですね。」
}
# speaker: narrator
妹は腕時計を外し、兄の手にのせた。兄は時刻を見ず、時計を持ったまま絵を見た。
# speaker: heroine
「あれじゃ、何時に出たらいいか分からないよね。」
# speaker: player
「見てほしいのは、そっちじゃないのかも。」
# speaker: narrator
彼女は助け舟を出しかけて、絵の中の人の手を見た。
-> END

=== s_after_2 ===
# background: milano_refectory
{ answer_correct:
# speaker: heroine
「顔が向く先と腕が指す先、両方いるんだ。」
- else:
# speaker: heroine
「手だけ見たから読み違えた。マタイは隣の人にも、あの言葉に気づいてほしかったんだ。」
}
# speaker: heroine
「同じ手でも、誰に向けたかで違うんですね。」
# speaker: enemy
「うちの五分はたいてい七分。それは絵を見ても分かんないよ。」
# speaker: narrator
兄の肩が一度だけ上がった。声を出さずに笑って、時計を妹に返した。
-> END

=== s_outro ===
# background: milano_refectory
{ answer_correct:
# speaker: heroine
「描きながら変えられる時間を選んだんですね。」
- else:
# speaker: heroine
「乾いた壁を選んだのは、急がずに手を入れられるから。絵を前に立ち止まるのは、見る人だけじゃなかったんだ。」
}
# speaker: narrator
外へ出ると、彼女は録音を始めた。三秒で止めた。
# speaker: heroine
「さっき、あの人の静かな時間を、私がいい話にして持って帰ろうとした。なんて言えばいいかな。」
# speaker: player
「三秒のままでも、いいんじゃない。」
# speaker: narrator
兄妹は向こうの角を曲がった。曲がり切るところで兄が手を上げた。今度は二人とも、意味を決めずに手を振り返した。
-> END
