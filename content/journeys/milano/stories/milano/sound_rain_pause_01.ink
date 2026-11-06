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

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの端で雨が道を切った。傘を出した彼女は、開く寸前で柄を握り直した。
# speaker: heroine
「いま傘を開いたら、せっかくの雨宿りが一秒で終わるんですよね。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
雨粒が線になる向こうを彼女は眺めた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は畳んだ傘を反対の手に移し、二人の間を空けた。
}

* [「一分だけ傘を預かる」]
    # effect: sound_rain_pause_01_1_1
    { romance_result == "negative":
        # speaker: heroine
        「預けなくても開かないよ。私が決めたんだから。」
    - else:
        # speaker: heroine
        「はい。利息は一緒に雨音を聞く一分で。」
    }
    -> join_1

* [「僕はもう少しここにいたい」]
    # effect: sound_rain_pause_01_1_2
    { romance_result == "negative":
        # speaker: heroine
        「雨が強くなる前には歩こうね。ずっと、ではないよ。」
    - else:
        # speaker: heroine
        「私も。二人とも帰りそびれた顔で、ちゃんと残りたいんだね。」
    }
    -> join_1

* [「屋根のどの音が好き？」]
    # effect: sound_rain_pause_01_1_3
    { romance_result == "negative":
        # speaker: heroine
        「今日は比べるより、ぼんやり聴きたいな。」
    - else:
        # speaker: heroine
        「端っこ。ガラスの上と路面で二回鳴るところ。」
    }
    -> join_1

=== join_1 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
開く前の傘の柄に、二人の指の影が重なった。
}
# speaker: narrator
立ち止まる人と追い越す人が分かれていく。彼女が傘を開いたとき、雨はまだ小降りだった。
-> END
