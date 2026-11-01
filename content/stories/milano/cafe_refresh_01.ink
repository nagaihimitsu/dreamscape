// コルドゥージオ広場のロースタリー。配管をたどって豆の道を描く。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
-> start

=== start ===
# background: milano_starbucks_roastery_date
# speaker: narrator
コルドゥージオ広場のスターバックス・リザーブ・ロースタリー。
透明な管の中を、豆が一斉に駆け上がっていった。
# speaker: heroine
# emotion: surprised
「わ、今の見た？　上に行ったよね。次はどっち？」
# speaker: narrator
{heroine_name}が管の行方を追って振り返る。天井には何本もの管が交差していた。
# speaker: heroine
# emotion: smile
「ここ、前は郵便局だった建物なんだって。今は豆が配達されてるみたい」
# speaker: narrator
彼女は手元のレシートの裏に管を描き始めたが、線がすぐに絡まった。
{
- relationship_tone == "strained":
彼女はこちらに紙を見せかけて、まず自分で線をほどこうとした。
- relationship_tone == "warm":
彼女は紙を差し出し、迷路の真ん中を鉛筆で突いた。
- else:
彼女は紙と天井を見比べてから、少し困った顔をした。
}
# speaker: heroine
「焙煎機へ向かう途中までは分かったのに。この先、三回も分かれてる」

* [「豆に宛先を書いておけば、迷わなかったのに」]
    # effect: milano_cafe_first_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「小さすぎて書けないよ。……あ、そういう問題じゃないか」
        # speaker: narrator
        彼女は鉛筆を持ったまま、豆の大きさを指で示した。
    - else:
        # speaker: heroine
        「切手も貼る？　豆、一粒ずつ？」
        # speaker: narrator
        彼女は紙に点を打ちかけ、途中で数えるのを諦めた。
    }
    -> after_first
* [「豆より、夢中で線を追う{heroine_name}が気になる」]
    # effect: milano_cafe_first_flirt_refresh
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「見られると描きにくいな。今は管のほうを見てて」
        # speaker: narrator
        彼女は紙を自分へ引き寄せた。
    - else:
        # speaker: heroine
        # emotion: shy
        「そんなに真剣な顔してた？　……うわ、恥ずかしい」
        # speaker: narrator
        彼女はレシートで顔を隠し、すぐに足りないと気づいて笑った。
    }
    -> after_first
* [「焦らず、一緒に管の先を追ってみようか」]
    # effect: milano_cafe_first_interest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、もう少し自分でやってみてもいい？」
        # speaker: narrator
        彼女は鉛筆を握り直した。
    - else:
        # speaker: heroine
        「じゃあ私は左、{player_name}さんは右。見失ったら正直に申告ね」
        # speaker: narrator
        彼女は二手に分かれる線を示した。
    }
    -> after_first

=== after_first ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は人の通路を塞がないよう、柱のそばに寄った。
- else:
彼女は人を避けながら、管の先が見える場所を探した。
}
二人は店内の案内を読み、豆の道を確かめる。
透明な管は生豆を焙煎機へ運び、焙煎した豆は銅の管を通ってカフェバーへ届くという。
# speaker: heroine
「なるほど。全部が同じ道を通るわけじゃなかったんだ」
# speaker: narrator
紙の上では、彼女の線が一か所だけ違う方向へ曲がっている。
# speaker: heroine
「ここ、思い込みで描いちゃった。どうしよう、消そうかな」

* [「そこに『豆の寄り道』って書いておこう」]
    # effect: milano_cafe_second_playful_refresh
    { romance_result == "negative":
        # speaker: heroine
        「本当の道と間違えそうだから、それは小さく書こう」
        # speaker: narrator
        彼女は曲がった線を指で押さえた。
    - else:
        # speaker: heroine
        「迷子の豆が出たら困るから、ただし書きも必要だね」
        # speaker: narrator
        彼女は線の脇に小さく「想像」と書いた。
    }
    -> ending
* [「自分で描き直す？　紙なら僕のもあるよ」]
    # effect: milano_cafe_second_warm_refresh
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、この紙で続けたいな」
        # speaker: narrator
        彼女は元のレシートを広げ直した。
    - else:
        # speaker: heroine
        「じゃあ裏を貸して。今度は答え合わせできるね」
        # speaker: narrator
        彼女は差し出された紙に、一本目の線を引いた。
    }
    -> ending
* [「間違えた線も残しておきたい。二人で見た順番だから」]
    # effect: milano_cafe_second_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「残すかは、もう少し迷わせて。私の間違いだし」
        # speaker: narrator
        彼女は鉛筆を置き、紙を見つめた。
    - else:
        # speaker: heroine
        「じゃあ、正しい道は隣に描こう。見比べられるように」
        # speaker: narrator
        彼女は別の線を引き、二つの終点を丸で囲んだ。
    }
    -> ending

=== ending ===
# speaker: narrator
頭上でまた、管を通る音がした。彼女は思わず紙と天井を見比べる。
# speaker: heroine
「今度は見失わなかった！　……あ、カップの方も冷めちゃうね」
-> END
