// ガッレリアを出たあと、雨宿りする短い寄り道。
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの出口で、雨が広場を白く塗り始めた。
{heroine_name}は屋根の下に立ったまま、石の濡れる音を聞いている。
# speaker: heroine
「ガラスを鉄で支えた屋根だから、雨が見えるんですね」
「さっきと同じ場所なのに、音だけ別の街みたい」
「……もう少し、ここにいてもいいですか」

* [「今日は雲が街の音楽係なんだね」]
    # effect: milano_rain_pause_music
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「音楽係にしたら、雨が少しかわいそうかも」
        # speaker: narrator
        彼女は耳を澄ましたまま、屋根から落ちる雫を目で追った。
    - else:
        # speaker: heroine
        # emotion: smile
        「選曲が激しいですね。傘の音も入れてほしい」
    }
    -> ending
* [「屋根の端までなら、濡れずに見られそう」]
    # effect: milano_rain_pause_watch
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「あそこ、思ったより水が跳ねますね」
        # speaker: narrator
        彼女は差し出しかけた足を戻し、小さく肩をすくめた。
    - else:
        # speaker: heroine
        「あ、あの柱のところ。そこなら少し見えるかも」
    }
    -> ending
* [「傘を買って、すぐ先へ行こう」]
    # effect: milano_rain_pause_hurry
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「……私は、まだここにいたいです」
        「傘を買う前に、一度聞いてほしかった」
    - else:
        # speaker: heroine
        # emotion: worried
        「……もう少し、ここにいたいです。せっかく聞いていたから」
    }
    -> ending

=== ending ===
# speaker: narrator
雨が弱まり、広場の向こうの輪郭が少しずつ戻ってきた。
急ぎ足の人の傘が、二人の前を横切った。
-> END
