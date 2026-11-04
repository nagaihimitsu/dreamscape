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

# background: gt_bg_delhi_bangla_sahib
# speaker: narrator
グルドワーラ・バングラ・サーヒブの入口で、二人は訪問の作法を確かめた。靴を脱ぎ、頭を覆う布を整える。
# speaker: heroine
「できた……と思ったのに。片方が長い」
# speaker: narrator
{heroine_name}が布の端を引くと、反対側が短くなる。引き直し、少し考え、最初の形に戻った。
# speaker: heroine
# emotion: exasperated
「ここだけ、三周してる。分かった顔でうなずいちゃったから、もう一度聞きにくいな」
# speaker: narrator
こちらが案内してくれた人の方を見ると、彼女は布を押さえたまま、小さくうなずいた。
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「変なところ、笑わずに教えてくれる？」
- else:
    # speaker: heroine
    # emotion: teasing
    「失敗した所は、あとで自分で話します。先に助けてください」
}

* [「もう一度、結び方を聞こう」]
    # effect: gt_delhi_date_bangla_sahib_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。今度はわたしが聞くね。どこで分からなくなったか、自分で説明したい」
    - else:
        # speaker: heroine
        # emotion: smile
        「ありがとう。二回目はちゃんと、途中でも止めて聞く」
    }
    -> after_first

* [「自分のも見て。お互い後ろが見えないから」]
    # effect: gt_delhi_date_bangla_sahib_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「見たいけど、今は両手がふさがってる。まず自分のを終わらせてからでもいい？」
    - else:
        # speaker: heroine
        「ほんとだ。じゃあ順番に。そっち、端が少し折れてるよ」
        # speaker: narrator
        彼女は触れる前に、折れた場所を指で示した。
    }
    -> after_first

* [「片方だけ長い流行、今はやめておこう」]
    # effect: gt_delhi_date_bangla_sahib_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「今はちょっと困ってるから、冗談は後にしてほしい」
        # speaker: narrator
        こちらがうなずくのを見て、彼女は助けを求める方へ向き直った。
    - else:
        # speaker: heroine
        # emotion: teasing
        「わたし発の流行、だいぶ短命でした。ちゃんと直します」
        # speaker: narrator
        彼女は笑ってから、入口の人へもう一度声をかけた。
    }
    -> after_first

=== after_first ===
# speaker: narrator
案内の人は手順をゆっくり示してくれた。彼女は途中で確かめ、今度は頭をきちんと覆えたことを確認する。
# speaker: heroine
# emotion: smile
「ありがとうございました。聞いてよかった」
# speaker: narrator
二人は案内に従い、静かに礼拝所を訪ねる。言葉を交わすのは、見学を終えて落ち着ける場所に出てからだった。
# speaker: heroine
「第八代のシク教のグルが滞在した屋敷が、この礼拝所の由来とされているんだって」
# speaker: narrator
彼女は説明を閉じ、先ほど教わった入口の方を見た。うまく覆えた布には、もう触らない。
# speaker: heroine
「分からないって言ったら、嫌な顔をされる気がしてた。自分ができないだけなのにね」
# speaker: narrator
靴を履き直す時、今度はこちらの鞄の紐がねじれていた。彼女が先に気づく。
# speaker: heroine
「後ろ、引っかかってる。直す？　それとも、いったん下ろす方が楽？」

* [「一度下ろすから、少し持っていて」]
    # effect: gt_delhi_date_bangla_sahib_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「今、自分の荷物で手がいっぱい。空けるから、ちょっとだけ待って」
        # speaker: narrator
        彼女は無理に抱え込まず、自分の鞄を安定させてから手を差し出した。
    - else:
        # speaker: heroine
        「はい。今度はこちらの番ですね」
        # speaker: narrator
        彼女は重さを確かめて受け取り、紐を直す間、両手で持っていた。
    }
    -> ending

* [「どこがねじれてるか、教えてくれる？」]
    # effect: gt_delhi_date_bangla_sahib_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「言葉だけだと、わたしも説明が難しいな。一度下ろしたら、指で示せるよ」
    - else:
        # speaker: heroine
        「右の肩の、少し下。そう、そこ。わたしも、こう聞けばよかったんだね」
        # speaker: narrator
        彼女は手を出さず、直ったところで小さくうなずいた。
    }
    -> ending

* [「今度はこっちが、三周する番かな」]
    # effect: gt_delhi_date_bangla_sahib_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「三周しなくていいよ。さっき困ったから、同じ所で困ってほしくないの」
    - else:
        # speaker: heroine
        # emotion: teasing
        「二周目で止めます。経験者が隣にいるので」
        # speaker: narrator
        彼女は一度下ろすように手で示し、こちらが従うと嬉しそうに笑った。
    }
    -> ending

=== ending ===
# speaker: narrator
紐がまっすぐになる。彼女は自分の荷物を持ち直し、入口で教えてくれた人へ会釈した。
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "warm":
    # speaker: heroine
    # emotion: smile
    「次、分からなくなったら聞くね。頼まれる方も、そんなに困るばかりじゃないって分かったから」
- else:
    # speaker: heroine
    # emotion: smile
    「知らないこと、まだいっぱいあるね。分かった顔で通り過ぎるのは、少し減らしたいな」
}
# speaker: narrator
歩き出す前に、彼女は一度こちらの肩を見る。今度は何も引っかかっていない。確かめた顔が、少し得意そうだった。
-> END
