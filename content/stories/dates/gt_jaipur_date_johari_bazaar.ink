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

# background: gt_bg_jaipur_johari_bazaar
# speaker: narrator
ジョーハリー・バザールには、宝飾品や工芸品を扱う店が並んでいる。彼女は店頭の腕飾りを見て、足を少し遅くした。
# speaker: heroine
「あの青、きれい。……隣の緑もいいね。見てると、好きな色が忙しく変わる」
# speaker: narrator
見るだけでもよいか尋ねると、店の人がうなずいてくれた。彼女は品物に触れず、少し離れたところから色を比べる。
# speaker: heroine
「服なら、いつもの色を選びそう。でも、こうして並んでると、違う色も気になるな」
{ relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: heroine
「好きな色、聞いてもいい？　わたしが選ぶのと同じじゃなくても、知りたい」
- else:
# speaker: heroine
# emotion: teasing
「そっちはどれ？　先に言ってみて。わたし、聞くとその色が急によく見えたりするから」
}

* [「最初に見ていた青が気になる」]
    # effect: gt_jaipur_date_johari_bazaar_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「わたしに合わせなくてもいいんだよ。今は、そっちの好きな色を聞きたい」
    - else:
        # speaker: heroine
        # emotion: smile
        「あ、同じところ見てた。光が当たると少し明るくなるの、いいよね」
    }
    -> after_first
* [「緑の方を、もう少し見たい」]
    # effect: gt_jaipur_date_johari_bazaar_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「うん。わたしは青のままかも。違う色が気になってても、いいよね」
    - else:
        # speaker: heroine
        「そうなんだ。じゃあ、ちょっとこっちから見よう。緑がよく見える」
    }
    -> after_first
* [「好きな色が変わる速さで勝負しようか」]
    # effect: gt_jaipur_date_johari_bazaar_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「急かされたら全部好きになっちゃう。今は、のんびり選びたいな」
    - else:
        # speaker: heroine
        # emotion: teasing
        「それなら負けないよ。あ、でも今、青が少し長く勝ってる」
    }
    -> after_first

=== after_first ===
# speaker: narrator
店の人が、二人の見ていた品を少し向きを変えて置く。彼女は礼を言い、もう一度顔を近づけた。
# speaker: heroine
「見る向きで違うんだ。さっきのわたし、けっこう自信を持って青って言ったのに」
# speaker: narrator
緑を見て、青へ戻る。今度はどちらも指ささず、口元だけが少し緩んだ。
# speaker: heroine
「今日は買わずに、見るだけにしようかな。欲しいものを決める前の時間が、今は楽しい」

* [「もう少し、一緒に見ていこう」]
    # effect: gt_jaipur_date_johari_bazaar_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うれしいけど、ここは十分見たかな。次の店先も気になってきた」
    - else:
        # speaker: heroine
        # emotion: happy
        「うん。急いで決めなくていいと思うと、また違うものが見えてくる」
    }
    -> ending
* [「欲しいものが決まった時にも聞きたい」]
    # effect: gt_jaipur_date_johari_bazaar_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「決まらないままでも、今日の話はするよ。選ばなかった方も面白かったから」
    - else:
        # speaker: heroine
        「もちろん。たぶん、今まで候補に出てない色だったりするよ」
    }
    -> ending
* [「次の店で、青の防衛戦だね」]
    # effect: gt_jaipur_date_johari_bazaar_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「守るほどは決めてないってば。気が変わっても、実況しないでね」
    - else:
        # speaker: heroine
        # emotion: teasing
        「強そうな相手が来たら、すぐ譲ると思う。そういう勝負でいいなら」
    }
    -> ending

=== ending ===
# speaker: narrator
店の人に礼を言って、通りへ戻る。荷物は増えていないのに、彼女の話す色だけが増えていた。
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "warm":
# speaker: heroine
# emotion: smile
「そっちの好きな色、覚えておくね。買うためじゃなくて。次に見つけたら、すぐ教えたいから」
- else:
# speaker: heroine
「次は、そっちが気になった店を教えて。わたしの足、さっきから勝手に止まっちゃうから」
}
# speaker: narrator
二人は人の流れに戻った。次の店先で、彼女は立ち止まる前にこちらを見た。
-> END
