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

# background: gt_bg_agra_mariam_tomb
# speaker: narrator
マリアム・ウッザマーニー廟の案内には、アクバルの王妃、ジャハーンギールの母、と記されていた。{heroine_name}は読み終えてからも、しばらくそこに立っている。
# speaker: heroine
# emotion: neutral
「関係を聞くと、誰かは分かる。でも、どんなことが好きだったかは、ここには書いてないんだね」
# speaker: narrator
こちらが左の園路へ顔を向けると、彼女も一度ついてくる。二歩目で止まり、右側の建物の見え方を振り返った。
# speaker: heroine
# emotion: smile
「わたしを誰かに紹介するなら、どう言う？　旅行の同行者、以外で聞いてみたい」

* [「俺を振り回す、なかなか手強い人」]
    # effect: gt_agra_date_mariam_tomb_first_provocative
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「振り回してるつもりはないよ。そう言われると、行きたい所まで言いにくくなる」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「手強い、は少しうれしい。いつも合わせてくれる人、よりは、わたしに近いかも」
    }
    -> after_first
* [「今、世界で一番気になっている人」]
    # effect: gt_agra_date_mariam_tomb_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,blush
        「それ、わたしの紹介というより、そっちの気持ちだよね。……気持ちの方は、ちゃんと聞いたけど」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「恋人です、より困る紹介。うれしい顔をしたまま、挨拶することになっちゃう」
        - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「待って。わたし、自分の紹介を聞いてたんだけど。……その続きも、少し気になる」
        }
    }
    -> after_first
* [「人の話を、ちゃんと聞こうとする人」]
    # effect: gt_agra_date_mariam_tomb_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。でも、聞いてるうちに自分の番を逃すこともある。いいところだけだと、少し窮屈だな」
    - else:
        # speaker: heroine
        # emotion: smile
        「そう見てくれたのは、うれしい。でも、今日は聞くだけじゃない方も、知ってほしい」
    }
    -> after_first

=== after_first ===
# speaker: narrator
彼女は今来た道を、右へ指し直した。
# speaker: heroine
# emotion: serious
「本当は、あっちから見たかった。最初に言えばよかったのに、なんとなく合わせちゃった」
# speaker: narrator
こちらがすぐ向きを変えると、彼女は慌てて手を下ろす。
# speaker: heroine
# reaction: heroine,worried,sweat
「違う、急いで直してほしいわけじゃなくて。左を見たかったなら、それも聞きたい。わたしだけが決めたいんじゃないから」

* [「左も気になる。右のあとで見たい」]
    # effect: gt_agra_date_mariam_tomb_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「うん。それを先に聞けたらよかった。わたしも、先に言うから」
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「じゃあ、両方。こんなに短い相談で済んだのに、頭の中ではずっと迷ってた」
    }
    -> ending
* [「遠慮していない君にも、会いに来た」]
    # effect: gt_agra_date_mariam_tomb_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「そんなに立派な理由にしないで。今は、右か左かの話をしたい」
    - else:
        { relationship_tone_after == "guarded_attraction" || relationship_tone_after == "strained":
        # speaker: heroine
        # emotion: shy
        「うれしい。でも、急に全部は見せられないよ。まず、右を見たいわたしからでいい？」
        - else:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「じゃあ、遠慮しない。右を見たいし、そのあと、そっちの話も聞きたい。両方付き合って」
        }
    }
    -> ending
* [「紹介文に『たまに頑固』を追加します」]
    # effect: gt_agra_date_mariam_tomb_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「たまに、じゃないかも。だから、笑って終わらせずに聞いてね」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「はい、本人確認済み。あと『言い直すまで、少し時間がかかる』も、小さく入れておいて」
    }
    -> ending

=== ending ===
# speaker: narrator
右から建物を見る。それから、二人で左へ回った。どちらから見るのが正しいか、という話にはならなかった。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: heroine
# emotion: smile
「紹介文、長くなったね。次に誰かへ話す時は、わたしも横にいて続きを言おうかな」
- else:
# speaker: heroine
# emotion: smile
「さっきの紹介、一行だけで決めなくてよかった。わたしの方にも、まだ訂正がありそう」
}
# speaker: narrator
彼女はもう一度、見たい所を指した。今度は、こちらの返事を待つ顔をしていた。
-> END
