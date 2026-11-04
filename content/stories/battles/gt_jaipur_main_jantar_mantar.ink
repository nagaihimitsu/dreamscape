VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_jantar_mantar
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
ジャンタル・マンタルの見学路で、男性が腕時計を見てから首をかしげる。同じ動きを三度繰り返したところで、目が合った。
# speaker: enemy
「すまない、今の時刻を見せてもらえるかな。今日はこれを止めてきたのに、つい見てしまう」
# speaker: narrator
スマートフォンを示すと、男性は礼を言って腕を下ろした。自分から、ディーペンという時計修理屋だと話し始める。
# speaker: heroine
「止めてきたんですか。壊れたんじゃなくて？」
# speaker: enemy
「休日くらい、針に急かされるのをやめたくてね。外してくればよかったと、今気づいた」
# speaker: heroine
# emotion: happy
「それで、今日は天文台に。もっと大きな時間の道具を見に来ちゃったんですね」
# speaker: enemy
「言われてみれば、その通りだ。しかも、目盛りを見ていると時間を忘れる」
# speaker: narrator
彼は頭上の構造物を見上げ、嬉しそうに息をつく。道具を扱う手が、今日は何も持っていない。
# speaker: heroine
「わたしは、どこをどう見る道具なのかが気になります。形だけで用途が分かるものじゃないですね」
# speaker: enemy
「では、時計屋と一緒に確かめよう。私にも知らないことはある。まずは、この観測器が何をするものか」
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「そうだ。巨大な固定式の装置を使って、肉眼で天体の位置を測る」
- else:
「巨大な固定式の装置で、肉眼による天体の位置の観測をする。望遠鏡だけが空を知る道具ではないんだね」
}
# speaker: heroine
# emotion: surprised
「腕に乗る時計を直す人が、体よりずっと大きい道具を見上げてる。なんだか面白い」
# speaker: enemy
「今日の修理はお断りだよ。仕事机に乗らない」
# speaker: narrator
彼女が吹き出す。ディーペンは自分の両手を見てから、装置の長い辺へ視線を戻した。
# speaker: heroine
# emotion: smile
「これを造る時は、机の方を大きくするわけにもいかないですね。人も、いろんな仕事が必要そう」
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「違う文化の天文学が出会った場所なんですね。一人だけで、全部を思いついたわけじゃない」
- else:
「いろんな文明に伝わる知識が、ここで交わったんだ。独りで考える姿ばかり想像してました」
}
# speaker: enemy
「私も、知らない仕組みは人に聞く。店の看板に私の名前があっても、知恵まで全部私のものではない」
# speaker: narrator
彼は笑って、また腕時計へ目を落としかけた。途中で気づき、手を背中へ回す。
# speaker: heroine
# emotion: teasing
「今、見ないで済みましたね」
# speaker: enemy
「君に見張られている気がしてきた。最後の問いは、時間を知ることが、誰にとって大事だったかだ」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「そう。観測所は科学だけでなく、王の権威や社会、信仰とも結びついていた」
- else:
「空の研究だけではなかったんだ。王の権威や社会、信仰とも結びつく場所だった、と評価されている」
}
# speaker: heroine
「時間を知る人がいると、動き方が変わる人もいる。今日は時計を止めた人も、ここに来てるし」
# speaker: enemy
「私まで歴史に入れないでくれ。明日には店で、きちんと時刻を合わせているから」
# speaker: narrator
彼女は笑いながら、もう一度空を見上げた。建物のような観測器の向こうに、空が大きく広がっている。
# speaker: enemy
{ battle_score == 3:
「三つとも見事だった。次に来る時には、私の方が教わることが増えそうだ」
- else:
「一緒に確かめると、私も曖昧だったところが分かる。いい休日になったよ」
}
# speaker: heroine
「このあと、どうするんですか？」
# speaker: enemy
「もう一周。それから、何か食べる。そこは時刻を見なくても分かる」
# speaker: narrator
ディーペンが腹に手を当てた。彼女もつられて自分の腹を押さえ、少しだけ困った顔で笑った。
-> END
