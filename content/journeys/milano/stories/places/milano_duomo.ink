INCLUDE modules.ink
-> DONE

// ドゥオモ（ミラノ大聖堂）の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、通常戦、道中交流とデート。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== duomo_milano_guide ===
# scene: guide
# background: milano_duomo
# speaker: narrator
ドゥオモ広場に出ると、{heroine_name}はスマホを縦にかまえた。画面には、大聖堂のてっぺんまできれいに入っている。
# speaker: heroine
一枚目、何を撮ったと思います？
# speaker: player
大聖堂。今のはさすがに当てられる
# speaker: heroine
# emotion: teasing
はずれ。録音です。帰ってから十秒だけ、ここに戻れるように
# speaker: narrator
再生すると、ごそっ、ごそっ、と布をこする音がした。彼女は自分の袖をにらんだ。
# speaker: heroine
……帰ってから、この上着が着られますね
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
悪いが、あと十秒だけここを無人にしてくれ
# speaker: heroine
じゃあ、まずあなたが出ないと
# speaker: narrator
布が持ち上がった。中から出てきた男の鼻に、布目がついていた。
# speaker: enemy
リヴィオ。録音の注文がね、「ミラノの広場、人の気配なし」。注文した奴は、ここに来たことがない
# speaker: player
何時から待ってるんです？
# speaker: enemy
鳩しかいない朝から。あいつらの羽音を消したら、今度は俺の腹が鳴った
# speaker: heroine
私、あそこも見てきます。広場って、上だけじゃなさそう
-> quiz(1) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
地下にも先客がいましたね
- else:
# speaker: heroine
今の聖堂の下にも、その場所を空けてもらった歴史があるんですね
}
# speaker: heroine
空っぽの場所が先にあったと思ってた。ここを空けるために、誰かの建物を片づけたんですね
# speaker: enemy
わざわざ下まで行くのか。足音、録ってもいいか？
# speaker: heroine
私の分だけなら。後ろの人の分は、その人に聞いて
-> quiz(2) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
あの形で、水に入る人を迎えたんですね
- else:
# speaker: heroine
洗い場かと思ったら洗礼の水盤。誰かにとっては、忘れられない一日だったんだ
}
# speaker: narrator
二人が戻ると、リヴィオはマイクを地面に近づけていた。自分の靴が鳴るので、片足を上げている。
# speaker: player
片方は、まだ地面にありますよ
# speaker: enemy
両方上げる値段は、もらってない
# speaker: heroine
誰の足音か分からなくなっても、誰かがここに来たことは残りますね
-> quiz(3) ->
# background: milano_duomo
{ quiz_correct:
# speaker: heroine
名簿の名前は、石には見えない支えですね
- else:
# speaker: heroine
石に彫らなくても、名前を残す本があるんだ。今も続いてるのがいいな
}
# speaker: narrator
十秒がそろいかけた時、広場の端で小さな子が手を振った。彼女が先に気づいた。
# speaker: heroine
あ、こっちだよ！
# speaker: enemy
……九秒半
# speaker: narrator
男は停止ボタンを押した。子が母親に追いつくまで、もう一度は押さなかった。
# speaker: enemy
注文主には人のいない夜を売る。いまのは俺の放送に取っておく。今の声、使っても？
# speaker: heroine
いまのは、あの子に言ったので
# speaker: enemy
了解。なら俺の腹から録り直しだ
# speaker: narrator
彼女のスマホには、赤い録音ボタンが残った。押すのは、次の場所でも間に合う。
-> END

// 道中交流「切れた三本目」（knot の名前 duomo_string が交流のID）。
// 今は起こらない：条件『ドゥオモを終えた』（頭の # when: episode …）は、ドゥオモのバトルを終えると満たす。その後は交流が始まる観察がない。
// バトルを終えると、ドゥオモは地図の行き先に出なくなる。バトルの画面（結果の画面も）から観察に戻れるが、バトルの途中なので交流は始まらない。
// この交流でもらう青いピックは「弦を一本、余らせて」で使う。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
=== duomo_string ===
# scene: encounter
# title: 切れた三本目
# at: visit duomo_milano
# priority: after observe
# when: episode milano_duomo_episode
# on_done: item blue_pick
# background: milano_duomo
# speaker: narrator
ドゥオモを背に演奏していたノラが、三本目の弦を切った。予備の袋を歯で開けようとして、丸ごと落とす。
# speaker: narrator
ノラ「拾うの、私が先だとギターも一緒に落ちる。悪いけど、片方だけ手、貸してくれる？」
# speaker: heroine
ギターのほう、持ちたいです。……思ったより、軽くない

* [I'll hold the loose string. # option: coil # translation: ほどけた弦を押さえます。]
    # speaker: narrator
    丸まる弦を押さえると、ノラの両手が空いた。足元のケースから、青いピックを二枚出す。
    # speaker: narrator
    ノラ「一枚どうぞ。城の中庭で小さいギターを弾いてる子がいたら、その子に。いなけりゃ、あなたの」
    # speaker: heroine
    直接渡すかは、会ってから決めようか
    -> END

* [Let me pick up the packet. # option: case # translation: 袋を拾います。]
    # speaker: narrator
    袋を拾うと、中から青いピックがこぼれた。ノラは一本だけ音を鳴らしてから、二枚のうち一枚を押し戻した。
    # speaker: narrator
    ノラ「予備が誰かの本番になる日もあるよ。城で弾いてる子が見えたら、よろしく」
    -> END

* [I'll give you some room. # option: leave # translation: 少し場所を空けます。]
    # later
    # speaker: narrator
    ノラはギターを膝から下ろし、やっと両手を空けた。「場所も助かる。また弾いてるときにね」
    # speaker: heroine
    今度ここを通ったら、弦が戻ったか聴いてみましょう
    -> END

// デート（本筋）。romance/date_catalog.json の milano_walk_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_walk_01 ===
# scene: date
# title: 私を探す一枚
# background: milano_walk_landmark
# speaker: narrator
ドゥオモ広場でカメラを渡された。彼女はポーズを取らず、広場の人の流れにすっと混じった。
# speaker: heroine
大聖堂を撮って。あとで私を探せるくらい、小さく
足元の地下には昔の礼拝施設の跡もあるんだって。そこまで写るかな
# speaker: player
人物が主役じゃなくていいの？
# speaker: heroine
いつも撮る係なんです。一枚くらい、たしかにここにいたっていう証拠がほしい
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はストラップを渡すまで、カメラから両手を離さなかった。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
カメラを渡すとき、彼女は背伸びして、ファインダー越しの相手をのぞいた。
}

* [「袖だけでも分かる」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        私がここにいたって話だから、袖だけで済まさないで
    - else:
        # speaker: heroine
        # emotion: teasing
        じゃあ腕は振らない。難易度、ちょっと上げます
    }
    -> join_1

* [「どの辺まで歩きたい？」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        範囲を決めたら探すのが簡単すぎる。行き先は内緒
    - else:
        # speaker: heroine
        あの境目。地下に前の広場が残ってるって知ると、石の上を歩く足も撮ってほしいな
    }
    -> join_1

* [「一枚だけ僕に任せて」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        一枚だけって言われると緊張する。何枚かにしてくれる？
    - else:
        # speaker: heroine
        うん。一枚だけね。変でも、あとで二人で見る
    }
    -> join_1

= join_1
# speaker: narrator
画面を拡大すると、人の肩と肩の間に彼女がいた。大聖堂を見上げず、こちらを向いて笑っている。
# speaker: heroine
しまった。カメラ見たら普通の記念写真だ

* [「こっちを見た理由を聞く」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        そこまで理由がある顔してた？　たまたまかもよ
    - else:
        # speaker: heroine
        ちゃんと探してくれてるか、気になった。……探してたね
    }
    -> join_2

* [「次は交代して探して」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        今日は撮る係をお休みしたいの。もう少しだけ
    - else:
        # speaker: heroine
        見つけるよ。立ち止まって人に道を譲る癖、もう知ってる
    }
    -> join_2

* [「この一枚を送っていい？」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        先に二人で見よう。送るかは、ちょっと考えさせて
    - else:
        # speaker: heroine
        うん。元の大きさで。探すところも家に持って帰りたい
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
小さな画面を一緒に見るために、肩が触れた。
}
# speaker: narrator
二人は画面を縮めた。彼女が街に戻り、それでも今度はすぐ見つかった。
-> END
