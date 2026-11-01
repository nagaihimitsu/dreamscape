// ドゥオモ広場：石の彫像と、飛び立つ本物の鳥。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
-> start

=== start ===
# background: milano_walk_landmark
# speaker: narrator
ドゥオモ広場で、{heroine_name}が大聖堂の尖塔を見上げた。
# speaker: heroine
「いちばん上の金色の像、マドンニーナっていうんだって」
「昔はあの像より高い建物を建てない習慣があって、後から高層ビルができたときは、屋上に像の写しを置いたそうなの」
# speaker: narrator
彼女は手で日差しを遮り、金色の像から、周りに並ぶ石の彫像へ視線を移した。
# speaker: heroine
「ねえ、あそこ。羽を休めてるみたいな像がある」
{
- relationship_tone == "strained":
彼女は近づきすぎないよう、少し離れた場所から指さした。
- else:
彼女は主人公と同じ方向を向けるまで、指先をゆっくり動かした。
}
# speaker: narrator
小さな影が首を回し、そのまま飛び立った。
# speaker: heroine
「……鳩だった。あんなところに本物が混ざってるなんて」

* [「今の像は、ずいぶん自由に移動するね」]
    # effect: milano_walk_first_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「もう一回言われると、ちょっと悔しい」
        # speaker: narrator
        彼女は鳩の飛んだ方向を追った。
    - else:
        # speaker: heroine
        「閉館前に戻ってくるかな。……戻らないか」
        # speaker: narrator
        彼女は悔しそうな顔を保てず笑った。
    }
    -> sketch
* [「次は動かない方を一緒に探そう」]
    # effect: milano_walk_first_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「待って。今度は自分で見つけてから教えたい」
    - else:
        # speaker: heroine
        「いいよ。ただし鳩を数えたら負けね」
        # speaker: narrator
        彼女は広場の人波から外れ、大聖堂を見上げた。
    }
    -> sketch
* [「鳩に先に気づくところ、なんだか君らしい」]
    # effect: milano_walk_first_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「像と間違えた話を、私らしさにしなくても」
        # speaker: narrator
        彼女は首をかしげた。
    - else:
        # speaker: heroine
        「観察上手って意味なら、そういうことにしておこうかな」
        # speaker: narrator
        彼女はもう一度、鳩の止まっていた場所を見た。
    }
    -> sketch

=== sketch ===
# speaker: narrator
彼女はメモ帳に大聖堂の輪郭を描き、飛んでいった鳩の場所に小さな丸をつけた。
# speaker: heroine
「彫像はここに残るけど、鳩はもういない」
「記念にしたいのに、描いたら本物の彫像みたい。困ったな」
{
- relationship_tone_after == "strained":
彼女は紙を差し出さず、主人公の返事を待った。
- else:
彼女は紙を少し傾け、空いた場所を示した。
}

* [「鳩の横に『ただいま外出中』って書こう」]
    # effect: milano_walk_second_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「案内板を立てたら、かえって像だと思われるかも」
    - else:
        # speaker: heroine
        「じゃあ帰宅予定は未定。すごく自由な像だね」
        # speaker: narrator
        彼女は小さな丸の脇に「外出中」と書いた。
    }
    -> ending
* [「飛び立った方へ矢印をつけるのは？」]
    # effect: milano_walk_second_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「矢印だと、鳥がどこかの案内役みたいになりそう」
        # speaker: narrator
        彼女は鉛筆を止めて、紙を見直した。
    - else:
        # speaker: heroine
        「それなら、止まってた場所も分かるね」
        # speaker: narrator
        彼女は丸から空へ一本線を伸ばした。
    }
    -> ending
* [「その紙、隣に自分も描き足していい？」]
    # effect: milano_walk_second_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「まず何を描くか聞いてもいい？　鳩を増やすつもりじゃないよね」
    - else:
        # speaker: heroine
        「いいよ。じゃあ、あなたの見たものも残して」
        # speaker: narrator
        彼女はページの端を空けた。
    }
    -> ending

=== ending ===
# speaker: heroine
「大聖堂の像はたくさんあるんだって。今度はちゃんと、石の方を見つけたいな」
# speaker: narrator
彼女はもう一度だけ尖塔を見上げ、メモ帳を閉じた。
-> END
