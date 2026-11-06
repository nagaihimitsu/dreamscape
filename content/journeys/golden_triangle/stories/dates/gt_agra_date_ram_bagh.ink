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

# background: gt_bg_agra_ram_bagh
# speaker: narrator
ラム・バーグの園路を歩いていた{heroine_name}が、急に歩く速さを落とした。こちらが合わせると、彼女は少しだけ唇を尖らせる。
# speaker: heroine
# emotion: neutral
「疲れた、とはまだ言ってません」
# speaker: narrator
立ち止まって見返すと、彼女が先に笑った。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「ごめん。見栄です。ゆっくり歩きたいです」
# speaker: narrator
初期のムガル庭園の一つとされる、バーブル期の庭。園路と水路の並ぶ眺めは、急がずとも先へ続いている。
# speaker: heroine
# reaction: heroine,teasing,music
「せっかくだから、今日は一番遅く歩いた人が勝ち、ってどう？　立ち止まるのもあり」

* [「自分も疲れた。競争より、休みたい」]
    # effect: gt_agra_date_ram_bagh_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「そうだったんだ。わたし、遊びにしたら言いやすいと思ってた。先に座る？」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん、そうしよう。……わたし、負けず嫌いの方向を間違えてたね」
    }
    -> after_first
* [「一歩目で昼寝に入れば優勝できる」]
    # effect: gt_agra_date_ram_bagh_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「寝るのはホテルにして。わたし、庭まで来て寝顔の番はしたくない」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「審判として却下。起きている方にも、勝つ機会をください」
    }
    -> after_first
* [「遅い方を、お姫様抱っこするのは？」]
    # effect: gt_agra_date_ram_bagh_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「しません。抱えられるより、わたしの速さに付き合ってほしい」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,blush
        「わたしが勝ったら、そっちを抱えるの？　ルール、今のうちに直した方がいいよ」
        - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        「何を言い出すの。……勝負は中止。変な想像をさせた人は、隣をゆっくり歩いてください」
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
一度休んでから、二人で園路へ戻った。彼女は思いついた遅い歩き方を一歩だけ試し、かえって歩きにくくなった自分に笑う。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「やっぱり、普通に歩く方が楽。競争にしようと思ったのが、間違いだったね」
# speaker: narrator
水路の曲がる先が気になり、彼女はそちらへ顔を向けた。しかし、足はまだ動かさない。
# speaker: heroine
# emotion: smile
「あそこまでは、見たい。本当に。元気なふりじゃなくて」

* [「では、最下位の二人で出発します」]
    # effect: gt_agra_date_ram_bagh_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「もう順位はいいよ。遅いことをずっと話されると、気になっちゃう」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「同率最下位。いいね、誰も先に着いて待たなくていい」
    }
    -> ending
* [「途中で戻りたくなったら、一緒に戻ろう」]
    # effect: gt_agra_date_ram_bagh_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「うん。でも、今は行きたいって方も信じてね。もう一回歩ける」
    - else:
        # speaker: heroine
        # emotion: smile
        「ありがとう。それなら、行きたいって言いやすい。戻る時も、ちゃんと言うね」
    }
    -> ending
* [「君となら、一番ゆっくりの旅もしたい」]
    # effect: gt_agra_date_ram_bagh_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,question
        「わたし、速く歩きたい日もあるよ。今日のわたしだけで、全部決めないで」
    - else:
        { relationship_tone_after == "guarded_attraction" || relationship_tone_after == "strained":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「今日は、そう言ってくれると安心する。ほかの日は、その日に聞いてね」
        - else:
        # speaker: heroine
        # reaction: heroine,smile,heart
        「じゃあ、わたしも。元気な時だけ一緒にいたい、とは思わないから」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
水路の先へ着いた時、彼女は勝ち負けを宣言しなかった。見たかった所を見て、自分から折り返す。
# speaker: heroine
# emotion: smile
「今日は、ここまで。まだ歩けるけど、ここまでにしたい」
{ relationship_tone_after == "warm" || relationship_tone_after == "comfortable":
# speaker: heroine
# reaction: heroine,teasing,music
「帰りは普通に歩きます。遅く歩く才能がないことが判明したので」
- else:
# speaker: heroine
「また見栄を張ったら、自分で取り消すね。さっきみたいに」
}
# speaker: narrator
二人は競わず、元の園路へ戻った。
-> END
