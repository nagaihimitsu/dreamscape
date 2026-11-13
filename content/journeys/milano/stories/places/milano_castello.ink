INCLUDE modules.ink
-> DONE

// スフォルツェスコ城の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内と通常戦。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== castello_sforzesco_guide ===
# scene: guide
# background: milano_castello
# speaker: narrator
スフォルツェスコ城の中庭で、小さな女の子が父親の横顔をじっと見ている。父はくしゃみをこらえていた。
# speaker: heroine
「絵のモデルかな。」
# speaker: narrator
子が手を開くと、親指ほどの頭が出てきた。父がくしゃみをした。粘土の鼻も同時にひしゃげた。
# speaker: player
「今のはどっちが謝るんだろう。」
# speaker: heroine
# emotion: happy
「私なら、くしゃみした顔のほうが欲しいです。」
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_castello_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_castello_01 ===
# scene: battle
# background: milano_castello
# speaker: enemy
# cutin: name
# reaction: heroine,smile
「鼻だけ戻せないかな、鼻だけ。今の、俺の親父にそっくりだった。」
# speaker: narrator
娘は粘土の塊に親指を入れ、もう一つ穴を開けた。「じゃあおじいちゃんの貯金箱」
# speaker: heroine
# emotion: happy
「それ、いくら貯まる？」
# speaker: narrator
娘は自分の指先を見た。「砂なら」
# speaker: enemy
「写真、一枚でよかったんだ。新しい顔を作るのは待ってくれよ。」
# speaker: narrator
城の展示に入るため、粘土は小箱にしまわれた。父だけが、閉じたふたを見ていた。
-> quiz(1) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
「ここで以前、誰が横になってたのか。部屋の見え方が変わるな。」
- else:
# speaker: enemy
「城と聞くと偉い人ばかり浮かんだけど、ここに寝かされてたのは病気の兵士だった。」
}
# speaker: narrator
旧病院の天井を見上げてから、娘は彫刻を見た。「寝てたら、天井がいちばんよく見えるね」
# speaker: enemy
「父さんが入院してたときも、天井のしみの話ばっかりでな。俺は毎回、外の天気を教えてた。」
# speaker: heroine
「しみの形、聞いたことあります？」
# speaker: enemy
「……聞けばよかったな。」
-> quiz(2) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
「作り直した時間も、今の形に入ってるんだな。」
- else:
# speaker: enemy
「ひと彫りであの形、じゃなかった。ミケランジェロだって晩年まで変え続けたんだ。」
}
# speaker: narrator
娘は一歩ずつ像のまわりを歩いた。父は動かない。こちら側の形が気に入ったらしい。
# speaker: heroine
「私は、こっちの横顔が好き。そっちからはどうですか？」
# speaker: enemy
「ここから動いたら、好きだった形を忘れそうでね。」
-> quiz(3) ->
# background: milano_castello
{ quiz_correct:
# speaker: enemy
「横へ一歩行けば、同じ像がまた違う。」
- else:
# speaker: enemy
「俺が回れば、あの像の後ろも見えるのか。向きが一つだと思い込んでたよ。」
}
# speaker: narrator
中庭で娘が粘土を出すと、ダヴィデは携帯を伏せた。
# speaker: enemy
「もう一度、俺が座る。次の顔に、親父がいたら教えてくれ。」
# speaker: narrator
娘は彼の眉を指で上げた。「笑わないで。かわいくなっちゃう」
# speaker: enemy
「そこは似せてくれていいんだけど。」
# speaker: narrator
父が笑うたび、娘の作る眉が険しくなった。彼女は二人のそばを、そっと通り過ぎた。
-> END
