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

# background: gt_bg_delhi_lodhi_garden
# speaker: narrator
ロディ・ガーデンの道で、{heroine_name}が座れる場所を見つけた。嬉しそうな顔をした後、すぐ遠くの廟へ視線を戻す。
# speaker: heroine
「あっちも見たいね。歩けば、すぐ……」
# speaker: narrator
一歩目が、さっきより小さい。彼女は自分の足を見てから、こちらを見た。
# speaker: heroine
# emotion: worried
「ごめん。五分、座ってもいい？　見たいのと、足が疲れたのが、同時に来ちゃった」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女は荷物を自分の膝へ寄せ、隣に座る場所を空けた。
- else:
    # speaker: heroine
    # emotion: teasing
    「さっきのわたし、元気なふりが少し雑だったね」
}

* [「五分より長くても大丈夫」]
    # effect: gt_delhi_date_lodhi_garden_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、今日は自分で戻るタイミングを決めたいな。元気になったら言うね」
    - else:
        # speaker: heroine
        # emotion: smile
        「助かります。五分って言うと、頼みやすい気がして。でも、もう少しいたい」
    }
    -> after_first

* [「じゃあ五分間、座る係になります」]
    # effect: gt_delhi_date_lodhi_garden_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「係じゃなくて、休んでていいよ。わたしに付き合う仕事にしないで」
    - else:
        # speaker: heroine
        # emotion: teasing
        「合格です。開始からもう、すごく上手」
        # speaker: narrator
        彼女は笑い、張っていた膝からそっと力を抜いた。
    }
    -> after_first

* [「一緒に座りたかったから、ちょうどよかった」]
    # effect: gt_delhi_date_lodhi_garden_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「合わせてくれてない？　本当に疲れた時は、そっちからも言ってね」
    - else:
        # speaker: heroine
        「それ、先に言ってくれてもよかったのに。じゃあ、二人とも休憩」
        # speaker: narrator
        彼女は自分の分の水を取り出し、こちらにも休むよう目で促した。
    }
    -> after_first

=== after_first ===
# speaker: narrator
座ったまま、庭の向こうの建物を見る。歩いていた時には途切れていた輪郭が、木々の間に落ち着いた。
# speaker: heroine
「ここ、サイイド朝やロディ朝の廟とモスクがあるんだって。古い建物だけ見に来たつもりだったけど」
# speaker: narrator
道を行く人が、二人の前を静かに通り過ぎる。彼女は画面を消し、膝の上に裏返した。
# speaker: heroine
# emotion: smile
「今、ちょっと、近所の公園で休んでる気分。来たことのない場所なのに」
# speaker: narrator
しばらくして時計を見た彼女が、あ、と口を開けた。五分は、とっくに過ぎている。
# speaker: heroine
「もう少しここにいるか、あの建物まで歩くか。今度はちゃんと迷えるくらい、足が戻ってきた」

* [「立ってみてから決めよう」]
    # effect: gt_delhi_date_lodhi_garden_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「立つと、そのまま歩かなきゃって気がしそう。あと少しだけ座って決めたい」
    - else:
        # speaker: heroine
        「うん。体に聞くの、忘れてた」
        # speaker: narrator
        彼女は荷物を持つ前に立ち、足首をゆっくり動かした。
    }
    -> ending

* [「休憩を気に入った。もう少し延長したい」]
    # effect: gt_delhi_date_lodhi_garden_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは少し歩きたくなった。じゃあ、そこの道まで一緒に行ってみない？」
    - else:
        # speaker: heroine
        「わたしも。歩かなくても景色を見ていいって、忘れてた」
        # speaker: narrator
        彼女は時計をしまい、今度は時間を決めずに座り直した。
    }
    -> ending

* [「座る係、昇進できそう？」]
    # effect: gt_delhi_date_lodhi_garden_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「もう役目の話はおしまい。隣で普通に休んでてくれたら、それでいいから」
    - else:
        # speaker: heroine
        # emotion: happy
        「勤務時間を延ばしたい人から昇進させます。わたしが先かな」
        # speaker: narrator
        彼女は立ち上がるそぶりだけ見せ、すぐ元の場所へ戻った。
    }
    -> ending

=== ending ===
# speaker: narrator
二人が立ち上がる時、彼女はもう急がなかった。見に行く建物を一つだけ決め、荷物を持ち直す。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「休みたいって言って、今日がつまらなくなるんじゃないかと思ってた。そんなことなかったね」
- else:
    # speaker: heroine
    # emotion: smile
    「次は足が戻ったふりもしません。見たいものは、ちゃんと残ってるし」
}
# speaker: narrator
さっき座っていた所を振り返る。そこも、今日見つけた場所の一つになっていた。
-> END
