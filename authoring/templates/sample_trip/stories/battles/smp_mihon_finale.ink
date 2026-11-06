// 都市フィナーレ（stories/battles/<接頭辞>_<都市ID>_finale.ink）：都市の最後の対決。英語3択5問。
// - 場面は intro・after_1〜after_4・outro（battles/catalog.json の scope: "city_finale"）。
// - answer_correct と battle_score（0〜5）のどの組合せでも日本語の台詞が出るようにする。選択肢・# effect は置かない。
// - 勝ち負けで相手を改心させて終える定型にせず、相手にも筋の通った願いを持たせる。
// - 見本の人物と言い伝えは架空。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "after_3": -> after_third }
{ battle_scene == "after_4": -> after_fourth }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: smp_bg_mihon_clock_tower
# speaker: narrator
夕方の広場で、町長のハンナが図面を広げていた。新しい歯車の絵に、赤い丸がついている。
# speaker: enemy
「来月、時計を動かします。旅の人に『時間にいいかげんな街』と言われるのは、もう嫌なの」
# speaker: heroine
「動かしたら、三時の約束はどうなるんですか」
# speaker: enemy
「約束？　時計番から聞いたのね。いいわ、この街のことをどれだけ知ったか、聞かせて」
-> END

=== after_first ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「止まった時刻が約束になった。祖父の代の話ね。でも、今の旅人には伝わらないわ」
- else:
    # speaker: enemy
    「昔の人は、止まった三時を約束の言葉にしたの。ただ、今の旅人には伝わらない」
}
-> END

=== after_second ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「そう、壊れていると思われる。わたしが困っているのは、そこなのよ」
- else:
    # speaker: enemy
    「旅の人はまず、壊れていると思うの。わたしが困っているのは、そこ」
}
# speaker: heroine
「壊れてると思われるのが嫌なら、止まってる理由を伝える方法もありそうですね」
-> END

=== after_third ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「待つ人が文字盤を見られるように。……ベンチの向きまで、考えたことがなかった」
- else:
    # speaker: enemy
    「ベンチは、待っている人が文字盤を見られるように塔を向いているの。今朝、わたしも座ってみたわ」
}
-> END

=== after_fourth ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「戻ってきた人のための鐘。時計を動かしたら、あの子の仕事はどうなるのかしら」
- else:
    # speaker: enemy
    「鐘は、戻ってきた人がいるときに手で鳴らすの。トーマが毎朝油を差しているのは、そのためね」
}
# speaker: heroine
「動かすか残すか、街の人にも聞いてみませんか。トーマさんも、話したそうでした」
-> END

=== conclusion ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「『三時に会おう』。……子どもの頃、わたしもそう言って友達を呼んでいたわ」
- else:
    # speaker: enemy
    「この街では『三時に会おう』と誘うの。子どもの頃、わたしもそう言っていたわ」
}
{
- battle_score == 5:
    # speaker: enemy
    「図面はしまうわ。代わりに塔の下へ、言い伝えの札を立てる。旅の人が読めるように」
    # speaker: heroine
    「札の最後に、『来られるときに来て』って書いてほしいな」
- battle_score >= 3:
    # speaker: enemy
    「すぐには決めない。まず札を立てて、街の人の声を聞いてからにする」
- else:
    # speaker: enemy
    「わたしにも、知らないことが多かったわ。決めるのは、もう少し話を聞いてから」
}
# speaker: narrator
ハンナが図面を丸めると、塔の上でトーマが小さく手を振った。
-> END
