VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: gt_bg_jaipur_nahargarh_fort
# speaker: narrator
アラヴァリ丘陵の尾根に立つナハルガル城から、ジャイプールの町が広がっていた。{heroine_name}は安全な見学路の内側で足を止める。
# speaker: heroine
# emotion: happy
「わあ。屋根って、こんなにあったんだ」
# speaker: narrator
視線だけが先へ進む。もう一歩は出さずに、彼女は足元を確かめた。
# speaker: heroine
「高いところから見るのは好き。でも、端に近づくのは別。ここで十分見えるね」
# speaker: narrator
隣に並ぶと、彼女は手をひさしにした。建物が重なり、その間を道が細く通っている。
# speaker: heroine
「地図を見たときは、すぐ分かった気になったのに。実物だと、どこから目で追えばいいんだろう」
{
- relationship_tone == "strained":
    # speaker: heroine
    「少し、自分で探してみるね。分からなくなったら聞いてもいい？」
- relationship_tone == "warm" || relationship_tone == "romantic_tension":
    # speaker: heroine
    # emotion: teasing
    「先に分かっても、三秒くらい待ってて。今、すごく得意そうな顔を準備してるから」
- else:
    # speaker: heroine
    「あの大きい道をたどってみようかな。地図、こっちにも見せてもらっていい？」
}

* [「一つずつ、道をたどろう」]
    # effect: gt_jaipur_date_nahargarh_fort_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも、指が先に行くと追えなくなる。もう少しゆっくりお願い」
    - else:
        # speaker: heroine
        # emotion: smile
        「お願い。あ、そこまでなら見える。曲がった先は、あの屋根の後ろかな」
    }
    -> city

* [「得意そうな顔だけなら、もうできてる」]
    # effect: gt_jaipur_date_nahargarh_fort_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「今、結構真剣だったんだけど。笑うのは、見つかってからにして」
    - else:
        # speaker: heroine
        # emotion: teasing
        「顔だけ先に到着しました。中身が追いつくまで、もう少々お待ちください」
    }
    -> city

* [「自分も、地図と結びつかなくなった」]
    # effect: gt_jaipur_date_nahargarh_fort_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「二人で分からなくなると心細いね。一度、地図の向きから確かめよう」
    - else:
        # speaker: heroine
        「よかった、わたしだけじゃなかった。じゃあ、同じ道を見てるかから始めよっか」
    }
    -> city

=== city ===
# speaker: narrator
二人の指が、ようやく同じ道を指した。彼女は地図を下げ、もう一度、町全体を見渡す。
# speaker: heroine
# emotion: smile
「分かった。たぶん、あれ。……ううん、たぶんのままにしておこう。帰って確かめたい」
# speaker: narrator
地図を閉じると、細かい屋根の列がまた目に入る。彼女は息を吐き、首を左右へゆっくり動かした。
# speaker: heroine
「小さく見えるのに、一軒ずつに階段があって、部屋があるんだよね。誰かが今、探し物してたりするのかな」
「わたしなら、この眺めの中で自分の洗濯物を探すのは無理。目立つ色にしないと」
# speaker: narrator
笑った彼女は、しまいかけた地図をもう一度開く。それから少し迷って、鞄へ戻した。
# speaker: heroine
「全部の場所が分かるまで頑張るつもりだったけど、今日は、眺める方がいいな」

* [「少し、何も探さずに見よう」]
    # effect: gt_jaipur_date_nahargarh_fort_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも『何も探さない』って思うと、逆に探しちゃう。気にせず見よう」
    - else:
        # speaker: heroine
        # emotion: smile
        「賛成。分からない建物にも、順番に目を止めてみたい」
    }
    -> rest

* [「探し物が見つからない人を応援しよう」]
    # effect: gt_jaipur_date_nahargarh_fort_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「本当に困ってたら、遠くから応援だけじゃ足りないね。勝手な想像だったかな」
    - else:
        # speaker: heroine
        # emotion: happy
        「じゃあ、洗濯物係はわたし。鍵係をお願いします。無事に出かけられますように」
    }
    -> rest

* [「ここからの町を、一緒に見られてよかった」]
    # effect: gt_jaipur_date_nahargarh_fort_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「まだ終わりみたいに言わないで。もう少し見たいんだから」
    - else:
        # speaker: heroine
        # emotion: shy
        「うん。一人だったら、地図とにらめっこしたままだったかもしれない」
    }
    -> rest

=== rest ===
{ relationship_tone_after == "guarded_attraction" || relationship_tone_after == "romantic_tension":
    # speaker: narrator
    彼女がこちらを見た。目が合うと、照れ隠しのようにまた町を指す。
    # speaker: heroine
    # emotion: teasing
    「あ、そっちは見なくていいの。せっかくここまで来たんだから」
- else:
    # speaker: narrator
    しばらく、二人とも地図を出さなかった。彼女は気になる屋根を見つけるたび、小さく指を差した。
}
# speaker: narrator
帰り道の方へ身体を向けてから、{heroine_name}は肩越しにもう一度町を眺めた。
# speaker: heroine
# emotion: smile
「次はあの中を歩くんだね。上から見たのを覚えてるうちに、いつもの大きさでも見てみたい」
-> END
