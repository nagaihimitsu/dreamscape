VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_hawa_mahal
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
ハワー・マハルを望む場所で、若い女性が仕事用らしい名札を鞄の奥へ押し込んだ。目が合うと、彼女は先に口を開いた。
# speaker: enemy
「今日は案内できないよ。ここで働いてるわけでもないし」
# speaker: heroine
# reaction: heroine,surprised,question
「いえ、わたしたちも休んでるだけで。……お仕事帰りですか？」
# speaker: enemy
「病院の受付。イーシャ。さっきまで、いろんな人に同時に呼ばれてた。今は、窓を見てるところ」
# speaker: narrator
彼女は建物へ顎を向けた。{heroine_name}はスマートフォンを手にしたまま、少しためらう。
# speaker: heroine
「旅の短い動画を作っていて。今の話も、一緒に撮っていいですか？」
# speaker: enemy
「いや。今日は、誰かに見せる顔まで用意してない」
# speaker: narrator
返事は速かった。彼女はカメラを開かず、スマートフォンをしまう。
# speaker: heroine
# emotion: neutral
「分かりました。聞くだけなら？」
# speaker: enemy
「仕事の話は終わり。あの窓の話ならいいよ。通りにいる人と、内側の人。どっちが何を見ていたのか、気になってた」
-> END

=== after_first ===
# speaker: heroine
{ answer_correct:
「宮廷の女性が、街から姿を見られずに眺めるための格子だったんですね」
- else:
「宮廷の女性が、姿を見られずに外を眺めるためだったんですね。見られる側を逆に考えてました」
}
# speaker: enemy
「今日はその窓、借りたいな。顔を作らなくても、街を見ていられる」
# speaker: heroine
# emotion: serious
「でも、中にいた人が外へ出たかったかもしれないって、わたしは思いました」
# speaker: narrator
イーシャは彼女を見た。少しの間、二人とも窓を見ない。
# speaker: enemy
「それは、その人に聞かなきゃ分からない。私が今日は隠れたいのも、その人と同じじゃないし」
# speaker: heroine
「そうですね。わたし、知らない人の気持ちまで、続けてしまった」
# speaker: narrator
風が髪を動かす。彼女は押さえながら、窓が街を見る以外にも働いていたことを案内で確かめた。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「小窓は風も通す。飾りだけじゃないんだ」
- else:
「風を通す役目もあったんですね。きれいな形に気を取られてました」
}
# speaker: enemy
「目にも涼しく、だったらいいんだけどね。見てるだけじゃ、私の暑さは減らない」
# speaker: heroine
# reaction: heroine,teasing,music
「説明を聞いて涼しくなるなら、わたしもいっぱい聞きたいです」
# speaker: narrator
イーシャが初めて声を出して笑う。すぐに笑顔を戻そうとはせず、顔を上げたまま風を待った。
# speaker: heroine
「今の感じ、覚えておきたいな。撮る代わりに言葉で書いてもいいですか。名前は出さずに」
# speaker: enemy
「それなら。『顔を撮られたくない日もある』。そこ、消さないで」
# speaker: narrator
彼女は短い言葉をメモに入れた。イーシャは入場案内を見て、正面のどこに入口があるのか目を細める。
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「背後側か。正面に立って、正面ばかり探してた」
- else:
「入口は背後側なんだね。いちばん目立つ所に扉があるって、勝手に決めてた」
}
# speaker: heroine
「入るなら、まずそっちの案内ですね」
# speaker: enemy
{ battle_score == 3:
「調べるのは速いんだ。私の機嫌まで調べなくていいからね」
- else:
「一緒に探した入口だけ、案内できた。今日はそれで十分かな」
}
# speaker: narrator
彼女は笑いかけたが、イーシャの笑顔を待つのはやめた。メモの文を見せると、短くうなずいてもらえた。
# speaker: heroine
「ここ、使うかもしれません。姿のない場面として」
# speaker: enemy
「どうぞ。いい顔をしてた、とか付け足さなければ」
# speaker: narrator
イーシャはまだ窓を見ていた。二人は会釈して、その視線の先を横切らない方へ離れる。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「最後、また笑ってもらおうとしてた。お仕事終わったところなのにね」
# speaker: narrator
彼女は人の顔を外して、小窓の列を短く撮る。通りの音と、許してもらった一文を残し、イーシャの姿は入れなかった。
-> END
