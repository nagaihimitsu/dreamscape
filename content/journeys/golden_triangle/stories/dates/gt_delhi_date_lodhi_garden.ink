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
ロディ・ガーデンで空いたベンチを見つけた途端、{heroine_name}の歩幅が急に大きくなった。座るためなら、まだ元気が出るらしい。
# speaker: heroine
# reaction: heroine,happy,exclamation
「ここ。今日は、まずこの景色にします」
# speaker: narrator
木々の向こうに廟が見える。彼女は膝に鞄を置き、かしこまった声を作った。
# speaker: heroine
# reaction: heroine,teasing,music
「旅の現場からお伝えします。名所に到着した二人は、早くも一歩も動きません」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「……今の、ちょっと恥ずかしかった。録画は禁止ね」
- else:
    # speaker: heroine
    「では、隣の方。現場の状況をどうぞ」
}

* [「座る競技なら、今の二人は優勝候補」]
    # effect: gt_delhi_date_lodhi_garden_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「わたしは休みに来たの。ここでも勝敗があるの、忙しいなあ」
        # speaker: narrator
        実況はそこで止める。彼女は靴先を前へ伸ばし、やっと息をついた。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「おっと、隣の選手が荷物を置いた！　これは長く座る構えです！」
        # speaker: narrator
        自分で言って、彼女が先に吹き出す。息を整えようとして、また笑った。
    }
    -> after_first

* [「実況より、普通に君と話したい」]
    # effect: gt_delhi_date_lodhi_garden_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,gloom
        「これも、普通にわたしが話してたんだけどな」
        # speaker: narrator
        彼女は庭へ目を戻した。冗談のつもりだった声が、少しだけ遠くなる。
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        「そう言われると、普通が急に難しい」
        { ending_reached:
            # speaker: heroine
            # emotion: teasing
            「今の、二人きりになりたい時の声。ベンチの上でも使うんだね」
        - else:
            # speaker: heroine
            「じゃあ、最初の話題。わたし、さっき座りたくて早足になりました」
        }
    }
    -> after_first

* [「聞く役に回る。水を飲む間は待つよ」]
    # effect: gt_delhi_date_lodhi_garden_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,question
        「あれ、わたし一人でずっと放送するの？　そんなに話題を持ってないよ」
        # speaker: narrator
        彼女は水を一口飲み、こちらにも口を挟んでほしそうに目を向けた。
    - else:
        # speaker: heroine
        # reaction: heroine,smile,music
        「配慮の行き届いた番組です。では、ここで給水のため中断します」
        # speaker: narrator
        真顔で水を飲み終えると、彼女は自分の芝居に耐えきれず笑った。
    }
    -> after_first

=== after_first ===
# speaker: narrator
庭の向こうには、サイイド朝やロディ朝の廟、モスクが残っている。二人は案内を読み、木に隠れていた輪郭を目で探した。
# speaker: heroine
# emotion: smile
「あの建物はずっとここにあるのに、走っていく人には一瞬で通り過ぎる景色なんだね」
# speaker: narrator
道を行く人を眺めていた彼女が、不意にこちらへ向く。
# speaker: heroine
# reaction: heroine,teasing,question
「ところで。座る前、平気そうな顔してたけど、足、疲れてた？」
# speaker: narrator
こちらの片足が、返事の代わりに伸びた。彼女はそれを見逃さない。
# speaker: heroine
「やっぱり。二人とも『まだ歩けます』の顔、得意じゃないね」

* [「格好いいところを見せたくて、頑張ってた」]
    # effect: gt_delhi_date_lodhi_garden_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「頑張る方向、そっちじゃなくていいよ。気づけなかったら、わたしがずっと歩かせてたんだよ？」
        # speaker: narrator
        彼女は少し強く言ってから、水を置く場所をこちらへ空けた。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「……わたしに？」
        # speaker: narrator
        返事を待つまでもないのに、彼女は待った。それから、声を普段に戻す。
        # speaker: heroine
        # emotion: teasing
        「休むって言えたので、今の方が少しかっこいい。足は伸ばしてよし」
    }
    -> ending

* [「休憩終了は、二人とも立ちたくなってから」]
    # effect: gt_delhi_date_lodhi_garden_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,question
        「それ、二人とも遠慮したら永遠に座ってるよ。わたしはもう少し。そっちは？」
        # speaker: narrator
        こちらも残ることを示すと、彼女はようやく時計から目を離した。
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「賛成。立ちたい人が先に申告。元気のふりは禁止」
        # speaker: narrator
        彼女は自分の靴先を見てから、軽くこちらの靴先を指した。両方とも動かない。
    }
    -> ending

* [「次の見どころも、君が笑うところで」]
    # effect: gt_delhi_date_lodhi_garden_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「笑わせてくれる気はなくて、わたしが自力で笑う番組なの？」
        # speaker: narrator
        彼女は口を尖らせる。その顔をこちらが見ていると、今度こそ話題を庭へ戻した。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「では、見どころを作るため、格好つけた歩き方をもう一度お願いします」
        # speaker: narrator
        こちらが背筋を伸ばすだけで、彼女は手を上げて止めた。笑いすぎて、立つ準備ができない。
    }
    -> ending

=== ending ===
# speaker: narrator
やがて二人とも足を動かしたくなり、見に行く廟を決めた。彼女は立つ前に、こちらの顔を確かめる。
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: heroine
    # emotion: serious
    「本当に、もう大丈夫？　見栄の分は抜いて教えてね」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「速報です。二人が立ちました。なお、次の休憩場所も探すもようです」
}
# speaker: narrator
録音も観客もいない放送を終え、二人はベンチを離れた。
-> END
