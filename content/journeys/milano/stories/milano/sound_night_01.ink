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

# background: milano_night_landmark
# speaker: narrator
ナヴィリオの夜。向こう岸の声が水を越えてくる。隣の足音だけ、ときどき半拍遅れる。
# speaker: heroine
「さっきから歩幅を合わせようとして、歩き方を忘れました。」
# speaker: player
# reaction: heroine,exasperated,sigh
「どうりで右足だけ偉そうだった。」
# speaker: heroine
# emotion: exasperated
「見てたの、それ。先に言ってよ。」
「運河沿いには、家の入口をつなぐ共同の廊下がある建物もあるんだって。つい窓を見ちゃう。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は水際から一人分あけて歩く。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
二つの足音がそろった瞬間だけ、彼女がこちらの手を見た。
}

* [「三歩だけ競争しよう」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「競争すると余計に頑張っちゃうよ。今日はゆっくりがいい。」
    - else:
        # speaker: heroine
        「三歩なら勝つ。よーい、って言った人がもう一歩出てるから。」
    }
    -> join_1

* [「先に歩いてみて」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「先頭はちょっと恥ずかしい。一緒にいて、遅くなったらそのままで。」
    - else:
        # speaker: heroine
        「じゃあ、この辺。私、運河側だといつも遅くなる。」
    }
    -> join_1

* [「別々の歩幅で並べるよ」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「言うのは簡単なんだけど、つい見ちゃうんだよね、隣の足。」
    - else:
        # speaker: heroine
        「それ、やってみたかった。合わなくなったら橋で待とう。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
橋の手前で彼女が止まった。立ち飲みの輪を避けたのかと思ったら、手すりの向こうを見ていた。
# speaker: heroine
「私がゆっくりなの、疲れたからだと思った？」

* [「少しそう思った」]
    # effect: sound_night_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「見ただけで決めなくてよかった。今は、橋から水を見たいの。」
    - else:
        # speaker: heroine
        「正解は半分。疲れたのと、まだ帰りたくないのと。」
    }
    -> join_2

* [「早く帰りたくなかった？」]
    # effect: sound_night_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「気持ちまで先回りしないで。言いたくなったら自分で言うね。」
    - else:
        # speaker: heroine
        「……それをそっちが先に言うの、ずるい。うん、もう少し。」
    }
    -> join_2

* [「腰掛けて、答えを待つ」]
    # effect: sound_night_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「座らずに、そばで立っててくれる？　今そこで灯りが切れそう。」
    - else:
        # speaker: heroine
        「ありがとう。座った途端、もう一周する元気が出てきた。困ったね。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
橋の上だけは、どちらの足音も聞こえなかった。
}
# speaker: narrator
橋を下りて、二人は違う速さで同じ角を曲がった。
-> END
