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
マリアム・ウッザマーニー廟の案内を、{heroine_name}がゆっくり読んでいる。読み終えると、砂岩の建物を見上げた。
# speaker: heroine
# emotion: neutral
「皇帝の母、王妃。関係を聞くと、誰のことかは分かりやすくなるね」
# speaker: narrator
マリアム・ウッザマーニーは、アクバルの王妃で、ジャハーンギールの母として紹介されている。
# speaker: heroine
「どんなものが好きだったのかな。それは、ここにある説明だけじゃ分からないんだ」
# speaker: narrator
彼女は分からないところを想像で埋めず、案内から目を離した。歩き始めてから、ふと思いついたようにこちらを見る。
# speaker: heroine
# emotion: smile
「わたしを一行で紹介するなら、どうなるんだろう。旅の同行者、だけだと少し寂しいかも」
{ relationship_tone == "warm" || relationship_tone == "comfortable":
# speaker: heroine
# emotion: teasing
「でも、今から欠点の一覧は出さないでね。一行だから」
}

* [「気になるものを、よく見つける人」]
    # effect: gt_agra_date_mariam_tomb_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「そう見えてるんだ。見つけたのに、声をかけそびれることも多いんだけどね」
    - else:
        # speaker: heroine
        # emotion: happy
        「それ、うれしい。見つけたあと、一緒に見てもらえるのも好きなんだ」
    }
    -> after_first
* [「寄り道の理由を、すぐ思いつく人」]
    # effect: gt_agra_date_mariam_tomb_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「それだと、予定を遅らせる人みたい。行きたいところがある、って言ってほしいな」
    - else:
        # speaker: heroine
        # emotion: teasing
        「理由だけじゃないよ。本当に気になってるんです。……説得は、ちょっと頑張るけど」
    }
    -> after_first
* [「まだ、一行では言い切れない人」]
    # effect: gt_agra_date_mariam_tomb_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「まだ、か。ひとつくらい聞けると思ってたから、少し残念」
    - else:
        # speaker: heroine
        # emotion: shy
        「それなら、続きを知ってもらえるといいな。一行より、少し長く」
    }
    -> after_first

=== after_first ===
# speaker: narrator
彼女は返事を頭の中で繰り返すように、少し黙って歩いた。それから、片手を小さく上げる。
# speaker: heroine
# emotion: smile
「わたしからも一つ足していい？　気を遣ってるように見えて、けっこう頑固なときがある人」
# speaker: narrator
本人がそう言うと、妙に言い切った紹介になった。こちらが笑うと、彼女も口元をゆるめる。
# speaker: heroine
「何でもいい、って言ってから、やっぱりこっちがよかったって思うこともある。先に言えばいいのにね」

* [「言い直してくれたら、聞きたい」]
    # effect: gt_agra_date_mariam_tomb_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、いつでも言えるわけじゃないから。今は、それだけ知っててほしい」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。言い直すまで時間がかかっても、聞いてくれるとうれしい」
    }
    -> ending
* [「そういうところも、もっと知りたい」]
    # effect: gt_agra_date_mariam_tomb_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「全部まとめて見せるのは、ちょっと難しいな。話したくなったときでいい？」
    - else:
        # speaker: heroine
        # emotion: shy
        「面倒だと思う日もあるかもしれないよ。……それでも、知りたいって言ってくれるのはうれしい」
    }
    -> ending
* [「自分にも、言いそびれることがある」]
    # effect: gt_agra_date_mariam_tomb_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「そっか。今、わたしの話も、もう少し聞いてほしかったけど。その話もあとで聞きたい」
    - else:
        # speaker: heroine
        「そうなんだ。じゃあ、わたしも聞けるようになりたい。自分のことばっかり気にしないで」
    }
    -> ending

=== ending ===
# speaker: narrator
道が分かれるところで、彼女は先に行きたい方を指した。少しだけ迷い、それでも手は引っ込めない。
# speaker: heroine
# emotion: smile
「こっちから、もう一度建物を見たいな。よかったら、付き合って」
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: heroine
# emotion: teasing
「ほら。紹介文の続き、さっそく出てきた」
}
# speaker: narrator
二人は彼女の選んだ方へ歩いた。帰り道の相談は、その景色を見てからにした。
-> END
