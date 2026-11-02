VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_duomo
# speaker: narrator
ドゥオモを背に演奏していたノラが、三本目の弦を切った。予備の袋を歯で開けようとして、丸ごと落とす。
# speaker: narrator
ノラ「拾うの、私が先だとギターも一緒に落ちる。悪いけど、片方だけ手、貸してくれる？」
# speaker: heroine
「ギターのほう、持ちたいです。……思ったより、軽くない。」

* [I'll hold the loose string. # option: coil # translation: ほどけた弦を押さえます。]
    # speaker: narrator
    丸まる弦を押さえると、ノラの両手が空いた。足元のケースから、青いピックを二枚出す。
    # speaker: narrator
    ノラ「一枚どうぞ。城の中庭で小さいギターを弾いてる子がいたら、その子に。いなけりゃ、あなたの」
    # speaker: heroine
    「直接渡すかは、会ってから決めようか。」
    -> END

* [Let me pick up the packet. # option: case # translation: 袋を拾います。]
    # speaker: narrator
    袋を拾うと、中から青いピックがこぼれた。ノラは一本だけ音を鳴らしてから、二枚のうち一枚を押し戻した。
    # speaker: narrator
    ノラ「予備が誰かの本番になる日もあるよ。城で弾いてる子が見えたら、よろしく」
    -> END

* [I'll give you some room. # option: leave # translation: 少し場所を空けます。]
    # speaker: narrator
    ノラはギターを膝から下ろし、やっと両手を空けた。「場所も助かる。また弾いてるときにね」
    # speaker: heroine
    「今度ここを通ったら、弦が戻ったか聴いてみましょう。」
    -> END
