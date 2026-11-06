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

# background: gt_bg_jaipur_jal_mahal
# speaker: narrator
マン・サーガル湖の岸に立つ。ジャル・マハルの姿は水に映り、波紋のたびに小さな屋根がほどけていた。
# speaker: heroine
# reaction: heroine,happy,sparkle
「宮殿が二つ。下の方だけ、ずっと引っ越ししてる」
# speaker: narrator
宮殿の中には入らず、湖岸で眺める。彼女は反射の揃う瞬間を知らせようとして、こちらへ向いた。その隙に、屋根がまた崩れた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「あー。教えようとすると、わたしが見逃す」
# speaker: heroine
「決めた。しばらく二人とも黙って、湖を見る。揃っても、しゃべらない」
{ relationship_tone == "warm" || relationship_tone == "romantic_tension":
    # speaker: heroine
    # emotion: teasing
    「そっちを見たくなっても、わたしが我慢します。……何、その顔。もう始めるよ」
- else:
    # speaker: narrator
    彼女は唇の前へ指を立て、すぐに自分で照れたように手を下ろした。
}

* [「黙って君を好きになっててもいい？」]
    # effect: gt_jaipur_date_jal_mahal_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,interrobang
        「黙る話をしてたのに、一番黙れなくなること言ったね。今は返事、求めないで」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        { ending_reached:
            「もっと、ってこと？　……それなら止めない。湖、ちゃんと見えるかな」
        - else:
            「そんな許可、急に……。だめとは言ってないけど。今、顔は見ないで」
        }
    }
    -> water
* [「先に笑った方が、宮殿を掃除する」]
    # effect: gt_jaipur_date_jal_mahal_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「入れない宮殿を罰ゲームにしないで。わたし、ほんとに静かに見たいんだよ」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「届くほうきがありません。……あっ、もう笑っちゃった。始める前だから無効！」
    }
    -> water
* [「揃ったら、声を出さずに指で知らせよう」]
    # effect: gt_jaipur_date_jal_mahal_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「合図を見ようとして、またそっちを見ちゃいそう。今度は自分で見つけたいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「それなら、見逃さないね。わたしも見つけたら、同じところを指す」
    }
    -> water

=== water ===
# speaker: narrator
二人とも湖へ顔を向けた。話す言葉を探さずにいると、遠くの屋根より、足元近くの水の音がはっきりする。
# speaker: narrator
水面に、宮殿の形がひとつにつながった。彼女の指が上がる。こちらの指も、ほとんど同時に動いた。
# speaker: heroine
# reaction: heroine,surprised,exclamation
「今！」
# speaker: narrator
言った本人が口を覆う。それから声を殺そうとして、余計に肩が揺れた。
# speaker: heroine
# reaction: heroine,happy,music
「わたしが一番しゃべるんだ。景色より、見えたって言いたかった」
「黙っていられるのもいいけど。今日のわたしは、だめみたい」

* [「じゃあ次は、思う存分実況して」]
    # effect: gt_jaipur_date_jal_mahal_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「役をもらうと、逆に黙っちゃう。今のは、勝手に出た声だから」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「こちら湖岸です。宮殿、ただいま崩れました。現場のわたしは、だいぶ楽しんでいます」
    }
    -> leaving
* [「その『今』を、隣で聞けてうれしかった」]
    # effect: gt_jaipur_date_jal_mahal_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「そこまで大切な声にされると、次が出しにくいよ。普通に、うっかり言ったんです」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        「……そっか。じゃあ、次もここにいて。聞いてほしい人がいると、声が出ちゃうから」
    }
    -> leaving
* [「もう少し、ここにいよう」]
    # effect: gt_jaipur_date_jal_mahal_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「もう十分待ってもらった気もする。でも、あと一回だけ、揃うのを見たい」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。今度は、何も我慢する決まりなしで」
    }
    -> leaving

=== leaving ===
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: narrator
    少し間を空けて、二人で水面を見る。彼女は何か言いかけたが、今度は一緒に見えるのを待ってから指を上げた。
- else:
    # speaker: narrator
    彼女は同じ方向を向いたまま、こちらへほんの少し肩を寄せた。声を出す前から、笑っているのが分かった。
}
# speaker: heroine
# emotion: smile
「今。……今度は、二人とも見えたね」
# speaker: narrator
湖岸を離れる時、彼女は宮殿より先にこちらを振り返った。沈黙の規則は、いつの間にか二人とも忘れていた。
-> END
