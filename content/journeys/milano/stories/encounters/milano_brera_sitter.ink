VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で、素描の学生がこちらに声をかけた。「五秒だけモデル、お願いしていいですか。動く前の人の膝が描けなくて」
# speaker: heroine
「五秒なら。あ、私、もう動くつもりで膝を固めちゃった。」

* [I'll be the one about to leave. # option: pose # translation: 出ていく直前の役をやるよ。]
    # speaker: narrator
    一歩を宙に止めると、学生は鉛筆を下ろした。「もう残る人の膝です。帰っていいですよ」。歩き出した瞬間だけ、鉛筆が動いた。
    -> END

* [I'll count to five. # option: count # translation: 五秒数えるよ。]
    # speaker: narrator
    五、と言ったところで、彼女は肩を下ろした。学生「その後の六秒目、いまの膝です」。
    # speaker: heroine
    「契約延長は、一度だけですよ。」
    -> END

* [I'd rather stay out of the sketch. # option: decline # translation: 私は絵の外にいたいです。]
    # speaker: narrator
    学生はすぐスケッチ帳を閉じた。「了解。今日いちばん早く立ち去れそうな膝だったから惜しいけど」。
    # speaker: heroine
    「断った後の足が、一番描くのに向いてたね。」
    -> END
