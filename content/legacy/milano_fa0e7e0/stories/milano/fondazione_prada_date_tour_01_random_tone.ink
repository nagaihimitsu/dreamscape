// 蒸留所の跡に残るものと、新しく置くもの。
VAR romance_result = "neutral"
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
EXTERNAL has_memory(memory_id)

# background: milano_fondazione_prada_date
# speaker: narrator
プラダ財団の中庭。古い建物のそばに、新しい建物が並んでいる。
# speaker: heroine
{
- relationship_tone == "strained":
    # emotion: serious
    「別々に見て、気になったものだけ後で話しましょうか」
- relationship_tone == "guarded_attraction":
    # emotion: shy
    「あなたが何を見るのか、少し気になります」
- relationship_tone == "comfortable":
    # emotion: smile
    「私は壁から見ます。あなたは、どちらから？」
- relationship_tone == "warm":
    # emotion: smile
    「別々のものを見つけても、後で教え合えますね」
- relationship_tone == "romantic_tension":
    # emotion: shy
    「同じものを見つけたら、先に言ってくださいね」
- relationship_tone == "reserved":
    # emotion: neutral
    「まずは中庭から見てみたいです」
}
「ここ、昔は蒸留所だったんですね」
「古いものを全部消さずに、隣に新しいものを置いたんですね」
{ has_memory("milano_brera_first_listen"):
    「ブレラの絵でも、行く足か戻る足か、二人で迷いましたね」
}
# speaker: heroine
「昔の自分の失敗も、ここに残したら作品になるのかな」

* [「失敗の横に『触らないでください』って札を立てる」]
    # effect: milano_fondazione_prada_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「札を立てると、かえって目立ちません？」
        「その失敗だけは、見えないところに置きたいです」
    - else:
        # speaker: heroine
        # emotion: smile
        「それでも触る人、絶対いますよ」
        「あなたも今、触ろうとしましたよね」
    }
    -> after_first
* [「残すかどうか、自分で決められるといいね」]
    # effect: milano_fondazione_prada_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「決められるといいんですけど、迷っているところなんです」
        「少しだけ、壁を見ていてもいいですか」
    - else:
        # speaker: heroine
        「それなら、一つくらいは残してもいいかも」
        # speaker: narrator
        彼女は古い壁と新しい建物を交互に見た。
    }
    -> after_first
* [「昔の失敗なんて、忘れたほうがいいよ」]
    # effect: milano_fondazione_prada_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「忘れてしまったら、あのとき考えたことまで消えそう」
        「私は、残しておきたいです」
    - else:
        # speaker: heroine
        # emotion: serious
        「忘れたくない失敗もありますよ」
        「……人には見せたくないですけど」
    }
    -> after_first

=== after_first ===
# speaker: heroine
「実は、一つだけ絶対に展示したくない失敗があるんです」
「何かは聞かないでくださいね」
# speaker: heroine
{
- relationship_tone_after == "strained":
    # emotion: serious
    「忘れるかどうかも、まだ決めてないんです」
- relationship_tone_after == "guarded_attraction":
    # emotion: shy
    「そんなに見られると、秘密の顔まで読まれそう」
- relationship_tone_after == "comfortable":
    # emotion: smile
    「いつか話せる日が来ても、笑わないでくださいね」
- relationship_tone_after == "warm":
    # emotion: smile
    「話せる日が来たら、たぶん最初に笑ってしまいます」
- relationship_tone_after == "romantic_tension":
    # emotion: teasing
    「いつか話すかも。でも、今はまだ非公開です」
- relationship_tone_after == "reserved":
    # emotion: neutral
    「これは、もう少し自分で考えたいんです」
}

* [「分かった。説明札も、今日は伏せておこう」]
    # effect: milano_fondazione_prada_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「伏せた札まであると、余計に気になりそう」
        「……何も置かないことにします」
    - else:
        # speaker: heroine
        # emotion: smile
        「はい。非公開の収蔵品です」
    }
    -> ending
* [「余計に気になる。ひとつだけ教えて」]
    # effect: milano_fondazione_prada_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「聞かないでって言ったのに」
        「いつか話すかもしれません。でも、今日は秘密です」
    - else:
        # speaker: heroine
        { romance_stage < 3:
            # emotion: worried
            「……聞かないでって、言いましたよ」
            「いつか話すかもしれないけど、今日は違います」
        - else:
            # emotion: teasing
            「気になります？　じゃあ、もう少しだけ秘密にします」
        }
    }
    -> ending
* [「じゃあ僕の失敗を先に話す。君のは言わなくていい」]
    # effect: milano_fondazione_prada_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「私が黙っているからって、無理に話さなくて大丈夫ですよ」
        「話したくなったら、聞きます」
    - else:
        # speaker: heroine
        # emotion: smile
        「それ、私だけ得してませんか」
        「……聞きますけど」
    }
    -> ending

=== ending ===
# speaker: narrator
二人は中庭を横切り、古い建物の影から新しい壁のほうへ歩いた。
{ ending_reached:
    # speaker: heroine
    # emotion: teasing
    「あなたの失敗、展示するときは私にも知らせてください」
- else:
    # speaker: heroine
    「残すものを選ぶのも、意外と難しそう」
}
-> END
