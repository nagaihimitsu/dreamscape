// ブレラ絵画館。絵の異なる細部から二人の見方を交わす。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_brera_date
# speaker: narrator
ブレラ絵画館の『接吻』の前で、{heroine_name}は絵の下のほうを見ていた。
# speaker: heroine
「片方の足、もう階段にかかってる」
「この人、行くところがあるんでしょうか」
# speaker: narrator
案内には、別れの場面にも見えると書いてある。絵の左奥には、人影のような暗がりもあった。
# speaker: heroine
「私はそっちが気になったけど……{player_address}は、どこを見てました？」

* [「階段。片方だけ急いでるみたいだ」]
    # effect: milano_brera_first_joke
    # speaker: heroine
    # emotion: smile
    「待たせた側かもしれませんよ。絵の中でも、乗り遅れそう」
    -> after_first
* [「君が見ていた足元。何が気になった？」]
    # effect: milano_brera_first_listen
    # speaker: heroine
    「行く人の足なのか、戻ってきた足なのか、決めきれなくて」
    # speaker: narrator
    彼女は少し離れて、もう一度階段を見た。
    -> after_first
* [「二人の間。離れたくなさそうに見えた」]
    # effect: milano_brera_first_honest
    # speaker: heroine
    # emotion: shy
    「……そう見えるの、いいですね」
    「足元ばかり見てたら、そこを見落としてました」
    -> after_first

=== after_first ===
# speaker: narrator
人が移動し、絵の暗がりまで見える位置が空いた。
# speaker: heroine
「あの影、誰なんだろう。見張ってるのか、ただ通るところなのか」
「答えがないと、勝手に続きを考えてしまいます」

* [「影の人も、階段を譲るべきか迷ってる」]
    # effect: milano_brera_second_joke
    # speaker: heroine
    # emotion: smile
    「ずっと待ってるなら、足がしびれてるかもしれません」
    -> ending
* [「君なら、どんな続きにする？」]
    # effect: milano_brera_second_listen
    # speaker: heroine
    「二人が離れたあと、影の人が落とし物を拾う話」
    # emotion: smile
    「暗いだけじゃ、かわいそうだから」
    -> ending
* [「続きは分からなくても、今ここで一緒に見られてよかった」]
    # effect: milano_brera_second_honest
    # speaker: heroine
    # emotion: shy
    「……じゃあ、この影のことも覚えていてください」
    「あとで話したら、二人とも別の話にしてそう」
    -> ending

=== ending ===
# speaker: narrator
絵の前を離れても、二人の視線は一度ずつ戻った。
何を見たかは、たぶん少し違っていた。
-> END
