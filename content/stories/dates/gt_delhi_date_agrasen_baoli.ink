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

# background: gt_bg_delhi_agrasen_baoli
# speaker: narrator
アグラセン・キ・バオリの入口で、二人は見学できる範囲を確かめた。視線の先に、地面の下へ続く階段がある。
# speaker: heroine
# emotion: surprised
「わ、下に建物がある。近づくまで、こんな奥行きだと思わなかった」
# speaker: narrator
{heroine_name}は許可された通路の、広く安定した場所で立ち止まる。目線だけが、一段ずつ下へ降りていった。
# speaker: heroine
「十、十一……あ、どこまで数えたっけ」
# speaker: narrator
案内には百三段とある。彼女は数字を読んでから、もう一度、今見えている段を数えようとした。
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    # emotion: smile
    「わざわざ数えなくても書いてあるのにね。始めると、途中でやめにくい」
- else:
    # speaker: heroine
    # emotion: teasing
    「今、話しかけたら一からだよ。……って、わたしの方がしゃべっちゃった」
}

* [「途中まで数えた景色も、ちゃんと見たよ」]
    # effect: gt_delhi_date_agrasen_baoli_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも、一度くらい自分でも数え切りたかったな。ちょっと悔しい」
        # speaker: narrator
        彼女は笑い飛ばさず、もう少し段の並びを目で追った。
    - else:
        # speaker: heroine
        「そうだね。数に気を取られて、横のアーチを見てなかった」
        # speaker: narrator
        目線が左右へ広がる。彼女は、そこで初めて小さく息を吐いた。
    }
    -> after_first

* [「ここからは二人で数える？」]
    # effect: gt_delhi_date_agrasen_baoli_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「二人だと、どこが一段目かで相談が始まりそう。今日は案内の数字を信じようかな」
    - else:
        # speaker: heroine
        「お願い。あ、同じところを二回数えないでね。わたしは今、それをやりました」
        # speaker: narrator
        互いに目で示す位置を確かめ、少しだけ続きを追った。
    }
    -> after_first

* [「百四段あったら、どちらかが増やしたね」]
    # effect: gt_delhi_date_agrasen_baoli_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「それは今、言わないで。ほんとに分からなくなるから」
        # speaker: narrator
        彼女は指を一度止め、それから困ったように笑った。
    - else:
        # speaker: heroine
        # emotion: teasing
        「では、増やした人がもう一度数えます。……二人とも黙るの、怪しいね」
        # speaker: narrator
        笑い声を小さくして、彼女は数える指を下ろした。
    }
    -> after_first

=== after_first ===
# speaker: narrator
段を数えるのをやめると、繰り返すアーチと、奥へ続く線が目に残った。彼女は案内の「階段井戸」という言葉を指でなぞる。
# speaker: heroine
「水のための場所なんだね。上へ登る階段はすぐ分かるのに、下へ続くと、ちょっと探検みたい」
# speaker: narrator
足は動かさず、先の方を見る。入れない場所へ降りなくても、見えてくる線はまだあった。
# speaker: heroine
「わたし、全部行かないと見たことにならない気がしてた。今は、この辺りで眺めていたいな」
# speaker: narrator
こちらが立ち位置を変えると、彼女も同じ高さで景色を確かめた。
# speaker: heroine
# emotion: smile
「一歩ずれただけで、重なってたものが離れる。どっちが好き？」

* [「今、君が見つけた方」]
    # effect: gt_delhi_date_agrasen_baoli_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「合わせなくていいよ。違う方でも、教えてくれたら見てみたい」
    - else:
        # speaker: heroine
        # emotion: shy
        「じゃあ、もう少しだけこっちにいて。自分の見つけた場所、覚えておきたい」
        # speaker: narrator
        彼女は隣の安全な足場を確かめてから、こちらへ場所を示した。
    }
    -> ending

* [「二つとも。見比べると好きな所が増える」]
    # effect: gt_delhi_date_agrasen_baoli_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「今日は一つ選んでみたかったな。わたしは、アーチが少し離れて見える方」
    - else:
        # speaker: heroine
        「欲張りだ。……わたしも、戻ったら別の方がよく見えてきそう」
        # speaker: narrator
        彼女は二つの景色を見比べ、最初の一つを選ぶのをやめた。
    }
    -> ending

* [「数えなくていい方」]
    # effect: gt_delhi_date_agrasen_baoli_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「もう数えてないよ。今はちゃんと、好きな景色の話をしてます」
    - else:
        # speaker: heroine
        # emotion: happy
        「両方だね。じゃあ今日は、百三って数字だけ案内に預けていこう」
        # speaker: narrator
        彼女は自分の指を一度開いてみせ、それから手を下ろした。
    }
    -> ending

=== ending ===
# speaker: narrator
帰りも同じ見学路をたどる。二人が最後に振り向いた時、彼女の口元は数字を刻んでいなかった。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「今日ここで話したこと、段数より先に思い出しそう。ちょっと笑われたことも、込みで」
- else:
    # speaker: heroine
    # emotion: smile
    「途中でやめても、面白いままだったね。最後まで数えた時とは、違う見方ができた」
}
-> END
