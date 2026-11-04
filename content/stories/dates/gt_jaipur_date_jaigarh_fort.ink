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

# background: gt_bg_jaipur_jaigarh_fort
# speaker: narrator
ジャイガル城の城壁を眺めていると、彼女が案内図の二つの城を指した。丘の向こうのアンベールとは、地下通路でもつながっていたという。
# speaker: heroine
# reaction: heroine,surprised,question
「壁で守って、その裏ではつながってる。正面だけ見て、安心してる場合じゃないね」
# speaker: narrator
通路へは行かず、見学路で図を眺める。彼女は急に背を伸ばし、こちらへ手のひらを向けた。
# speaker: heroine
# emotion: teasing
「では、わたしがこっちの城主。そちらの申し出を聞きます。物騒なのは、却下です」
{ relationship_tone == "strained" || relationship_tone == "reserved":
    # speaker: heroine
    「……急に始めちゃった。困ったら、ただ景色を見る旅人に戻っていいからね」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,sparkle
    「案内図の上だけだから、だいぶ強気です。さあ、どうぞ」
}

* [「まず、そちらの希望を聞きたい」]
    # effect: gt_jaipur_date_jaigarh_fort_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,question
        「こっちが聞く番だったのに。じゃあ希望は、先に何か申し出てほしい、です」
    - else:
        # speaker: heroine
        # emotion: smile
        「こちらは、景色を見ながら歩く同盟を希望します。急かさないことが条件」
    }
    -> after_first
* [「一生、君に降参します」]
    # effect: gt_jaipur_date_jaigarh_fort_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「一生だと、こっちの責任も重い！　今日は、普通に歩いてくれる人を募集してます」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        { ending_reached:
            「急に期限を延ばしたね。……とりあえず、今日の残りは預かります」
        - else:
            「城の話だったよね？　そこだけ、ずるく現実に聞こえたんだけど」
        }
    }
    -> after_first
* [「降参より、対等に隣を歩きたい」]
    # effect: gt_jaipur_date_jaigarh_fort_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「分かるけど、今はちょっとふざけたかった。わたし、そんなに偉そうだったかな」
    - else:
        # speaker: heroine
        # reaction: heroine,smile,heart
        「うん。それなら、城主はここでおしまい。隣、空いてます」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人で城壁の続きを眺める。彼女は現在地を確かめようとして、案内図の向きを逆に持っていたことに気づいた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「……今のは見なかったことに。国の向きが逆でした」
# speaker: narrator
裏返す手元を見ていると、彼女は図を胸へ引き寄せた。それから笑って、こちらに開き直す。
# speaker: heroine
「秘密の通路があると、城主同士で相談する時は便利そうだね。これは勝手な想像だけど」
「でも、二人の相談まで全部こっそりだったら嫌だな。嫌なことは、表で言ってほしい」

* [「じゃあ正面から。今日、君がすごく楽しそうでうれしい」]
    # effect: gt_jaipur_date_jaigarh_fort_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「褒める方から来た。……返事の準備ができてないよ。さっきの城主の勢い、返して」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,heart
        「うん、楽しい。今、もっと。正面から言ってくれるの、やっぱりいいね」
    }
    -> ending
* [「図が逆の時も、正直に言うね」]
    # effect: gt_jaipur_date_jaigarh_fort_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「それは、もう言わなくていいです。自分で気づいたから。ひとつの失敗を何回も使わないで」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「その際は、王国を救った功労者として表彰します。記念品は、わたしの拍手」
    }
    -> ending
* [「言いにくい時も、急がせずに聞きたい」]
    # effect: gt_jaipur_date_jaigarh_fort_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「今は、そんなに深刻な相談じゃなかったんだけど。でも、覚えておくね」
    - else:
        # speaker: heroine
        # emotion: smile
        「ありがとう。たぶん一回、平気なふりする日もある。あとから言い直しても、聞いてね」
    }
    -> ending

=== ending ===
{ romance_result == "negative":
    # speaker: narrator
    彼女は図を畳む前に、言葉を探した。こちらが先を急がずにいると、今度は落ち着いた声になる。
    # speaker: heroine
    「ちゃんと話すの、図の向きを直すより難しいね。でも、言ったからね、今のは」
- else:
    # speaker: narrator
    彼女は案内図を丁寧に畳んだ。今度は、二人とも同じ向きを向いている。
}
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # reaction: heroine,teasing,music
    「城主より旅人がいいな。そっちの隣を歩くのに、申し出が要らないから」
- else:
    # speaker: heroine
    # emotion: smile
    「では、旅人に戻ります。次の角は、一緒に図を見てから行こう」
}
# speaker: narrator
城壁の線は丘へ続いている。二人は秘密の近道を使わず、同じ見学路を歩き始めた。
-> END
