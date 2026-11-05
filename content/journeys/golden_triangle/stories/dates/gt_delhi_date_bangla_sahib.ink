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

# background: gt_bg_delhi_bangla_sahib
# speaker: narrator
グルドワーラ・バングラ・サーヒブの入口で、二人は靴を脱ぎ、頭を覆う布を整えた。{heroine_name}は教わった形にしたつもりで、手を離す。
# speaker: heroine
# reaction: heroine,worried,question
「できた？　……その顔だと、できてない？」
# speaker: narrator
片方を引くと、反対側が短くなる。もう一度直して、彼女は同じ形へ戻した。
# speaker: heroine
# reaction: heroine,exasperated,dizzy
「三周した。分かりましたって、さっき元気よく言っちゃったのに」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「変なところ、教えて。笑うのは、直ってからにしてね」
- else:
    # speaker: heroine
    # emotion: teasing
    「自信ありそうな顔だけ、上手になってきた。そっちは上達しなくていいのに」
}

* [「自分のも見て。後ろは見えていないから」]
    # effect: gt_delhi_date_bangla_sahib_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「今、わたしの両手はここから動かせません。順番を待ってください」
        # speaker: narrator
        彼女は頭の布を押さえたまま、先に自分が聞き直す方へ向いた。
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,question
        「あ、そっちも少し折れてる。完成した人の顔してたから、見てなかった」
        # speaker: narrator
        二人ともまだ途中だと分かると、彼女は気負わずに案内の人を呼べた。
    }
    -> after_first

* [「一人で四周するより、もう一度聞こう」]
    # effect: gt_delhi_date_bangla_sahib_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「数えなくていいよ。自分で、どこが分からなかったか言うから」
        # speaker: narrator
        彼女の声は小さいが、はっきりしていた。こちらは口を挟まず待つ。
    - else:
        # speaker: heroine
        # emotion: serious
        「うん。今度は途中で止めて聞く。うなずくのを、ちょっと遅くする」
        # speaker: narrator
        彼女は自分で声をかけ、どちらの端を動かすのか確かめた。
    }
    -> after_first

* [「完成するまで、応援団が一名ついています」]
    # effect: gt_delhi_date_bangla_sahib_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「応援より、間違ってる所を教えてほしい。今は、ちょっと困ってるの」
        # speaker: narrator
        こちらが具体的に折れた場所を示すと、彼女はそこを押さえて聞き直した。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「声は出さずにお願いします。失敗のたびに拍手もしなくていいです」
        # speaker: narrator
        笑えたところで、彼女は案内の人へ手を上げた。自分でやるのと、聞くのは別のことだった。
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人とも覆い方を確かめてから、中へ入った。礼拝の場では会話をやめ、案内に従って静かに過ごす。
# speaker: narrator
見学を終えて落ち着ける場所に出ると、彼女は入口でもらった説明を読み返した。第八代のシク教のグルが滞在した屋敷が、この礼拝所の由来とされている。
# speaker: heroine
# emotion: neutral
「昔ここにいた人の話を読んでたのに、今日は、教え直してくれた人の手も覚えてる」
# speaker: narrator
靴を履き直す。今度はこちらの鞄の紐がねじれ、肩にうまく収まらない。
# speaker: heroine
# reaction: heroine,teasing,exclamation
「あ。完成した人の顔をしてるのに、後ろが途中です」
# speaker: narrator
彼女は少し得意そうに近づき、触る直前で手を止めた。
# speaker: heroine
「直していい？　それとも、一度下ろす？　今度は、先に聞けます」

* [「その距離で見られると、好きが顔に出る」]
    # effect: gt_delhi_date_bangla_sahib_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,interrobang
        「いま鞄の紐を見てた！　顔は、こっちに向けなくて大丈夫！」
        # speaker: heroine
        # emotion: serious
        「……あとで聞くから、先に直そう。今だと、わたしまで手元が分からなくなる」
        # speaker: narrator
        彼女は鞄を下ろすように示し、距離を戻してねじれを解いた。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「もう。直す人が困ることを言わないで」
        { ending_reached:
            # speaker: heroine
            # emotion: teasing
            「顔に出てるのは知ってます。今日は、鞄の不具合も分かるようになりました」
        - else:
            # speaker: heroine
            「聞こえたよ。……でも今は、わたしが助けるところ、最後まで見てて」
        }
        # speaker: narrator
        彼女は鞄を一度下ろしてもらい、自分の手で紐をまっすぐにした。
    }
    -> ending

* [「今度は、そっちに任せたい」]
    # effect: gt_delhi_date_bangla_sahib_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「全部任されると、また『分かりました』って言いそう。下ろすのは、そっちでお願い」
        # speaker: narrator
        役割を分け、二人で紐のねじれをほどいた。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「はい。では、鞄をこちらへ。さっきの見本をちゃんと見ておいてよかった」
        # speaker: narrator
        彼女は重さを確かめて鞄を支えた。こちらが頼んだことが、少しうれしそうだった。
    }
    -> ending

* [「下ろすから、ねじれている場所を教えて」]
    # effect: gt_delhi_date_bangla_sahib_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,question
        「言葉で説明する方が難しいかも。ちょっと見せて。指で示すなら、できる」
        # speaker: narrator
        彼女は説明を急がず、見える位置まで鞄を動かしてから教えた。
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「ここ。一回ひっくり返ってる。そう、その向き。……やった、直った」
        # speaker: narrator
        彼女は自分で触って直すよりも、言葉が通じたことを喜んだ。
    }
    -> ending

=== ending ===
# speaker: narrator
肩に鞄が収まり、二人は歩き出す。彼女は少し先へ進んでから、わざわざ戻って後ろを確認した。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # reaction: heroine,teasing,music
    「よし。今度は本当に完成。格好いい顔をしても大丈夫です」
- else:
    # speaker: heroine
    # emotion: smile
    「直ってる。よかった。今日はもう、分かった顔だけで終わらなくて済んだね」
}
# speaker: narrator
自分の布を直せなかった時より、彼女は少し胸を張っていた。助けた方として並ぶ足取りは、軽かった。
-> END
