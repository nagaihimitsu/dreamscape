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
チーニー・カ・ラウザの外壁に、青いタイルが残っている。{heroine_name}は近づきすぎない位置で立ち止まり、色の違う部分を見比べた。
# speaker: heroine
# emotion: smile
「こっちは青。あっちは、緑にも見える。青って言うだけじゃ、足りないね」
# speaker: narrator
この廟に葬られたアフザル・ハーンは、シャー・ジャハーンに仕えた高官で、学者・詩人でもあった。外壁の釉薬タイルが、この場所の特色だ。
# speaker: heroine
「詩人の人なら、もっといい言い方が出てきたのかな。わたしは今、『きれいな青』で止まってる」
{ relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: heroine
「{player_address}には、何色に見える？」
- else:
# speaker: heroine
# emotion: teasing
「何か一つ、言ってみて。難しい言葉だったら、説明も付けてもらいます」
}

* [「緑に近いところも、見ていたい」]
    # effect: gt_agra_date_chini_rauza_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。わたしは、隣の濃いところも気になる。まだ一つに決められないな」
    - else:
        # speaker: heroine
        「分かる。目がそっちに戻るんだよね。わたしも、今そこを見てた」
    }
    -> after_first
* [「『きれいな青、少し緑』でどう？」]
    # effect: gt_agra_date_chini_rauza_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「うーん。伝わるけど、少しだけでも、もっと考えてみたいな」
    - else:
        # speaker: heroine
        # emotion: happy
        「説明としては正直だね。詩の題名としては、少し長いかも」
    }
    -> after_first
* [「まだ、うまく言えない」]
    # effect: gt_agra_date_chini_rauza_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「そうか。わたしもだけど、何か聞けたらって思ってた。もう少し見てみよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「わたしも。すぐ答えが出るより、ちょっと安心した」
    }
    -> after_first

=== after_first ===
# speaker: narrator
彼女は腕を組み、壁を見たまま小さく口を動かした。何か思いついたようにこちらを向く。
# speaker: heroine
# emotion: serious
「遠い水を、焼きつけたような……」
# speaker: narrator
そこまで言って、彼女は自分で吹き出した。声を抑え、もう一度壁へ顔を戻す。
# speaker: heroine
# emotion: exasperated
「だめ。言ってみたら、急に恥ずかしくなった。今の、どうしよう」

* [「そのまま覚えておいていいと思う」]
    # effect: gt_agra_date_chini_rauza_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「わたしは、まだ直したいな。きれいに言おうとしすぎた気がする」
    - else:
        # speaker: heroine
        # emotion: shy
        「笑わずに聞いてくれたんだ。じゃあ、消さずにおこうかな」
    }
    -> ending
* [「今の言い方、けっこう好きだよ」]
    # effect: gt_agra_date_chini_rauza_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「うれしいけど、すぐ褒められると、言い直せなくなるよ。少し考えさせて」
    - else:
        # speaker: heroine
        # emotion: shy
        「ほんとに？　……じゃあ、今のは{player_address}にだけ聞いてもらったことにする」
    }
    -> ending
* [「自分なら、きれいな青に戻る」]
    # effect: gt_agra_date_chini_rauza_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「戻るのもいいけど、わたしはもう一回だけ試したいな。せっかく考えたから」
    - else:
        # speaker: heroine
        # emotion: smile
        「それもいいね。目の前で言えば、ちゃんと同じ色を見られるし」
    }
    -> ending

=== ending ===
# speaker: narrator
しばらくして、彼女は説明をやめた。ただ、青の残るところを一つ指し、こちらが同じところを見るまで待つ。
# speaker: heroine
# emotion: smile
「ここ。わたしは、ここの色が好き」
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: heroine
# emotion: teasing
「さっきの詩は、次に会ったとき、急に読み上げたりしないでね。まだ制作中だから」
}
# speaker: narrator
その色にぴったりの名前は、最後まで決まらなかった。帰る前に、二人でもう一度、同じ場所を確かめた。
-> END
