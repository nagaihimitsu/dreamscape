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
# background: gt_bg_delhi_humayun_tomb
# speaker: narrator
水路沿いの木陰で、{heroine_name}が廟のドームを見上げていたとき、誰かに腕をつかまれた。
# speaker: narrator
二十歳くらいの女の子だった。隣に、同じくらいの年の青年。二人とも、顔から血の気が引いている。
# speaker: narrator
「お願い、十分だけ友達になって！」
# speaker: heroine
# reaction: heroine,surprised,interrobang
「と、友達？　今から？」
# speaker: narrator
女の子はメヘル、青年はカビールと名乗った。大学の同級生。西門から、メヘルの叔父が入ってきたのだという。
# speaker: narrator
二人きりでいるところを見られたら、夕飯の前に母親に知れる。そして母親に知れたら、親戚中に知れる。メヘルは早口でそう説明した。
# speaker: narrator
「カビールは歴史学科だから、外国のお友達を案内してるってことにする。あなたたちは、わたしの文通相手。お願い！」
# speaker: heroine
# emotion: worried
「え、でも、わたし、嘘は……」
# speaker: enemy
「メヘル！」
# speaker: narrator
返事より先に、太い声が飛んできた。口ひげ、腹の上で張ったクルタ、手にはなぜか新聞。大股で近づいてくる。
# speaker: enemy
「こんな所で何をしている。……そっちの若いのは誰だ」
# speaker: narrator
メヘルが、外国の友達とガイド役の同級生だと説明する。{heroine_name}は否定しなかった。否定しそびれた、の方が近い。
# speaker: enemy
「スレーシュだ。この子の叔父。所得税の調査官を三十五年やった。話の合わない申告は、匂いで分かる」
# speaker: narrator
スレーシュはこちらに鼻を向け、本当に匂いをかぐ仕草をした。それから新聞を丸め、指揮棒のように振る。
# speaker: enemy
「案内してもらったんなら、答えられるな？　ここに眠る皇帝は、どうやって死んだ」
-> END

=== after_first ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「……図書室の階段。ほう。ちゃんと聞いていたようだな」
    # speaker: narrator
    カビールの肩が、目に見えて下がった。息を止めていたらしい。
- else:
    # speaker: enemy
    # reaction: enemy,question
    「ガイドがいて、それか？　書庫の階段から落ちたんだ。礼拝の声に振り向いてな」
    # speaker: narrator
    カビールが慌てて「説明はしたんです、忘れちゃったんです」と口を挟む。スレーシュの目が細くなった。
}
# speaker: narrator
スレーシュが手帳に何か書き込む隙に、メヘルが{heroine_name}の耳元でささやく。「ありがとう、あと少しだけ」
# speaker: heroine
# emotion: worried
「……ごめんなさい。黙ってるのも、嘘の一部みたいで、苦しいの」
# speaker: narrator
メヘルの目が一瞬揺れた。けれど、叔父が振り返る方が早かった。
# speaker: enemy
「次の項目。帳簿は入口から見るものだ。入ってすぐ、最初に見た墓。あれは誰の墓だ」
# speaker: narrator
新聞の先が、正門の方を指した。カビールが答えかけ、叔父の一睨みで口を閉じる。
# speaker: enemy
「お前には聞いていない。お客さんに聞いている」
-> END

=== after_second ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「イーサー・ハーン。正解だ。……フマユーンの廟の入口で、別の王に仕えた男の墓が出迎える。面白いだろう」
    # speaker: narrator
    スレーシュは問題を出した側なのに、少し得意そうだった。
- else:
    # speaker: enemy
    「違う。イーサー・ハーン、シェール・シャーの宮廷の男だ。フマユーンの廟より古い。入口の申告で、もうつまずいたな」
    # speaker: narrator
    メヘルの手が、{heroine_name}の袖を強く握った。
}
# speaker: narrator
スレーシュは腕時計を見た。三度目だった。視線が、こちらではなく東の門の方へ流れる。
# speaker: narrator
クルタの胸ポケットから、赤いものが少しのぞいていた。薔薇だ。新聞で隠すように、彼は姿勢を変えた。
# speaker: heroine
# reaction: heroine,teasing,question
「……あの、スレーシュさん。どなたかと、待ち合わせですか？」
# speaker: enemy
# reaction: enemy,sweat
「調査官に質問するな。質問するのはわたしだ」
# speaker: narrator
咳払いを一つ。声が、少しだけ大きくなった。
# speaker: enemy
「最後の項目だ。千八百五十七年の九月、この廟で何があった」
-> END

=== conclusion ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「最後の皇帝が、先祖の墓に逃げ込んで、ここで捕まった。……合格だ。申告に誤りなし」
- else:
    # speaker: enemy
    「最後の皇帝が、ここで捕まったんだ。先祖の墓に逃げ込んでな。……まあ、いい。合格にしてやる」
}
# speaker: narrator
そのとき、東の門の方から女性の声がした。「スレーシュ！」
# speaker: narrator
淡い色のサリーの女性が、手を振っている。スレーシュの手から新聞が落ち、胸ポケットの薔薇が、全員の前にあらわになった。
# speaker: narrator
メヘルの目が、ゆっくり細くなる。「……叔父さん。その薔薇、誰に？」
# speaker: enemy
# reaction: enemy,sweat
「大学の同級生だ。四十年ぶりに連絡が来て……いや、違う、これは調査だ」
# speaker: narrator
沈黙。庭の水路の上を、風だけが渡っていく。最初に口を開いたのはスレーシュだった。
# speaker: enemy
「提案がある。今日この廟で、誰も、誰にも会わなかった」
# speaker: narrator
「異議なし」とメヘルが即答し、カビールが何度もうなずいた。三人の視線が、そろって{heroine_name}に向く。
# speaker: heroine
# emotion: serious
「わたしは、誰にも言いません。言う相手もいないですし。……でも、いつかお母さんに、自分の口で言えたらいいなって思います。二人とも」
# speaker: enemy
「二人とも、とは。……わしも入っているのか」
# speaker: heroine
「入ってます」
# speaker: narrator
スレーシュは落ちた新聞を拾い、少し笑った。
# speaker: enemy
「税務署に三十五年いて分かったことがある。いちばん申告が合わないのは、家族の帳簿だ。わしの頃も、若いのはみんなここで会っていたよ」
{
- battle_score == 3:
    # speaker: enemy
    「君の申告は完璧だった。調査官として言う。……完璧すぎて、むしろ怪しかった」
- battle_score == 2:
    # speaker: enemy
    「君の申告には一か所だけ誤りがあった。今日は修正申告で許す」
- else:
    # speaker: enemy
    「君の申告は穴だらけだ。だが今日、わしは誰にも会っていないから、何も見なかった」
}
# speaker: narrator
叔父は東の門へ、若い二人は西の門へ。互いに振り返らないまま、別々の方向へ歩いていった。
# speaker: heroine
# reaction: heroine,exasperated,sigh
「……わたし、嘘の友達になって、嘘の共犯者になって、最後は監査に通っちゃった」
-> END
