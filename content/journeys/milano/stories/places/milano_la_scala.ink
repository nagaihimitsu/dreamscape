INCLUDE modules.ink
-> DONE

// スカラ座の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、特殊戦B、道中交流とデート。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== la_scala_case_guide ===
# scene: guide
# background: milano_la_scala_date
# speaker: narrator
スカラ座の前で、女が椅子を一脚持ち上げている。通りかかった男が腰掛けようとした寸前だった。
# speaker: narrator
女は一度「すみません」と言い、よく考えてもう一度、「私のです」と言った。
# speaker: heroine
「座らせてもらえない椅子。劇場の外にもあるんですね。」
-> END

// ───── 特殊戦B（矛盾追及）。battles/catalog.json の milano_la_scala_b01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張・追及は手伝いの knot milano_la_scala_b01_claim、milano_la_scala_b01_press（knot の名前＋_claim・_press）。
=== milano_la_scala_b01 ===
# scene: battle
# background: milano_la_scala_date
# speaker: enemy
「祖母の椅子を片づけに来た。家族の話じゃ「スカラ座の平土間にあった」。買い手は鼻で笑った。」
# speaker: narrator
椅子を裏返すと、薄緑の塗料が桟に垂れている。祖母が台所を塗った年と同じ色だという。
# speaker: heroine
「劇場の椅子だと分かったら、売れるんですか？」
# speaker: enemy
# reaction: heroine,worried
「高くなる。……そしたら、捨てない口実ができる。持って帰るのに、口実ひとつ要る家なの。」
-> quiz(1) ->
# background: milano_la_scala_date
{ quiz_correct:
# speaker: enemy
「客席の壁紙にまで持ち主の好みがあったのね。」
- else:
# speaker: enemy
「桟敷は借りるだけだと思ってた。持ち主が好きなふうに飾れたのね。」
}
# speaker: narrator
アダは椅子の足を手のひらで払った。縁には、何度も持ち上げられた跡がある。
# speaker: enemy
「祖母はここにあったと言う。買い手は、そんなことは絶対にないと言う。どっちかが嘘をついたのかな。」
# speaker: player
「「絶対」のほうから調べてみよう。」
-> milano_la_scala_b01_claim ->
# background: milano_la_scala_date
# speaker: heroine
「触って分かるのはこの椅子のことだけ。他の椅子も全部そうかは、記録を開きましょう。」
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> milano_la_scala_b01_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: milano_la_scala_date
    # speaker: enemy
    「面白い。でも私が知りたいのは、平土間の床から椅子を動かせたかどうか。別の場所の話じゃ、買い手には通じない。」
    -> stop
}
# background: milano_la_scala_date
# speaker: heroine
「平土間では椅子を借りて座った、しかも動かせた。買い手の理由は崩れます。ただ、この一脚がそこから来た証明はまだありません。」
-> quiz(2) ->
# background: milano_la_scala_date
{ quiz_correct:
# speaker: enemy
「違う時代の座り方が一つ見えた。」
- else:
# speaker: enemy
「買い手は平土間の椅子を知らなかった。動かして、客に貸してたのよ。」
}
# speaker: enemy
「動かせた椅子が、うちまで動いてきた。そこをつないでくれる人がいればね。」
# speaker: heroine
# emotion: serious
「私、そこの証人にはなれません。」
# speaker: narrator
アダの手から布が落ちた。彼女は拾って、椅子の上に置いた。
-> quiz(3) ->
# background: milano_la_scala_date
{ quiz_correct:
# speaker: enemy
「席を持ち寄ってでも、演奏を聴きたかったのね。」
- else:
# speaker: enemy
「正式な再開を待てない人がいたのね。瓦礫の中、普通の椅子で演奏を聴いた。」
}
# speaker: narrator
アダは買い手に電話をかけた。
# speaker: enemy
「劇場の椅子だとは保証しません。はい。……じゃあ取りやめで。」
# speaker: narrator
切って、ようやく腰掛けた。彼女の膝の高さに、ぴったりだった。
# speaker: enemy
「子どもの頃ね、足が床につかないから、ばあちゃんがあの桟に板を渡した。いま見たら、傷が両方にある。」
# speaker: heroine
「値札、どうします？」
# speaker: enemy
「取る。家で文句が出たら、今度は私が座ってるところをどかしてもらう。」
-> END

=== milano_la_scala_b01_claim ===
# background: milano_la_scala_date
# speaker: enemy
「買い手の言い分はこう。「スカラ座の平土間の席は昔から全部固定。家に持って帰れた椅子なんてあるはずない」」
->->

=== milano_la_scala_b01_press ===
# background: milano_la_scala_date
# speaker: heroine
「この椅子の来歴じゃなくて、「昔から全部」の部分ですね。どの客席のどんな記録なら確かめられるかな。」
->->

// 道中交流「喉飴を噛む人」（knot の名前 scala_mint が交流のID）。
// 今は起こらない：条件『スカラ座の特殊戦を戦った』（頭の # when: battle …）を満たすと、スカラ座の観察はもう開かないため。
// 特殊戦を戦うと、スカラ座は地図の行き先に出なくなる。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
=== scala_mint ===
# scene: encounter
# title: 喉飴を噛む人
# at: visit la_scala_case
# priority: after observe
# when: battle milano_la_scala_b01
# background: milano_la_scala_date
# speaker: narrator
スカラ座前で、声の大きな客が二人、飴を持って口論している。片方が袋を開け、片方が「噛んだら三秒だ」とこぼした。
# speaker: narrator
架空の菓子売り「この二人、毎回これで開演前の時間をつぶすのよ。小袋なら二ユーロ」

* [A small bag, please. # option: buy # translation: 小袋を一つください。]
    # money: -2
    # speaker: narrator
    受け取った彼女が一粒を口に入れた。かり、と音がして、二人の客が同時に振り向いた。
    # speaker: heroine
    「……三秒、もたなかったです。」
    -> END

* [Who won last time? # option: ask # translation: 前はどっちが勝ったの？]
    # speaker: narrator
    菓子売り「私。口論が長いと、開演前にもう一袋売れるの」。客がそろって袋を握りしめた。
    # speaker: heroine
    「今日の勝負は長くなりそう。」
    -> END

* [No sweets for me, thanks. # option: leave # translation: 私は飴は遠慮します。]
    # later
    # speaker: narrator
    菓子売りは袋をしまい、二人の客に目をやった。「あんたたちも、たまにはこの人を見習って黙ってみたら」
    # speaker: narrator
    二人は同時に抗議した。飴が頬の同じ側でふくらんだ。
    -> END

// デート（本筋）。romance/date_catalog.json の milano_la_scala_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_la_scala_date_01 ===
# scene: date
# title: 故意のアンコール
# background: milano_la_scala_date
# speaker: narrator
スカラ座前の広場で彼女が一礼した。拍手をすると手で制される。
# speaker: heroine
# emotion: teasing
「まだ始まってません。お客さん、気が早すぎます。」
# speaker: player
「何が始まるの？」
# speaker: heroine
「学芸会。台詞ひとつだったのに、前の子と一緒に言っちゃった。その一言の、やり直し。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は声がどこまで届くか、靴先で距離を測った。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の前だけに、小さくお辞儀し直した。
}

* [「客席で黙って待つ」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「本当に黙られると、学芸会より緊張する。何か言って。」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいお客さんですね。あ、こうやっておしゃべりしてるの、私のほうだ。」
    }
    -> join_1

* [「前の子の役、やろうか」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        「その役までいるとあの日そっくりで。今日は一人でやってみる。」
    - else:
        # speaker: heroine
        「うん！　あなたの台詞は「誰かいるのか」。最後までちゃんと言ってね。」
    }
    -> join_1

* [「途中で笑っても最後まで見る」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        「笑われる前提はやっぱり怖い。ちょっと背中向けて。」
    - else:
        # speaker: heroine
        「そっちの方が安心する。笑わせたら二度目もやるかも。」
    }
    -> join_1

= join_1
# speaker: narrator
彼女は劇場の入口を背に、深く息を吸った。「ここにいるよ」。向こうの信号が変わるまで、誰も続きをかぶせなかった。
# speaker: heroine
「昔のスカラ座では客が桟敷を好きに飾ったんだって。いまの客席、どこがいい？」

* [「もう半歩、前の席」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        「そこだと顔まで全部見える。今はこのくらいで。」
    - else:
        # speaker: heroine
        「……近いね。でも今の一言なら、そこに届いたって分かる。」
    }
    -> join_2

* [「あなたが見える最後列」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        「そんなに下がらなくていいよ。今度は普通の声で話したい。」
    - else:
        # speaker: heroine
        「いいな。いちばん遠くにいた人も待っててくれたって、役者はうれしい。」
    }
    -> join_2

* [「僕が舞台、そっちが客席」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_la_scala_date_01
    { romance_result == "negative":
        # speaker: heroine
        「もう一本だけ、私が役者でいたい。いい？」
    - else:
        # speaker: heroine
        「役者交代！　私は拍手しないよ、ちゃんと最後までは。」
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
礼が終わっても、彼女は少しの間こちらを見ていた。
}
# speaker: narrator
広場の雑踏の中で、二人分だけの公演が終わった。カーテンの代わりに信号がもう一度変わった。
-> END
