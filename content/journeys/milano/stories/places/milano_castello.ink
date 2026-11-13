INCLUDE modules.ink
-> DONE

// スフォルツェスコ城の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、通常戦と道中交流（バトルの後の「弦を一本、余らせて」）。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== castello_sforzesco_guide ===
# scene: guide
# background: milano_castello
# speaker: narrator
スフォルツェスコ城の中庭で、小さな女の子が父親の横顔をじっと見ている。父はくしゃみをこらえていた。
# speaker: heroine
絵のモデルかな
# speaker: narrator
子が手を開くと、親指ほどの頭が出てきた。父がくしゃみをした。粘土の鼻も同時にひしゃげた。
# speaker: player
今のはどっちが謝るんだろう
# speaker: heroine
# emotion: happy
私なら、くしゃみした顔のほうが欲しいです
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_castello_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_castello_01 ===
# scene: battle
# background: milano_castello
# speaker: enemy
# cutin: name
# reaction: heroine,smile
鼻だけ戻せないかな、鼻だけ。今の、俺の親父にそっくりだった
# speaker: narrator
娘は粘土の塊に親指を入れ、もう一つ穴を開けた。
# speaker: milano_castello_daughter
じゃあおじいちゃんの貯金箱
# speaker: heroine
# emotion: happy
それ、いくら貯まる？
# speaker: narrator
娘は自分の指先を見た。
# speaker: milano_castello_daughter
砂なら
# speaker: enemy
写真、一枚でよかったんだ。新しい顔を作るのは待ってくれよ
# speaker: narrator
城の展示に入るため、粘土は小箱にしまわれた。父だけが、閉じたふたを見ていた。
-> quiz(1) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
ここで以前、誰が横になってたのか。部屋の見え方が変わるな
- else:
# speaker: enemy
城と聞くと偉い人ばかり浮かんだけど、ここに寝かされてたのは病気の兵士だった
}
# speaker: narrator
旧病院の天井を見上げてから、娘は彫刻を見た。
# speaker: milano_castello_daughter
寝てたら、天井がいちばんよく見えるね
# speaker: enemy
父さんが入院してたときも、天井のしみの話ばっかりでな。俺は毎回、外の天気を教えてた
# speaker: heroine
しみの形、聞いたことあります？
# speaker: enemy
……聞けばよかったな
-> quiz(2) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
作り直した時間も、今の形に入ってるんだな
- else:
# speaker: enemy
ひと彫りであの形、じゃなかった。ミケランジェロだって晩年まで変え続けたんだ
}
# speaker: narrator
娘は一歩ずつ像のまわりを歩いた。父は動かない。こちら側の形が気に入ったらしい。
# speaker: heroine
私は、こっちの横顔が好き。そっちからはどうですか？
# speaker: enemy
ここから動いたら、好きだった形を忘れそうでね
-> quiz(3) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
横へ一歩行けば、同じ像がまた違う
- else:
# speaker: enemy
俺が回れば、あの像の後ろも見えるのか。向きが一つだと思い込んでたよ
}
# speaker: narrator
中庭で娘が粘土を出すと、ダヴィデは携帯を伏せた。
# speaker: enemy
もう一度、俺が座る。次の顔に、親父がいたら教えてくれ
# speaker: narrator
娘は彼の眉を指で上げた。
# speaker: milano_castello_daughter
笑わないで。かわいくなっちゃう
# speaker: enemy
そこは似せてくれていいんだけど
# speaker: narrator
父が笑うたび、娘の作る眉が険しくなった。彼女は二人のそばを、そっと通り過ぎた。
-> END

// 道中交流「弦を一本、余らせて」（knot の名前 castello_pick が交流のID）。
// スフォルツェスコ城の訪問の本筋の後（# priority: +1）：城のバトルの結果を閉じた後。条件はない（城にはデートがないので「また今度」もない）。
// 青いピック（ドゥオモの「切れた三本目」でもらう）を持っていれば、ティノに渡すか、持っておく（どちらも完了）。
// 持っていなければ、聴く・尋ねる・通り過ぎる（どれも完了し、フラグ milano_tino_needs_pick を立てる。後でピックをもらったら、フィナーレの前のダルセナで渡せる）。
// 城が砦から宮廷の住まいへ、今は博物館や図書館の入る場所になったことは scenes/catalog.json の出典。
=== castello_pick ===
# scene: encounter
# title: 弦を一本、余らせて
# at: visit castello_sforzesco
# priority: +1
# person: milano_tino
# background: milano_castello
# speaker: narrator
城の中庭の端で、少年が小さなギターを抱えていた。親指に絆創膏を巻き直しては、同じ和音を弾く。
# speaker: milano_tino
# cutin: name
ここ、音が壁に当たって返ってくるんだ。家だと、隣の人が壁を叩き返してくるけど
# speaker: heroine
お城の中で練習していいの？
# speaker: milano_tino
もとは砦で、そのあと宮廷の住まいだったんだって。今は博物館と図書館が入ってるから、中庭は誰でも歩ける。ぼくみたいなのでも
# speaker: narrator
開いたケースに、青い三角の跡だけが残っていた。
{ cond("item blue_pick held"):
    # speaker: heroine
    ……ノラさんのピック、あの跡と同じ形だ
    -> castello_pick_with_pick
- else:
    # speaker: heroine
    あの跡、何が入ってたんだろう。……聞きすぎかな
    -> castello_pick_without_pick
}

// ピックを持っているとき（渡す・一音を頼む・持っておく）。
=== castello_pick_with_pick ===
* [Would this pick fit your hand? # option: give # translation: このピック、手に合いそう？]
    # give: blue_pick milano_tino
    # speaker: narrator
    ティノは弦を一本だけ弾いた。
    # speaker: milano_tino
    うわ。自分の指だと、こんなに強く弾けなかった
    # speaker: narrator
    中庭の壁から、細く音が返ってきた。
    # speaker: heroine
    最初に鳴らしたのが一音なの、いいね
    -> END

* [Could you play one note with this? # option: ask # translation: これで一音弾いてくれる？]
    # give: blue_pick milano_tino
    # speaker: milano_tino
    曲じゃなくて一音なら、外しようがないね
    # speaker: narrator
    豪快に隣の弦をはじき、本人がいちばん驚いた。
    # speaker: heroine
    いまのでお願いします。二回目は、違う音になっちゃうから
    -> END

* [I'll hold on to it for now. # option: keep # translation: 今は自分で持っておくよ。]
    # speaker: narrator
    彼女はケースの青い跡に落ちた葉を払い、ティノに目で挨拶した。ピックは、まだ手元にある。
    # speaker: heroine
    渡すなら、あの子が欲しいって言ってからでもいいよね
    -> END

// ピックを持っていないとき（聴く・尋ねる・通り過ぎる）。どれも、後でダルセナで渡せるようにフラグを立てる。
=== castello_pick_without_pick ===
* [Can I listen for a while? # option: listen # translation: しばらく聴いていてもいい？]
    # set: milano_tino_needs_pick
    # speaker: narrator
    少年は同じ和音を三回弾いた。三回目だけ、壁からの返事が少し遅れた。
    # speaker: milano_tino
    今の、聞こえた？　お城が一拍おくれて弾くんだ
    # speaker: heroine
    聞こえた。……壁が相棒なんだね
    -> END

* [Did something use to sit in that case? # option: wonder # translation: そのケース、何か入ってたの？]
    # set: milano_tino_needs_pick
    # speaker: milano_tino
    青いピック。ドゥオモの前で弾いてる人にもらったんだけど、どこかに落とした。親指でも弾けるし
    # speaker: narrator
    絆創膏の下の親指は、少し赤かった。
    # speaker: heroine
    ……そっか。見かけたら、覚えておくね
    -> END

* [Let's not interrupt him. # option: pass # translation: 邪魔しないでおこう。]
    # set: milano_tino_needs_pick
    # speaker: narrator
    二人は中庭の反対側を回った。背中のほうで、和音が一つ、壁に当たって返ってきた。
    -> END
