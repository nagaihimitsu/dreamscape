// ガッレリアを出たあと、雨宿りする短い寄り道。
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

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの出口で、雨が広場を白く塗り始めた。
{heroine_name}は屋根の下に立ったまま、石の濡れる音を聞いている。
# speaker: heroine
{
- relationship_tone == "strained":
    # emotion: serious
    「雨が弱まるまで、ここで待たせてください」
- relationship_tone == "guarded_attraction":
    # emotion: shy
    「屋根の下って、思ったより狭いんですね」
- relationship_tone == "comfortable":
    # emotion: smile
    「急がなくていいなら、雨の音を聞いていたいです」
- relationship_tone == "warm":
    # emotion: smile
    「あなたは、この雨の音、何に聞こえます？」
- relationship_tone == "romantic_tension":
    # emotion: shy
    「もう少しここで。……雨が止むまででいいので」
- relationship_tone == "reserved":
    # emotion: neutral
    「少しだけ、屋根の下で待ちましょうか」
}
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
# speaker: heroine
{
- relationship_tone_after == "strained":
    # emotion: serious
    「私のペースも、聞いてもらえると助かります」
- relationship_tone_after == "guarded_attraction":
    # emotion: shy
    「すぐそばだと、雨以外の音も気になります」
- relationship_tone_after == "comfortable":
    # emotion: smile
    「何も話さなくても、雨が埋めてくれますね」
- relationship_tone_after == "warm":
    # emotion: smile
    「止んだら、どこへ歩こう。あなたは気になる場所あります？」
- relationship_tone_after == "romantic_tension":
    # emotion: shy
    「傘が要らなくなっても、少しだけ並んでいたいです」
- relationship_tone_after == "reserved":
    # emotion: neutral
    「雨、少し弱くなってきましたね」
}
# speaker: narrator
雨が弱まり、広場の向こうの輪郭が少しずつ戻ってきた。
急ぎ足の人の傘が、二人の前を横切った。
-> END
