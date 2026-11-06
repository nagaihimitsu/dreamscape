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

# background: milano_navigli_date
# speaker: narrator
洗濯屋小路の石の洗い場の近くに、子どもの赤い手袋が落ちていた。拾った彼女が、しゃがんだまま止まる。
# speaker: heroine
「遠くから見える所に掛けたい。でも、子どもの目の高さって、ここなんだね。」
「この傾いた石、昔は洗濯する人たちが水を引いて使ってたんだって。手袋を置いたら濡れちゃうかな。」
# speaker: player
「僕らの見やすいところが、いちばんとは限らないか。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は手袋の濡れていない方だけをつまんだ。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
# reaction: heroine,smile
二人が同時にしゃがんだので、彼女は額がぶつかる寸前で笑った。
}

* [「低い所で手に持って待つ」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「一人で十分だよ。少し先で、片手が寒そうな人を見てて。」
    - else:
        # speaker: heroine
        「私も横にいよう。二人ともこの姿勢だと、何か隠してる人みたいだけど。」
    }
    -> join_1

* [「片手だけ寒い人を探そう」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「見ただけで当てるより、いま来た道にいるか見てみたい。」
    - else:
        # speaker: heroine
        「いい観察。……あの人、片方だけ手をポケットに。あ、大人だった。」
    }
    -> join_1

* [「見つけやすい場所を一緒に選ぶ」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「私はここで手渡したい。少し待ってもいい？」
    - else:
        # speaker: heroine
        「うん。勝手に持って遠くへ行く前に、それがいい。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
洗い場の石には、人がそこで働いていた頃の傾きが残っている。彼女が同じ高さに手を置くと、さっきの親子が戻ってきた。
# speaker: heroine
「持ち主、見つかった。なのに、立ちたくない。いまの高さだと、水の色がちょっと違う。」

* [「その目線、貸して」]
    # effect: sound_navigli_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「真似して転ばないで。濡れてない場所で見よう。」
    - else:
        # speaker: heroine
        「貸し出し無料。返すときは、膝に手をついてゆっくりね。」
    }
    -> join_2

* [「待ててよかった」]
    # effect: sound_navigli_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「もう少し待ちたかったな。手袋じゃなくて、この景色に。」
    - else:
        # speaker: heroine
        「うん。何もしないで待つの、私は意外と苦手。付き合ってくれてありがとう。」
    }
    -> join_2

* [「先に立って手を貸す」]
    # effect: sound_navigli_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「大丈夫、自分で立てる。隣が空いてたほうが立ちやすいよ。」
    - else:
        # speaker: heroine
        「ありがとう。……思ったよりちゃんと握っちゃった。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は立つ前に、こちらの膝についた砂を指さした。
}
# speaker: narrator
親子の後ろで赤い手が二つ揺れた。二人は水に近い道を選んだ。
-> END
