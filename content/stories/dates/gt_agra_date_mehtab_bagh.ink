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

# background: gt_bg_agra_mehtab_bagh
# speaker: narrator
メヘターブ・バーグの園路で、{heroine_name}が足を止めた。ヤムナー川の向こうに、タージ・マハルが見える。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「こっちからだと、川も一緒に見えるんだ。……写真、一枚だけにする。あとは、このまま見たい」
# speaker: narrator
撮った一枚を確かめて鞄へしまう。しばらく眺めていた彼女が、ふいにこちらを向いた。
# speaker: heroine
# emotion: neutral
「ここを離れたら、今日の立ち位置って、もう正確には分からなくなるんだね」
{ relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は言いすぎたかという顔をして、川へ視線を戻した。
- else:
# speaker: heroine
# reaction: heroine,teasing,music
「だからって、地面に印は付けません。覚える係、二名でお願いします」
}

* [「景色より、今は君の横顔を覚えたい」]
    # effect: gt_agra_date_mehtab_bagh_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,blush
        「その言い方は、ずるい。わたしは川を見てたのに、顔をどうしていいか分からなくなる」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「じゃあ、横顔だけじゃなくて。ちゃんとこっちを見るね」
        - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「急に、そんなこと言うんだ。……覚えるなら、笑ってる方にして。今なら、たぶんそうなる」
        }
    }
    -> after_first
* [「もう少し、ここにいよう」]
    # effect: gt_agra_date_mehtab_bagh_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。でも、わたしが寂しそうだったからって、帰りにくくならないでね」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。何をするか決めなくていいの、今はすごくうれしい」
    }
    -> after_first
* [「この眺め、二人で半分ずつ暗記しよう」]
    # effect: gt_agra_date_mehtab_bagh_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「試験にしないで。もう、覚えたいことが増えすぎてるんだから」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「じゃあ川はわたし、タージはそっち。あとで合わせたら、建物が川に浮いてたりして」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人は園路の少し先まで歩いて、振り向いた。川を隔てて墓廟を望む庭。その距離が、こちら側にいる時間も作っている。
# speaker: heroine
「近くまで行けない眺めって、落ち着くね。もっと寄らなきゃって、思わずに済む」
# speaker: narrator
彼女は戻る道を見て、それから、こちらを見た。
# speaker: heroine
# emotion: smile
「次の旅って、まだ何も決まってないのに。こういう時間は、またほしいな」

* [「自分も、今日が終わるのは少し惜しい」]
    # effect: gt_agra_date_mehtab_bagh_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。惜しいって言うと、もう帰るみたいになるね。まだ、ここにいたい」
    - else:
        # speaker: heroine
        # emotion: smile
        「一人だけ惜しんでるんじゃなくて、よかった。じゃあ、もう少しだけ今日の話をしよう」
    }
    -> ending
* [「次の旅も、その次も、君を誘いたい」]
    # effect: gt_agra_date_mehtab_bagh_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,blush
        「先の予定を全部押さえないで。うれしいけど、わたしが誘う番も取っておいて」
    - else:
        { relationship_tone_after == "strained" || relationship_tone_after == "guarded_attraction":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「そう思ってくれたことは、覚えておく。でも、次も一緒かは、その時に二人で決めたい」
        - else:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「一つ先は、わたしが誘う。それでもいい？　誘われるだけだと、悔しくなりそう」
        }
    }
    -> ending
* [「次回の集合場所は『だいたいこのへん』で」]
    # effect: gt_agra_date_mehtab_bagh_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「それ、絶対に見つからないやつ。今のわたしにも、もう怪しいもん」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「はい。じゃあ、違う所で二人とも手を振ってたら、先に気付いた方が迎えに行くこと」
    }
    -> ending

=== ending ===
# speaker: narrator
戻ってみると、彼女は迷わず一か所を指し、すぐ首をかしげた。
# speaker: heroine
# reaction: heroine,teasing,question
「ここ。……の、一歩隣だったかも」
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: narrator
こちらが隣へ並ぶと、彼女は今度は川を見る前に、こちらの顔を確かめた。
# speaker: heroine
# emotion: smile
「うん。今日の分は、これで覚えた」
- else:
# speaker: heroine
# emotion: smile
「違ってても、今の場所は分かるね。もう一回、ここから見よう」
}
# speaker: narrator
地面には印を付けず、写真も増やさなかった。二人はそれぞれの位置から、川の向こうを眺めた。
-> END
