// ガッレリアのガラス屋根の下で、突然の雨をやり過ごす。
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
ガッレリアの出口に近づいたとき、広場を歩く人たちが一斉に傘を開いた。
# speaker: heroine
# emotion: surprised
「あっ、降ってる。さっきまで気づかなかった」
# speaker: narrator
鉄の骨組みに支えられたガラス屋根の向こうで、雨が細い線になって見える。
# speaker: heroine
「屋根が透明だと、濡れずに雨が見えるんだね」
「ごめん、少しだけここで見ててもいい？　わたし、傘が開く瞬間を見るの好き」
{
- relationship_tone == "strained":
彼女は返事を待ち、広場までの距離をもう一度見た。
- relationship_tone == "guarded_attraction":
彼女はすぐ隣を見て、少し声を小さくした。
- relationship_tone == "comfortable":
彼女は通り過ぎる傘の数を指で数えはじめた。
- relationship_tone == "warm":
彼女は出口を指さし、次はどの傘が開くか予想した。
- relationship_tone == "romantic_tension":
彼女は肩が触れそうな位置で立ち止まり、窓の雨を見上げた。
- else:
彼女は屋根から落ちる雫を眺めながら待った。
}
# speaker: heroine
「さっき、赤い傘の人だけ一歩遅かった。濡れなかったかな」

* [「次は青い傘が開く。予想してみよう」]
    # effect: milano_rain_v2_music
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「当てるゲームにすると、濡れた人を見て喜びそう」
        「予想はするけど、みんな間に合ってほしいな」
    - else:
        # speaker: heroine
        # emotion: happy
        「じゃあ、わたしは黄色！　……あ、黄色い傘の人がそもそもいない」
    }
    -> ending
* [「あの柱の近くからなら広場がよく見えそう」]
    # effect: milano_rain_v2_watch
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「思ったより雨が跳ねるね。靴を濡らすところだった」
        「ここから見ることにする」
    - else:
        # speaker: heroine
        # emotion: smile
        「ほんとだ。屋根の切れ目も見える」
        「あの人は間に合ったね」
    }
    -> ending
* [「傘を買いに行こう。待つより早く進める」]
    # effect: milano_rain_v2_hurry
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「急ぎたいのは分かった。でも、わたしはもう少し見ていたい」
        「決める前に聞いてほしかったな」
    - else:
        # speaker: heroine
        # emotion: neutral
        「傘はいいね。でも、出るのはもう少し待って」
        「せっかく見つけた景色だから」
    }
    -> ending

=== ending ===
# speaker: narrator
ガラスを打つ雨が細かくなり、広場の人の足も少しずつゆるんだ。
# speaker: heroine
{ relationship_tone_after == "strained":
    # emotion: serious
    「待ってくれてありがとう。次は、急いでるかもちゃんと聞くね」
- else:
    # emotion: smile
    「あ、今度は赤と青が同時。これは予想できなかった」
}
「止んだら、次の場所は一緒に決めよう」
-> END
