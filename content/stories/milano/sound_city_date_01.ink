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
二つの広場を結ぶガッレリア。その真ん中で、彼女は右でも左でもなく、来た方を向いた。
# speaker: heroine
「帰り道って、行きたいところを言っても許される時間かな。」
# speaker: player
「どこへ？」
# speaker: heroine
「いま通ったところ。あの店の前で話しかけようと思って、通り過ぎちゃった。」
「この通路、ドゥオモ広場とスカラ広場をつないでるんだよね。今日はその途中で戻りたくなっちゃった。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
店の明かりが二人の間を横切った。彼女はまだ半歩先にいる。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は袖を少し引いて、来た方の柱を指した。
}

* [「じゃあ巻き戻そう」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「笑い話にするには、ちょっと勇気を使ったとこ。普通に戻ろう。」
    - else:
        # speaker: heroine
        「足で巻き戻すの初めて。台詞まで同じだと私また言いそびれるから、そこは変えてね。」
    }
    -> join_1

* [「ここで聞かせて」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「場所も一緒に覚えておきたい。もう少しだけ付き合って。」
    - else:
        # speaker: heroine
        「ありがとう。名所とか関係ない話でもいい？」
    }
    -> join_1

* [「僕にも言いたいことがある」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「先にいい？　いま口を開けたところだから。」
    - else:
        # speaker: heroine
        「それ、先に聞かせて……あっ、また私の番を譲っちゃった。今日は私から。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
閉じた店のガラスに二人の像が並ぶ。彼女は自分の方を向いて、小さく一度うなずいた。
# speaker: heroine
「旅が終わったら、用事がない日に会ってみたい。ここみたいに、会うためだけに通る場所がほしい。」

* [「用事なら僕が作るよ」]
    # effect: sound_city_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「なくていいって言ったのに。埋めなくても、会いたいの。」
    - else:
        # speaker: heroine
        「何にする？　あ、いま二人とも予定を作る気でいる。」
    }
    -> join_2

* [「最寄りの駅で待ち合わせよう」]
    # effect: sound_city_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「もう決めるのは少し早いかな。でも、聞いてくれたのはうれしい。」
    - else:
        # speaker: heroine
        「いい。どっちが先に見つけるか、それだけ決めよう。」
    }
    -> join_2

* [「会いたいって言ってくれたら行く」]
    # effect: sound_city_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「毎回私からは寂しい。半分ずつがいい。」
    - else:
        # speaker: heroine
        「言うよ。その代わり、そっちからも言ってね。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は店のガラスに映る二人を見てから歩き出した。
}
# speaker: narrator
今度こそ帰る方を向いた。ガラスの二人も、ほとんど同時に向きを変えた。
-> END
