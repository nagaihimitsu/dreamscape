INCLUDE modules.ink
-> DONE

// ガッレリアの場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内と通常戦。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== galleria_vittorio_emanuele_ii_guide ===
# scene: guide
# background: milano_galleria
# speaker: narrator
ガッレリアのガラス屋根に、靴の音がいくつも返る。{heroine_name}が十秒録る間、主人公は息まで止めていた。
# speaker: heroine
# emotion: smile
「そんなに頑張らなくても。息くらい、入っていいですよ。」
# speaker: player
「じゃあ、息もミラノの音ってことで。」
# speaker: narrator
目の前を通った赤い鞄が、引き返してもう一度同じ速さで通った。
# speaker: heroine
「今の、巻き戻したの私じゃないよね。」
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_galleria_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_galleria_01 ===
# scene: battle
# background: milano_galleria
# speaker: enemy
# cutin: name
# reaction: heroine,serious
「そのまま、そのまま。今度は初めて会った感じで、こっちに笑って。」
# speaker: heroine
「初めて会ったんですけど。」
# speaker: narrator
男は棚から香水瓶を取り、二人の顔に重ねて画面を確認した。鞄の女はさっきから三度目の往復に入っている。
# speaker: enemy
「瓶だけじゃ客は買わない。後ろに恋人がいれば、続きが気になる。」
# speaker: player
「誰が撮っていいって？」
# speaker: enemy
「ガッレリアを歩いてて、背景になるなって方が難しいよ。」
-> quiz(1) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
「二つの出口の用事は違っても、途中まで同じ道なんだ。」
- else:
# speaker: heroine
「ここをまっすぐ行った人、買い物じゃなくてスカラ座に用があったのかも。」
}
# speaker: heroine
「通り抜ける道で待っていれば、人はそりゃ映ります。でも、この人の顔はあなたの商品じゃないです。」
# speaker: enemy
# reaction: heroine,worried
「君の手にも録音機があるけどね。」
# speaker: narrator
彼女の親指が止まった。再生すると、鞄の女が息を切らして値段を交渉する声まで入っていた。
# speaker: heroine
# emotion: serious
「……ほんとだ。これは私が消します。」
-> quiz(2) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
「座らなくても、ここが誰かの客間になるのか。」
- else:
# speaker: heroine
「客間って呼ぶの、立ち話をしてるあの二人を見ると分かる気がする。」
}
# speaker: narrator
彼女は削除を押し、今度はレンズの前に立った。
# speaker: enemy
「いい顔。そのまま香水持って。」
# speaker: heroine
「持ちません。今撮ってるぶんを見せてください。」
# speaker: narrator
香水瓶で隠した画面の端に、鞄の女が手を差し入れた。「私にも」
-> quiz(3) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
「劇が終わってからも、人の夜は続いたんですね。」
- else:
# speaker: heroine
「幕が下りたら今度は夕飯。散歩まで含めて一晩のお出かけだったんですね。」
}
# speaker: narrator
三人に画面を囲まれて、男は二人の映ったテイクを消した。鞄の女は、自分の分の出演料を受け取るまで引かなかった。
# speaker: enemy
「次は人形でやるよ。あれは時間単価が安い。」
# speaker: narrator
ケースにしまった瓶をもう一度出して、男は自分の顔の前に置いた。
# speaker: heroine
「……私、記録してる側は景色に入ってないと思ってた。」
# speaker: player
「消すとき、手が止まったね。」
# speaker: heroine
「うん。いい音だったから。そこが一番いやだった。」
-> END
