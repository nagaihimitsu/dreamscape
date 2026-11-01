// ブレラ絵画館《接吻》。一枚の絵に別々の物語を見る。
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

# background: milano_brera_date
# speaker: narrator
ブレラ絵画館の一室。ハイエツの《接吻》を前に、{heroine_name}は絵の下の方をのぞき込んだ。
# speaker: heroine
# emotion: surprised
「あ、片足が階段にかかってる。今から行くのかな。それとも帰ってきたところ？」
# speaker: narrator
案内は、若い二人の抱擁を別れの場面としても紹介している。背後には、暗い人影のような形も見えた。
# speaker: heroine
「先に靴を見ちゃった。題名を知ったら、そこじゃないって言われそう」
{
- relationship_tone == "strained":
彼女は絵との距離を取ってから、こちらに尋ねた。
- relationship_tone == "guarded_attraction":
目が合うと彼女は一度絵へ戻り、それから小さく笑った。
- relationship_tone == "comfortable":
彼女は階段を指で示し、自分の足も半歩上げた。
- relationship_tone == "warm":
彼女は絵の足元を指さし、こちらの返事を待った。
- relationship_tone == "romantic_tension":
彼女は一瞬こちらを見てから、わざとらしく靴へ目を戻した。
- else:
彼女は自分の靴を見下ろし、絵を見直した。
}
# speaker: heroine
「{player_address}は、最初にどこを見た？」

* [「足。階段に乗ったまま、よく転ばないなって」]
    # effect: milano_brera_v2_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「絵の人に、足元注意って言いたくなるんだ」
        「でも私も、降りるとき気をつけよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「わかる。慌ててたら、わたしは絶対つまずく」
        「絵になる前に、そっちが事件だね」
    }
    -> after_first
* [「後ろの影。誰かに見られてるみたいで」]
    # effect: milano_brera_v2_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「え、そこにも人がいる？　気づかなかった」
        「見張ってる人だったら、急に落ち着かないね」
    - else:
        # speaker: heroine
        # emotion: surprised
        「本当だ。足ばっかり見て、後ろを見逃してた」
        「待ってる人かな。二人を捜しに来たのかも」
    }
    -> after_first
* [「二人の間。離れたくなさそうに見えた」]
    # effect: milano_brera_v2_first_honest
    { romance_result == "negative":
        # speaker: heroine
        {
        - relationship_tone_after == "strained":
            # emotion: serious
            「絵の話だよね。今は、そのまま絵を見ていたいな」
        - relationship_tone_after == "guarded_attraction":
            # emotion: shy
            「そこを見るんだ。……絵の話、だよね？」
        - else:
            # emotion: worried
            「そう見えるんだ。わたしはまだ、別れだと決められなくて」
        }
    - else:
        # speaker: heroine
        {
        - relationship_tone_after == "romantic_tension":
            # emotion: shy
            「……そこ、わたしも気になってた」
            # speaker: narrator
            視線が合い、彼女は照れ隠しのように階段を指さした。
        - relationship_tone_after == "comfortable":
            # emotion: smile
            「わたしは靴。見てたところ、全然違うね」
        - else:
            # emotion: neutral
            「離れたくない、か。もう一度見てみよう」
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
人が移動し、二人は少し離れたところから絵を見直した。
# speaker: heroine
「案内には、この絵を当時のイタリアの統一運動と結びつける見方もあるって」
「わたし、恋人同士のことだけ考えてた。背景があると、足の行き先も違って見えるね」
# speaker: narrator
彼女は暗がりに目を戻し、答えを決めないまま首を傾げた。
# speaker: heroine
「この影の人、どうしてそこにいるんだろう」

* [「階段を使いたいけど、通れなくて待ってる」]
    # effect: milano_brera_v2_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「そんな順番待ちだったら、二人は早く気づいてあげてほしい」
    - else:
        # speaker: heroine
        # emotion: happy
        「ずっと遠慮してるの？　それはそれで続きが見たい！」
        「わたしなら一回、咳払いするかな」
    }
    -> ending
* [「分からないままにしておきたい。君は？」]
    # effect: milano_brera_v2_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「わたしは少し考えたい。決めなくても、想像するのは楽しいから」
    - else:
        # speaker: heroine
        # emotion: smile
        「わたしも決めたくない。でも、見張り役だと思うと急に怖くなるね」
        「次に見たら、また違う話にしよう」
    }
    -> ending
* [「君の見た続きも聞きたい。また一緒に見よう」]
    # effect: milano_brera_v2_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「また来る話は、今日の絵を見終わってからにしよう」
        「今は、あの影をもう少し見ていたいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。今度は先に影を見る。靴だけで終わらないように」
    }
    -> ending

=== ending ===
# speaker: narrator
出口へ向かいかけて、{heroine_name}が振り返った。
# speaker: heroine
「やっぱり、あの足。どうしても気になる」
「ごめん、あと一分だけいい？」
# speaker: narrator
彼女は返事を待つ間も、もう絵のほうを見ていた。
-> END
