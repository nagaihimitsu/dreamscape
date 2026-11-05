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

# background: gt_bg_delhi_agrasen_baoli
# speaker: narrator
アグラセン・キ・バオリの入口で、二人は見学できる範囲を確かめた。街路からは想像しなかった奥行きが、地面の下へ開いている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
「わ、こんなに下まで。ここ、入ってみたい」
# speaker: narrator
そう言った{heroine_name}の足が、広い見学路の途中で止まった。何でもないような顔で、案内を読み始める。
# speaker: heroine
「階段井戸。百三段……へえ、百三段なんだね」
# speaker: narrator
同じ数字をもう一度読んだところで、彼女はこちらを見た。
# speaker: heroine
# reaction: heroine,worried,sweat
「ごめん。怖くないふりをしてた。下が見えたら、膝が変な感じになっちゃって」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女は急いで笑おうとしたが、途中でやめた。
- else:
    # speaker: heroine
    # emotion: exasperated
    「入口のわたし、返事が早すぎたね」
}

* [「探検隊長、撤退の判断もお仕事です」]
    # effect: gt_delhi_date_agrasen_baoli_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「笑う前に、今ほんとに怖いって聞いてほしかった」
        # speaker: narrator
        こちらが姿勢を戻すと、彼女は手に力が入っていたことに気づき、指を開いた。
    - else:
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「隊長、就任してすぐ撤退かあ。……でも、その仕事はできそう」
        # speaker: narrator
        息を吐いた彼女は、下ではなく、今立っている足元から確かめた。
    }
    -> after_first

* [「自分も、底を見たら膝にきた」]
    # effect: gt_delhi_date_agrasen_baoli_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,question
        「それ、本当？　わたしを安心させるために言ってるなら、そうしなくていいよ」
        # speaker: narrator
        こちらがゆっくり腰を引くと、彼女もようやく、相手の足を見た。
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        「二人とも平気な顔してたの？　じゃあ、先へ行こうって言い合うところだったね」
        # speaker: narrator
        彼女は困った顔のまま笑った。無理に進む人がいなくなり、二人の足は落ち着く。
    }
    -> after_first

* [「ここから眺めよう。進むかは後で決めよう」]
    # effect: gt_delhi_date_agrasen_baoli_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,question
        「待って。戻りたいって決めたわけでもないの。少しだけ、わたしに決めさせて」
        # speaker: narrator
        こちらは足を止め、彼女が目を上げるのを待った。
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。それなら、見ていたい。怖いけど、嫌いになったわけじゃないから」
        # speaker: narrator
        彼女は呼吸を整え、顔だけを奥へ向けた。
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人は幅のある通路に留まる。下へ続く階段の両側に、幾重にもアーチが重なっていた。
# speaker: heroine
# emotion: serious
「水に届くために、下へ行く階段なんだね。わたし、今まで階段って、上に何かあるものだと思ってた」
# speaker: narrator
彼女は一歩だけ、同じ高さの通路を横へ動く。重なっていた線が離れ、奥が少し見えた。
# speaker: heroine
# reaction: heroine,happy,sparkle
「あ、ここなら見られる。下へ行かなくても、こっちに動けばよかった」
# speaker: narrator
勇ましい顔には戻らない。怖さを抱えたまま、彼女は自分で選んだ場所から、しばらく眺めていた。
# speaker: heroine
「帰る時は、ちょっと手を借りようかな。足元より、目が勝手に下を見ちゃう」

* [「戻ってからも、手をつないでいたい」]
    # effect: gt_delhi_date_agrasen_baoli_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,interrobang
        「帰り道の続きまで？　今は、ここの出口まででお願いします」
        # speaker: narrator
        彼女は範囲を確かめてから、差し出された手を取った。こちらも、その先を勝手に決めなかった。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「怖いから、っていう口実を使ってたのに。先に言わないでよ」
        { ending_reached:
            # speaker: heroine
            「うん。外まで。外に出たら、今度はわたしが決めるね」
        - else:
            # speaker: heroine
            「……外に出てから、もう一度聞いて。その時、ちゃんと答える」
        }
        # speaker: narrator
        彼女は自分から手を重ねた。先を引かれるのでなく、隣にいるための重さだった。
    }
    -> ending

* [「怖いって言ってくれて、ほっとした」]
    # effect: gt_delhi_date_agrasen_baoli_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「わたしは、言うまで全然ほっとしてなかったよ。頼みたいのに、言いにくい時もあるんだから」
        # speaker: narrator
        彼女は少し唇を尖らせながら、隣を歩ける位置に手を差し出した。
    - else:
        # speaker: heroine
        # emotion: smile
        「わたしも。平気なふり、帰りまで続けなくて済んだ」
        # speaker: narrator
        彼女は手を借り、握る強さを自分で加減した。
    }
    -> ending

* [「隊長、手を貸す部隊が一名、待機中です」]
    # effect: gt_delhi_date_agrasen_baoli_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「肩書きはもう外して。普通に隣で歩いてくれたらいいの」
        # speaker: narrator
        こちらが手を下げると、彼女は引き止めた。手は借りる。ただ、芝居はいらないらしい。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「では任務です。わたしより先に、すたすた歩いて行かないこと」
        # speaker: narrator
        彼女がこちらの手を取り、自分の歩幅で向きを変える。隊長の指示は、今度ははっきりしていた。
    }
    -> ending

=== ending ===
# speaker: narrator
同じ見学路を戻り、足元が落ち着くところで二人は立ち止まった。彼女は一度手を離し、井戸の方を振り返る。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # reaction: heroine,smile,blush
    「もう、ここなら平気。……今度は、怖くない方の手を貸してもらっていい？」
    # speaker: narrator
    彼女は返事を待ってから、もう一度、隣の手を取った。
- else:
    # speaker: heroine
    # emotion: smile
    「ありがとう。ここからは自分で歩ける。あの横の一歩、戻る前に見つけてよかった」
}
# speaker: narrator
百三という数字を数え切らなくても、彼女は自分が立った場所を、きちんと覚えていた。
-> END
