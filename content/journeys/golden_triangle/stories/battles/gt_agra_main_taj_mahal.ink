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
# background: gt_bg_agra_taj_mahal
# speaker: enemy
「真ん中で待つ、と言ったのは私だ。私が聞きたい。どこの真ん中だ？」
# speaker: narrator
タージ・マハルの庭で、男性が電話に向かって眉をつり上げていた。通話が切れると、持っていた案内図まで裏返す。
# speaker: heroine
# reaction: heroine,worried,question
「誰かと、はぐれたんですか？」
# speaker: enemy
「母と別々に見ていてね。待ち合わせが下手なんだ。母ではなく、私が」
# speaker: narrator
ファリドは市内で菓子店を営んでいるという。今日は母と見学に来たが、店では一言で通じる説明が、ここでは通じなかった。
# speaker: enemy
「店なら『真ん中の箱』で済む。ここには箱が多すぎる」
# speaker: heroine
# reaction: heroine,teasing,music
「タージ・マハルを箱に入れようとしてる時点で、ちょっと」
# speaker: enemy
「入る箱なら、うちでも取り寄せられないな」
# speaker: narrator
ファリドは母へ、場所を決め直すので動かず待っていてほしいと送った。{heroine_name}が案内図の庭を指す。
# speaker: heroine
「まず、ここ全体の真ん中と、白い建物の位置を分けませんか。わたしも、正面からだと同じに見えてました」
# speaker: enemy
「分けよう。これ以上、中央を増やしたくない」
-> END

=== after_first ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: enemy
「庭の端に墓廟。よし、白い建物を『庭の真ん中』と呼んだ私が悪い」
- else:
# speaker: enemy
「墓廟は庭の端か。私も間違えた。母の返事がかみ合わないわけだ」
}
# speaker: narrator
案内図の前で落ち合うことに決めると、母から『今見ている説明を読んだら行く』と返事が来た。急いでいたのは、息子だけらしい。
# speaker: enemy
# reaction: enemy,sweat
「待つのは苦手だ。店なら、待っている間にも何か包める」
# speaker: heroine
「じゃあ、説明の続きを一緒に。上に見える二つの石棺のこと、わたしも気になってたんです」
# speaker: narrator
主廟の内部写真を撮ろうとはせず、手元の資料図を開く。見える石棺と、実際に葬られた場所は同じなのだろうか。
-> END

=== after_second ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: heroine
「上はしのぶための記念棺。実際のお墓は下の埋葬室。見える場所だけじゃないんだね」
- else:
# speaker: heroine
# reaction: heroine,surprised,exclamation
「上の石棺に眠っていると思ってた。実際のお墓は、下の埋葬室なんだ」
}
# speaker: enemy
「箱の中身を決めつけるな、と。今度は私の商売に刺さった」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「そこの例えは、箱から離れませんか」
# speaker: narrator
ファリドはすぐに頭を下げた。図へ目を戻すと、二つの記念棺の並びを、左右から指で測る。
# speaker: enemy
「すまない。……ただ、これは揃っていないね。外から見た印象と違う。どうしてだろう」
-> END

=== conclusion ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: enemy
「シャー・ジャハーンの記念棺が、妃の隣に後から置かれた。形より、人が増えた順番だったか」
- else:
# speaker: enemy
「妃の隣に、シャー・ジャハーンの記念棺が後から加わったんだね。完全な対称、とは言えないな」
}
{ battle_score == 3:
# speaker: heroine
# reaction: heroine,happy,sparkle
「三つとも分かった。中央で迷ったところから、こんなところまで来ちゃったね」
- else:
# speaker: heroine
# emotion: smile
「図を開いてよかった。目だけで揃えようとすると、見えなくなる話もあるんだね」
}
# speaker: narrator
こちらへ近づく年配の女性に、ファリドが片手を上げた。彼女が最初に尋ねたのは、店に電話していなかったか、だった。
# speaker: enemy
# reaction: enemy,interrobang
「今日はしてない。……二回だけだ。出る前と、出た後」
# speaker: heroine
# reaction: heroine,teasing,music
「それ、ほとんど今じゃないですか」
# speaker: narrator
彼は反論せず、スマートフォンを深くしまった。母の歩く方へ向き直る前に、こちらの案内図を指す。
# speaker: enemy
「その『中央』には気を付けて。次に会っても、私はおすすめしない」
# speaker: narrator
店主は母の歩幅に合わせようとして、早くなり、また戻った。{heroine_name}も地図を畳み、今度は本物の庭へ目を向けた。
-> END
