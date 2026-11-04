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

# background: gt_bg_jaipur_nahargarh_fort
# speaker: narrator
ナハルガル城から、ジャイプールの屋根が広がっていた。彼女が見学路を進み、遠くの通りを指す。こちらは足元を確かめたまま、一歩が遅れた。
# speaker: heroine
# reaction: heroine,happy,sparkle
「わあ。あの中を歩いていたんだね。こっちから、もっと――」
# speaker: narrator
彼女の声が途中で止まる。こちらの足が動いていないことに気づき、自分が来た道を戻ってきた。
# speaker: heroine
# emotion: worried
「ごめん。見せたい方へ先に行っちゃった。高さ、気になる？」
# speaker: narrator
小さくうなずくと、彼女は景色ではなく、落ち着いて立てる位置を探した。
# speaker: heroine
「じゃあ、今度はわたしがゆっくり歩く係ね。端まで行かなくても、町は見えるよ」

* [「手を借りてもいい？」]
    # effect: gt_jaipur_date_nahargarh_fort_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「待って。わたし、支え方まで分かるわけじゃないよ。少し奥へ戻って、落ち着いてからにしよう」
    - else:
        # speaker: heroine
        # reaction: heroine,smile,heart
        { ending_reached:
            「うん。今日はわたしが貸す方。しっかり、ここにいて」
        - else:
            「わたしでよければ。怖い方が一人で頑張る決まり、ないもんね」
        }
        # speaker: narrator
        差し出された手を、見学路の内側でそっと握る。彼女は急に引かず、こちらが動き出すのを待った。
    }
    -> city
* [「景色には強いけど、高さには弱かった」]
    # effect: gt_jaipur_date_nahargarh_fort_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「ふざけて平気な顔にしなくてもいいよ。わたし、今はちょっと心配してるんだから」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「担当が分かれてたんだ。じゃあ、景色に強い方と一緒に、ゆっくり歩きます」
    }
    -> city
* [「怖い。今日は無理せず、ここから見たい」]
    # effect: gt_jaipur_date_nahargarh_fort_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「ここだと落ち着けない顔に見えるよ。もう半歩、奥へ戻るのはどう？」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。そう言ってもらえたら、待つ方も困らない。今日はここからにしよう」
    }
    -> city

=== city ===
# speaker: narrator
二人は、落ち着いて立てる位置を選んだ。屋根の列は、そこからでも遠くへ続いている。
# speaker: heroine
# emotion: neutral
「ちゃんと見える。見せたい場所へ連れていくことばかり考えてたな、わたし」
# speaker: narrator
地図を開くと、彼女の指が一本の道をたどる。今度は足を動かさず、遠くの景色とゆっくり照らし合わせた。
# speaker: heroine
「地図では小さい四角でも、あそこに階段があって、誰かの部屋があるんだね」
# speaker: narrator
一軒を見つめたまま、彼女がふっと笑った。
# speaker: heroine
「いつも、わたしがびっくりする方だと思ってた。今日は、こっちが待つ番だったね」
「怖い顔も、見せてくれる方がいいな。見栄を張るの、交代で休もう」

* [「次の旅でも、格好悪い顔を君に見せたい」]
    # effect: gt_jaipur_date_nahargarh_fort_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,teasing,question
        「格好悪い顔の予約？　次の行き先を決める時は、楽しい顔も見せてね」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        「うん。次にわたしが怖がってたら、今日みたいにゆっくり歩いて。その時は、交代で」
    }
    -> rest
* [「今、頼もしかった。ありがとう」]
    # effect: gt_jaipur_date_nahargarh_fort_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「頼もしい役、ずっとはできないかも。今日も、最初は気づかずに先へ行ったし」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「ほんと？　……ふふ。わたしも役に立てたなら、ここへ来た甲斐がもう一つ増えた」
    }
    -> rest
* [「勇敢な二人、帰り道は慎重に撤退します」]
    # effect: gt_jaipur_date_nahargarh_fort_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「もう平気なふりしてる？　勇敢じゃなくても、ちゃんと一緒に帰るよ」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「まずは景色を見届けてからね。勇敢なふりはしなくていいから、足元は見てください」
    }
    -> rest

=== rest ===
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: narrator
    彼女は帰る前に、気になる道をもう一つ指した。見えているか尋ね、こちらのうなずきを待つ。
- else:
    # speaker: narrator
    彼女は目が合うと笑い、それから町を眺め直した。こちらが町へ目を向けられたのを見ると、さっきの通りをもう一度指した。
}
# speaker: heroine
# emotion: smile
「下に戻ったら、今見えた道を見つけたいな。その時は、いつもの高さに強い人に案内をお願いします」
# speaker: narrator
二人はゆっくり見学路を戻った。彼女が一度だけ振り返り、景色の方へ小さく手を上げた。
-> END
