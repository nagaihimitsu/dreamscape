INCLUDE modules.ink
-> DONE

// 『最後の晩餐』（旧食堂）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦と、道中交流。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== last_supper_guide ===
# scene: guide
# background: milano_refectory
# speaker: narrator
旧食堂に入った瞬間、絵の横幅を目で追うだけで首が動いた。{heroine_name}はスマホを出しかけて、鞄の底にしまう。
# speaker: heroine
今日はあとで録ります。ここで、わたしが何を言いそうになったか
# speaker: narrator
隣の男が手のひらを少し開いた。連れの女性が男の手から、自分の手首へと目を移す。
# speaker: player
知ってる合図？
# speaker: heroine
いいえ。でも、あの人に何か必要なら……
# speaker: narrator
声をかける前に、女性が首を振った。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_last_supper_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_last_supper_01 ===
# scene: battle
# background: milano_refectory
# speaker: heroine
お水、いりますか？
# speaker: narrator
男は片手を上げた。彼女がもう一歩寄ると、連れの女性が二人の間に入った。
# speaker: enemy
# cutin: name
# reaction: heroine,surprised
兄には声を休める約束があるの。夕方、小さな舞台が一本。聞き返されると、この人は絶対しゃべっちゃう
# speaker: narrator
兄は唇を結んだままうなずいた。
# speaker: heroine
あの手、助けてっていう意味かと……
# speaker: enemy
# reaction: heroine,shy
それ、私に「あと五分」の手。子どもの頃、風呂から出ないときも同じ手だった
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
描いた光が、こちらの壁まで届いたみたい
- else:
# speaker: heroine
ランプを探してた。こっちの部屋の窓と、絵の光を合わせたんですね
}
# speaker: narrator
妹は腕時計を外し、兄の手にのせた。兄は時刻を見ず、時計を持ったまま絵を見た。
# speaker: heroine
あれじゃ、何時に出たらいいか分からないよね
# speaker: player
見てほしいのは、そっちじゃないのかも
# speaker: narrator
彼女は助け舟を出しかけて、絵の中の人の手を見た。
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
顔が向く先と腕が指す先、両方いるんだ
- else:
# speaker: heroine
手だけ見たから読み違えた。マタイは隣の人にも、あの言葉に気づいてほしかったんだ
}
# speaker: heroine
同じ手でも、誰に向けたかで違うんですね
# speaker: enemy
うちの五分はたいてい七分。それは絵を見ても分かんないよ
# speaker: narrator
兄の肩が一度だけ上がった。声を出さずに笑って、時計を妹に返した。
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
描きながら変えられる時間を選んだんですね
- else:
# speaker: heroine
乾いた壁を選んだのは、急がずに手を入れられるから。絵を前に立ち止まるのは、見る人だけじゃなかったんだ
}
# speaker: narrator
外へ出ると、彼女は録音を始めた。三秒で止めた。
# speaker: heroine
さっき、あの人の静かな時間を、わたしがいい話にして持って帰ろうとした。なんて言えばいいかな
# speaker: player
三秒のままでも、いいんじゃない
# speaker: narrator
兄妹は向こうの角を曲がった。曲がり切るところで兄が手を上げた。今度は二人とも、意味を決めずに手を振り返した。
-> END

// 道中交流「広場の無声映画」（knot の名前 supper_pantomime が交流のID）。
// 『最後の晩餐』の訪問の本筋の後（# priority: +1）：バトルの結果を閉じた後（この場所にデートはないので、いつもバトルの直後）。条件はない。どの選択肢でも完了する。
// バトルの最後に角を曲がった兄妹に、その先でまた会う。声を休める兄が、身振りで夕食を頼む。
// 絵の人物が手と顔の向きで反応を伝えることは scenes/catalog.json の出典（館の解説）。
=== supper_pantomime ===
# scene: encounter
# title: 広場の無声映画
# at: visit last_supper
# priority: +1
# person: milano_ida
# person: milano_last_supper_brother
# background: milano_refectory
# speaker: narrator
教会の前の角を曲がった先に、さっきの兄妹がいた。兄は声を休めたまま、両腕を大きく広げて静止している。
# speaker: milano_ida
それだと「大きな魚」。……違うの？　今日の注文、この人が手でやるって言い出して
# speaker: heroine
絵の中の人たちも、声じゃなくて、手と顔の向きで返事してましたね
# speaker: milano_ida
あの人たちは、ずっとあの手のままで通じてるから
# speaker: narrator
兄が首を振り、今度は指で四角を描いた。

* [May I try a gesture? # option: act # translation: 身振りを一つ試してもいい？]
    # speaker: narrator
    指を一本立て、くるくる回した。兄はフォークを巻き取る真似で応じた。
    # speaker: heroine
    通じた。食べたいものの話になると、みんな役者なんですね
    -> END

* [What do you actually want for dinner? # option: ask # translation: 本当は夕食に何が食べたいの？]
    # speaker: narrator
    兄は少し考えてから、両手で丸を作った。
    # speaker: milano_ida
    ……ピザ？　四角って言うから、私が勝手にパスタにした
    # speaker: heroine
    当てるより、聞いたほうが早かったね。……わたしも、さっきの手、聞けばよかったんだ
    -> END

* [Enjoy your dinner together. # option: leave # translation: 二人で夕食を楽しんで。]
    # speaker: narrator
    兄は指にキスをして、こちらへ小さく投げた。
    # speaker: milano_ida
    それだけは通訳がいらないね
    # speaker: heroine
    あれ、わたしもいつか自然にやってみたい
    -> END
