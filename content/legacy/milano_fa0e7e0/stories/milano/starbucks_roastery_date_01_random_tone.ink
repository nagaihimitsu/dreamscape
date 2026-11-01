// 焙煎の見える店と、宛先を急がない手紙。
VAR romance_result = "neutral"
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_starbucks_roastery_date
# speaker: narrator
コルドゥージオ広場のスターバックス・リザーブ・ロースタリー。
店に入ると、焙煎の香りが先に届いた。
# speaker: heroine
{
- relationship_tone == "strained":
    # emotion: serious
    「注文は、それぞれゆっくり決めましょうか」
- relationship_tone == "guarded_attraction":
    # emotion: shy
    「隣でメニューを覗かれると、余計に迷いますね」
- relationship_tone == "comfortable":
    # emotion: smile
    「迷ったら、メニューを端から読んでみましょうか」
- relationship_tone == "warm":
    # emotion: smile
    「気になるものがあったら、先に教えてくださいね」
- relationship_tone == "romantic_tension":
    # emotion: shy
    「同じ香りを選んだら、ちょっと面白いですね」
- relationship_tone == "reserved":
    # emotion: neutral
    「どんなものがあるか、先に見てみますね」
}
「ここ、前は郵便局だった建物なんですって」
「ミラノに来てスターバックス、って顔をされるかと思ってました」
# speaker: narrator
{heroine_name}は焙煎の設備を見上げ、それからメニューに視線を落とした。

* [「せっかくミラノなのに、いつもの店じゃもったいない」]
    # effect: milano_starbucks_roastery_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「いつもの店に見えたのは、入る前だけでした」
        「私は、来てみてよかったです」
    - else:
        # speaker: heroine
        # emotion: serious
        「私は、いつもの看板が違う街でどう見えるか、気になったんです」
        「もったいないかどうかは、飲んでから決めませんか」
    }
    -> after_first
* [「あの機械、豆のための遊園地みたいだ」]
    # effect: milano_starbucks_roastery_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「豆の遊園地なら、私たちは入場できませんね」
        「ここまで来て、外から見学だけですか」
    - else:
        # speaker: heroine
        # emotion: smile
        「豆だけ乗れるんですね。私たちは香りのおすそ分け」
    }
    -> after_first
* [「君が選んだ場所なら、どこでも来たい」]
    # effect: milano_starbucks_roastery_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「どこでも、だと私の行き先が何でもいいみたいです」
        「一緒に行きたい場所を選びたいな」
    - else:
        # speaker: heroine
        { romance_stage < 3:
            # emotion: worried
            「どこでも、ですか。……たまには嫌な場所も言ってくださいね」
            「一緒に選びたいので」
        - else:
            # emotion: shy
            「じゃあ次は、私があなたの選んだところへ」
            「どこでも、は少し怖いけど」
        }
    }
    -> after_first

=== after_first ===
# speaker: heroine
{
- relationship_tone_after == "strained":
    # emotion: serious
    「少しゆっくり選んでもいいですか」
- relationship_tone_after == "guarded_attraction":
    # emotion: shy
    「その顔で待たれると、余計に決まりません」
- relationship_tone_after == "comfortable":
    # emotion: smile
    「こうして迷う時間も、悪くないですね」
- relationship_tone_after == "warm":
    # emotion: smile
    「あなたの候補も聞いていいですか。私はまだ二つで迷っていて」
- relationship_tone_after == "romantic_tension":
    # emotion: teasing
    「選ぶの、待っていてくれます？　急がせたら余計に迷いますよ」
- relationship_tone_after == "reserved":
    # emotion: neutral
    「もう少しだけ、メニューを見てもいいですか」
}
# speaker: narrator
二人が注文を考える間にも、店の中に香りが流れてくる。
# speaker: heroine
「ここから昔の自分に一行だけ送れるなら、何て書こう」
「……あ、私、まだ飲み物も決めてないのに」

* [「まず注文から。手紙は、飲みながら考えよう」]
    # effect: milano_starbucks_roastery_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「注文を先に決めると、手紙のことを忘れそう」
        「ちょっとだけ待ってください」
    - else:
        # speaker: heroine
        # emotion: smile
        「助かります。昔の私、待つのは得意だったので」
    }
    -> ending
* [「書くことがないなら、何か教えてあげようか」]
    # effect: milano_starbucks_roastery_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「手紙を代わりに書かれたら、昔の私が混乱します」
        「私の言葉で考えさせてください」
    - else:
        # speaker: heroine
        # emotion: serious
        「それだと、あなたから私への手紙になりません？」
        「自分の分は、自分で考えたいです」
    }
    -> ending
* [「宛名だけ書いて、続きはまた一緒に考えたい」]
    # effect: milano_starbucks_roastery_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……一緒に考えるのは、もう少し先でもいいですか」
        「まずは、宛名を間違えないようにしないと」
    - else:
        # speaker: heroine
        { ending_reached:
            # emotion: teasing
            「じゃあ、封をする係はお願いします。急がなくていい手紙ですね」
        - else:
            # emotion: shy
            「……宛先を決めるくらいなら」
            「本文は、今日すぐじゃなくてもいいですか」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
{heroine_name}はメニューを一度閉じてから、もう一度開いた。
# speaker: heroine
# emotion: smile
「まずは、一行より一杯ですね」
-> END
