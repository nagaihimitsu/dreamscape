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

# background: gt_bg_jaipur_panna_meena_kund
# speaker: narrator
アンベールの階段井戸、パンナ・ミーナー・クンド。見学できる周縁から、幾何学模様のように折れ曲がる段を眺める。
# speaker: heroine
# emotion: surprised
「これ、全部階段なんだ。写真だと模様に見えたけど、ここから見ると深さがあるね」
# speaker: narrator
彼女は井戸の中へ降りず、空中に指を伸ばした。段の線を目でたどり、途中で小さく首をかしげる。
# speaker: heroine
「今、こっちへ行ったつもりなのに、違う道を見てた。足は動かしてないのに迷ったよ」
{ relationship_tone == "reserved" || relationship_tone == "strained":
# speaker: narrator
彼女はいったん手を下ろし、こちらの見ている場所を確かめた。
- else:
# speaker: heroine
# emotion: teasing
「見てるだけなら上手に進めると思った？　わたしもそう思ってた」
}

* [「分かれたところから、もう一度見よう」]
    # effect: gt_jaipur_date_panna_meena_kund_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「同じところを探すと、ますます分からなくなりそう。最初からがいいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「あ、ここだ。そっちを見てたんだね。わたしは、一段向こうに飛んでた」
    }
    -> after_first
* [「指だけ、先に着いてしまったね」]
    # effect: gt_jaipur_date_panna_meena_kund_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「着いた先も分からないんだけど。今は、一緒に探してくれると助かる」
    - else:
        # speaker: heroine
        # emotion: teasing
        「そう。目が追いつくのを待ってもらっています。ずいぶん気の早い指で」
    }
    -> after_first
* [「別の段を見ていたかもしれない」]
    # effect: gt_jaipur_date_panna_meena_kund_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「え、じゃあ合ってたかも分からないね。今度は、場所を言いながら見よう」
    - else:
        # speaker: heroine
        # emotion: happy
        「二人とも別のところへ行ってたんだ。じゃあ、どっちも戻ってこよう」
    }
    -> after_first

=== after_first ===
# speaker: narrator
今度は動かす指を止め、見えている段を一つずつ確かめる。線の反復が、壁を下りる道の形に変わっていく。
# speaker: heroine
「階段井戸って、水のところまで行くための場所なんだよね。きれいな形だけど、使う時は重さも深さもあったんだ」
# speaker: narrator
彼女は覗き込みすぎない位置へ半歩戻った。上から見るだけでも、下までの隔たりが感じられる。
# speaker: heroine
「今度は全体を見たい。道を一本追いかけてたら、周りの形をすっかり忘れてた」

* [「少し離れて見ると、つながって見えるね」]
    # effect: gt_jaipur_date_panna_meena_kund_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「そうかも。でも、もう少しこの位置で見たいな。やっと目が慣れてきた」
    - else:
        # speaker: heroine
        # emotion: smile
        「ほんとだ。さっき迷ったところも、一つの模様になってる」
    }
    -> ending
* [「指の案内役は、いったん休憩だ」]
    # effect: gt_jaipur_date_panna_meena_kund_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「休ませてもいいけど、わたしまで引退させないでね。まだ見たいところがある」
    - else:
        # speaker: heroine
        # emotion: teasing
        「はい、お疲れさまでした。次は、目だけでのんびり見ます」
    }
    -> ending
* [「細かく見たあとだと、全体も違って見える」]
    # effect: gt_jaipur_date_panna_meena_kund_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは、まだ細かいところが気になるかも。同じ速さで切り替えなくてもいいよね」
    - else:
        # speaker: heroine
        「うん。さっきは見分けられなかった角が、今なら分かる。ちょっと嬉しい」
    }
    -> ending

=== ending ===
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: narrator
彼女はもう一度だけ指を上げた。こちらが同じ箇所を見たと分かると、声を出さずに笑う。
- else:
# speaker: narrator
彼女は最後に気になった箇所を指さし、場所が伝わるまでゆっくり待った。
}
# speaker: heroine
「ここ。今日は、この角を覚えて帰る。全部じゃなくても、分かる場所が一つできたから」
# speaker: narrator
手を下ろしたあとも、彼女の視線はしばらくそこに残っていた。二人は井戸の周縁から、見学路へ戻る。
-> END
