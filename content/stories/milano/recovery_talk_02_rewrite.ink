// ガッレリアで、すれ違いを急いで解決せず、もう一度話す。
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
ガッレリアのガラス屋根に、午後の光が広がっている。
人の流れに押されそうになり、{heroine_name}はショーウィンドウの前で立ち止まった。
# speaker: heroine
# emotion: worried
「少し、ここで話してもいい？」
「さっきから言おうと思ってたんだけど、人が多くて、何度もタイミングを逃しちゃった」
{
- relationship_tone == "strained":
彼女は鞄の持ち手を握り直し、こちらを見る。
- relationship_tone == "guarded_attraction":
彼女は目を合わせかけて、ガラスに映る人の流れへ視線を移した。
- else:
彼女は通り過ぎる人を見送ってから、こちらに向き直った。
}
# speaker: heroine
「うまく言えなかったこと、あとで一人で考えすぎる癖があって」
「今日は、ちゃんと聞いてみたい。さっき、どういうつもりだった？」

* [「急がせたならごめん。何が嫌だったか聞きたい」]
    # effect: milano_recovery_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「ありがとう。でも、どこから話せばいいか迷うな」
        「今すぐ全部まとめなくてもいい？」
    - else:
        # speaker: heroine
        # emotion: serious
        「決める前に、わたしの考えも聞いてほしかった」
        「言い返せなくて、そのままにしちゃったのも私だけど」
    }
    -> ending
* [「あの雄牛のところを回って、やり直せないかな」]
    # effect: milano_recovery_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「幸運のお願いならいいけど、話したことは消せないよ」
        「ちゃんと話してから、一緒に見に行こう」
    - else:
        # speaker: heroine
        # emotion: smile
        「靴のかかとだけ減って、話は残りそう」
        「先に話してから、お願いしに行こうか」
    }
    -> ending
* [「気まずいけど、話を途中で終わらせたくない」]
    # effect: milano_recovery_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        { relationship_tone_after == "strained":
        「話すのはいい。でも、今日は答えを急がないでほしい」
        - else:
        「わたしも終わらせたくない。少し時間をもらってもいい？」
        }
    - else:
        # speaker: heroine
        # emotion: smile
        { relationship_tone_after == "romantic_tension":
        「うん。大事だからこそ、ちゃんと聞きたい」
        - else:
        「わたしも。言い直してもいいって思えると、助かる」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
人の切れ目を待って、彼女は屋根の交わる方向を見上げた。
# speaker: heroine
「ありがとう。すぐに前みたいに話せなくても、もう少し歩きながら考えたいな」
「次は、言いそびれる前に止めるね」
# speaker: narrator
彼女は今度は待たずに、歩く速さを口にした。
-> END
