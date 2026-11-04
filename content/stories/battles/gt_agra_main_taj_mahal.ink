VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_agra_taj_mahal
# speaker: narrator
タージ・マハルの庭で、スマートフォンを少し傾けては戻す男性がいる。{heroine_name}が通り道を空けると、彼は慌てて手を下ろした。
# speaker: enemy
「すみません。撮るの、終わっています。切り取る位置が決まらなくて」
# speaker: narrator
ファリドと名乗る男性の画面には、正面から撮った白い墓廟が映っていた。仕事は図案制作。今日は休みだという。
# speaker: heroine
# emotion: teasing
「休みの日も、端をそろえてるんですね」
# speaker: enemy
「職業のせいにしたいけど、性格かな。母に送る一枚なんです。こっちに来ると、いつも花の写真を要求される」
# speaker: heroine
「お母さん、タージ・マハルより花が見たいんですか？」
# speaker: enemy
「私が送れば、たいてい『花は？』と返る。建物なら、立派な写真がもうあるから」
# speaker: narrator
彼は苦笑し、案内の資料を開く。写真の収まりと、建物の造りを比べる遊びをしていたらしい。
# speaker: enemy
「三問、付き合いませんか。見た目で決めると、ちょっと引っかかる。資料を見ても大丈夫です」
# speaker: heroine
# emotion: smile
「やります。わたし、さっき『全部真ん中』って思いかけたので、もう引っかかってるかも」
# speaker: enemy
「いい出発点。最初は、この庭のどこに墓廟が置かれているか、です」
-> END

=== after_first ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: enemy
「そう。正面からの収まりと、庭全体の中心は別なんですね」
- else:
# speaker: enemy
「上からの配置を見ると分かります。庭の真ん中に、墓廟があるわけではないんです」
}
# speaker: heroine
# emotion: surprised
「ずっと奥まで見たくなるの、置き方にも理由があるんだ」
# speaker: narrator
ファリドは写真を拡大するのをやめ、水路の先を目で追った。
# speaker: enemy
「次は中にある石棺のこと。見えているものと、実際に葬られている場所は同じでしょうか」
-> END

=== after_second ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: heroine
「見せるための石棺と、その下のお墓。分けて考えるんだね」
- else:
# speaker: heroine
「あ、目に見える石棺が、そのまま本当のお墓だと思ってた」
}
# speaker: enemy
「地上の石棺は、故人をしのぶためのもの。実際の墓は下階にあるそうです」
# speaker: narrator
彼は静かに資料を閉じかけ、もう一度開いた。まだ最後の問いが残っている。
# speaker: enemy
「では、最後。何もかも左右対称、と言ってしまっていいか。二つの石棺の配置を見てください」
-> END

=== conclusion ===
# background: gt_bg_agra_taj_mahal
{ answer_correct:
# speaker: enemy
「その例外を見つけましたね。シャー・ジャハーンの石棺は、妃の隣に置かれています」
- else:
# speaker: enemy
「二つの石棺が並ぶところは、完全な左右対称ではありません。外の印象だけだと、見落としますね」
}
{ battle_score == 3:
# speaker: heroine
# emotion: happy
「三つとも分かった！　写真の中に、知らなかった奥行きが増えた感じ」
- else:
# speaker: heroine
# emotion: smile
「同じ白い建物なのに、最初に見たときより気になるところが増えちゃった」
}
# speaker: narrator
ファリドの画面に通知が届く。母親からの短い返事を見て、彼は声を立てずに笑った。
# speaker: enemy
「『あなたは写ってないの？』だって。今日は花じゃなかった」
# speaker: heroine
# emotion: teasing
「切り取る場所、かなり変わりましたね」
# speaker: narrator
彼は頼んでもいいかとスマートフォンを差し出した。こちらが受け取り、通行の邪魔にならない位置を確かめる。
# speaker: heroine
「はい、そこ。もう少しだけ顔を上げて。建物と一緒に、ちゃんと入ってます」
# speaker: narrator
撮れた一枚を見て、ファリドは拡大も切り抜きもせずに送信した。
-> END
