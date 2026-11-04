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

# background: gt_bg_agra_akbar_tomb
# speaker: narrator
アクバル廟の門を見上げた{heroine_name}が、スマートフォンへ短いメモを打つ。画面には『門、すごい』の四文字だけが並んだ。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「こんなに細かい模様を見て、出てくる言葉がこれ。建物に申し訳ない気がしてきた」
# speaker: narrator
彼女はもう一度門を見て、急に澄ました顔を作った。
# speaker: heroine
# emotion: serious
「こちらにご覧いただけますのは、とても、かなり……門です」
# speaker: narrator
最後の二文字で、自分が先に吹き出す。こちらが笑うと、彼女は空いた手を差し出した。
# speaker: heroine
# reaction: heroine,teasing,music
「では、お客様。続きをお願いします。詳しいふりをして、知らないことを足すのは禁止です」

* [「結論としては、門、すごいです」]
    # effect: gt_agra_date_akbar_tomb_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「戻ってきた！　いや、お願いしたわたしが悪かった。説明係、二人とも解任です」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「ありがとうございました。すばらしく短い解説でした。……だめ、もう一回言わないで。笑っちゃう」
    }
    -> after_first
* [「自分も、最初はそれしか言えなかった」]
    # effect: gt_agra_date_akbar_tomb_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「うん。でも、今のはちょっと格好つけたかったの。正直に戻すの、早いよ」
    - else:
        # speaker: heroine
        # emotion: smile
        「同じか。よかった。じゃあ最初の一行は、二人の連名にしよう」
    }
    -> after_first
* [「門より、笑ってる君に見とれていました」]
    # effect: gt_agra_date_akbar_tomb_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,blush
        「観光の説明をお願いします！　……今はそれ以上言わないで。笑ってた顔、戻せなくなる」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「お客様、よそ見です。あとで個別に感想を伺います」
        - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「わたしの解説、そんな方向へ進むと思わなかった。……じゃあ、今のは書かないで、覚えておく」
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人で案内を読む。この墓廟は、アクバル自身が着工し、息子ジャハーンギールが完成させたとある。
# speaker: heroine
「一人で最後まで仕上げたわけじゃないんだ。始めた人と、続けた人がいる」
# speaker: narrator
彼女はメモに二人の名前を書き加えた。最初の四文字は、消していない。
# speaker: heroine
# emotion: smile
「じゃあ、わたしが感想を始めるから、続きを一行だけ。……『今日ここへ来て、よかったのは』」

* [「遠くと近くで、別の模様が見つかったこと」]
    # effect: gt_agra_date_akbar_tomb_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: smile
        「うん、そうなんだけど。今は、もう少しくだらないことが出てくるかと思って身構えてた」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「それ、わたしも書きたい。大きい、で終わらない門だったね」
    }
    -> ending
* [「君と来たから。次も、理由は同じでいい」]
    # effect: gt_agra_date_akbar_tomb_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,blush
        「それだけにしないで。わたしがいなくても、この門はすごいよ。……一緒に来たいってところは、聞いたけど」
    - else:
        { relationship_tone_after == "reserved" || relationship_tone_after == "strained":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「びっくりした。今すぐ同じ返事はできないけど、今日、言ってくれたことはうれしい」
        - else:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「では、わたしの続き。『次は、わたしが誘いたくなったこと』。一行、ちゃんと使いました」
        }
    }
    -> ending
* [「偉大な門の前で、二人とも語彙を失ったこと」]
    # effect: gt_agra_date_akbar_tomb_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「一応、名前は覚えたよ。全部なくしたことにはしないでください」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「語彙の捜索は打ち切ります。実物がすごかったので、仕方ありません」
    }
    -> ending

=== ending ===
# speaker: narrator
書き足そうとした彼女は、画面を閉じた。まだ見ていない方へ、自分から歩き出す。
# speaker: heroine
# emotion: smile
「続きは、出る時に。次の感想が『建物、すごい』でも、笑わない……いや、少しは笑っていいよ」
{ relationship_tone_after == "comfortable" || relationship_tone_after == "warm":
# speaker: heroine
# reaction: heroine,teasing,music
「ただし、わたしより先に笑うのは禁止。自分でも気付いてるから」
- else:
# speaker: narrator
二人は同じ所を見上げ、今度は言葉を足さずに門をくぐった。
}
-> END
