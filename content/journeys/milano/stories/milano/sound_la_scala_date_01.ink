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

# background: milano_la_scala_date
# speaker: narrator
スカラ座前の広場で彼女が一礼した。拍手をすると手で制される。
# speaker: heroine
# emotion: teasing
「まだ始まってません。お客さん、気が早すぎます。」
# speaker: player
「何が始まるの？」
# speaker: heroine
「学芸会。台詞ひとつだったのに、前の子と一緒に言っちゃった。その一言の、やり直し。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は声がどこまで届くか、靴先で距離を測った。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の前だけに、小さくお辞儀し直した。
}

* [「客席で黙って待つ」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「本当に黙られると、学芸会より緊張する。何か言って。」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいお客さんですね。あ、こうやっておしゃべりしてるの、私のほうだ。」
    }
    -> join_1

* [「前の子の役、やろうか」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「その役までいるとあの日そっくりで。今日は一人でやってみる。」
    - else:
        # speaker: heroine
        「うん！　あなたの台詞は「誰かいるのか」。最後までちゃんと言ってね。」
    }
    -> join_1

* [「途中で笑っても最後まで見る」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「笑われる前提はやっぱり怖い。ちょっと背中向けて。」
    - else:
        # speaker: heroine
        「そっちの方が安心する。笑わせたら二度目もやるかも。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
彼女は劇場の入口を背に、深く息を吸った。「ここにいるよ」。向こうの信号が変わるまで、誰も続きをかぶせなかった。
# speaker: heroine
「昔のスカラ座では客が桟敷を好きに飾ったんだって。いまの客席、どこがいい？」

* [「もう半歩、前の席」]
    # effect: sound_la_scala_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「そこだと顔まで全部見える。今はこのくらいで。」
    - else:
        # speaker: heroine
        「……近いね。でも今の一言なら、そこに届いたって分かる。」
    }
    -> join_2

* [「あなたが見える最後列」]
    # effect: sound_la_scala_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「そんなに下がらなくていいよ。今度は普通の声で話したい。」
    - else:
        # speaker: heroine
        「いいな。いちばん遠くにいた人も待っててくれたって、役者はうれしい。」
    }
    -> join_2

* [「僕が舞台、そっちが客席」]
    # effect: sound_la_scala_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「もう一本だけ、私が役者でいたい。いい？」
    - else:
        # speaker: heroine
        「役者交代！　私は拍手しないよ、ちゃんと最後までは。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
礼が終わっても、彼女は少しの間こちらを見ていた。
}
# speaker: narrator
広場の雑踏の中で、二人分だけの公演が終わった。カーテンの代わりに信号がもう一度変わった。
-> END
