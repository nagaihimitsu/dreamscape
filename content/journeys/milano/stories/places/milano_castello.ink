INCLUDE modules.ink
-> DONE

// スフォルツェスコ城の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦と道中交流（バトルの後の「弦を一本、余らせて」）。
// 2026-11-22 の改稿：くしゃみで粘土の鼻がつぶれ、亡き祖父に似た顔になる。父ダヴィデはその顔を残したい、娘ルチアは宿題の「パパの顔」を作りたい。
// 二人の審判にされたヒロインは、作る人の側に立つ。反転：鼻は、祖父の話を一度もしない父に話させたくて、娘がわざと押していた。
// 結末は第3問（像を周りから見られる）から：前からは父、横からは祖父の顔。
// 父と娘は、フィナーレでヒロインが注文帳を「子どもの日曜日」と読む手がかりの一つ。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== castello_sforzesco_guide ===
# scene: guide
# background: milano_castello
# speaker: narrator
スフォルツェスコ城の中庭。煉瓦の壁の前のベンチで、小さな女の子が粘土をこねながら、隣に座った父親の顔をにらんでいる。
# speaker: narrator
父親は背筋を伸ばして動かずにいたが、鼻がひくひくしていた。くしゃみをこらえているらしい。
# speaker: heroine
似顔絵……じゃなくて、粘土の似顔だ
# speaker: narrator
女の子の手のひらには、こぶしほどの大きさの頭がのっている。そのとき、父親が盛大にくしゃみをした。
# speaker: narrator
女の子の指が跳ねて、粘土の鼻がぺしゃんこになった。
# speaker: heroine
# reaction: heroine,surprised,exclamation
あっ
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_castello_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_castello_01 ===
# scene: battle
# background: milano_castello
# speaker: narrator
女の子が、つぶれた鼻を指で戻そうとした。
# speaker: enemy
# cutin: name
待て、直すな！　……今の顔、うちの親父にそっくりだ
# speaker: milano_castello_daughter
# cutin: name
だめ。これ、学校の宿題なの。『家族の顔』。パパの顔を作るんだから
# speaker: enemy
親父だって家族だろ
# speaker: milano_castello_daughter
おじいちゃんには、会ったことないもん
# speaker: narrator
父と娘は、同時にこちらを向いた。
# speaker: enemy
そこの人。どっちが正しいか、決めてくれ
# speaker: heroine
# reaction: heroine,surprised,sweat
わ、わたしが決めるんですか？
# speaker: enemy
ダヴィデだ。こっちは娘のルチア。頼む、公平にな
# speaker: heroine
……お父さんのお父さんって、どんな人だったんですか
# speaker: enemy
まあ、いいだろ、親父の話は
# speaker: narrator
ダヴィデは目をそらした。ルチアは粘土の頭を小箱にしまいながら、その横顔をじっと見ていた。
# speaker: milano_castello_daughter
宿題、もう一つあるの。お城の中の、ミケランジェロの最後の像を見てくること
# speaker: narrator
四人は城の博物館に入った。像の置かれた部屋は、天井の高い、細長い部屋だった。
# speaker: enemy
城の部屋ってことは、王様の広間か何かだろ
-> quiz(1) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    ここ、昔は病院だったんですね。病気の兵士たちが、ここで寝てた
- else:
    # speaker: heroine
    王様の広間じゃなくて、病院だったんだ。病気の兵士たちが、ここで療養してた
}
# speaker: narrator
ルチアが天井を見上げた。
# speaker: milano_castello_daughter
寝てたら、天井がいちばんよく見えるね
# speaker: enemy
……親父も、最後は病院だった。天井のしみの話ばっかりしてたよ。あれは馬に見える、あれは鍋だ、ってな
# speaker: enemy
俺は毎回、外の天気の話だけして帰った
# speaker: heroine
しみの形、聞いてみたことはありますか？
# speaker: narrator
ダヴィデは天井を見上げたまま、首を振った。
# speaker: enemy
……ない
# speaker: narrator
部屋の奥に、白い石の像が立っていた。寄りそう二人の人の形が、途中で溶けたように見える。
# speaker: milano_castello_daughter
先生が言ってた。これ、ミケランジェロが最後まで作ってた像なんだって。だったら、わたしも直していいでしょ
-> quiz(2) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    何年も、何度も作り変えた像。直した時間も、今の形に入ってるんだ
- else:
    # speaker: enemy
    ひと彫りでできたんじゃなく、晩年の十年近く、作り変え続けたのか。……ミケランジェロでも
}
# speaker: heroine
# emotion: serious
作ってるのはルチアちゃんだから、直すかどうかは、ルチアちゃんが決めていいと思います
# speaker: enemy
……審判まで、そっちにつくのか
# speaker: narrator
ルチアは小箱を胸に抱いたまま、しばらく足もとを見ていた。
# speaker: milano_castello_daughter
……鼻がつぶれたの、くしゃみのせいだけじゃないよ
# speaker: enemy
は？
# speaker: milano_castello_daughter
冷蔵庫の写真のおじいちゃんに似るように、わたしが、もう少し押したの。パパ、おじいちゃんの話を一回もしないから
# speaker: milano_castello_daughter
似てたら、話すかなって
# speaker: narrator
ダヴィデは口を開けたまま、何も言わなかった。像の前で、しばらく誰も動かなかった。
# speaker: enemy
……それで、どっちの顔にするんだ。親父か、俺か
# speaker: heroine
あの像、前からだけじゃなくて、まわりを歩いて見られましたよね
-> quiz(3) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    ぐるっと回って、どこからでも見られる。正面の一枚だけが、この像の顔じゃないんだ
- else:
    # speaker: enemy
    回りこんで見られるのか。正面の写真一枚が、この像の全部じゃない、と
}
# speaker: heroine
じゃあ、前から見たらパパ、横から見たらおじいちゃん。……っていうのは、どうかな
# speaker: milano_castello_daughter
できる！
# speaker: narrator
中庭のベンチに戻ると、ルチアは粘土の頭を出して、鼻の正面だけを指でつまみ直した。横顔は、そのまま残した。
# speaker: milano_castello_daughter
動かないで。おじいちゃんの話、して
# speaker: enemy
……親父はな、くしゃみが三回続く人だった。一回目が出ると、みんな次を待つんだ
# speaker: narrator
言い終わらないうちに、ダヴィデがくしゃみをした。一回。二回。
# speaker: milano_castello_daughter
三回目はだめ！
# speaker: narrator
ダヴィデは鼻をつまんで、三回目をこらえた。ルチアの指は、もう止まらなかった。
# speaker: narrator
# leave: enemy
二人のそばを、{heroine_name}はそっと通り過ぎた。
# speaker: heroine
# emotion: smile
お父さんの顔、おじいちゃんの話をしてるときが、いちばん似てたね
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
城の中庭の端で、男の子が小さなギターを抱えていた。親指に絆創膏を巻き直しては、同じ和音を弾いている。
# speaker: milano_tino
# cutin: name
ここ、音が壁に当たって返ってくるんだ。家だと、隣の人が壁を叩き返してくるけど
# speaker: heroine
お城の中で練習していいの？
# speaker: milano_tino
もとは砦で、そのあと宮廷の住まいだったんだって。今は博物館と図書館が入ってるから、中庭は誰でも歩ける。ぼくみたいなのでも
# speaker: narrator
開いたケースの内張りに、青い三角の跡だけが残っていた。
{ cond("item blue_pick held"):
    # speaker: heroine
    # item_out: blue_pick
    ……ノラさんのピック、あの跡と同じ形だ
    -> castello_pick_with_pick
- else:
    # speaker: heroine
    あの跡、何が入ってたんだろう。……聞いたら悪いかな
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
    豪快に隣の弦をはじいて、本人がいちばん驚いた。
    # speaker: heroine
    今のがいい。二回目は、きっと違う音になっちゃうから
    # speaker: narrator
    ピックは、そのままティノの指に残った。
    -> END

* [I'll hold on to it for now. # option: keep # translation: 今は自分で持っておくよ。]
    # speaker: narrator
    彼女はケースの青い跡に落ちた葉を払い、ティノに目で挨拶した。ピックは、まだ手もとにある。
    # speaker: heroine
    渡すなら、あの子がほしいって言ってからでもいいよね
    -> END

// ピックを持っていないとき（聴く・尋ねる・通り過ぎる）。どれも、後でダルセナで渡せるようにフラグを立てる。
=== castello_pick_without_pick ===
* [Can I listen for a while? # option: listen # translation: しばらく聴いていてもいい？]
    # set: milano_tino_needs_pick
    # speaker: narrator
    ティノは同じ和音を三回弾いた。三回目だけ、壁からの返事が少し遅れた。
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
