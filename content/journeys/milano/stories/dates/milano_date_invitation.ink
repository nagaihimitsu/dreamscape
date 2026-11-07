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
ガッレリアの中央で、彼女がこちらの前に回った。手を伸ばし、袖に触れる直前で止める。
# speaker: heroine
「今日は片道だけ、私が先を歩きたい。振り返ったら、そこにいてくれる？」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は触れかけた指を自分の袖口に戻した。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は見失わない距離まで、自分から歩幅を縮めた。
}

* [「一歩後ろにいる」]
    # effect: sound_invitation_01_1_1
    { romance_result == "negative":
        # speaker: heroine
        「あまり近いと引率みたいだね。見えるくらいにいてくれれば十分。」
    - else:
        # speaker: heroine
        「うん。ついてきてるか、たまに反射で確かめるね。」
    }
    -> join_1

* [「横顔の見える位置なら」]
    # effect: sound_invitation_01_1_2
    { romance_result == "negative":
        # speaker: heroine
        「顔より行き先を見てほしい。私がどっちを選ぶか。」
    - else:
        # speaker: heroine
        # emotion: shy
        「それ、私は道を見ていられるかな。試してみよう。」
    }
    -> join_1

* [「到着するまで質問は一つだけ」]
    # effect: sound_invitation_01_1_3
    { romance_result == "negative":
        # speaker: heroine
        「質問は聞きたいよ。私が先頭でも、二人で歩いてるから。」
    - else:
        # speaker: heroine
        「じゃあ先に私から。お腹すいてる？　……そこで行き先が変わります。」
    }
    -> join_1

=== join_1 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
横を向いた彼女の口元に、言いかけた言葉が残った。
}
# speaker: narrator
彼女が選んだのは店ではなく、広場が初めてのぞく柱の間だった。「ここで、今日は私が待ってたかったの」
-> END
