// スカラ座広場。観劇や立入は、予約済みとは仮定しない。
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
-> start

=== start ===
# background: milano_la_scala_date
# speaker: narrator
スカラ座の前で、{heroine_name}は劇場の歴史を記した案内を読んでいた。
# speaker: heroine
「前の劇場が火事でなくなって、桟敷席の持ち主たちが、新しい劇場の建設費を出したんだって」
「自分の席をなくした人たちが、次に観る場所も作ったんだね」
# speaker: narrator
彼女は案内の絵に、小さく並んだ桟敷席を目で追う。
{
- relationship_tone == "strained":
彼女は見終わった案内を少し傾け、同じ箇所を示した。
- else:
彼女は桟敷席の絵を指でたどり、一つの席で止まった。
}
# speaker: heroine
「もし席を一つ持っていたら、誰を呼ぼうかな」
「あ、まず何を観るかも決めてないのに。気が早いね」

* [「一席だけなら、交代で座ろう。上演中に」]
    # effect: milano_la_scala_first_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「周りの人が舞台に集中できなくなっちゃう」
    - else:
        # speaker: heroine
        「何回立ったら係の人に見つかるかな」
        # speaker: narrator
        彼女は案内を口元に当てて笑った。
    }
    -> intermission
* [「誰を呼びたいか、もう思い浮かんでる？」]
    # effect: milano_la_scala_first_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「まだ秘密。……というより、決められてないんだ」
        # speaker: narrator
        彼女は案内を折り目で揃えた。
    - else:
        # speaker: heroine
        「母かな。こういう建物を見るのが好きだから」
        「でも一席しかないなら、私はどうするんだろう」
    }
    -> intermission
* [「その席に、いつか僕も招いてほしい」]
    # effect: milano_la_scala_first_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「まず何を観るか相談してからね。眠くなる演目かもしれないし」
    - else:
        # speaker: heroine
        「いいよ。でも席は一つ。二人で来るなら、もう一つ探さないと」
        # speaker: narrator
        彼女は目を細めて、冗談か本気か測ろうとした。
    }
    -> intermission

=== intermission ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は話を急がず、案内の続きを読んだ。
- else:
彼女は席の絵から、最初の公演についての説明へ指を移した。
}
# speaker: heroine
「最初の公演はサリエリのオペラだったんだ。新しい劇場の、最初の一夜」
「火事で前の場所を失った人は、幕が開くまで落ち着かなかっただろうな。……想像だけど」
# speaker: narrator
彼女は広場を歩く人たちを見て、案内を畳んだ。
# speaker: heroine
「知らない場所の前に立ってるとき、私はちょっと緊張する。入りたい気持ちのほうが大きくてもね」

* [「受付で『平常心を二枚』って頼めたらいいのに」]
    # effect: milano_la_scala_second_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「売り切れだったら、もっと緊張しそう」
    - else:
        # speaker: heroine
        「窓口で『お一人様一枚までです』って言われたらどうする？」
        # speaker: narrator
        彼女は想像して笑った。
    }
    -> ending
* [「どんなところが一番緊張する？」]
    # effect: milano_la_scala_second_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「うまく説明できるかな。まだ考え中」
    - else:
        # speaker: heroine
        「入り方を間違えたらって考えちゃう。でも分からなければ、聞けばいいんだよね」
        # speaker: narrator
        彼女は入口の案内をもう一度見た。
    }
    -> ending
* [「緊張しても、一緒に行きたい」]
    # effect: milano_la_scala_second_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも急いで決めないで。ちゃんと一緒に選びたい」
    - else:
        # speaker: heroine
        「私も。分からないことは二人で聞こう」
    }
    -> ending

=== ending ===
# speaker: narrator
彼女は案内を畳み、劇場の入口をもう一度見た。
# speaker: heroine
「今日は外から。いつか本当に観るなら、席も演目も一緒に決めようね」
-> END
