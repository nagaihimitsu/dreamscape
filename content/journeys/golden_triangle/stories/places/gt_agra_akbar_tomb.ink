INCLUDE modules.ink
-> DONE

// アクバル廟のデート（二人きり。ほかに出るのは猿とブラックバックと、番人が少し。噛み合いの選択は2回）。
// デリーで買った雨の匂いの小瓶（gt_delhi_rain_attar）を持っていれば、猿が盗むのはそれ。
// 猿への応じ方（取引・追う・待つ）は手伝いの knot の選択（関係値はここ）。どれでも最後に猿が盗んだ物を落とし、
// ミニゲーム「猿の落とし物」（# minigame: monkey_catch、手伝いの knot gt_agra_akbar_tomb_monkey_catch_*）で受け止める。
// 小瓶を受け止められなければ（fumbled・missed）瓶が割れて小瓶は「使った」になり、芝生に雨の匂いの場面になる。
// サングラスは、受け止めても落としても無事に戻る。

// 【3】
=== gt_agra_date_akbar_tomb ===
# scene: date
# title: 猿との取引
# when: episodes agra >= 1
# hint: アーグラの観光を一つ終えてから
# background: gt_bg_agra_akbar_tomb
# speaker: narrator
シカンドラのアクバル廟は、門だけで一つの宮殿のようだった。赤い砂岩の大門をくぐると、広い芝生の向こうに、墓廟が低く横たわっている。
芝生の上で、背中の黒い獣が数頭、草を食んでいた。ねじれた長い角。ブラックバックだ。この廟の庭では、その群れが見られる。
# speaker: heroine
# reaction: heroine,surprised_big,sparkle
# voice: gt_agra_date_akbar_tomb_001
鹿！　王さまのお墓に、鹿がいる。角、ねじれてる。あれ、どうやって伸びるんだろう
* [「近づかずに、ここから見よう」 # option: watch_from_here]
    # profile: attentive
    # memory: gt_agra_date_akbar_tomb_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_akbar_tomb_002
        ……うん。もうちょっと近くで見たかったけど。驚かせたら、かわいそうだもんね
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_akbar_tomb_003
        うん。ここからでも、草を噛む音が聞こえそう。あ、一頭、こっち見た
    }
* [「角が何回ねじれてるか、当ててみて」 # option: guess_the_twists]
    # profile: playful
    # memory: gt_agra_date_akbar_tomb_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_agra_date_akbar_tomb_004
        数えられないよ、遠すぎて……。あ、また頭下げちゃった
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_agra_date_akbar_tomb_005
        えっと、一、二、三、四！　ううん、五かも。ずるい、動かないで
    }
* [「もっと近くで見よう」 # option: get_closer]
    # profile: bold
    # memory: gt_agra_date_akbar_tomb_memory
    { romance_result == "negative":
        # speaker: narrator
        三歩近づいたところで、ブラックバックたちはいっせいに顔を上げ、芝生の向こうへ駆けていった。
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_akbar_tomb_006
        ……逃げちゃった。ちょっと、急ぎすぎたね
    - else:
        # speaker: narrator
        そっと近づくと、一頭だけが逃げずに残った。角の筋まで見える距離だった。
        # speaker: heroine
        # reaction: heroine,surprised,sparkle
        # voice: gt_agra_date_akbar_tomb_007
        近い！　目、まつ毛が長い
    }
-
# speaker: narrator
ブラックバックに気を取られていた、そのときだった。
{ cond("item gt_delhi_rain_attar held"):
    -> gt_agra_akbar_tomb_monkey_attar ->
- else:
    -> gt_agra_akbar_tomb_monkey_glasses ->
}
# speaker: narrator
彼女がスマートフォンで開いた英語の案内に、この廟に眠る皇帝のことが書いてあった。アクバルは、生涯、文字を読めなかったと伝えられている。それでも本が大好きで、毎日、人に読み上げさせていた。宮廷には、たくさんの写本が集められていたという。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_date_akbar_tomb_008
読めないのに、本が好きだったんだ……。読んでもらうって、相手が書いてあるとおりに読んでくれるって、信じることだよね
# speaker: heroine
# emotion: teasing
# voice: gt_agra_date_akbar_tomb_009
じゃあ、そのページ、読んで。わたし、皇帝の気分で聞くから
* [真面目に読む # option: read_plainly]
    # profile: honest
    { romance_result == "negative":
        # speaker: narrator
        書いてあるとおりに、一行ずつ読んだ。三行目のあたりで、彼女の目がブラックバックの方へそれていった。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_agra_date_akbar_tomb_010
        ごめん、途中で鹿見てた。皇帝、失格だね
    - else:
        # speaker: narrator
        書いてあるとおりに、一行ずつ読んだ。彼女は腕を組み、目を閉じて、いかにも皇帝らしくうなずいていた。
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_akbar_tomb_011
        よろしい。読んでもらうのって、いいね。言葉が、人の声になって届く
    }
* [芝居がかって、朗々と読む # option: read_grandly]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_agra_date_akbar_tomb_012
        声、大きすぎ……。家族連れの人たちが、こっち見てる
    - else:
        # speaker: narrator
        門まで届きそうな声で読み上げると、近くの家族連れが振り返り、ブラックバックまで顔を上げた。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_agra_date_akbar_tomb_013
        ふふっ、声が大きい！　皇帝は、そこまで頼んでない
    }
* [一行だけ、嘘を混ぜて読む # option: read_with_a_lie]
    # profile: provocative
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_date_akbar_tomb_014
        今、嘘ついたでしょ。……読んでもらうのは信じることだって、言ったばかりなのに
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,question
        # voice: gt_agra_date_akbar_tomb_015
        待って。『皇帝は猿と取引した』って、今、書いてあった？
        # speaker: heroine
        # voice: gt_agra_date_akbar_tomb_016
        わたし、皇帝のふりしてるだけで、英語なら読めるんだよ。アクバルの読み手、くびね
    }
-
# speaker: narrator
帰り道、芝生のはずれで、ブラックバックが一頭、こちらをじっと見ていた。
# speaker: heroine
# voice: gt_agra_date_akbar_tomb_017
ここ、王さまのお墓なのに、鹿と猿の方が主人みたいだね。わたしたち、お客さんなのに、すっかり振り回されちゃった
-> END

// 【3】手伝いの knot：雨の匂いの小瓶を盗まれたとき（噛み合いでない選択）
=== gt_agra_akbar_tomb_monkey_attar ===
# speaker: narrator
暑さに顔をしかめながら、彼女が鞄から小さな布袋を取り出した。デリーの路地で買った、雨の匂いの小瓶だ。
# speaker: heroine
# voice: gt_agra_akbar_tomb_monkey_attar_001
こんなに暑いと、雨の匂いが恋しくなるね。ちょっとだけ、袋の上から――
# speaker: narrator
# shake: window
# se: snatch
言い終わる前に、灰色の影が横から走り抜けた。布袋が消えていた。猿が一匹、門の壁をするすると登り、袋を片手に、こちらを見下ろしている。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_akbar_tomb_monkey_attar_002
あっ！　ちょっと、それ、雨！　わたしの雨！
# speaker: narrator
# se: whistle
笛の音がして、若い番人が走ってきた。猿を見上げて、ため息をつく。
# speaker: gt_agra_akbar_guard
追いかけちゃだめです。取引しないと。何か飲み物と交換すれば、落としてくれます。ヴリンダーヴァンの猿は、眼鏡を盗んで、果物のジュースと交換するので有名なんですよ。ここのは、まだ見習いですけど
* [売店でパックのジュースを買って、交換を申し込む # option: attar_trade]
    # money: -20
    # rel: trust +1
    # speaker: narrator
    パックのジュースを高く掲げてみせると、猿は首をかしげた。布袋から小瓶をつまみ出して、小瓶と、こちらのジュースを、何度も見比べる。
    ジュースを壁の上へ放ると、猿は両手で受け取った。小瓶を持っていた方の手も、使って。
    -> gt_agra_akbar_tomb_monkey_catch_attar ->
    { cond("item gt_delhi_rain_attar held"):
        # speaker: narrator
        壁の上では、猿が器用にストローの穴を探し当てていた。
        # speaker: heroine
        # reaction: heroine,teasing,music
        取引成立、だね。……ありがとうございました？
        # speaker: narrator
        彼女は壁の上の猿に、律儀に頭を下げた。猿はジュースを飲みながら、それを見ていなかった。
    }
* [壁の下まで追いかける # option: attar_chase]
    # rel: spark +1
    # speaker: narrator
    壁の下まで走ると、猿は驚いて、さらに上へ跳んだ。その拍子に、布袋の口から小瓶が滑り出た。
    -> gt_agra_akbar_tomb_monkey_catch_attar ->
* [「待とう。猿にも、考える時間がいる」 # option: attar_wait]
    # rel: affection +1
    # speaker: narrator
    待っていると、猿は布袋の口を開け、中の小瓶を取り出した。栓を歯でくわえて、引っぱる。抜けない。栓のまわりの匂いを嗅いで――大きなくしゃみを一つ。小瓶が、手から離れた。
    -> gt_agra_akbar_tomb_monkey_catch_attar ->
-
{ cond("flag gt_agra_rain_on_lawn"):
    # speaker: narrator
    # se: glass_break_small
    石の通路で、かしゃん、と小さな音。
    次の瞬間、匂いが広がった。乾ききった芝生の上に、夏の終わりの最初の雨が降ったような、土の匂い。少し離れたところで、ブラックバックたちが、いっせいに顔を上げた。
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_agra_akbar_tomb_monkey_attar_004
    ……鹿が、雨だと思ってる
    # speaker: narrator
    # photo: gt_album_a39 # photo_caption: 雨の匂いになったアクバル廟
    彼女は割れた瓶を見下ろして、しばらく何も言わなかった。それから、こらえきれずに笑い出した。
    # speaker: heroine
    # reaction: heroine,happy,music
    # voice: gt_agra_akbar_tomb_monkey_attar_005
    日本で雨が降ったら、あの路地を思い出すはずだったのに。インドの芝生に、先に降っちゃった
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_akbar_tomb_monkey_attar_006
    でも、いいかも。これで、雨が降るたびに思い出す場所が、二つになった。路地と、鹿
}
- ->->

// 【3】手伝いの knot：猿が落とした小瓶を受け止める（噛み合いでない、場面の中の選択。取引・追う・待つのどれからも来る）。
// 選択肢の代わりにミニゲーム「猿の落とし物」。結果の選択肢に関係値は付けない（腕前で関係値が動かないように）。
// 弾いた・届かなかったときは小瓶を使う（割れる）。ここへ来る道は、デートの knot の cond("item gt_delhi_rain_attar held") の中だけ。
// おまかせは fumbled：雨の場面（アルバムの写真 a39）へ進む（クリケットのおまかせも、写真のある結末へ進むのと同じ考え）。
=== gt_agra_akbar_tomb_monkey_catch_attar ===
# speaker: narrator
# minigame: monkey_catch auto fumbled art.wall gt_img_agra_akbar_tomb_gate
小瓶が、壁の上から落ちてくる。考えるより先に、両手が出ていた。
* [落ちてきた小瓶を、両手で受け止めた # option: caught]
    # speaker: narrator
    両手の中に、ひやりとした小さな重みが収まった。指を開くと、小瓶は割れずにそこにあった。
    # speaker: heroine
    # reaction: heroine,surprised_big,sparkle
    わたしの雨、無事だった！
    # speaker: heroine
    # reaction: heroine,teasing,music
    ……今の、ちょっと格好よかったよ。ちょっとだけね
    # speaker: narrator
    彼女は小瓶を受け取ると、今度は鞄のいちばん奥にしまった。
* [受け止めかけて、指先で弾いた # option: fumbled]
    # use: gt_delhi_rain_attar
    # set: gt_agra_rain_on_lawn
    # speaker: narrator
    指先に、ガラスの冷たさが一瞬だけ触れた。つかんだと思った小瓶は、指の間で跳ねて、外へこぼれた。
* [手が届かなかった # option: missed]
    # use: gt_delhi_rain_attar
    # set: gt_agra_rain_on_lawn
    # speaker: narrator
    伸ばした手の先をかすめて、小瓶は落ちていった。
- ->->

// 【3】手伝いの knot：サングラスを盗まれたとき（噛み合いでない選択）
=== gt_agra_akbar_tomb_monkey_glasses ===
# speaker: narrator
まぶしさに目を細めて、彼女が頭の上のサングラスを下ろそうとした。その手が、空を切った。
# se: snatch
猿が一匹、門の壁をするすると登り、サングラスを片手に、こちらを見下ろしている。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# shake: window
# voice: gt_agra_akbar_tomb_monkey_glasses_001
あっ！　今の、わたしの頭の上から！？　気配、全然なかった！
# speaker: narrator
# se: whistle
笛の音がして、若い番人が走ってきた。猿を見上げて、ため息をつく。
# speaker: gt_agra_akbar_guard
追いかけちゃだめです。取引しないと。何か飲み物と交換すれば、落としてくれます。ヴリンダーヴァンの猿は、眼鏡を盗んで、果物のジュースと交換するので有名なんですよ。ここのは、まだ見習いですけど
* [売店でパックのジュースを買って、交換を申し込む # option: glasses_trade]
    # money: -20
    # rel: trust +1
    # speaker: narrator
    パックのジュースを高く掲げてみせると、猿はサングラスとジュースを何度も見比べ、やがて、ぱっと手を離した。
    -> gt_agra_akbar_tomb_monkey_catch_glasses ->
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_akbar_tomb_monkey_glasses_002
    歯形がついてる。でも、かけられる。記念になっちゃった
* [壁の下まで追いかける # option: glasses_chase]
    # rel: spark +1
    # speaker: narrator
    壁の下まで走ると、猿はさらに上へ逃げ、そこで、サングラスを自分の顔にかけた。
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_agra_akbar_tomb_monkey_glasses_003
    似合ってる。ふふっ、どうしよう、すごく似合ってる
    # speaker: narrator
    彼女が笑いながら写真を撮ると、猿はまぶしそうに空を見上げ、サングラスを外して、ぽいと放った。思ったより暗かったらしい。
    -> gt_agra_akbar_tomb_monkey_catch_glasses ->
* [「待とう。猿にも、考える時間がいる」 # option: glasses_wait]
    # rel: affection +1
    # speaker: narrator
    待っていると、猿はサングラスを裏返し、表に返し、つるを一本かじってから、興味をなくしたように手を離した。
    -> gt_agra_akbar_tomb_monkey_catch_glasses ->
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_akbar_tomb_monkey_glasses_004
    待ったら返ってきた。取引より、待つ方が安かったね
- ->->

// 【3】手伝いの knot：猿が落としたサングラスを受け止める（噛み合いでない、場面の中の選択。小瓶と同じミニゲームを
// prefix glasses で。結果の選択肢に関係値は付けない）。どの結果でも、サングラスは無事に戻る。
=== gt_agra_akbar_tomb_monkey_catch_glasses ===
# speaker: narrator
# minigame: monkey_catch prefix glasses thing glasses auto caught art.wall gt_img_agra_akbar_tomb_gate
サングラスが、壁の上から落ちてくる。考えるより先に、両手が出ていた。
* [落ちてきたサングラスを、両手で受け止めた # option: glasses_caught]
    # speaker: narrator
    両手の中に、サングラスがすとんと収まった。
* [受け止めかけて、指先で弾いた # option: glasses_fumbled]
    # speaker: narrator
    指先で一度跳ねたサングラスは、くるりと回って、石の通路で、からんと鳴った。拾い上げると、レンズは割れていなかった。
* [手が届かなかった # option: glasses_missed]
    # speaker: narrator
    サングラスは手の先をかすめて、石の通路に落ちた。拾い上げると、レンズは割れていなかった。
- ->->
