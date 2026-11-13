INCLUDE modules.ink
-> DONE

// ドゥオモ（ミラノ大聖堂）の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内と通常戦。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== duomo_milano_guide ===
# scene: guide
# background: milano_duomo
# speaker: narrator
ドゥオモ広場に出ると、{heroine_name}はスマホを縦にかまえた。画面には、大聖堂のてっぺんまできれいに入っている。
# speaker: heroine
「一枚目、何を撮ったと思います？」
# speaker: player
「大聖堂。今のはさすがに当てられる。」
# speaker: heroine
# emotion: teasing
「はずれ。録音です。帰ってから十秒だけ、ここに戻れるように。」
# speaker: narrator
再生すると、ごそっ、ごそっ、と布をこする音がした。彼女は自分の袖をにらんだ。
# speaker: heroine
「……帰ってから、この上着が着られますね。」
# speaker: narrator
すぐそばで、もっと大きな布を頭からかぶっている人がいた。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_duomo_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_duomo_01 ===
# scene: battle
# background: milano_duomo
# speaker: narrator
布の下から棒つきのマイクだけが出ている。先端が彼女の袖を追った。
# speaker: enemy
# cutin: name
# reaction: heroine,surprised,question
「悪いが、あと十秒だけここを無人にしてくれ。」
# speaker: heroine
「じゃあ、まずあなたが出ないと。」
# speaker: narrator
布が持ち上がった。中から出てきた男の鼻に、布目がついていた。
# speaker: enemy
「リヴィオ。録音の注文がね、「ミラノの広場、人の気配なし」。注文した奴は、ここに来たことがない。」
# speaker: player
「何時から待ってるんです？」
# speaker: enemy
「鳩しかいない朝から。あいつらの羽音を消したら、今度は俺の腹が鳴った。」
# speaker: heroine
「私、あそこも見てきます。広場って、上だけじゃなさそう。」
-> quiz(1) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
「地下にも先客がいましたね。」
- else:
# speaker: heroine
「今の聖堂の下にも、その場所を空けてもらった歴史があるんですね。」
}
# speaker: heroine
「空っぽの場所が先にあったと思ってた。ここを空けるために、誰かの建物を片づけたんですね。」
# speaker: enemy
「わざわざ下まで行くのか。足音、録ってもいいか？」
# speaker: heroine
「私の分だけなら。後ろの人の分は、その人に聞いて。」
-> quiz(2) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
「あの形で、水に入る人を迎えたんですね。」
- else:
# speaker: heroine
「洗い場かと思ったら洗礼の水盤。誰かにとっては、忘れられない一日だったんだ。」
}
# speaker: narrator
二人が戻ると、リヴィオはマイクを地面に近づけていた。自分の靴が鳴るので、片足を上げている。
# speaker: player
「片方は、まだ地面にありますよ。」
# speaker: enemy
「両方上げる値段は、もらってない。」
# speaker: heroine
「誰の足音か分からなくなっても、誰かがここに来たことは残りますね。」
-> quiz(3) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
「名簿の名前は、石には見えない支えですね。」
- else:
# speaker: heroine
「石に彫らなくても、名前を残す本があるんだ。今も続いてるのがいいな。」
}
# speaker: narrator
十秒がそろいかけた時、広場の端で小さな子が手を振った。彼女が先に気づいた。
# speaker: heroine
「あ、こっちだよ！」
# speaker: enemy
「……九秒半。」
# speaker: narrator
男は停止ボタンを押した。子が母親に追いつくまで、もう一度は押さなかった。
# speaker: enemy
「注文主には人のいない夜を売る。いまのは俺の放送に取っておく。今の声、使っても？」
# speaker: heroine
「いまのは、あの子に言ったので。」
# speaker: enemy
「了解。なら俺の腹から録り直しだ。」
# speaker: narrator
彼女のスマホには、赤い録音ボタンが残った。押すのは、次の場所でも間に合う。
-> END
