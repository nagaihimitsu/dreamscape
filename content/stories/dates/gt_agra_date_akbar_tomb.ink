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

# background: gt_bg_agra_akbar_tomb
# speaker: narrator
アクバル廟の門を見上げ、{heroine_name}はスマートフォンに短いメモを打った。打ち終わると、なぜか一人で笑う。
# speaker: heroine
# emotion: smile
「『門、すごい』。これだけ。あとで見ても、何のことか分からないね」
# speaker: narrator
画面には、まだ題名のない旅のメモが並んでいる。『模様』『思ったより遠い』といった、本人にしか分からない断片もあった。
# speaker: heroine
「ちゃんと書こうと思うと、止まっちゃう。何から書いたらいいと思う？」
{ relationship_tone == "warm" || relationship_tone == "comfortable":
# speaker: heroine
# emotion: teasing
「笑うのはいいけど、『すごい』だけ借りるのはなしね。もう使ったから」
}

* [「今、いちばん見ていたところから」]
    # effect: gt_agra_date_akbar_tomb_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「それが、あっちもこっちも見てたんだよね。少しだけ整理させて」
    - else:
        # speaker: heroine
        「門の細かい模様かな。遠くからも目に入るのに、近くでも見たくなる」
    }
    -> after_first
* [「『門、かなりすごい』にしよう」]
    # effect: gt_agra_date_akbar_tomb_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「一文字ずつ増やす相談じゃないんだけどな。今日は、少しは覚えて帰りたい」
    - else:
        # speaker: heroine
        # emotion: teasing
        「情報、ほとんど増えてないよ。帰るころには『とてもかなりすごい』になるね」
    }
    -> after_first
* [「その短いメモも、好きだよ」]
    # effect: gt_agra_date_akbar_tomb_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、わたしはもう少し書きたいんだ。あとで忘れると悔しいから」
    - else:
        # speaker: heroine
        # emotion: shy
        「そんなところまで見るんだ。じゃあ消さずに、その下へ足そうかな」
    }
    -> after_first

=== after_first ===
# speaker: narrator
案内には、アクバル自身が着工し、息子ジャハーンギールが完成させた墓廟だとある。彼女は読んでから、建物をもう一度見た。
# speaker: heroine
「一人が始めて、別の人が仕上げることもあるんだね。わたしのメモは、わたしがやらないとだけど」
# speaker: narrator
彼女は『門、すごい』の下に、色と形を短く書き足した。そこで手を止め、こちらへ画面を向ける。
# speaker: heroine
# emotion: smile
「一行だけ、{player_address}が見たものも入れていい？　同じところ見てたのか、知りたい」

* [「二人分だと、後で読むのが楽しそう」]
    # effect: gt_agra_date_akbar_tomb_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも今は一行決めたい。先に楽しみにされると、完成させなきゃってなる」
    - else:
        # speaker: heroine
        「うん。どっちが書いたか、名前も小さく入れておこう。忘れてしまわないように」
    }
    -> ending
* [「メモを直している顔が、楽しそうだった」]
    # effect: gt_agra_date_akbar_tomb_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「わたしの顔じゃなくて、今日は建物のことを聞きたかったな。こっちも見て」
    - else:
        # speaker: heroine
        # emotion: shy
        「それをここに書くの？　……わたしがあとで読むんだけど。ちょっと困るな」
    }
    -> ending
* [「自分も、まず『門、すごい』だった」]
    # effect: gt_agra_date_akbar_tomb_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「ほんとに？　わたしに合わせなくていいよ。違う感想も聞きたいから」
    - else:
        # speaker: heroine
        # emotion: happy
        「同じだ。じゃあ、最初の一行は二人分。次からは別々に書こう」
    }
    -> ending

=== ending ===
# speaker: narrator
画面に増えた数行を、彼女はすぐには読み直さなかった。スマートフォンをしまい、まだ見ていない方へ顔を向ける。
# speaker: heroine
# emotion: smile
「続きは、出るときに書こう。書くためだけに歩いてたら、もったいないから」
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "warm":
# speaker: heroine
# emotion: teasing
「あとで、一行お願いするかもしれないよ。ちゃんと見ててね」
}
# speaker: narrator
二人は門の前を離れた。彼女のメモには、最初に打った短い感想も、そのまま残っていた。
-> END
