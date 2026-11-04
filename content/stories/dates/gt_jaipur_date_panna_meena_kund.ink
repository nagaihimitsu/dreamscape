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
パンナ・ミーナー・クンドの周縁で、折れ曲がる階段を眺める。下へは降りず、見える線を目でたどっていた彼女が、急に得意そうな顔をした。
# speaker: heroine
# reaction: heroine,happy,sparkle
「分かった。あの角から、こっちを回って……ここ。同じ所までたどれる？」
# speaker: narrator
こちらが指すと、彼女は別の角を指した。もう一度確かめる。違うのは、彼女が戻ったつもりの場所だった。
# speaker: heroine
# reaction: heroine,surprised,interrobang
「え。待って、わたしの方？　……あ、ほんとだ」
# speaker: narrator
彼女は指を引っ込めた。笑って済ませようとしたが、少しだけ唇がとがっている。
# speaker: heroine
「こういうの、見つけるのは得意なつもりだった。自分から勝負みたいにしたのに」

* [「君の得意そうな顔、かなり好きだった」]
    # effect: gt_jaipur_date_panna_meena_kund_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「失敗した顔まで、面白がらないで。今は、ちょっと本気で悔しいんです」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「顔に点をつける勝負じゃないのに。……それ言われたら、悔しがり続けにくいよ」
    }
    -> after_first
* [「勝負はやめて、二人で一本の道を見よう」]
    # effect: gt_jaipur_date_panna_meena_kund_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「負けたから終わりにしてもらうのも嫌だな。もう一回だけ、自分で確かめたい」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。今度は、分かった顔をする前に、ちゃんと最後まで見る」
    }
    -> after_first
* [「一歩も動かない遭難を発明したね」]
    # effect: gt_jaipur_date_panna_meena_kund_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「今は笑えない。あとでなら、笑えるかもしれないけど。今はやめて」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「救助も目だけでお願いします。……ふふっ、ずっとここに立ってるのにね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
彼女は同じ角へ視線を戻した。今度は指を先へ走らせず、段の折り返しを一つずつ追う。
# speaker: heroine
# emotion: neutral
「こっちだった。わたし、一段飛ばして見てたんだ」
# speaker: narrator
模様のような線は、水のある所へ近づくための階段でもある。彼女は深さを見てから、ゆっくり息を吐いた。
# speaker: heroine
「見てるだけで間違えるのに、水を運ぶ人には、本当の段も重さもあったんだね」
{ romance_result == "negative":
    # speaker: heroine
    # emotion: serious
    「さっきの、まだちょっと引っかかってる。でも、悔しかったのは、そっちのせいだけじゃないよ」
- else:
    # speaker: heroine
    # emotion: neutral
    「わたし、さっき一瞬、本気で悔しかった。軽い遊びにしたつもりだったのに」
}
# speaker: heroine
「一緒に来て楽しいのと、勝ちたいのが同時にあるんだね。……そっちは、ない？」

* [「ある。好きな人には、格好いいところも見せたい」]
    # effect: gt_jaipur_date_panna_meena_kund_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        「好きな人、って、急にそこを混ぜる？　わたし、悔しい顔のまま返事することになるよ」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,heart
        { ending_reached:
            「うん。わたしも、好きな人に格好つけたかった。……見事に失敗したけどね」
        - else:
            「それ、わたしのことだと思っていいの？　……だったら、今の失敗も取り消さずに置いておく」
        }
    }
    -> ending
* [「悔しい時は、笑うのを少し待つね」]
    # effect: gt_jaipur_date_panna_meena_kund_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「顔を見張るみたいには、しないでね。わたしも、嫌ならちゃんと言うから」
    - else:
        # speaker: heroine
        # emotion: smile
        「ありがとう。ずっと笑わないで、じゃないよ。わたしも笑える時に、一緒がいい」
    }
    -> ending
* [「では次は、どっちが先に負けを認めるか勝負」]
    # effect: gt_jaipur_date_panna_meena_kund_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「もう競わせないで。今日は、勝ち負けのないところで終わりたい」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「負けました。……あっ、先に言ったから勝ち？　待って、どっち？」
    }
    -> ending

=== ending ===
# speaker: narrator
二人は線をたどるのをやめ、井戸全体を眺めた。階段は相変わらず、目を迷わせるほど細かく折り重なっている。
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: heroine
    # emotion: neutral
    「今日は、わたしの負けず嫌いも見つかったね。すぐ笑って終われなくても、少し待ってもらえると助かる」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「次に得意なものを見つけたら、また見せると思う。格好つけるの、完全にはやめられそうにないので」
}
# speaker: narrator
見学路へ戻る時、彼女は一度だけあの角を指した。今度は答えを求めず、自分で見つけ直したことを知らせる指だった。
-> END
