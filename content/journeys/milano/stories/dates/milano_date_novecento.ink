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

# background: milano_novecento_date
# speaker: narrator
ノヴェチェント美術館。フォンタナのネオンの線を目で追っていた彼女が、指で小さな曲線を描いた。
# speaker: heroine
「空中に文字を書くと、その人の字に見えると思う？」
「あの線、ネオンの管を手で曲げて作ったんだって。作った人の癖、残ってるかな。」
# speaker: player
「当ててみる。今のは何？」
# speaker: heroine
# emotion: surprised
「まだ一画。そこで当てたら、ちょっと怖いです。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
人差し指は胸の前で、自分にしか読めない速さで動いた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の視線と重なる高さで、もう一度指を動かした。
}

* [「最後まで見てから読む」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「最後まで書くと簡単すぎるよ。途中で一度だけ予想して。」
    - else:
        # speaker: heroine
        「うん。あの線も手で曲げた管なんだって。誰かの手の癖、あるのかな。」
    }
    -> join_1

* [「もう一画だけください」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「ヒントを出すと答えまで言いそう。少し黙ってるね。」
    - else:
        # speaker: heroine
        「ヒントは一画三秒。……時間を守って書く字って、ものすごく下手になる。」
    }
    -> join_1

* [「字より、書く人に似てる」]
    # effect: common_date_first_bold
    { romance_result == "negative":
        # speaker: heroine
        「どう似てるか言ってくれないと、褒められたのか困るな。」
    - else:
        # speaker: heroine
        「何それ。……でも、途中で止めて考えるところは、たしかに私だ。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
線は光らず、次の一画を描くと前の一画が消える。彼女は最後のところで、人差し指を握った。
# speaker: heroine
「ほんとは自分の名前。最後まで書くと、ここに落書きした気がして。」

* [「僕の手のひらなら空いてる」]
    # effect: sound_novecento_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「それは近すぎるかな。もう少し広いところに書きたい。」
    - else:
        # speaker: heroine
        # emotion: shy
        「……じゃあ、空中で。手のひらのすぐ上に書くね。」
    }
    -> join_2

* [「最後の一画だけ覚えるよ」]
    # effect: sound_novecento_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「それだけだと他の人の名前にもなるよ。今日は声で名乗ろうかな。」
    - else:
        # speaker: heroine
        「読めない一画を覚えてくれるの？　ふふ、持ち帰り方として好き。」
    }
    -> join_2

* [「消えるのも作品のうち」]
    # effect: sound_novecento_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「すぐ「作品」って呼ばれると恥ずかしいよ。ただ遊んでいたい。」
    - else:
        # speaker: heroine
        「作者もう一人見つけた。じゃあ撤収は一瞬。手を下ろして、おしまい。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
名前の最後の曲線を、彼女は二人の間に残した。
}
# speaker: narrator
手を下ろすとネオンだけが光っていた。二人は声に出さず、最後の一画をそれぞれ足した。
-> END
