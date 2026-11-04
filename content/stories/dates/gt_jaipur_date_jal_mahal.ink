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

# background: gt_bg_jaipur_jal_mahal
# speaker: narrator
マン・サーガル湖の岸で、{heroine_name}は歩みを止めた。水の向こうに、ジャル・マハルの黄色い壁と小さな屋根が並んでいる。
# speaker: heroine
# emotion: surprised
「あ、本当に湖の真ん中にある。写真だと、岸の続きに見えてた」
# speaker: narrator
彼女は案内を確かめた。今回は宮殿の中へ入るのではなく、湖岸から眺める。
# speaker: heroine
「ちょっと残念。窓の近くまで行けるかなって、楽しみにしてたから」
「でも、ここなら水に映った方も見えるね。あ、今きれいに――あー、揺れた」
# speaker: narrator
波紋に切れた屋根が、少し離れたところでまたつながる。彼女は視線で追いかけた。
{
- relationship_tone == "strained" || relationship_tone == "reserved":
    # speaker: heroine
    「もう少し見ていてもいい？　きれいにつながるところ、一度見たいな」
- else:
    # speaker: heroine
    # emotion: teasing
    「宮殿にはもう会えたけど、下の宮殿が落ち着かない。こっちも待ってあげようよ」
}

* [「どの屋根を待ってる？」]
    # effect: gt_jaipur_date_jal_mahal_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「指で示そうとすると見失うね。ちょっとだけ、目で追わせて」
    - else:
        # speaker: heroine
        # emotion: smile
        「真ん中から少し右の、小さいの。いちばん先に揺れるのに、いつも見ちゃう」
    }
    -> water

* [「水の方が、落ち着きがないね」]
    # effect: gt_jaipur_date_jal_mahal_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「わたしも今、そわそわしてる。そこまで一緒にしないでね」
    - else:
        # speaker: heroine
        # emotion: teasing
        「うん。きれいに並んだところで、すぐ配置替え。忙しい宮殿です」
    }
    -> water

* [「待ってる間の景色も好きだな」]
    # effect: gt_jaipur_date_jal_mahal_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは、まだつながったところが見たい。欲張りかな。でも、もう少し」
    - else:
        # speaker: heroine
        「そっか。わたしは屋根ばっかり見てた。手前にも、細かい光がいっぱいあるね」
    }
    -> water

=== water ===
# speaker: narrator
しばらく待つと、屋根の形が水の上にそろった。{heroine_name}がこちらを向いた、その間にまた崩れる。
# speaker: heroine
# emotion: surprised
「今！　……今、だった」
# speaker: narrator
彼女は湖とこちらを交互に見て、とうとう笑った。
# speaker: heroine
# emotion: happy
「知らせる方を見ると、景色を見逃すんだ。なかなか難しい」
「でも、そっちも見えてたならいいか。わたしだけが見たと思うと、話したくなるから」
# speaker: narrator
宮殿の実物は少しも揺れていない。彼女はようやく水面から視線を上げ、遠くの窓を一つずつたどった。
# speaker: heroine
「ここに来る前は、中に入れないなら短い寄り道かなって思ってた。もう少しいたい、に変わっちゃった」

* [「次は、声だけで知らせて」]
    # effect: gt_jaipur_date_jal_mahal_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「実況係になると、また見逃しそう。次はわたしも、ただ見てたいな」
    - else:
        # speaker: heroine
        # emotion: teasing
        「了解。合図は『今』。ただし、空振りが多いです」
    }
    -> leaving

* [「まだ、ここにいよう」]
    # effect: gt_jaipur_date_jal_mahal_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うれしい。でも、ずっと待たせるのも気になる。あと少しだけにしよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。今度は完成するまで待つ、って決めないで見ようかな」
    }
    -> leaving

* [「もう少しいたいって、言ってくれてうれしい」]
    # effect: gt_jaipur_date_jal_mahal_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「そこを改めて言われると、ちょっと照れる。そんな大げさな希望じゃないよ」
    - else:
        # speaker: heroine
        # emotion: shy
        「そっか。じゃあ、遠慮しない。もう少し、付き合ってください」
    }
    -> leaving

=== leaving ===
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: narrator
    彼女は肩の力を抜いて、同じ方向を向いた。次に屋根がそろったとき、こちらを振り返らず、小さく「今」と言った。
- else:
    # speaker: narrator
    次に屋根がそろったとき、彼女は静かに指を差した。二人で水面を見たまま、うなずき合った。
}
# speaker: heroine
# emotion: smile
「見えた。今度はちゃんと、二人とも」
# speaker: narrator
岸を歩き始めてからも、彼女は一度だけ振り返った。水に映る宮殿は、まだ忙しく形を変えていた。
-> END
