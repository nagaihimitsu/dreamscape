// ブレラ絵画館。絵の異なる細部から二人の見方を交わす。
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
ブレラ絵画館の『接吻』の前で、{heroine_name}は絵の下のほうを見ていた。
{
- relationship_tone == "reserved":
彼女は絵の足元を見ながら、こちらのほうへ少し体を向けた。
- relationship_tone == "strained":
彼女は一歩引き、絵と自分たちの間を空けた。
- relationship_tone == "comfortable":
彼女は同じ絵を見上げながら、気になった場所を指で示した。
- relationship_tone == "guarded_attraction":
視線が合うと、彼女は絵の足元へすぐに目を戻した。
- relationship_tone == "warm":
彼女は絵を見たまま、こちらの感想を待っている。
- else:
彼女は絵からこちらに目を向け、言いかけてから少し笑った。
}
# speaker: heroine
「片方の足、もう階段にかかってる」
「この人、行くところがあるんでしょうか」
# speaker: narrator
案内には、別れの場面にも見えると書いてある。絵の左奥には、人影のような暗がりもあった。
# speaker: heroine
「私はそっちが気になったけど……{player_address}は、どこを見てました？」

* [「階段。片方だけ急いでるみたいだ」]
    # effect: milano_brera_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「急いでる、と決めるにはまだ早いかもしれません」
        # speaker: narrator
        彼女は絵の足元を、もう一度見た。
    - else:
        # speaker: heroine
        # emotion: smile
        「待たせた側かもしれませんよ。絵の中でも、乗り遅れそう」
    }
    -> after_first
* [「君が見ていた足元。何が気になった？」]
    # effect: milano_brera_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うまく言えなくて……もう少し見てもいいですか」
        # speaker: narrator
        彼女は階段から目を離さなかった。
    - else:
        # speaker: heroine
        「行く人の足なのか、戻ってきた足なのか、決めきれなくて」
        # speaker: narrator
        彼女は少し離れて、もう一度階段を見た。
    }
    -> after_first
* [「二人の間。離れたくなさそうに見えた」]
    # effect: milano_brera_first_honest
    { romance_result == "negative":
        # speaker: heroine
        {
        - relationship_tone_after == "strained":
            # emotion: serious
            「……今は、絵の話だけにしてもらえますか」
        - relationship_tone_after == "guarded_attraction":
            # emotion: shy
            「……そこを見るんですね。絵の話、ですよね？」
            # speaker: narrator
            彼女は視線を外し、絵との距離を取り直した。
        - else:
            # emotion: worried
            「……そう見えるんですね。私は、もう少し離れて見たいです」
            # speaker: narrator
            彼女は一歩下がり、絵全体を見直した。
        }
    - else:
        # speaker: heroine
        {
        - relationship_tone_after == "romantic_tension":
            # emotion: shy
            「……そこ、私も気になってました」
            # speaker: narrator
            視線が合う。先に絵へ戻したのは彼女のほうだった。
        - relationship_tone_after == "comfortable":
            # emotion: smile
            「私は足元ばかり見てました。見てるところ、違いますね」
        - relationship_tone_after == "guarded_attraction":
            # emotion: surprised
            「……そこを見るんですね」
            # speaker: narrator
            彼女は足元へ目を戻し、少し間を置いた。
        - else:
            # emotion: neutral
            「……そう見えますか」
            # speaker: narrator
            彼女は絵へ視線を戻した。
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は絵との距離を確かめるように、一歩下がった。
- relationship_tone_after == "reserved":
彼女は絵の影を追いながら、ゆっくり歩いた。
- else:
彼女は影の見える場所へ歩き、こちらにも手で知らせた。
}
# speaker: narrator
人が移動し、絵の暗がりまで見える位置が空いた。
# speaker: heroine
「あの影、誰なんだろう。見張ってるのか、ただ通るところなのか」
「答えがないと、勝手に続きを考えてしまいます」

* [「影の人も、階段を譲るべきか迷ってる」]
    # effect: milano_brera_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「譲る相手が見えてたら、ですけどね」
        # speaker: narrator
        彼女は影の端を目でたどった。
    - else:
        # speaker: heroine
        # emotion: smile
        「ずっと待ってるなら、足がしびれてるかもしれません」
    }
    -> ending
* [「君なら、どんな続きにする？」]
    # effect: milano_brera_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「続きを決めたら、この人たちが困るかも」
        # speaker: narrator
        彼女は影を見たまま、言いかけた言葉を飲み込んだ。
    - else:
        # speaker: heroine
        「二人が離れたあと、影の人が落とし物を拾う話」
        # emotion: smile
        「暗いだけじゃ、かわいそうだから」
    }
    -> ending
* [「続きは分からなくても、今ここで一緒に見られてよかった」]
    # effect: milano_brera_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……今は、もう少し絵だけを見ていたいです」
        # speaker: narrator
        彼女は影のほうへ視線を戻した。
    - else:
        # speaker: heroine
        # emotion: shy
        「……じゃあ、この影のことも覚えていてください」
        「あとで話したら、二人とも別の話にしてそう」
    }
    -> ending

=== ending ===
# speaker: narrator
絵の前を離れても、二人の視線は一度ずつ戻った。
何を見たかは、たぶん少し違っていた。
-> END
