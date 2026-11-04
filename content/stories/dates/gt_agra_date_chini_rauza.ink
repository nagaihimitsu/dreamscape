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

# background: gt_bg_agra_chini_rauza
# speaker: narrator
チーニー・カ・ラウザの外壁に、青い釉薬タイルが残っている。{heroine_name}は色の違う部分を見比べ、何か言いかけて口を閉じた。
# speaker: heroine
# emotion: neutral
「今、すごく気取ったことを言いそうになった」
# speaker: narrator
ここに葬られたアフザル・ハーンは、高官であり学者・詩人でもあった。案内を読んだ彼女は、もう一度青へ目を向ける。
# speaker: heroine
# emotion: serious
「遠い水を、焼きつけたような……」
# speaker: narrator
自分で言って、自分で照れた。顔をそらし、こちらの反応を片目だけでうかがう。
# speaker: heroine
# reaction: heroine,shy,blush
「忘れて。いや、今すぐ忘れた顔をするのもやめて。どっちも恥ずかしい」

* [「その声で、もう一度だけ聞きたい」]
    # effect: gt_agra_date_chini_rauza_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,blush
        「アンコールは受け付けません。今は本当に恥ずかしいから、少し待って」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「恋人だからって、再生ボタンはありません。……あとでなら、一回だけ」
        - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「そういうふうに聞きたがるの、反則。……でも、笑わないで聞いたことは、覚えておく」
        }
    }
    -> after_first
* [「こちらも一句。青い。大変、青い」]
    # effect: gt_agra_date_chini_rauza_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「わたしのやつを笑わせて薄めようとしてる？　今は、まじめに失敗したかったの」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「短いのに、二回言った！　……だめ。わたしの詩より、そっちを覚えて帰っちゃいそう」
    }
    -> after_first
* [「今の言葉のまま、聞いていたい」]
    # effect: gt_agra_date_chini_rauza_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「止められると、直せなくなるよ。まだ、自分でも好きか分からないんだ」
    - else:
        # speaker: heroine
        # emotion: smile
        「そう？　じゃあ、いったん消さない。続きが出るまで、そのままにしておく」
    }
    -> after_first

=== after_first ===
# speaker: narrator
彼女は続きの言葉を探した。けれど青の隣にも青があり、名前を考えるたびに、目が別の色へ移ってしまう。
# speaker: heroine
# emotion: smile
「詩人の廟に来たからって、急に詩人にはなれないね。好きな色なら、指せるんだけど」
# speaker: narrator
彼女が一か所を指す。こちらが同じ場所を見つけると、満足そうに手を下ろした。
# speaker: heroine
# reaction: heroine,teasing,question
「ところで、さっきの詩。帰ってから急に読まれたりしないよね？」

* [「自分は、忘れたくないと思った」]
    # effect: gt_agra_date_chini_rauza_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「それはうれしい。でも、わたしが恥ずかしい時は、口に出さずにいてね」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、覚えてて。失敗作って決めたの、わたしだけだったんだね」
    }
    -> ending
* [「秘密の作品として、厳重に保管します」]
    # effect: gt_agra_date_chini_rauza_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「作品って呼ばれると、急に立派になるから困る。保管庫は、小さめでお願いします」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「持ち出し禁止、無断朗読禁止。……作者が直したくなった時だけ、開けてください」
    }
    -> ending
* [「君の声ごと、俺だけが覚えて帰りたい」]
    # effect: gt_agra_date_chini_rauza_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,blush
        「わたしの言葉を、全部ひとり占めするのはなし。でも、今の一行だけなら……いいよ」
    - else:
        { relationship_tone_after == "strained" || relationship_tone_after == "reserved":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「そんな言い方をされたら、照れる。今の一行だけね。次は、誰に話すか、わたしが決めます」
        - else:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「じゃあ、ちゃんと覚えて。次にわたしが忘れてたら、二人きりの時に教えてね」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
帰る前に、彼女はもう一度、好きな青を指した。詩の続きを足す代わりに、その位置を二人で確かめる。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: heroine
# emotion: smile
「今日は、聞いてもらったからいいか。うまく言えたかどうかは、あとで考える」
- else:
# speaker: heroine
# emotion: smile
「続きができても、最初から全部直すかもしれないよ。それも、わたしの権利です」
}
# speaker: narrator
彼女は先に歩き出した。数歩先で口元が動いたが、今度の一行は、まだ聞こえなかった。
-> END
