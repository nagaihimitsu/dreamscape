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

# background: gt_bg_jaipur_albert_hall
# speaker: narrator
アルバート・ホール博物館の案内には、金属工芸、木工、絨毯、細密画が並んでいた。彼女はそれを読んでから、こちらの顔をじっと見る。
# speaker: heroine
# reaction: heroine,teasing,question
「どこで足が止まるか、当ててみたい。展示じゃなくて、そっちの足」
# speaker: narrator
ひと通り見渡したあとで、互いに一つだけ気になったものを案内し合う。彼女から、そんな遊びの提案が出た。
# speaker: heroine
「わたしの方も、予想していいよ。……当てられたら、ちょっと悔しいかもしれないけど」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「分からなくても、困らないでね。知ってるふりをしてほしいわけじゃないから」
- else:
    # speaker: heroine
    # reaction: heroine,happy,music
    「自分の好きなものが、全部ばれてると思わないでよ。わたしにも、まだ分からないし」
}

* [「案内を見る目だと、細密画が気になってそう」]
    # effect: gt_jaipur_date_albert_hall_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「そんなに顔を読まれると、意地で違う方へ行きたくなる。まだ、決めないでおこう」
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「あ、そこを見てたのは合ってる。でも中に入ったら、変わるかもしれません」
    }
    -> looking
* [「『この人を見ていたい』という展示はある？」]
    # effect: gt_jaipur_date_albert_hall_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「わたしを展示にしないで。今日は、わたしも見る側で楽しみたいの」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「本人が勝手に移動する展示でよければ。……でも、わたし以外もちゃんと見てね」
    }
    -> looking
* [「まだ分からない。外れた方が、話を聞けそう」]
    # effect: gt_jaipur_date_albert_hall_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「一回くらい予想してほしかったけど。うん、入ってから変わるのも、ありにしよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「それなら、わたしも外していいね。間違えた時の方が、なんで？って聞ける」
    }
    -> looking

=== looking ===
# speaker: narrator
館内を見て回る。細密画の前で彼女は立ち止まったが、案内し合う一つに選んだのは、金属工芸の細部だった。
# speaker: heroine
# emotion: smile
「ここ。こんなに小さい曲がり方なのに、続きを見たくなった。名前を覚えるより先に、目が戻っちゃって」
# speaker: narrator
彼女はこちらが見るのを待った。作品へ目を戻し、やがて声をひそめる。
# speaker: heroine
「わたしの予想は、たぶん外れたな。でも、もう少し見てから聞くね」
# speaker: narrator
見学を終え、ラームニワース庭園へ出る。大きく重なる屋根を見上げて、彼女が目をしばたたいた。
# speaker: heroine
# reaction: heroine,happy,music
「急に、世界の字が大きくなったみたい。さっきまで、あんなに小さい線を見てたから」
# speaker: heroine
「それで、何が残った？　わたしの予想を言う前に、聞かせてほしい」

* [「夢中になると、人を待てるところ。君のそういう所が好きだ」]
    # effect: gt_jaipur_date_albert_hall_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,question
        「今は作品の話を聞きたかった。好きって言葉はうれしい。でも、それで答えの代わりにはしないで」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        { ending_reached:
            「そんなところまで、見てるんだね。……好きな理由が増えるのは、うれしいな」
        - else:
            「そこを好きって言われると思わなかった。わたし、待ってただけなんだけど……うれしい」
        }
        # speaker: heroine
        「作品の話も、あとでちゃんと聞くからね。今、ちょっと顔を直してる」
    }
    -> garden
* [「あの金工、同じ曲線を何度も見直したくなった」]
    # effect: gt_jaipur_date_albert_hall_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしが連れていった所だけになっちゃったね。そっちが自分で見つけたものも、聞きたかったな」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「同じ所で止まったんだ。予想は外れたけど、これは当たるより、ちょっといい」
    }
    -> garden
* [「先に予想を聞きたい。どうしてそう思ったの？」]
    # effect: gt_jaipur_date_albert_hall_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「聞く順番、返されちゃった。わたしばかり話してる気がする。今度はそっちの番がいいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「木工。作り方を確かめるみたいに見てたから。作品が好きか、仕組みが気になるかまでは、分からなかった」
    }
    -> garden

=== garden ===
# speaker: narrator
彼女は案内を広げた。さっきとは違い、次に見る物を探すためではなく、見たものの話を続けるために。
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: heroine
    # emotion: neutral
    「当てる遊びにしたけど、答えを先に決めるのは嫌だね。そっちの話も、ちゃんと聞きたい」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「わたしの読み、まだまだ外れるね。まあ、全部分かった顔をされるより、次も聞かれた方がいいな」
}
# speaker: narrator
博物館の大きな屋根を背に、小さな細工の話をする指が動く。二人の予想には、まだ答えのつかない所が残っていた。
-> END
