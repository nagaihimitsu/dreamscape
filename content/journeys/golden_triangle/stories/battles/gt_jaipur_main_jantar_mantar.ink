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
ジャンタル・マンタルで、男性が腕時計を見て、鼻で笑った。そのすぐあと、また同じ時計を見る。
# speaker: enemy
「今の時刻を、見せてもらえるかい。こいつは今日、働いていない」
# speaker: narrator
画面を示すと、男性は自分の腕時計から目をそらした。時計修理屋のディーペンだと名乗る。
# speaker: heroine
「故障ですか？」
# speaker: enemy
「自分で止めた。休日まで時刻を気にするのは、やめようと思ってね」
# speaker: heroine
# reaction: heroine,teasing,music
「それで天文台に来たんですか。もっと大きい時間の道具が、こんなにあるのに」
# speaker: enemy
「……それは、家を出る前に言ってほしかった」
# speaker: narrator
彼女が笑うと、ディーペンも観測器の方を見て口元を緩めた。
# speaker: enemy
「仕事じゃないから、分からないものを見ていられるのはいいね。直せと言われたら困る大きさだ」
# speaker: heroine
# emotion: surprised
「そもそも、どこを見て使うんでしょう。大きさにびっくりして、道具として見られてませんでした」
# speaker: narrator
彼女は見学路の案内を開く。目の前の固定式装置が、何を測るためのものなのか確かめる。
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「巨大な固定式の装置で、肉眼による天体位置の観測。そうだね、まず目が働く」
- else:
「巨大な固定式の装置で、肉眼で天体の位置を測る。望遠鏡が見つからないわけだ」
}
# speaker: heroine
「時計屋さんの机には、乗らないですね」
# speaker: enemy
「修理を断る理由が一つ増えた」
# speaker: narrator
言い終わる前に、彼はまた腕を上げた。袖で時計を隠し、何事もなかったように空を向く。
# speaker: heroine
# reaction: heroine,teasing,question
「時刻、気になります？」
# speaker: enemy
「癖だよ。誰にも急かされていない。たぶん」
# speaker: narrator
最後の言葉だけ弱い。彼は首をひねったが、観測所を築いた知識はどこから来たのか、という説明に目を留めると、その続きを読み始めた。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「違う文化の知識が出会った場所なんですね。知らない仕組みを、誰かに教わることもあったんだ」
- else:
「いろんな文化の天文学が交わったんですね。一人で全部考えたように思ってました」
}
# speaker: enemy
「私も人に聞くよ。店の看板は私の名前だが、知恵を全部自前にしたら、たちまち店が止まる」
# speaker: narrator
鞄の中で電話が震えた。画面を見た彼の指が止まる。
# speaker: enemy
# reaction: enemy,interrobang
「姉だ。……しまった。見学のあと、一緒に食べる約束をしていた」
# speaker: heroine
# reaction: heroine,surprised,exclamation
「急かす人、いましたね！」
# speaker: narrator
彼は電話に出て、自分のいる場所を伝えた。走り出しはせず、近くで待つ姉に短く謝る。
# speaker: enemy
「私一人の時刻を止めたつもりだったんだが。他の人の用事まで止まらないんだった」
# speaker: narrator
彼は閉じかけた案内の一節を指す。空を知ることが、社会や人の営みにも関わったという箇所だった。
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「観測所は科学だけでなく、王の権威や社会、信仰とも結びついていた。誰か一人の道具じゃない」
- else:
「王の権威や社会、信仰とも結びついていたんだね。空の研究だけで閉じた場所ではなかった」
}
# speaker: heroine
「今は、お姉さんが待つ時間とも結びついてます」
# speaker: enemy
「今日の私を説明板に足さないでくれ」
# speaker: narrator
ディーペンは腕時計を外し、鞄へしまう。代わりに電話の画面を確かめた。
# speaker: enemy
{ battle_score == 3:
「君たちは全部つながった。私は、約束と時刻がつながっていなかった」
- else:
「分からないところは残ったな。続きはまた来る。今日は待たせた相手がいる」
}
# speaker: heroine
# emotion: smile
「時計、また動かすんですか？」
# speaker: enemy
「あとでね。まず姉に、余計な言い訳をしない。それがいちばん難しい修理だ」
# speaker: narrator
彼は歩いて去る。二人は背中を見送り、やっと笑った。大きな装置の上には、変わらず空がある。
# speaker: heroine
# reaction: heroine,happy,music
「今日の修理はお断り、だったのにね」
# speaker: narrator
彼女は装置の縁から空へ続く眺めを短く撮った。再生してから、動画の最後の候補へ置く。
# speaker: heroine
「最後に声を入れるなら、ここかな。今は、まだ何て言うか決まらないけど」
-> END
