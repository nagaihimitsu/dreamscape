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

# background: milano_starbucks_roastery_date
# speaker: narrator
# reaction: heroine,worried,sweat
ロースタリーの焙煎を見ていたら、彼女の小さいカップだけ先に届いた。鼻を近づけて、ちょっと困った顔をする。
# speaker: heroine
「湯気はすごく好き。飲むほうは……まだ舌が信用できません。」
# speaker: player
「熱いの苦手だった？」
# speaker: heroine
「猫舌なのに、いちばんいい匂いのときに飲みたいんです。かなり不利な趣味。」
「あの透明な管、焙煎する前の豆が通ってるんだって。追いかけているうちに冷めるかな。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はカップの取っ手を自分の方へ向けた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は二人のカップを並べてから、そっと取っ手をこちらに向けた。
}

* [「その一口目、実況しようか」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「実況されたら、勢いで飲んでしまいそう。ちょっと待って。」
    - else:
        # speaker: heroine
        # emotion: teasing
        「まだ試合前です。選手の舌から冷静な判断を引き出しています。」
    }
    -> join_1

* [「冷めるまで焙煎を見よう」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「今席を離れると、ちょうどいい瞬間も逃しそう。ここで待ちたい。」
    - else:
        # speaker: heroine
        「いいね。あそこで豆が返るたび、香りの向きが変わる気がする。」
    }
    -> join_1

* [「同じのを頼めばよかった」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「好きかどうか、私もまだ分かんない。もう少し待ってから決めて。」
    - else:
        # speaker: heroine
        「ひと口ずつ、あとで交換しようよ。比べたい。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
やっと飲めた彼女は目を丸くした。隣に置いた水を飲み、もう一度味を確かめる。
# speaker: heroine
「思ってたより酸っぱい。でも、嫌いっていうのとも違う。こういうとき、何て言う？」

* [「もうひと口ほしい味」]
    # effect: sound_cafe_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「うーん。もうひと口は私が決める。まだお水の番。」
    - else:
        # speaker: heroine
        「それ。美味しいかは保留なのに、カップはもう持ち上がってる。」
    }
    -> join_2

* [「感想をあとで交換しよう」]
    # effect: sound_cafe_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「あとでだと忘れちゃう。私は今、変な顔のうちに言いたい。」
    - else:
        # speaker: heroine
        「いい。先に言われると、その味を探しちゃうから。」
    }
    -> join_2

* [「その顔がもう感想だよ」]
    # effect: sound_cafe_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「顔を見られると味に集中できないよ。カップの方を見てて。」
    - else:
        # speaker: heroine
        「そんなに出てた？　じゃあそっちが飲むときは絶対見る。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
カップとカップが軽く当たった。彼女は離す前に、一度だけこちらを見た。
}
# speaker: narrator
帰り際、彼女はカップの底をもう一度のぞいた。残っていた一滴だけ、自分の舌で確かめた。
-> END
