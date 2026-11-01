// 都市クリア後：ガッレリアで、交差する二つの広場への道を選ぶ。
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
-> start

=== start ===
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアのガラス屋根の下で、{heroine_name}が二つの出口を見比べた。
# speaker: heroine
「こっちがドゥオモ広場、反対がスカラ広場。さっき通ってきたのに、同じ場所に戻った気がしないね」
# speaker: narrator
床のモザイクの上を、人が両方の出口へ行き交っている。
彼女はメモ帳を取り出し、人の動きを矢印で描き始めた。
{
- relationship_tone == "strained":
紙の端を押さえ、混み合う人の流れから一歩離れた。
- else:
彼女は人を避けながら、鉛筆を二本の矢印の間で動かした。
}
# speaker: heroine
「見て。急いで通る人と、屋根ばっかり見てる人がいる」
# speaker: narrator
彼女の視線が天井に向いたまま止まる。鉛筆の先だけが紙からはみ出した。
# speaker: heroine
「……あ、私も後者だった」

* [「屋根を見る人の列に、僕たちも入ろう」]
    # effect: milano_city_date_first_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「列を作ると通れなくなっちゃうよ。端から見よう」
    - else:
        # speaker: heroine
        「じゃあ最後尾はここ。足元にも気をつけて」
        # speaker: narrator
        彼女は人の流れを避け、少し端へ誘った。
    }
    -> crossing
* [「どちらの広場へ向かう人が多いと思う？」]
    # effect: milano_city_date_first_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「数え始めたら、きっと帰れなくなるよ」
    - else:
        # speaker: heroine
        「数えてみようか。あ、途中で引き返した人はどっち？」
        # speaker: narrator
        彼女は最初の一人で数えるのをやめた。
    }
    -> crossing
* [「今は出口を決めずに、ここに一緒にいたい」]
    # effect: milano_city_date_first_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも人の通り道だけは空けようね」
    - else:
        # speaker: heroine
        「私も。屋根の下はもう少し見ていたいな」
        # speaker: narrator
        彼女はメモを閉じずに隣へ寄せた。
    }
    -> crossing

=== crossing ===
# speaker: narrator
紙の上では、二つの広場から伸びた矢印が真ん中で交差していた。
# speaker: heroine
「ここ、街の居間って呼ばれることもあるんだって。家の居間みたいに座るだけじゃなくて、みんな通り抜けていく居間」
「私たちも、そろそろどっちかへ歩く？」
{ ending_reached:
    「恋人になっても、道を決めるのは二人で、だね」
}
{
- relationship_tone_after == "strained":
彼女は紙を自分に向けたまま、主人公の返事を待った。
- else:
彼女は二つの矢印を指で交互に押さえた。
}

* [「矢印を一本ずつ足して、いつまでも往復しよう」]
    # effect: milano_city_date_second_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「それは困る。帰る前に足が動かなくなる」
    - else:
        # speaker: heroine
        「地図が真っ黒になるまで？　それ、出口が見えなくなるよ」
        # speaker: narrator
        彼女は鉛筆を置いて笑った。
    }
    -> ending
* [「どちらをもう一度見たい？」]
    # effect: milano_city_date_second_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「私ばかり決めてない？　あなたの行きたい方も聞かせて」
    - else:
        # speaker: heroine
        「スカラ座の方。さっきは人を避けるので精いっぱいだったから」
        # speaker: narrator
        彼女は紙の上に、小さな丸を描いた。
    }
    -> ending
* [「今度は君の選ぶ道を、一緒に歩きたい」]
    # effect: milano_city_date_second_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「一緒に決めたいよ。私だけに預けないで」
    - else:
        # speaker: heroine
        「私が決めてもいいの？　じゃあ、今はスカラ広場へ」
        # speaker: narrator
        彼女は鉛筆の先で、その方向を示した。
    }
    -> ending

=== ending ===
# speaker: narrator
行き先を話しながら、二人は再び人の流れに戻った。
# speaker: heroine
「上を見すぎて、人にぶつかったら教えてね。私も言うから」
-> END
