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
# background: gt_bg_delhi_jama_masjid
# speaker: narrator
ジャーマー・マスジドの見学を終えた出口側で、若い男性が小さな写真を並べていた。二人に気づくと、写真を一枚ずつ持ち上げる。
# speaker: enemy
「さっき見てきたの、どの写真に近い？」
# speaker: narrator
一枚は塔、もう一枚は門、最後は中庭。{heroine_name}は一つを選びかけ、指を戻した。
# speaker: heroine
「どれも近いです。お土産の写真ですか？」
# speaker: enemy
「僕が撮ったやつ。弟の宿題に一枚貸す約束をしたら、『兄さんが説明できる写真にして』だって」
# speaker: narrator
彼はイムランと名乗った。写真の裏には、自分用の問題が書いてある。
# speaker: heroine
# emotion: teasing
「弟さん、貸してもらう側なのに、注文が厳しいですね」
# speaker: enemy
「この前、花の名前を全部『赤い花』で済ませたのを、まだ覚えてる」
# speaker: narrator
彼女は笑い、それから人の通る場所を避けて、二人分の立ち位置を確かめた。
# speaker: enemy
「三問だけ、練習に付き合ってくれない？　最初は造った人。このモスクには、遠くの有名な建物とのつながりがある」
# speaker: heroine
「いいですよ。でも、弟さんに答えるのは、お兄さんですからね」
-> END

=== after_first ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「シャー・ジャハーン。タージ・マハルやレッド・フォートを造った皇帝でもある」
- else:
    # speaker: enemy
    「シャー・ジャハーンなんだ。タージ・マハルやレッド・フォートも、同じ皇帝につながる」
}
# speaker: heroine
「一人の名前から、行きたい場所がこんなに出てくるんだ」
# speaker: narrator
イムランは裏の説明を読み直した後、紙を伏せ、自分の言葉で短く繰り返した。
# speaker: enemy
「よし。今のは言える。次は門。これを『大きい入口』だけで済ませたら、また花の話をされる」
# speaker: narrator
イムランは東側の門を撮った写真を出す。ほかの入口とは違う大きさを、彼女も見比べた。
# speaker: enemy
「この東の入口は、昔、通る人が決まっていた。どんな人のためだったと思う？」
-> END

=== after_second ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「王と宮廷の人々。門の大きさに、通る人の立場まで出ているんだね」
- else:
    # speaker: enemy
    「東の入口は、もともと王と宮廷の人々のためだった。ほかより大きい理由は、見栄えだけじゃないんだね」
}
# speaker: heroine
「その門を撮った理由も言えば、もっといいかも。どこが気になったんですか？」
# speaker: enemy
「入口なのに、その奥にも建物が重なって見えた。くぐったら、どんな景色になるんだろうって」
# speaker: narrator
彼女は楽しそうにうなずいた。イムランが最後の中庭の写真を出すと、背景には歩く人も小さく写っている。
# speaker: enemy
「最後は、今のこの場所。建物の紹介だけだと、何が抜け落ちるだろう？」
-> END

=== conclusion ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「祈りに訪れる人がいる、今も使われているモスク。昔話だけで終わらせない、だね」
- else:
    # speaker: enemy
    「今も礼拝のために訪れる人がいる。見学の時間や範囲は、そのことも踏まえて確かめる必要があるんだ」
}
# speaker: narrator
イムランは写真を重ねず、三枚とも手に取った。
{
- battle_score == 3:
    # speaker: enemy
    「全部当てられた。弟の前に君たちを座らせたら、僕の出番がなくなる」
    # speaker: heroine
    「出番は残します。写真を撮った理由、わたしたちには言えないので」
- battle_score == 2:
    # speaker: enemy
    「二つ正解。弟は、たぶん間違えた一つを狙ってくる」
    # speaker: heroine
    「一緒に調べ直した、って言えばいいと思います。今のも、ちゃんと練習ですよ」
- else:
    # speaker: enemy
    「答える側だと急に難しいな。僕も、裏を見ないでもう一度やろう」
    # speaker: heroine
    「聞く係なら、少しできます」
}
# speaker: narrator
イムランは三枚を順に差し出す。裏を見ずに、門を見た時のことから話し始めた。今度は口が止まらない。
# speaker: heroine
# emotion: smile
「弟さん、一枚だけって言ってました？」
# speaker: enemy
「……言ってた。話す方は、三枚分でもいいよね」
# speaker: narrator
彼が笑って写真をしまう。二人は道を空けたまま会釈をし、それぞれの行き先へ歩き出した。
-> END
