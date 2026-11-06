VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_amber_fort
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: enemy
「そこは通り道だよ。見るなら、もっと奥。足を使う価値のある所へ行こう」
# speaker: narrator
アンベール城の中庭で立ち止まると、帽子を二つ抱えた男性に声をかけられた。鞄からは三つ目のつばが出ている。
# speaker: heroine
# reaction: heroine,surprised,question
「え、ここは見なくていいんですか？」
# speaker: enemy
「効率よく見るならね。元バス運転手のハリッシュだ。遠回りを削るのは得意だよ」
# speaker: narrator
示された案内図には、最初の中庭を素通りする線がある。彼女はつられて歩きかけ、踏み出した足を戻した。
# speaker: heroine
「でも、わたしは今ここが気になって。こんなに広いの、ただ通るためだけじゃない気がします」
# speaker: enemy
# reaction: enemy,question
「広場だろう。人が集まる。そこは見れば分かる」
# speaker: heroine
# reaction: heroine,serious,exclamation
「何をしに集まったかは、見ただけじゃ分からないです」
# speaker: narrator
彼女は案内を広げる。ハリッシュは帽子を持ち替え、広場の使われ方についての説明へ目を落とした。
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「帰還した軍隊が、戦利品を示した。君が引っかかったのは、そこか」
- else:
「帰還した軍隊が、戦利品を示した場所だったのか。通り道という私の説明も、ずいぶん省略していたな」
}
# speaker: heroine
「誰かが見せるために、誰かを集めていたんですね。門の大きさだけ見てたら、通り過ぎてた」
# speaker: enemy
「昔の使い方が分かっても、今日の足の数は二本のままだ」
# speaker: narrator
彼は膝をさすった。気づかれたと分かると、わざと鞄の留め具をいじる。
# speaker: heroine
# emotion: worried
「足、つらいんですか？」
# speaker: enemy
「休憩を勧める顔だね。もう十分勧められた。省く場所を自分で決めたいんだよ」
# speaker: narrator
彼女は言いかけた言葉を飲み込み、案内図へ戻った。城の中には、軍のためだけではない場所も並んでいる。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「住まいも庭も寺院もある。ここで一日過ごす人なら、ぜんぶ同じ用事じゃないですね」
- else:
「住まいも庭も寺院も含む宮殿なんですね。戦いの場所、だけで考えてました」
}
# speaker: enemy
「違う用事の人間を、同じ所で降ろすな。昔、散々言われたよ」
# speaker: heroine
# reaction: heroine,teasing,music
「今も、わたしたちの用事を聞く前に、降りる所を決めてました」
# speaker: narrator
ハリッシュが口を開き、閉じる。帽子を一つ、自分の頭へ乱暴に載せた。
# speaker: enemy
# reaction: enemy,sweat
「乗っていない人を案内したのは、久しぶりだ」
# speaker: narrator
彼は案内図の丘の上を指す。別の城とのつながりが描かれていた。
# speaker: enemy
「こっちに通じるという地下通路の話もある。近道のつもりで話す前に、相手の城くらいは確かめるか」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「ジャイガル城。そう、そのつながりだ」
- else:
「相手はジャイガル城だ。地下通路があるという話と、今日そこを歩けるかは別に考えないとな」
}
# speaker: narrator
通路へは向かわず、図の上だけで二つの城をたどる。彼女は案内を畳み、今いる中庭へ顔を戻した。
# speaker: enemy
{ battle_score == 3:
「説明は君の方が細かかった。私の道なら歩数は少ない。それは譲らないよ」
- else:
「知らないところを確かめた分、私は予定より長くここにいる。足には、あとで文句を言われるな」
}
# speaker: heroine
「わたしは、もう少しここを見ます。奥へ行くのが遅くなっても」
# speaker: enemy
「なら、帽子は要るかい。予備の予備まで持ってきた」
# speaker: heroine
# reaction: heroine,happy,music
「大丈夫です。そこは、ちょっと省いてきてもよかったかもしれませんね」
# speaker: narrator
ハリッシュは三つ目の帽子を押し込んだ。最短経路の図は消さずにしまい、彼自身が選んだ陰の方へ歩いていく。
# speaker: heroine
# emotion: smile
「自分で決めたい、か。わたし、すぐ座りましょうって言うところだった」
# speaker: narrator
彼女は中庭から奥の門へ向け、短い映像を撮った。先を急がない分だけ、門の向こうの人影が小さく動く。
-> END
