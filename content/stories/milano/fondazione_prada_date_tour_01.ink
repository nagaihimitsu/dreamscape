// 蒸留所の跡に残るものと、新しく置くもの。
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
「ここ、昔は蒸留所だったんですね」
「古いものを全部消さずに、隣に新しいものを置いたんですね」
{ has_memory("milano_brera_first_listen"):
    「ブレラの絵でも、行く足か戻る足か、二人で迷いましたね」
}
# speaker: heroine
「昔の自分の失敗も、ここに残したら作品になるのかな」

* [「失敗の横に『触らないでください』って札を立てる」]
    # effect: milano_fondazione_prada_first_a
    # speaker: heroine
    # emotion: smile
    「それでも触る人、絶対いますよ」
    「あなたも今、触ろうとしましたよね」
    -> after_first
* [「残すかどうか、自分で決められるといいね」]
    # effect: milano_fondazione_prada_first_b
    # speaker: heroine
    「それなら、一つくらいは残してもいいかも」
    # speaker: narrator
    彼女は古い壁と新しい建物を交互に見た。
    -> after_first
* [「昔の失敗なんて、忘れたほうがいいよ」]
    # effect: milano_fondazione_prada_first_c
    # speaker: heroine
    # emotion: serious
    「忘れたくない失敗もありますよ」
    「……人には見せたくないですけど」
    -> after_first

=== after_first ===
# speaker: heroine
「実は、一つだけ絶対に展示したくない失敗があるんです」
「何かは聞かないでくださいね」

* [「分かった。説明札も、今日は伏せておこう」]
    # effect: milano_fondazione_prada_second_a
    # speaker: heroine
    # emotion: smile
    「はい。非公開の収蔵品です」
    -> ending
* [「余計に気になる。ひとつだけ教えて」]
    # effect: milano_fondazione_prada_second_b
    # speaker: heroine
    { romance_stage < 3:
        # emotion: worried
        「……聞かないでって、言いましたよ」
        「いつか話すかもしれないけど、今日は違います」
    - else:
        # emotion: teasing
        「気になります？　じゃあ、もう少しだけ秘密にします」
    }
    -> ending
* [「じゃあ僕の失敗を先に話す。君のは言わなくていい」]
    # effect: milano_fondazione_prada_second_c
    # speaker: heroine
    # emotion: smile
    「それ、私だけ得してませんか」
    「……聞きますけど」
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
