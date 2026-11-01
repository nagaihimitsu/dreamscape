// プラダ財団。蒸留所だった建物と新しい展示空間を見比べる。
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

# background: milano_fondazione_prada_date
# speaker: narrator
プラダ財団の中庭で、{heroine_name}は古い建物と新しい棟を交互に見た。
# speaker: heroine
「同じ敷地なのに、隣同士で全然顔が違う」
「ここ、前は蒸留所だったんだって。残した建物と新しく作った棟を、両方使ってるんだね」
# speaker: narrator
彼女は案内を確認してから、古い壁に近づいた。
# speaker: heroine
「わたし、最初は全部新しく建てたのかと思ってた。ちゃんと見てなかったな」
{
- relationship_tone == "strained":
彼女は壁から離れ、どちらへ行くか尋ねようとして言葉を止めた。
- relationship_tone == "guarded_attraction":
彼女は振り向き、少し間を置いてから次の棟を指さした。
- relationship_tone == "comfortable":
彼女は建物を見比べ、どちらが新しいか当てるように目を細めた。
- relationship_tone == "warm":
彼女は案内を見せながら、自分の見間違いを笑った。
- relationship_tone == "romantic_tension":
彼女は隣に並ぶと、恥ずかしそうに案内を閉じた。
- else:
彼女は建物の境目を眺めて、もう一度案内を読んだ。
}
# speaker: heroine
「{player_address}は、古いところと新しいところ、どっちから見たい？」

* [「古いほう。前の使い道の跡を探したい」]
    # effect: milano_prada_v2_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「探したいけど、全部を蒸留所の跡だと思い込まないようにしないと」
        「さっきのわたしみたいにね」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいね。わたしも、どこが残ってるのか見てみたい」
        「分からなかったら案内に戻ろう」
    }
    -> after_first
* [「新しいほう。昔の建物との違いを見たい」]
    # effect: milano_prada_v2_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「先にそっちか。わたし、古い壁もちょっと気になってた」
        「あとで戻ってもいい？」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、あっちへ。戻ったときに壁の違いも見比べよう」
    }
    -> after_first
* [「一緒に選ぼう。君はどっちが気になる？」]
    # effect: milano_prada_v2_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「わたしに聞いてくれたのは嬉しい。でも、あなたの意見も聞きたいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「わたしは古い壁。でも新しい棟も見たい。……結局、両方だ」
        「欲張ってもいい？」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人は中庭を横切り、別の棟へ入る。壁の表情が変わり、足音も少し違って聞こえた。
# speaker: heroine
「前の建物を残したまま、新しい場所として使うんだね」
「昔のまま全部残すのも、全部変えるのも、どっちも大変そう」
# speaker: narrator
彼女はもう一度、来た方向を振り返った。
# speaker: heroine
「わたし、変える前に迷いすぎることがあるんだ。服の整理ですら」

* [「迷ってる服にも、一着ずつ事情がありそう」]
    # effect: milano_prada_v2_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「事情を聞き始めたら、整理が一生終わらないよ」
        「でも、その言い訳は使っちゃうかも」
    - else:
        # speaker: heroine
        # emotion: happy
        「そう、みんな事情があるの。特に一度も着てない服！」
        「……それが一番困るんだけどね」
    }
    -> ending
* [「残すかどうか、すぐ決めなくてもいいよ」]
    # effect: milano_prada_v2_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「ありがとう。でも、後回しにしすぎると置き場がなくなるの」
        「そのときは自分で決めないとね」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。迷ってる間に、なぜ残したいか分かることもあるよね」
    }
    -> ending
* [「一緒に決めよう。いらないものは僕が選ぶ」]
    # effect: milano_prada_v2_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「待って。それは自分で決めたい」
        「相談するのはいいけど、勝手に選ばれるのは嫌だな」
    - else:
        # speaker: heroine
        # emotion: teasing
        「意見は聞く。でも捨てるものを決めるのは、わたしだよ」
        「先に宣言しておきます」
    }
    -> ending

=== ending ===
# speaker: narrator
中庭に戻ると、さっき見た古い壁の向こうに、新しい棟が重なって見えた。
# speaker: heroine
「さっきは全部同じに見えたのにな」
「次は、自信満々に当ててみせる。……たぶん」
-> END
