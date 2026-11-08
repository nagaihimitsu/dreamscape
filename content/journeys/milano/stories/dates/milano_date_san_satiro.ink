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

# background: milano_san_satiro_date
# speaker: narrator
サン・サティロ教会。祭壇の奥を見た彼女が「あれ」と言い、すぐ自分の口を押さえた。
# speaker: heroine
# emotion: teasing
「私、先に気づいちゃったかも。答えを言うのと、びっくりする顔を見るの、いま迷ってます。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は目だけで、こちらがどこを見たか確かめた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は反対側から身を寄せて、同じ見え方になる位置を探った。
}

* [「顔なら見せてあげる」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「演技しなくていいよ。ほんとに驚くところが見たいんだから。」
    - else:
        # speaker: heroine
        「まだ何も見てないのにその顔は早い。こっち、一歩だけ来て。」
    }
    -> join_1

* [「気づいた人の声で聞きたい」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「言うと一瞬で終わっちゃう。私に五秒だけ我慢させて。」
    - else:
        # speaker: heroine
        「えへへ。奥行きがあるように見えて、横に寄ると景色が薄くなるの。」
    }
    -> join_1

* [「どこに立てばいい？」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うーん、案内しすぎたら私が答えちゃう。好きに歩いてみて。」
    - else:
        # speaker: heroine
        「ここ。靴一足ぶんだけ横へ。あっ、今の眉、ちゃんと見たよ。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
背後の道に限られた奥行きを、遠近法が補っている。二人は互いのいた場所を入れ替わった。
# speaker: heroine
「奥に見える天井、漆喰で作られた見せかけなんだって。正面からだと気づかなかった。」
「秘密を知る前に戻れたら、今度は何を見る？」

* [「最初に君が口を押さえたところ」]
    # effect: sound_san_satiro_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「今日はちゃんと建物も見て。私、一緒に見たくて誘ったの。」
    - else:
        # speaker: heroine
        「そこ見てたの？　教会より私が分かりやすかったの、ちょっと悔しい。」
    }
    -> join_2

* [「正面から、もう一度だまされる」]
    # effect: sound_san_satiro_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「一度知った後の違和感も楽しいよ。そこは残しておきたい。」
    - else:
        # speaker: heroine
        「ついてく。二度目もだませたら、向こうの圧勝だね。」
    }
    -> join_2

* [「別々に見てから話したい」]
    # effect: sound_san_satiro_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「次は隣にいてほしいな。今の顔、私ももう一回見たい。」
    - else:
        # speaker: heroine
        「それ、やってみよう。私が先に答えそうになったら指一本ね。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
靴一足ぶんの距離を、今度は二人とも動かさなかった。
}
# speaker: narrator
戻った正面には、さっきと同じ奥行きがあった。仕組みを知っても、目は少しだけ言うことをきかない。
-> END
