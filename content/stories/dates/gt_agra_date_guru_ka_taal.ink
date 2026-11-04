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

# background: gt_bg_agra_guru_ka_taal
# speaker: narrator
グル・カ・タールで、二人は案内に従って靴を預け、頭を覆った。{heroine_name}は身支度を確かめてから、砂岩の塔を指す。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「あそこ、形が違う。わたしは、先に塔の方を見たいな」
# speaker: narrator
彼女が目で合図する。こちらが出口の方を見ると、彼女は慌てて手を振った。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「帰ろう、じゃないです。今、来たところです」
{ relationship_tone == "reserved" || relationship_tone == "strained":
# speaker: heroine
「言わなくても伝わると思ったの、少し早かったかな」
- else:
# speaker: heroine
# emotion: teasing
「気持ちが通じる相手でも、方向は通じないみたい」
}

* [「右目が塔で、左目が出口だった？」]
    # effect: gt_agra_date_guru_ka_taal_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「わたしの顔、案内図じゃないよ。混ぜないで、ちゃんと聞いて」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「どっちも塔です。……もう、次から指と声も使います」
    }
    -> after_first
* [「先に、塔のことを一緒に確かめよう」]
    # effect: gt_agra_date_guru_ka_taal_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。でも、そっちが見たかった所も教えてね。全部任せられると、少し緊張する」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。今度は、伝わった。何の塔なのか、あの説明を見たい」
    }
    -> after_first
* [「君に見つめられて、方向が分からなくなった」]
    # effect: gt_agra_date_guru_ka_taal_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,sweat
        「格好つけるのはあと。わたし、今はちゃんと見学したい」
    - else:
        { ending_reached:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「はいはい。じゃあ、こちらを向きすぎないように。足元も、塔もあります」
        - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「えっ。……わたしも、どっちを見るか忘れちゃった。まず塔。二人とも、塔です」
        }
    }
    -> after_first

=== after_first ===
# speaker: narrator
案内を読むと、砂岩の塔は、かつての貯水施設ともつながるものだと分かった。見学できる範囲を確かめ、二人は塔と建物を眺めた。
# speaker: heroine
# emotion: neutral
「水をためる場所の話が、ここにも残ってるんだね。今の建物だけだと思ってた」
# speaker: narrator
礼拝する人の流れに合わせて、二人は静かに見学した。出る時、彼女は指を使って出口を示す。今度は、間違えなかった。
# speaker: narrator
靴を受け取り、身支度を整える。彼女は入口を離れてから、こちらの顔をじっと見た。
# speaker: heroine
# reaction: heroine,teasing,question
「今の顔は、どういう意味でしょう。場所の案内ではありません」

* [「分からないから、言葉でも聞きたい」]
    # effect: gt_agra_date_guru_ka_taal_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「そうだよね。ちょっとだけ、当ててもらいたかったんだけど。顔の問題は、難しかった」
    - else:
        # speaker: heroine
        # emotion: smile
        「正直でよろしい。『付き合ってくれて、ありがとう』でした。言葉で言った方が、わたしも照れるね」
    }
    -> ending
* [「もう少し一緒にいたい、だったらうれしい」]
    # effect: gt_agra_date_guru_ka_taal_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,blush
        「わたしの台詞を、そっちの希望にしないで。……今は、ありがとうって顔だったの」
    - else:
        { relationship_tone_after == "reserved" || relationship_tone_after == "strained":
        # speaker: heroine
        # reaction: heroine,shy,blush
        「答えは違ったけど、そう言ってくれたのはうれしい。もう少し歩くくらいなら、うん」
        - else:
        # speaker: heroine
        # reaction: heroine,teasing,heart
        「惜しい。『ありがとう』だった。でも、その続きとしては、採用したいです」
        }
    }
    -> ending
* [「次からは字幕を付けてください」]
    # effect: gt_agra_date_guru_ka_taal_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「全部説明するの、わたしだけ？　そっちも、たまには先に言ってね」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「では字幕。『塔を見たかった人は、満足しています』。これで伝わりましたか」
    }
    -> ending

=== ending ===
# speaker: narrator
彼女はもう一度塔を振り返った。次にこちらを向いた時は、顔だけで伝えようとしなかった。
# speaker: heroine
# emotion: smile
「今日は、見たい方に付き合ってくれてありがとう。帰りは、そっちが気になったものも教えてね」
{ relationship_tone_after == "warm" || relationship_tone_after == "comfortable":
# speaker: heroine
# reaction: heroine,teasing,music
「目だけで言うと、今度はわたしが違う方へ行くからね」
- else:
# speaker: narrator
こちらがうなずくのを確かめ、彼女は隣へ並んだ。出発の合図は、それで通じた。
}
-> END
