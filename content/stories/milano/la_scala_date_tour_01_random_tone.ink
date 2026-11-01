// スカラ座。台詞、間、観客のいない場所の違いを二人で話す。
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
スカラ座の前で、人の流れが開場を待つ列に変わる。
{heroine_name}は入口より少し離れた場所で、手にした案内をたたんだ。
{
- relationship_tone == "reserved":
彼女は案内を胸の前に持ち、入口とこちらを見比べた。
- relationship_tone == "strained":
彼女は案内の端をそろえ、入口のほうを向いた。
- relationship_tone == "comfortable":
彼女は案内を広げ、二人で同じ席を探した。
- relationship_tone == "guarded_attraction":
案内を見せようとした彼女は、近さに気づいて手を止めた。
- relationship_tone == "warm":
彼女は案内を差し出し、気になった席を教えてくれた。
- else:
彼女は案内を二人の間に広げたまま、小さく笑った。
}
# speaker: heroine
「昔の劇場が火事でなくなって、ここに新しい劇場を建てたんだって」
「前の劇場で桟敷席を持っていた人たちが、建設費を出したそうです」
「……自分たちの席を、もう一度つくったんですね」
# speaker: narrator
開いた扉の向こうから、笑い声が漏れる。
# speaker: heroine
「舞台では、知らない人がたくさん見ていても、言葉を届けるんですよね」
「私なら、最初の一言を忘れそう」

* [「そのときは、客席から次の台詞を叫ぼうか」]
    # effect: milano_la_scala_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「舞台から探しちゃって、余計に忘れそうです」
        # speaker: narrator
        彼女は客席のほうを思い浮かべるように、入口を見た。
    - else:
        # speaker: heroine
        # emotion: smile
        「助かるけど、あなたの席が一番目立っちゃう」
        「私の台詞より先に、係の人が来そうです」
    }
    -> after_first
* [「何を言う役なら、やってみたい？」]
    # effect: milano_la_scala_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「今すぐ選ぶには、役が多すぎます」
        # speaker: narrator
        彼女は案内を閉じ、表紙の角をそろえた。
    - else:
        # speaker: heroine
        「帰らないで、って言う役。……言われたほうも、困るかな」
        # speaker: narrator
        彼女は閉じた案内の角を指でそろえた。
    }
    -> after_first
* [「大勢の前より、二人のときの声を聞きたいな」]
    # effect: milano_la_scala_first_honest
    { romance_result == "negative":
        # speaker: heroine
        {
        - relationship_tone_after == "strained":
            # emotion: serious
            「……今は、そういう言い方をされると困ります」
        - relationship_tone_after == "guarded_attraction":
            # emotion: worried
            「……今、それを言うんですか。少し待ってください」
            # speaker: narrator
            彼女は案内をたたみ、入口へ目を戻した。
        - else:
            # emotion: neutral
            「二人のときも、急に言われると返事に迷います」
            # speaker: narrator
            彼女は少し距離を置き、入口へ視線を戻した。
        }
    - else:
        # speaker: heroine
        {
        - relationship_tone_after == "romantic_tension":
            # emotion: teasing
            「……私ばかり声を小さくするの、不公平じゃないですか」
            # speaker: narrator
            彼女は案内で口元を隠し、少しだけ近くで言った。
        - relationship_tone_after == "guarded_attraction":
            # emotion: shy
            「……今、それを言うんですね」
            # speaker: narrator
            彼女は一度視線を逸らしてから、小さく息をついた。
        - relationship_tone_after == "comfortable":
            # emotion: smile
            「それなら、客席のいちばん後ろまでは届かなくていいですね」
        - else:
            # emotion: neutral
            「……二人なら、そんなに大きな声はいりませんね」
            # speaker: narrator
            彼女は案内を閉じ、声の大きさを確かめるように言った。
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は案内を持ち直し、こちらとの間を少し空けた。
- relationship_tone_after == "reserved":
彼女は扉を見ながら、案内の折り目をなぞった。
- else:
彼女は案内の端をこちらへ向けてから、扉を見た。
}
# speaker: narrator
人の列が少し進み、扉の前に短い隙間ができた。
# speaker: heroine
「拍手って、不思議です。言葉がなくても、終わったことが伝わる」
「……でも、終わってほしくないときは、どうするんだろう」

* [「拍手を一回だけ、ものすごく長くする」]
    # effect: milano_la_scala_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「それだと、終わったのか分からなくなりそう」
        # speaker: narrator
        彼女は一度だけ手を合わせて、すぐに離した。
    - else:
        # speaker: heroine
        # emotion: teasing
        「手を合わせたまま？　それ、祈っている人に見えます」
        「カーテンも、閉めていいか迷いそう」
    }
    -> ending
* [「まだ聞いていたいって、伝える」]
    # effect: milano_la_scala_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「言うだけでも、舞台に上がるくらい緊張しそう」
        # speaker: narrator
        彼女は指先で案内の折り目をなぞった。
    - else:
        # speaker: heroine
        # emotion: smile
        「そっか。拍手のあとに、言ってもいいんですね」
        # speaker: narrator
        彼女は入口を見てから、隣のほうへ向き直った。
    }
    -> ending
* [「今日は、もう少し一緒にいたい」]
    # effect: milano_la_scala_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……急に言われると、返事を選んでしまいます」
        # speaker: narrator
        彼女は入口のほうを向いたまま、足だけ止めた。
    - else:
        # speaker: heroine
        # emotion: shy
        「……それは、拍手より分かりやすいです」
        「私も、急いではいません」
    }
    -> ending

=== ending ===
# speaker: narrator
列は扉の中へ吸い込まれ、広場の音がまた聞こえた。
二人は入口に背を向けるまで、少しだけ時間をかけた。
-> END
