VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_city_palace
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
シティ・パレスの中庭で、女の子が父親の袖を引いた。父親は装飾の細部へ指を向けたまま、足を動かさない。
# speaker: narrator
「お父さんが、また迷子」と、女の子がこちらに言った。
# speaker: heroine
# reaction: heroine,worried,question
「どこへ行きたいの？　一緒に案内を見ようか」
# speaker: enemy
「迷ってはいない。ここの仕事が気になって、見ているだけだよ。木工職人のヴィクラムだ」
# speaker: narrator
女の子は父親を指し、次に自分の腕を組む。父親も同じ姿勢になった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「あ、行き先が分からない迷子じゃなくて……。お父さんが戻ってこない方ね」
# speaker: enemy
「娘の見たい所も、もちろん見る。ただ、その前にここを――」
# speaker: narrator
「その前、もう聞いた」と娘が言う。彼女は吹き出しかけ、口を押さえた。
# speaker: heroine
「わたしも、その前に一つ聞いていいですか。ここは王様の住まいなら、どうしてこんなに違う場所が集まってるんでしょう」
# speaker: enemy
「いい質問だ。それを聞かれると、短く済まない」
# speaker: narrator
娘が大きく肩を落とす。彼女は慌てて、説明の項目を指さした。まず、宮殿を使っていた人々のことから。
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「住まいだけでなく、行政、儀礼、人が集まる活動の場でもあった。その通りだ」
- else:
「王の住まいだけじゃない。行政や儀礼、人の集まる活動にも使われた場所なんだ」
}
# speaker: narrator
ヴィクラムは畳みかけるように手を動かした。娘が、その手の動きをひと呼吸遅れてそっくりまねる。
# speaker: heroine
# reaction: heroine,happy,music
「ふふっ、ごめんなさい。後ろに、小さい説明役が増えてて」
# speaker: enemy
「店でもやるんだ、そのまねを。客が私じゃなく娘を見る」
# speaker: narrator
「だって毎回長いんだもん」。娘の声に、彼は憮然とする。
# speaker: enemy
「仕事が見えないまま、出来たものだけ褒められるのは、好きじゃないんだよ」
# speaker: heroine
# emotion: serious
「その話は聞きたいです。でも、聞きたいのはわたしで……この子も、とは限らないですね」
# speaker: narrator
彼女は娘に場所を譲り、作品が宮殿へ届くまでの案内を開いた。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「宮廷が芸術や工芸を支えていた。注文する人の後ろに、仕事をする人もいたんですね」
- else:
「宮廷が芸術や工芸を支えていたんですね。飾られた品だけだと、頼んだ人までしか考えていませんでした」
}
# speaker: enemy
「板を短くするのを、ただ切るだけだと思われることがある。切ったあとで戻せと言われても、ね」
# speaker: narrator
娘が父親の袖をもう一度引いた。今度は引く長さを指で測っている。
# speaker: heroine
# reaction: heroine,teasing,music
「切る前に、相談が来てますよ」
# speaker: enemy
# reaction: enemy,sigh
「相談じゃなくて、督促だね」
# speaker: narrator
彼はようやく案内を娘へ渡した。だが、娘が展示品の写真を指すと、また口が開きかける。
# speaker: heroine
「それ、今は誰に見せるために置いてあるんでしょう。昔に頼んだ人と、今日ここへ来た人は違いますよね」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「収集され、制作を依頼された品が、博物館で文化を伝えている。今日来た人へ、ということだね」
- else:
「王家の収集や制作依頼による品々を、今は博物館で紹介している。昔の使い方のままではないんだ」
}
# speaker: narrator
娘が案内を開いたまま歩きだす。ヴィクラムは一歩だけ追い、その場に残った二人を振り返った。
# speaker: enemy
{ battle_score == 3:
「君たちは私の話をよく聞いてくれた。娘は聞いていないと思っていたが、口調まで覚えていた」
- else:
「説明は、長ければ伝わるわけじゃないね。……短くできるとは、約束しないけど」
}
# speaker: heroine
「はい。わたしも、途中で娘さんの味方をするつもりが、話を長くしちゃいました」
# speaker: narrator
「二人とも迷子だった！」と娘が言った。ヴィクラムがむっとし、彼女は今度こそこらえられずに笑った。
# speaker: heroine
# reaction: heroine,happy,music
「そうだね。わたしも迷子でした。案内、お願いします」
# speaker: narrator
父娘が先へ向かう。父親はまだ何か言いたそうだが、娘の指す方を見ている。彼女はスマートフォンを出しかけ、しまった。
# speaker: heroine
「今の、動画にないな。わたしが笑っちゃったから。……短くメモだけしておこう」
-> END
