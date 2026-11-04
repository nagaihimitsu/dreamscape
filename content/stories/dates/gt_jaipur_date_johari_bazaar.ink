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

# background: gt_bg_jaipur_johari_bazaar
# speaker: narrator
ジョーハリー・バザールの店先で、腕飾りの列に彼女の足が止まった。見るだけでもよいか尋ねると、店の人が二人を見比べた。
# speaker: narrator
「一緒に選ぶ人がいるなら、時間はかけた方がいい。すぐ決まると、私が話せないからね」
# speaker: heroine
# reaction: heroine,happy,music
「商売の都合、先に教えてくれるんですね」
# speaker: narrator
店の人は一つの品の向きを変えた。「そちらの人が似合うと言ったら、決まりかな？」
# speaker: heroine
# reaction: heroine,serious,exclamation
「参考にはします。でも、決めるのはわたしです」
# speaker: narrator
言い切ってから、彼女はこちらを見た。店の人も、面白そうに返事を待っている。

* [「今、この人を全力で口説いているので、味方がほしいです」]
    # effect: gt_jaipur_date_johari_bazaar_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「店の人まで巻き込まないで。わたしに言うことを、わたしの前で相談しないの」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        { ending_reached:
            「味方を増やさなくても、聞いてるよ。……交際後も手を抜かないところは、よろしいです」
        - else:
            「公表するものなの、それ！？　……お店の人、今の応援はしなくて大丈夫です」
        }
    }
    -> after_first
* [「何が気に入ったのか、この人の話を聞きたいです」]
    # effect: gt_jaipur_date_johari_bazaar_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「今、観客が二人になっちゃった。感想がまとまる前に、発表を待たないでね」
    - else:
        # speaker: heroine
        # emotion: smile
        「そういう聞かれ方なら、話したい。青い方、向きで明るさが変わるのが好きなんです」
    }
    -> after_first
* [「一緒に選ぶのは楽しいです。でも今日は買いません」]
    # effect: gt_jaipur_date_johari_bazaar_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,question
        「わたしも見るだけのつもりだけど、買うかどうかまで二人分まとめないで。自分で言うよ」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。わたしも今日は見たいだけです。それでも、もう少し見ていていいですか？」
    }
    -> after_first

=== after_first ===
# speaker: narrator
「よく分かりました。じゃあ、今日は品物の方に働いてもらおう」と店の人が言った。青い腕飾りを光の当たる方へ寄せる。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「あ。今の方が好き。……それ、わたしの言葉を全部『買いたい』に訳してませんか？」
# speaker: narrator
「まだ、買う前の顔だと思っています」。店の人の返事に、彼女は目を細めた。
# speaker: heroine
# emotion: teasing
「じゃあ、今日はその顔で帰ります。わたしも負けません」
# speaker: narrator
品物には手を伸ばさず、彼女は二つの色を見比べた。それから、こちらだけに聞こえる声になる。
# speaker: heroine
「ねえ。似合うかだけじゃなくて、わたしが好きかどうかも聞いてほしい。でも、似合うって言われたい時もある。面倒かな」

* [「面倒なら、こんなに一緒にいたくならない」]
    # effect: gt_jaipur_date_johari_bazaar_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        「そっちの話にする？　……今、腕飾りに逃げられなくなった。返事は、少し待って」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        「……それ、店の人に聞かせなくてよかった。わたしだけが聞きたかった」
    }
    -> ending
* [「今は、どっちの言葉が聞きたい？」]
    # effect: gt_jaipur_date_johari_bazaar_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「注文して言ってもらうのも、違うな。今のは、ちょっと欲張りでした」
    - else:
        # speaker: heroine
        # emotion: smile
        「似合う方。……ううん、先に、本当にそう思ったらでいい。そこは注文できないね」
    }
    -> ending
* [「では今日の標語は『かわいい。売買は別件』」]
    # effect: gt_jaipur_date_johari_bazaar_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「標語にしないで。今は、ふざけずに聞いてほしかったな」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「ふふっ。返品できない褒め言葉だけ、先にもらいました。品物は、お店に置いて帰ります」
    }
    -> ending

=== ending ===
# speaker: narrator
彼女は自分で、今日は買わないと店の人へ伝えた。「また、その顔が変わった時に」。店の人は品の向きを元へ戻した。
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: heroine
    # emotion: neutral
    「わたし、言い方を気にしすぎたかな。でも、勝手に決められたくないところは、伝えておきたかった」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「買わずに出る顔って、どんな顔だった？　……聞かなくていいか。今は、けっこう楽しい顔のつもり」
}
# speaker: narrator
荷物は増えなかった。店先を離れてから、彼女はもう一度だけ青い腕飾りを振り返り、そのあとこちらを見た。
-> END
