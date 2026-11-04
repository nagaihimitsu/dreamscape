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

# background: gt_bg_agra_mehtab_bagh
# speaker: narrator
メヘターブ・バーグの園路で、{heroine_name}が足を止める。ヤムナー川の向こうに、タージ・マハルが見えた。
# speaker: heroine
# emotion: surprised
「川の反対側からだと、こんなふうに見えるんだ。こっちにも庭があったんだね」
# speaker: narrator
彼女は少し右へ移り、また戻った。二人の立つ場所を比べて、眉を寄せる。
# speaker: heroine
# emotion: teasing
「そっち、いい位置じゃない？　わたしが見つけたと思ったのに、先にいた」
{ relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は肩が触れないところで止まり、見える範囲を確かめた。
- else:
# speaker: narrator
彼女はこちらの立つ場所をのぞき、園路の上で半歩ずつ位置を変えた。
}

* [「交代して、比べてみよう」]
    # effect: gt_agra_date_mehtab_bagh_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「ごめん、せかしたわけじゃないよ。もう少しそっちから見てて」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。……あ、ほんとだ。木のかかり方が、ちょっと違う」
    }
    -> after_first
* [「いい場所を見つける才能がある」]
    # effect: gt_agra_date_mehtab_bagh_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「今は場所を貸してほしかったんだけど。才能の話は、あとで聞くね」
    - else:
        # speaker: heroine
        # emotion: teasing
        「へえ。じゃあ、次の休憩場所も任せちゃおうかな。才能、忙しいね」
    }
    -> after_first
* [「ここから、一緒に見たい」]
    # effect: gt_agra_date_mehtab_bagh_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「一緒には見たいけど、もう少し離れても見えるよ。ここ、歩く人もいるから」
    - else:
        # speaker: heroine
        # emotion: shy
        「うん。じゃあ、半分だけ空けて。わたしの分も」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人で通行の邪魔にならない位置へ寄る。川越しの姿を見ていた彼女が、庭の方へ振り向いた。
# speaker: heroine
「ここって、向こうを見るためだけの場所じゃないんだよね。こっちにも道があって、木がある」
# speaker: narrator
メヘターブ・バーグは、川を隔ててタージ・マハルを望む庭園だ。彼女は案内を見てから、園路の先を指した。
# speaker: heroine
# emotion: smile
「少し歩いて戻ってみない？　わたし、今の場所、ちゃんと覚えてるかな」

* [「目印を一つ決めておこう」]
    # effect: gt_agra_date_mehtab_bagh_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うーん、覚えなくてもいいかも。また探すのも楽しそうだから」
    - else:
        # speaker: heroine
        「あの道の曲がり角にしよう。木の葉の形だと、全部気になっちゃいそう」
    }
    -> ending
* [「戻ったら、同じところに立とう」]
    # effect: gt_agra_date_mehtab_bagh_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「そこは戻ってから決めたいな。別のところが好きになるかもしれないし」
    - else:
        # speaker: heroine
        # emotion: shy
        「いいよ。今度はわたしが先に立つから、ちゃんと見つけてね」
    }
    -> ending
* [「たぶん、もう分からなくなってる」]
    # effect: gt_agra_date_mehtab_bagh_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「歩く前から？　じゃあ今だけ、ちょっと待って。わたしが覚える」
    - else:
        # speaker: heroine
        # emotion: happy
        「早いなあ。わたしも怪しい。違う場所で、二人とも『ここだ』って言いそう」
    }
    -> ending

=== ending ===
# speaker: narrator
園路を少し歩いて戻ると、彼女は迷わず一か所を指し、すぐに首をかしげた。
# speaker: heroine
# emotion: teasing
「ここ。……の、一歩隣だったかも」
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: heroine
# emotion: smile
「まあ、また並べたからいいか。今は、ここが好き」
- else:
# speaker: heroine
# emotion: smile
「でも、ここもいいね。さっきより、庭がよく見える」
}
# speaker: narrator
今度は立つ場所を取り替えず、それぞれの位置から川の向こうを眺めた。
-> END
