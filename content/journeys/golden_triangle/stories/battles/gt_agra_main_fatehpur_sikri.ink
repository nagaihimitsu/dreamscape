VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_agra_fatehpur_sikri
# speaker: enemy
「出発します。忘れ物は……私の仕事だった」
# speaker: narrator
ファテープル・シークリーの広場で、年配の女性が自分の声に笑っていた。{heroine_name}も、つられて足を止める。
# speaker: heroine
# reaction: heroine,surprised,question
「出発、しないんですか？」
# speaker: enemy
「しない。長いことバスの車掌だったから、誰かが集まると口が勝手に。キランよ。今日は乗客一名、私だけ」
# speaker: narrator
退職した今も、家族で出かけると案内を任されるという。今日は下見のつもりで来て、途中でそれをやめた。
# speaker: enemy
「妹に『楽しんでおいで』と言われたのに、来週の順路を考えてた。賃金の出ない車掌まで続けるところだったわ」
# speaker: heroine
# reaction: heroine,teasing,music
「運行を終了したんですね」
# speaker: enemy
「私の分だけ、まだ走ります」
# speaker: narrator
キランは赤い建物の列を見渡す。{heroine_name}も、その先の広場を探すように顔を上げた。
# speaker: enemy
「これだけ大きな街にしたのね。どのくらい首都だったのかしら。建物の大きさだけで、長く使ったとは決められないけど」
-> END

=== after_first ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: enemy
「そう、短い首都の時代。建物の大きさで、長く使ったと思い込んじゃ駄目ね」
- else:
# speaker: enemy
「首都だった期間は長くないの。大きく造ったら、ずっとそこにいるとも限らない」
}
# speaker: heroine
「キランさんは、同じ路線に長くいたんですか？」
# speaker: enemy
「いくつも変わった。路線を覚えると、人も覚える。最後まで降りる場所を間違える人もいた」
# speaker: heroine
「それは、困りますね」
# speaker: enemy
# reaction: enemy,music
「私が」
# speaker: narrator
彼女の即答に、{heroine_name}は声を抑えて笑った。目の前の都市にも、違う用事で通った人たちがいたはずだ。
# speaker: enemy
「王様の住まいだけなら、こんなにいろんな建物はいらないでしょう。どんな用事が集まった街だったのかしら」
-> END

=== after_second ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: heroine
「政治も、礼拝も、暮らしも。一つの宮殿の大きさで考えると、足りないんだ」
- else:
# speaker: heroine
「宮殿だけじゃなかった。役所や、礼拝の場所や、そこで暮らす人の空間もある都市なんだね」
}
# speaker: enemy
「なら、全員同じ順番に案内する必要もないわね。私の家族だって、見たいものが違う」
# speaker: narrator
キランは折った案内図を鞄へしまう。{heroine_name}は、まだ見えていない方の広場へ視線を向けた。
# speaker: heroine
「都が移ると、こういう道も全部使われなくなるんでしょうか」
# speaker: enemy
「『終点、全員降りて』みたいに？　その先がないと思うと、急に寂しいわね。確かめてみましょう」
-> END

=== conclusion ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: enemy
「皇帝たちの一時的な訪問は続いた。首都でなくなっても、帰ってくる人はいたのね」
- else:
# speaker: enemy
「首都がラホールへ移った後も、皇帝たちが訪れていたの。誰も来なくなった、と閉じる話ではないわ」
}
{ battle_score == 3:
# speaker: heroine
# reaction: heroine,happy,sparkle
「三つとも分かった。わたし、今度はあっちの広場へ行ってみたいです」
- else:
# speaker: heroine
# emotion: smile
「思い込み、途中で降りられてよかった。今度はあっちの広場へ行ってみたいです」
}
# speaker: enemy
「私はもう少しここ。案内はしませんよ」
# speaker: heroine
# reaction: heroine,teasing,music
「はい。乗客一名ですもんね」
# speaker: narrator
キランに手を振り、二人は広場へ続く道を確かめた。{heroine_name}が、スマートフォンをこちらへ差し出す。
# speaker: heroine
「向こうが見えるところまで、少し撮ってもらえる？　建物だけだと、どうつながっていたか忘れそう」
# speaker: narrator
歩ける道で画面を向ける。彼女は一歩出て、案内を確かめるために戻り、それから広場へ進んだ。こちらは立ち止まったまま、その足取りを数秒だけ撮った。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「戻ったところまで入ってる。『こちらです！』って顔で、逆だったね」
# speaker: narrator
彼女は消去の印に指を近づけたが、触れずに引っ込めた。
# speaker: heroine
# emotion: smile
「残そう。次は何が見えるんだろうって、迷ったところも面白かったから」
-> END
