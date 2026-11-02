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

# background: milano_brera_date
# speaker: narrator
ブレラの《接吻》の前。彼女は抱き合う二人を見て、片手を自分の背中へ回した。
# speaker: heroine
「二人の足元、片方だけ階段にかかってる。先に行ってしまいそうで気になる。」
# emotion: serious
「この後にひとことだけ言えるとして。「気をつけて」と「行かないで」、どっちがその人のためになるんだろ。」
# speaker: player
「二つとも言うのは？」
# speaker: heroine
「私、たぶん長く話すと最後を「じゃあね」でごまかす。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
絵を見る人が動くまで、彼女は隣を一歩あけた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の肩のすぐ横から、画面の端を指した。
}

* [「行かないで、と言ってみて」]
    # effect: common_date_first_bold
    { romance_result == "negative":
        # speaker: heroine
        「今日は言ってみるだけでも重いな。絵の二人に借りておく。」
    - else:
        # speaker: heroine
        「行かないで。……あ、言ったほうが、ちゃんと送り出せそう。」
    }
    -> join_1

* [「黙って見送るのもありかな」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「それを選べる人は強いね。私は、今日は何か言いたい。」
    - else:
        # speaker: heroine
        「うん。でも私は、何も言わなかった日のことばかり覚えてる。」
    }
    -> join_1

* [「じゃあね、にも続きがあるよ」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「本当は続いてほしいときほど、軽く聞こえちゃう気がする。」
    - else:
        # speaker: heroine
        「次がある言い方だもんね。それなら、少し好きかも。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
衣装の色に国旗を読む人もいるという。絵の二人には街の事情もあったのかも、と彼女はつぶやいた。
# speaker: heroine
「理由をみんな知ったら、言える言葉が増えるかな。それとも減る？」

* [「僕なら、聞いてから決めたい」]
    # effect: sound_brera_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「答えるまで待たせるのも難しいよね。聞かれなくても言えるようになりたい。」
    - else:
        # speaker: heroine
        「私もそうしてほしい。事情があるなら、遠回りでも聞いて。」
    }
    -> join_2

* [「一言なら「またね」にする」]
    # effect: sound_brera_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「「またね」って約束かな。私はたまに、軽く言われると迷う。」
    - else:
        # speaker: heroine
        「いい。短いのに、もう一回分ある。」
    }
    -> join_2

* [「次に会った時の一言も予約する」]
    # effect: sound_brera_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「予約すると、違う言葉が出た日に困るよ。空けておきたい。」
    - else:
        # speaker: heroine
        「じゃあ私から。「遅い」。待ってたって伝わるでしょ。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
台詞を選び終えた口元を、彼女がそっと見た。
}
# speaker: narrator
次の絵に移るとき、彼女は《接吻》にだけ聞こえる声で「じゃあね」と言った。
-> END
