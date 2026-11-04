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

# background: gt_bg_delhi_india_gate
# speaker: narrator
インド門の見える広場で、家族連れの女性がカメラを差し出した。いつも撮る側で、自分だけ写真にいないのだという。
# speaker: heroine
# reaction: heroine,smile,sparkle
「じゃあ、真ん中へどうぞ。今日は撮る係、お休みです」
# speaker: narrator
{heroine_name}が一枚撮ると、女性は画面の自分を見て笑った。今度は二人を撮ってくれるという。
# speaker: heroine
「わたしたちも？　あ、はい。……どのくらい並ぶ？」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女は隣を空けたまま、こちらが立つのを待っている。カメラを渡す手だけが、先に伸びた。
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「さっきまで撮る側だと、偉そうに指示できたのにね。急に手の置き場がない」
}

* [「今、君のこと好きだなって思った」]
    # effect: gt_delhi_date_india_gate_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,interrobang
        「今？　今それを言うの？　写真の顔、もう何も作れないよ」
        { ending_reached:
            # speaker: heroine
            「うれしいのと、困るのは、同時に来るんだからね」
        - else:
            # speaker: heroine
            # emotion: serious
            「ちゃんと聞いた。でも、ここで返事を急がせないで」
        }
        # speaker: narrator
        こちらがうなずくと、彼女は大きく一度息を吸い、カメラへ向き直った。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「……写真を撮る前に言うんだ。それ」
        { ending_reached:
            # speaker: heroine
            # emotion: teasing
            「じゃあ今日の分、顔にも出して。わたしばっかり赤くなるのは困る」
        - else:
            # speaker: heroine
            「変な顔になってても、消さないでね。今、たぶん隠せないから」
        }
        # speaker: narrator
        彼女は逃げずに隣へ並んだ。笑い方を決める前に、シャッターが切られる。
    }
    -> after_first

* [「新婚旅行ってことにする？　……冗談」]
    # effect: gt_delhi_date_india_gate_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「冗談の前に、人生がすごい速度で進んだんだけど」
        # speaker: heroine
        # emotion: serious
        「その設定は、わたしに聞かずに人へ言わないでね」
        # speaker: narrator
        冗談は二人の間だけで止める。彼女は肩の力を抜き、いつもの距離に立った。
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,interrobang
        「し、新婚！　荷物より先に設定が増えた！」
        { ending_reached:
            # speaker: heroine
            # emotion: teasing
            「婚約の相談を飛ばした罰で、写真の変な顔はそっちの担当ね」
        - else:
            # speaker: heroine
            # emotion: teasing
            「まずは旅の連れから。飛び級は受け付けてません。……笑わせないで、撮られるから」
        }
        # speaker: narrator
        二人の事情を知らない女性も、つられて笑う。写真には、笑いを止め損ねた顔が残った。
    }
    -> after_first

* [「一緒の写真がほしい。嫌でなければ」]
    # effect: gt_delhi_date_india_gate_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,question
        「嫌かどうかって聞かれると、急に緊張する。普通に『並ぼう』でよかったのに」
        # speaker: narrator
        彼女は少し距離を空け、自分で立つ位置を決めた。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「わたしもほしい。門だけじゃ、一緒に来た人が分からないもんね」
        # speaker: narrator
        彼女はカメラへ顔を向け、目だけで一度こちらを確かめた。
    }
    -> after_first

=== after_first ===
# speaker: narrator
女性に礼を言って別れ、二人は門の説明に目を通した。戦争で亡くなった人々を記憶する場所だと知り、しばらく実物を見上げる。
# speaker: heroine
# emotion: serious
「写真の背景にするだけで、通り過ぎなくてよかった」
# speaker: narrator
少し歩いてから、彼女が撮ってもらった画面を開く。こちらの目は、見事に閉じかけていた。
# speaker: heroine
# reaction: heroine,teasing,music
「門は立派。わたしは落ち着かない顔。そして、そちらは……寝てる？」
# speaker: narrator
もう一枚を見ても、目の開き具合はよく似ている。彼女の肩が震えた。
# speaker: heroine
「待って、消さないで。この顔を見たら、さっきの会話まで思い出せる」

* [「この顔を見せる相手、君だけでいい」]
    # effect: gt_delhi_date_india_gate_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「秘密を預かる話にしなくても、勝手には見せないよ。今は、もう少し笑わせて」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        「その顔で、そんなに格好いいことを言わないで。保存する指が止まる」
        { ending_reached || relationship_tone_after == "romantic_tension":
            # speaker: heroine
            「……分かった。わたし専用。嫌になったらちゃんと言ってね」
        - else:
            # speaker: heroine
            「では、厳重に保管します。たまに笑う許可だけ、ください」
        }
    }
    -> ending

* [「それも残して。自分の顔に責任を持つ」]
    # effect: gt_delhi_date_india_gate_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「急に立派なこと言わないでよ。笑ってたわたしが悪者みたいになる」
        # speaker: narrator
        彼女は画面を伏せる。それでも、まだ口元だけは緩んでいた。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「潔い。じゃあ、わたしの落ち着かない顔も逃がさないでおく」
        # speaker: narrator
        彼女は写真を拡大し、二人の顔を同じ大きさで並べてみせた。
    }
    -> ending

* [「今度は撮るよ。好きな顔をして」]
    # effect: gt_delhi_date_india_gate_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,sweat
        「『好きな顔』が一番難しい！　もう写真用の顔は品切れです」
        # speaker: narrator
        彼女はスマートフォンを鞄へしまい、歩き出す方を指した。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,sparkle
        「じゃあ、かっこつけない顔。準備するから待って――って、準備したら違うね」
        # speaker: narrator
        笑った瞬間を撮る。確認した彼女は、その一枚にも小さくうなずいた。
    }
    -> ending

=== ending ===
# speaker: narrator
写真を閉じて、広場を歩く。二人で門を振り返った時には、もうカメラを構えていなかった。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「さっきの人、写れた自分を見てうれしそうだったね。今、ちょっと分かる」
- else:
    # speaker: heroine
    # emotion: smile
    「今日は、普通の顔で写るのが一番難しかった。門はずっと落ち着いてたのに」
}
# speaker: narrator
彼女はもう一度だけ画面を見たが、消す方の印には触れなかった。
-> END
