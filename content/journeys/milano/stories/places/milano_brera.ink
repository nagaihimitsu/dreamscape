INCLUDE modules.ink
-> DONE

// ブレラ絵画館の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、特殊戦C、道中交流とデート。
// 2026-11-22 の改稿：小劇団の演出家ミーナと衣装係の弟テオ。別れの場面の衣装を赤一色にするか、青を残すか。
// 反転：テオは来月、劇団を離れる（まだ姉に言っていない）。衣装の言い合いは、彼なりの別れの切り出し方だった。
// 結末は《接吻》の二色の衣装から：行く人と残る人、二つの色を残す。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== brera_case_guide ===
# scene: guide
# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で、赤と青の布を肩にかけた男の人が、歩幅を数えていた。四歩で立ち止まり、一歩だけ戻る。
# speaker: heroine
道に迷ってる……にしては、ずいぶん狭い範囲だね
# speaker: narrator
連れの女の人が、彼の肩の布を引っぱった。
# speaker: milano_brera_woman
その一歩を戻ったら、お客は、あんたが行くのをやめたと思うのよ。戻らないで
# speaker: narrator
二人はこちらに気づかないまま、言い合いながら絵画館へ入っていった。
-> END

// ───── 特殊戦C（証拠連結）。battles/catalog.json の milano_brera_c01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張は手伝いの knot milano_brera_c01_claim（knot の名前＋_claim）。
=== milano_brera_c01 ===
# scene: battle
# background: milano_brera_date
# speaker: narrator
絵画館の一室。さっきの二人が、一枚の絵の前で、また言い合っていた。
# speaker: enemy
# cutin: name
ミーナ。小さな劇団で演出をやってるの。今度の芝居の、別れの場面の衣装を決めに来た
# speaker: enemy
うちの舞台は暗いの。青い布は沈む。別れの場面は真っ赤一色。それなら、客席のいちばん後ろまで見える
# speaker: narrator
弟は、借りてきた青い布をたたもうとしなかった。二人の前には、ハイエツの《接吻》がかかっている。
# speaker: heroine
弟さんは、どんな色にしたいんですか？
# speaker: milano_brera_brother
# cutin: name
テオです。衣装係。……衣装のことで意見を聞かれたの、今日が初めてです
# speaker: enemy
時間がないの。最後列のお客に何が届くか、絵に聞きに来たのよ
# speaker: milano_brera_brother
いちばん強く人を引き寄せる絵なら、色の強い絵とは限らないよ。こっち
# speaker: narrator
テオが案内したのは、マンテーニャの絵の前だった。横たわる人の体を、足のほうから見上げるように描いてある。
-> quiz(1) ->
# background: milano_brera_date
{ quiz_correct:
    # speaker: enemy
    体を足もとから見通す、極端な見せ方……。色の強さじゃなくて、見る位置で、こっちを場面の中へ引きこむのね
- else:
    # speaker: enemy
    奥へ続く行列じゃなくて、体を足もとから見通す極端な見せ方。それで、見る人を場面の中へ引きこむのね
}
# speaker: enemy
……つまり、お客の立つ位置まで、絵が決めてるってこと
# speaker: player
舞台なら、お客がどこから見るかは、演出で選べますね
# speaker: narrator
ミーナは少し黙った。テオは布を胸に当てたまま、《接吻》の前へ戻った。
# speaker: milano_brera_brother
この絵だって、ただの恋人の絵じゃない。最初に見た人たちには、別の話も見えてた
-> quiz(2) ->
# background: milano_brera_date
{ quiz_correct:
    # speaker: enemy
    統一への闘いの進み具合を祝う展覧会……。中世の恋人に見えても、それを見たのは、その時代を生きてた人たちなのね
- else:
    # speaker: enemy
    王家の婚礼でも、オペラの開幕でもなく、統一への闘いの進み具合を祝う展覧会。そこを取り違えてた
}
# speaker: enemy
その時代のお客が、この二人を見て恋の話をした。そこまでは私にも分かる。でも、その先は？
# speaker: heroine
絵の中にあるものと、絵の外で起きてたこと。両方、持ってきます
-> milano_brera_c01_claim ->
# background: milano_brera_case
# speaker: heroine
布を見て分かることと、その時代の人だから分かったこと。分けてから、つなげよう
- (stop)
-> reasoning ->
{ evidence_result == "failure":
    # background: milano_brera_date
    # speaker: enemy
    それだけじゃ足りない。絵の中に何が見えるかと、誰がいつこの絵を見たか。両方そろえて
    -> stop
}
# background: milano_brera_date
# speaker: heroine
衣装の色は、二つの国の旗を思わせる。そして、最初にこの絵を見たのは、統一への闘いを祝う展覧会のお客さん
# speaker: heroine
だから、抱き合う二人を見ながら、国のことも考えられたんだと思います
-> quiz(3) ->
# background: milano_brera_date
{ quiz_correct:
    # speaker: enemy
    二人の恋に、国の話が重なってる。……色が二つあるから、話も二つ聞こえるのね
- else:
    # speaker: enemy
    恋人の衣装に、国旗を思わせる色。当時のお客は、恋といっしょに国のことも受け取った、と
}
# speaker: enemy
……二人だけの話より、大きな話。それなら、なおさら真っ赤一色でいい。分かりやすいもの
# speaker: milano_brera_brother
違うよ、姉さん
# speaker: narrator
テオは布を肩から外した。
# speaker: milano_brera_brother
来月から、トリノの劇場で衣装の仕事をする。……まだ、言えてなかった
# speaker: narrator
ミーナの手から、赤い布の端が落ちかけた。
# speaker: enemy
……いつ言うつもりだったの
# speaker: milano_brera_brother
この場面の衣装が決まったら。別れの場面で、行く人は赤。残る人は青。二人とも、最後列まで見えるようにしたかった
# speaker: narrator
彼は青い布の端を、姉の腕にそっとかけた。それから片足だけ、出口のほうへ向けた。絵の中の男と、同じ足だった。
# speaker: enemy
……色は、二つ残す。別れは、二人いないとできないものね
# speaker: milano_brera_brother
最後列の人にも、分かった？
# speaker: enemy
分かったわよ。……ばか
# speaker: narrator
テオが出口へ歩きだした。ミーナは青い布を持ったまま、その場に残った。
# speaker: narrator
稽古の続きなのか、本当の別れなのか。{heroine_name}も少し息を止めて見ていた。
-> END

=== milano_brera_c01_claim ===
# background: milano_brera_date
# speaker: enemy
恋人二人の衣装の色が、どうして二人だけの話より大きな話になるの？　絵の中から一つ、絵の外から一つ、根拠がほしい
->->

// 道中交流「モデルは五秒」（knot の名前 brera_sitter が交流のID）。
// ブレラ絵画館の観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。条件はない。どの選択肢でも完了する。
// 絵画館の絵が、正式な設立の前から美術学校の学生が学べるように集められたことは scenes/catalog.json の出典。
// 観察の後に流れるので、推理クイズの答え（《接吻》の衣装と1859年の展覧会、マンテーニャの視点）には触れない。
=== brera_sitter ===
# scene: encounter
# title: モデルは五秒
# at: visit brera_case
# priority: after observe
# person: milano_brera_student
# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で、画板を抱えた学生がこちらに声をかけてきた。柱の陰にも、座りこんで描いている学生が何人かいる。
# speaker: milano_brera_student
# cutin: name
五秒だけ、モデルをお願いしていいですか。動きだす直前の膝が、どうしても描けなくて
# speaker: heroine
みんな、ここで描いてるんだね
# speaker: milano_brera_student
ここの絵画館の絵は、もとは美術学校の学生が見て学べるように集められたんです。絵画館として開く前から
# speaker: milano_brera_student
だから僕ら、ここに来ると、ちょっとだけ自分の分もある気がして
# speaker: heroine
五秒なら。……あ、わたし、もう動くつもりで膝を固めちゃった

* [I'll be the one about to leave. # option: pose # translation: 出ていく直前の役をやるよ。]
    # speaker: narrator
    一歩を宙で止めると、学生は鉛筆を下ろした。
    # speaker: milano_brera_student
    その膝、もう『残る人』の膝になっちゃってます。……帰っていいですよ
    # speaker: narrator
    歩きだした瞬間にだけ、鉛筆が動いた。
    -> END

* [I'll count to five. # option: count # translation: 五秒数えるよ。]
    # speaker: narrator
    五、と言ったところで、彼女は肩を下ろした。
    # speaker: milano_brera_student
    それです。五秒が終わった、六秒目の膝。それが描きたかったんです
    # speaker: heroine
    延長は一回だけですよ
    -> END

* [I'd rather stay out of the sketch. # option: decline # translation: 絵には入らないでおきます。]
    # speaker: narrator
    学生はすぐに画板を閉じた。
    # speaker: milano_brera_student
    了解です。今日いちばん早く立ち去りそうな膝だったから、惜しいけど
    # speaker: heroine
    断ったあとの足が、いちばん描きたい足だったんだ
    -> END

// デート（本筋）。romance/date_catalog.json の milano_brera_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
// 推理クイズCより先に遊べるので、その答え（《接吻》の衣装の色と1859年の展覧会）は言わない。
=== milano_brera_date_01 ===
# scene: date
# title: 振り返る前のひとこと
# background: milano_brera_date
# speaker: narrator
ブレラの《接吻》の前。彼女は抱き合う二人を見ながら、片手を自分の背中へ回した。
# speaker: heroine
二人の足もと、片方だけ階段にかかってる。先に行っちゃいそうで、気になる
# emotion: serious
このあと、一言だけ言えるとしたら。「気をつけて」と「行かないで」、どっちがその人のためになるんだろう
# speaker: player
二つとも言うのは？
# speaker: heroine
わたし、長く話すと、たぶん最後を『じゃあね』でごまかしちゃう
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
ほかの見物の人が動くまで、彼女はこちらとのあいだを一歩空けていた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女はこちらの肩のすぐ横から、絵の端を指さした。
}

* [「行かないで、と言ってみて」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        今日は、言ってみるだけでも重いな。絵の二人に預けておく
    - else:
        # speaker: heroine
        行かないで。……あ、言ったほうが、ちゃんと送り出せそう
    }
    -> join_1

* [「黙って見送るのもありかな」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        それを選べる人は強いね。わたしは、今日は何か言いたい
    - else:
        # speaker: heroine
        うん。でもわたしは、何も言わなかった日のことばかり覚えてる
    }
    -> join_1

* [「じゃあね、にも続きがあるよ」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        本当は続いてほしいときほど、軽く聞こえちゃう気がする
    - else:
        # speaker: heroine
        次がある言い方だもんね。それなら、少し好きかも
    }
    -> join_1

= join_1
# speaker: narrator
この二人にも、二人だけじゃない事情があったのかな、と彼女はつぶやいた。
# speaker: heroine
事情をみんな知ったら、言える言葉は増えるかな。それとも減る？

* [「僕なら、聞いてから決めたい」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        答えるまで待たせるのも難しいよね。聞かれなくても、言えるようになりたい
    - else:
        # speaker: heroine
        わたしもそうしてほしい。事情があるなら、遠回りでも聞いて
    }
    -> join_2

* [「一言なら「またね」にする」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        「またね」って、約束なのかな。わたし、軽く言われると、ときどき迷う
    - else:
        # speaker: heroine
        いいね。短いのに、もう一回分ある
    }
    -> join_2

* [「次に会った時の一言も予約する」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_brera_date_01
    { romance_result == "negative":
        # speaker: heroine
        予約すると、違う言葉が出た日に困るよ。空けておきたい
    - else:
        # speaker: heroine
        じゃあ、わたしから。「遅い」。待ってたって伝わるでしょ
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
台詞を選び終えた口元を、彼女がそっと見た。
}
# speaker: narrator
次の絵に移るとき、彼女は《接吻》にだけ聞こえる声で、「じゃあね」と言った。
-> END
