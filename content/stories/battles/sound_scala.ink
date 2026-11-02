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
{ battle_scene == "press": -> s_press }
{ battle_scene == "evidence_failure": -> s_evidence_failure }
{ battle_scene == "evidence_success": -> s_evidence_success }
-> END

=== s_intro ===
# background: milano_la_scala_date
# speaker: enemy
「祖母の椅子を片づけに来た。家族の話じゃ「スカラ座の平土間にあった」。買い手は鼻で笑った。」
# speaker: narrator
椅子を裏返すと、薄緑の塗料が桟に垂れている。祖母が台所を塗った年と同じ色だという。
# speaker: heroine
「劇場の椅子だと分かったら、売れるんですか？」
# speaker: enemy
# reaction: heroine,worried
「高くなる。……そしたら、捨てない口実ができる。持って帰るのに、口実ひとつ要る家なの。」
-> END

=== s_after_1 ===
# background: milano_la_scala_date
{ answer_correct:
# speaker: enemy
「客席の壁紙にまで持ち主の好みがあったのね。」
- else:
# speaker: enemy
「桟敷は借りるだけだと思ってた。持ち主が好きなふうに飾れたのね。」
}
# speaker: narrator
アダは椅子の足を手のひらで払った。縁には、何度も持ち上げられた跡がある。
# speaker: enemy
「祖母はここにあったと言う。買い手は、そんなことは絶対にないと言う。どっちかが嘘をついたのかな。」
# speaker: player
「「絶対」のほうから調べてみよう。」
-> END

=== s_after_2 ===
# background: milano_la_scala_date
{ answer_correct:
# speaker: enemy
「違う時代の座り方が一つ見えた。」
- else:
# speaker: enemy
「買い手は平土間の椅子を知らなかった。動かして、客に貸してたのよ。」
}
# speaker: enemy
「動かせた椅子が、うちまで動いてきた。そこをつないでくれる人がいればね。」
# speaker: heroine
# emotion: serious
「私、そこの証人にはなれません。」
# speaker: narrator
アダの手から布が落ちた。彼女は拾って、椅子の上に置いた。
-> END

=== s_outro ===
# background: milano_la_scala_date
{ answer_correct:
# speaker: enemy
「席を持ち寄ってでも、演奏を聴きたかったのね。」
- else:
# speaker: enemy
「正式な再開を待てない人がいたのね。瓦礫の中、普通の椅子で演奏を聴いた。」
}
# speaker: narrator
アダは買い手に電話をかけた。
# speaker: enemy
「劇場の椅子だとは保証しません。はい。……じゃあ取りやめで。」
# speaker: narrator
切って、ようやく腰掛けた。彼女の膝の高さに、ぴったりだった。
# speaker: enemy
「子どもの頃ね、足が床につかないから、ばあちゃんがあの桟に板を渡した。いま見たら、傷が両方にある。」
# speaker: heroine
「値札、どうします？」
# speaker: enemy
「取る。家で文句が出たら、今度は私が座ってるところをどかしてもらう。」
-> END

=== s_claim ===
# background: milano_la_scala_date
# speaker: enemy
「買い手の言い分はこう。「スカラ座の平土間の席は昔から全部固定。家に持って帰れた椅子なんてあるはずない」」
-> END

=== s_press ===
# background: milano_la_scala_date
# speaker: heroine
「この椅子の来歴じゃなくて、「昔から全部」の部分ですね。どの客席のどんな記録なら確かめられるかな。」
-> END

=== s_evidence_failure ===
# background: milano_la_scala_date
# speaker: enemy
「面白い。でも私が知りたいのは、平土間の床から椅子を動かせたかどうか。別の場所の話じゃ、買い手には通じない。」
-> END

=== s_evidence_success ===
# background: milano_la_scala_date
# speaker: heroine
「平土間では椅子を借りて座った、しかも動かせた。買い手の理由は崩れます。ただ、この一脚がそこから来た証明はまだありません。」
-> END
