INCLUDE modules.ink
-> DONE

// スカラ座の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、特殊戦B、道中交流（推理クイズの後とデートの後の「喉飴を噛む人」）とデート。
// 2026-11-22 の改稿：椅子の修理屋アダは、祖母の家を引き払う日、「スカラ座の平土間にあった」と言い伝えられた台所色の椅子を売るか決めたい。
// 叔父は祖母の作り話だと言う。平土間の椅子は昔は動かせた（古道具屋の「絶対」が崩れる）。戦後、正式な再開の前の演奏会で客は普通の椅子に座った（第3問）。
// 祖母が十四の年に台所の椅子を担いで行ったというのは家の話で、記録ではない（本文でもそう言う）。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== la_scala_case_guide ===
# scene: guide
# background: milano_la_scala_date
# speaker: narrator
スカラ座の前の広場で、女の人が古い木の椅子を一脚、両手で持ち上げていた。
# speaker: narrator
通りかかった男の人が、その椅子に腰を下ろそうとした寸前だった。
# speaker: narrator
女の人は「すみません」と言いかけて、少し考えてから、言い直した。私のです、と。
# speaker: heroine
座らせてもらえない椅子……。どうして劇場の前に、椅子を一脚だけ持ってきたんだろう
-> END

// ───── 特殊戦B（矛盾追及）。battles/catalog.json の milano_la_scala_b01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張・追及は手伝いの knot milano_la_scala_b01_claim、milano_la_scala_b01_press（knot の名前＋_claim・_press）。
=== milano_la_scala_b01 ===
# scene: battle
# background: milano_la_scala_date
# speaker: narrator
二人に気づくと、女の人は椅子を石畳に下ろした。座面は薄緑に塗られ、桟には同じ色の塗料が垂れて固まっている。
# speaker: enemy
# cutin: name
アダ。椅子の修理屋よ。……でもこれは、修理の客の椅子じゃなくて、祖母の
# speaker: enemy
今日、祖母の家を引き払うの。家の言い伝えだと、この椅子は『スカラ座の平土間にあった椅子』
# speaker: enemy
叔父は、ばあちゃんのいつもの作り話だって。古道具屋は鼻で笑った。売るか残すか、今日決めなきゃいけない
# speaker: heroine
それで、本物の劇場の前まで持ってきたんですか
# speaker: enemy
ここに置いたら、何か分かるかと思って。……分かるわけないけど。この薄緑だって、祖母の台所の壁と同じ色だし
# speaker: enemy
ばあちゃんは、話を盛る人だった。スカラ座の桟敷の壁紙の色まで、見てきたみたいに話してた
-> quiz(1) ->
# background: milano_la_scala_date
{ quiz_correct:
    # speaker: heroine
    桟敷は、持ち主の家族が自分たちの好みで飾れたんだ。壁紙の色が席ごとに違っても、おかしくない
- else:
    # speaker: enemy
    桟敷は、持ち主の家族が好きなように飾れたのね。壁紙の色の話も、作り話とは限らないってこと
}
# speaker: enemy
でも、問題は桟敷じゃなくて、平土間。古道具屋の言い分は、こう
-> milano_la_scala_b01_claim ->
# background: milano_la_scala_date
# speaker: heroine
『昔から全部』……。この椅子だけ見ても、ほかの椅子のことは分からない。記録で確かめてみよう
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> milano_la_scala_b01_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: milano_la_scala_date
    # speaker: enemy
    それは平土間の椅子の話じゃないでしょ。古道具屋が言ってるのは、平土間の椅子が床から動かせたかどうか
    -> stop
}
# background: milano_la_scala_date
# speaker: heroine
昔の平土間の椅子は動かせたし、座りたい人が借りてた。『昔から全部固定』は、これで崩れます
# speaker: heroine
ただ、この一脚がそこにあった証拠には、まだなりません
-> quiz(2) ->
# background: milano_la_scala_date
{ quiz_correct:
    # speaker: enemy
    平土間で、客が椅子を借りてたっていう記録。……古道具屋の『絶対』は、これでおしまい
- else:
    # speaker: enemy
    平土間で、動かせる椅子を客が借りてた、と。古道具屋の『絶対』は、これでおしまいね
}
# speaker: enemy
でもね。この椅子は、どう見ても劇場の椅子じゃない。台所の椅子よ
# speaker: narrator
アダは椅子を裏返した。座面の裏に、子どもの字で小さく彫ってある。
# speaker: narrator
# letter: card
SCALA ♪
# speaker: enemy
子どものいたずら書きだと思ってた。……ばあちゃん、言ってたの。屋根の焼けた劇場で、音楽を聴いたって
# speaker: enemy
それも、作り話だと思ってた
-> quiz(3) ->
# background: milano_la_scala_date
{ quiz_correct:
    # speaker: heroine
    正式に再開する前、傷ついた劇場で演奏会があった。そのとき、お客さんは普通の椅子に座ってたんだ
- else:
    # speaker: enemy
    再開の前に、傷ついた劇場で演奏会があって、客は普通の椅子に座った……。オークションでも、稽古の舞台でもなく
}
# speaker: enemy
……ばあちゃんの話だと、十四の年、台所の椅子を担いで、焼けた劇場まで聴きに行ったって
# speaker: heroine
並んだ椅子がどこから来たかまでは、記録には書いてありません。でも、おばあさんの話と食い違うところも、ありません
# speaker: narrator
アダは長いあいだ、座面の裏の字を見ていた。それから、古道具屋に電話をかけた。
# speaker: enemy
売りません。……劇場の椅子だとは言いません。劇場へ行った椅子です。はい。取りやめで
# speaker: narrator
電話を切ると、アダはようやく、その椅子に腰を下ろした。
# speaker: enemy
叔父には、私から言う。ばあちゃんは話を盛る人だった。でも、この話は盛ってなかったかもしれないって
# speaker: heroine
# emotion: smile
スカラ座の平土間にあった椅子、ですね
# speaker: enemy
そう。うちの中では、これからもそう呼ぶ
-> END

=== milano_la_scala_b01_claim ===
# background: milano_la_scala_date
# speaker: enemy
古道具屋の言い分は、こう。『スカラ座の平土間の席は、昔から全部床に固定。持ち出せる椅子なんて、あるはずがない』
->->

=== milano_la_scala_b01_press ===
# background: milano_la_scala_date
# speaker: heroine
見るのは、この椅子の来歴じゃなくて、『昔から全部』のところ。平土間の椅子について書いた記録を探そう
->->

// 道中交流「喉飴を噛む人」（knot の名前 scala_mint が交流のID）。
// スカラ座の場所（p_scala）の本筋の後（# priority: +1）：スカラ座の推理クイズ（特殊戦B）の結果を閉じた後と、スカラ座のデートの後。特殊戦を遊んだ後だけ。
// 「飴は遠慮する」は「また今度」で、スカラ座のデートの後にまた会える。小袋は2ユーロ。
// 前の劇場が焼け、その桟敷の持ち主たちが新しい劇場の建設費を出したことは scenes/catalog.json の出典。推理クイズの答え（桟敷の内装・平土間の椅子・瓦礫の中の演奏）には触れない。
// デートの後にも読めるように、アダの椅子の件を前提にしない。
=== scala_mint ===
# scene: encounter
# title: 喉飴を噛む人
# at: place p_scala
# priority: +1
# when: battle milano_la_scala_b01
# person: milano_la_scala_candy_seller
# background: milano_la_scala_date
# speaker: narrator
スカラ座の前の柵のそばで、年配の客が二人、喉飴の袋を挟んで言い合っている。
# speaker: milano_la_scala_regular_man
うちの祖父さんは桟敷を持ってた。だから俺は、この劇場の半分は身内みたいなもんだ
# speaker: milano_la_scala_regular_woman
桟敷なら、うちの祖母だって。あなたのところは、もっと上の階でしょう
# speaker: milano_la_scala_candy_seller
# cutin: name
開演前の名物よ。この二人、毎回これで喉を使うの。だから飴が売れる。小袋なら二ユーロ
# speaker: heroine
桟敷の話なら……この劇場って、前の劇場が火事で焼けたあと、そこの桟敷の持ち主たちがお金を出して建てたんですよね
# speaker: narrator
二人が同時に彼女を見た。
# speaker: milano_la_scala_regular_man
……つまり、祖父さんの前の代から身内ってことだな
# speaker: milano_la_scala_regular_woman
建てたのは、うちの祖母の、そのまた祖母よ
# speaker: heroine
# emotion: teasing
あ。火に油、注いじゃった

* [A small bag, please. # option: buy # translation: 小袋を一つください。]
    # money: -2
    # speaker: narrator
    彼女が一粒、口に入れた。かりっと噛む音に、二人の客が同時に振り向いた。
    # speaker: heroine
    ……なめてるつもりが、三秒で噛んじゃった
    -> END

* [Who usually gets the last word? # option: ask # translation: いつもは、どっちが最後に言い返すの？]
    # speaker: milano_la_scala_candy_seller
    私。口論が長いと、開演前にもう一袋売れるの
    # speaker: narrator
    客の二人は、そろって飴の袋を握りしめた。
    # speaker: heroine
    今日は長くなりそう
    -> END

* [No sweets for me, thanks. # option: leave # translation: 飴は遠慮しておきます。]
    # later
    # speaker: milano_la_scala_candy_seller
    あんたたちも、この子みたいに、たまには黙って聞いてみたら
    # speaker: narrator
    二人は同時に抗議した。飴で、頬の同じ側がふくらんでいた。
    -> END

// デート（本筋）。romance/date_catalog.json の milano_la_scala_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
// 推理クイズBより先に遊べるので、その答え（桟敷の内装など）は言わない。
=== milano_la_scala_date_01 ===
# scene: date
# title: 故意のアンコール
# background: milano_la_scala_date
# speaker: narrator
スカラ座の前の広場で、彼女が深く一礼した。拍手しかけると、手で止められた。
# speaker: heroine
# emotion: teasing
まだ始まってません。お客さん、気が早すぎます
# speaker: player
何が始まるの？
# speaker: heroine
小学校の学芸会のやり直し。台詞が一つだけだったのに、前の子とかぶって言っちゃったの。その一言を、ここで言い直したい
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は、声がどこまで届くか、靴の先で距離を測った。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は、こちらに向かってだけ、小さくお辞儀をし直した。
}

* [「客席で黙って待つ」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        本当に黙られると、学芸会より緊張する。何か言って
    - else:
        # speaker: heroine
        # emotion: smile
        いいお客さんですね。……あ、こうやっておしゃべりしてるの、わたしのほうだ
    }
    -> join_1

* [「前の子の役、やろうか」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        その役までいたら、あの日とそっくりになっちゃう。今日は一人でやってみる
    - else:
        # speaker: heroine
        うん！　あなたの台詞は「誰かいるのか」。最後までちゃんと言ってね
    }
    -> join_1

* [「途中で笑っても最後まで見る」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        笑われる前提だと、やっぱり怖い。ちょっと背中向けてて
    - else:
        # speaker: heroine
        そのほうが安心する。笑わせたら、二回目もやるかも
    }
    -> join_1

= join_1
# speaker: narrator
彼女は劇場の入口を背にして、深く息を吸った。
# speaker: heroine
ここにいるよ
# speaker: narrator
向こうの信号が変わるまで、誰も続きをかぶせなかった。
# speaker: heroine
この劇場も、前の劇場が火事で焼けたあとに建てられたんだって。やり直しの舞台にしては、ちょうどいいでしょ
ねえ。もしここに客席があったら、今、どの席で見てた？

* [「もう半歩、前の席」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        そこだと、顔まで全部見えちゃう。今はこのくらいで
    - else:
        # speaker: heroine
        ……近いね。でも今の一言なら、そこまで届いたって分かる
    }
    -> join_2

* [「あなたが見える最後列」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        そんなに下がらなくていいよ。今度は、普通の声で話したい
    - else:
        # speaker: heroine
        いいな。いちばん遠くの人も待っててくれたって、役者はうれしいの
    }
    -> join_2

* [「僕が舞台、そっちが客席」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        もう一本だけ、わたしが役者でいたい。いい？
    - else:
        # speaker: heroine
        役者交代！　拍手は、最後まで見てからにするね
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
お辞儀が終わっても、彼女は少しのあいだ、こちらを見ていた。
}
# speaker: narrator
広場の雑踏の中で、二人だけの公演が終わった。幕の代わりに、信号がもう一度変わった。
-> END
