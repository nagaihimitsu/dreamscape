INCLUDE modules.ink
-> DONE

// メヘターブ・バーグのデート（噛み合いの選択は2回：チーム分けと、最後の一球）。
// 岸辺の夕日のタージと「黒いタージ」の話はアーグラのフィナーレが使うので、ここでは庭の外の空き地のクリケットにし、タージは背景にとどめる。
// 最後の一球はミニゲーム「クリケットの打席」（# minigame: cricket_batting）。選択肢の代わりに主人公が打ち、彼女が投げる。
// 打った結果（six・over_wall・edge・bowled・no_swing）が同じ ID の選択肢を選び、その選択肢の # profile: で噛み合いが決まる。
// 振らなかったとき（no_swing）は、噛み合いの後でソニアが「もう一球」と言い、手伝いの knot でもう一度だけ打つ
// （そちらは場面の中の選択で、噛み合いはない。1回の打席で噛み合いは1回だけ。二球目も振らなければ、ループせずに終わる）。
// 結果ごとの出来事と彼女の反応は、手伝いの knot（gt_agra_mehtab_bagh_ball_*）にまとめ、一球目と二球目で同じものを使う。
// 写真代を払うかは、手伝いの knot の選択（払わなくても話は進む）。

// 【3】
=== gt_agra_date_mehtab_bagh ===
# scene: date
# title: 塀を越えたらアウト
# when: episodes agra >= 1
# hint: アーグラの観光を一つ終えてから
# background: gt_bg_agra_mehtab_bagh
# weather: dust
# speaker: narrator
メヘターブ・バーグの庭をひと回りして外に出ると、塀の向こうは、隣の村の空き地になっていた。乾いた土の上で、子どもたちがクリケットをしている。打席の向こう、川の対岸には、白いドームが浮かんでいた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
見て。タージ・マハルの前で、クリケット。誰もタージの方、見てないね
# speaker: narrator
三本の棒の代わりに、煉瓦が三つ積んである。バットは板きれ。一人だけ、髪を後ろで固く結んだ女の子が、全員に指示を飛ばしていた。
その子が、こちらに気づいて走ってきた。英語は短く、迷いがない。
# speaker: gt_agra_mehtab_girl
一人足りない。入って。どっちでもいい。……ううん、やっぱり、投げられる方
# speaker: gt_sonia
# cutin: name
ソニア、十二歳。この空き地のキャプテン。ルールは三つ。川まで飛ばしたら六点。ただし、自分で拾いに行くこと。庭の塀を越えたら、アウト
# speaker: narrator
指を折りながら、そう教えてくれた。
# speaker: gt_sonia
塀の向こうは役所の庭だから、ボールを取りに行くと怒られる。だから、越えたらアウト
# speaker: heroine
……投げられる方、だって
# speaker: narrator
彼女は、ソニアの手の中のボールを見ていた。テープを何重にも巻いた、でこぼこのボールだ。
# speaker: heroine
# emotion: serious
わたし、やりたい。投げる方。体育のチーム分けで、いつも最後まで残ってた方なんだけど。それでも
* [「いいね。自分は打つ方に入る」 # option: rival_team]
    # profile: playful
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        敵同士……。ちょっと心細いな。味方、知らない子ばっかりだし
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        じゃあ、敵同士だね。手加減しないから
    }
* [「同じチームがいい」 # option: same_team]
    # profile: bold
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: gt_sonia
        だめ。打つ人が足りない方に入って。キャプテンが決める
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        ……子どもの前で、そういうこと言わないで。キャプテンに怒られちゃった
    - else:
        # speaker: gt_sonia
        だめ。打つ人が足りない方に入って。キャプテンが決める
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        ふふ、キャプテンには逆らえないね。敵同士になっちゃった
    }
* [「最初の一球、見てていい？」 # option: watch_first_ball]
    # profile: attentive
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        見られてると、ほんとに投げられないかも……。少しだけ、あっち向いてて
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        見られてると、緊張する。……でも、見てて。あとで笑ったら怒るけど
    }
-
# speaker: narrator
彼女の最初の一球は、地面を三回はねて、打者の足もとで止まった。子どもたちが笑い、彼女も笑った。
# se: bricks_fall
二球目は、煉瓦の手前で失速した。三球目で、煉瓦が一つ落ちた。アウト。打った少年が信じられないという顔をして、ソニアが一番大きな声で叫んだ。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
当たった！？　今の、わたし！？
# speaker: narrator
それから先は、あっという間だった。ソニアの家の手伝いの時間が来る前に、終わらせなければならないらしい。
# speaker: gt_sonia
最後の一球。あなたが打って。この人が投げる。打てなかったら、わたしたちの勝ち
# speaker: narrator
板きれのバットを渡された。マウンドの代わりの土の盛り上がりに、彼女が立つ。ボールを握り直して、まっすぐこちらを見た。
# speaker: heroine
# emotion: serious
# minigame: cricket_batting auto over_wall
本気で投げるから。本気で打ってね
// 最後の一球：選択肢の代わりにミニゲーム。打った結果の ID の選択肢をゲームが選ぶ（噛み合いはここで1回）。
* [最後の一球：まっすぐ打ち返した # option: six]
    # profile: bold
    -> gt_agra_mehtab_bagh_ball_six ->
* [最後の一球：横へ高く打ち上げた # option: over_wall]
    # profile: honest
    -> gt_agra_mehtab_bagh_ball_over_wall ->
* [最後の一球：板の端に当てた # option: edge]
    # profile: attentive
    -> gt_agra_mehtab_bagh_ball_edge ->
* [最後の一球：空振りした # option: bowled]
    # profile: honest
    -> gt_agra_mehtab_bagh_ball_bowled ->
* [最後の一球：振らなかった # option: no_swing]
    # profile: provocative
    # speaker: narrator
    板きれは、肩の上で止まったままだった。ボールは脇を抜けて、後ろの煉瓦を落とした。子どもたちが歓声を上げる。彼女だけが、笑っていなかった。
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        ……今の、振らなかったでしょ。それ、一番嫌
        # speaker: heroine
        本気で投げたのに、振ってももらえなかったら、わたしの一球、なかったことになっちゃう
    - else:
        # speaker: heroine
        # emotion: exasperated
        今の、見送ったでしょ。勝たせてくれようとしたなら、優しいのは分かる。でも、それはだめ
        # speaker: heroine
        わたしの一球、ちゃんと打ってほしかった
    }
    # speaker: narrator
    ソニアが二人を見比べて、肩をすくめた。
    # speaker: gt_sonia
    もう一球。今のは数えない。キャプテンが決める
    -> gt_agra_mehtab_bagh_another_ball ->
-
# speaker: narrator
試合が終わると、ソニアは手を差し出した。握手かと思ったら、手のひらは上を向いていた。
# speaker: gt_sonia
タージと、クリケットと、あなたたち。写真代、ちょうだい。外国の人は、みんな撮りたがるから
# speaker: heroine
# reaction: heroine,surprised,interrobang
しっかりしてる！
# speaker: gt_sonia
本物のバットが欲しいの。ちゃんとした革のボールも。州のチームの選考は、本物で打たないと笑われる
-> gt_agra_mehtab_bagh_photo ->
# speaker: narrator
子どもたちが散っていくと、空き地には土ぼこりと、二人だけが残った。彼女は服の土を払いながら、塀に背中をあずけた。
# speaker: heroine
チーム分けで、最初に選ばれたの、生まれて初めてかも。ソニアさん、わたしが投げたいって顔してたの、分かってたのかな
# speaker: heroine
# emotion: smile
投げたい、って言ってよかった。言わなかったら、たぶん今日も、見てるだけだった
-> END

// 【3】手伝いの knot：二球目（一球目を振らなかったとき。同じミニゲームを、選択肢の ID に again_ を付けてもう一度だけ。
// 場面の中の選択なので噛み合いはない。彼女の声は、一球目の噛み合いの romance_result のまま）
=== gt_agra_mehtab_bagh_another_ball ===
# speaker: narrator
# minigame: cricket_batting prefix again auto over_wall
ソニアがボールを投げ返す。彼女はそれを両手で受け取って、もう一度、土の盛り上がりに立った。
* [もう一球：まっすぐ打ち返した # option: again_six]
    -> gt_agra_mehtab_bagh_ball_six ->
* [もう一球：横へ高く打ち上げた # option: again_over_wall]
    -> gt_agra_mehtab_bagh_ball_over_wall ->
* [もう一球：板の端に当てた # option: again_edge]
    -> gt_agra_mehtab_bagh_ball_edge ->
* [もう一球：空振りした # option: again_bowled]
    -> gt_agra_mehtab_bagh_ball_bowled ->
* [もう一球：また振らなかった # option: again_no_swing]
    # speaker: narrator
    板きれは、また動かなかった。けれど今度は、少し遅いボールの方が板きれに当たって、ぼてぼてと転がり、彼女の足もとで止まった。
    # speaker: gt_sonia
    ……当たった。時間。引き分け
    # speaker: heroine
    # reaction: heroine,exasperated,sigh
    振らなくても、当たっちゃうんだ。……ずるい
    # speaker: narrator
    彼女はボールを拾って、それから、ようやく笑った。
    # speaker: heroine
    # emotion: smile
    次にどこかでやるときは、ちゃんと振ってね。かっこよくなくていいから、本気の方がいい
- ->->

// 【3】手伝いの knot：結果ごとの出来事と彼女の反応（一球目と二球目で共通。ボールの音はミニゲームが鳴らしたので、行の # se: は書かない）
=== gt_agra_mehtab_bagh_ball_six ===
# speaker: narrator
板きれの真ん中で、乾いた音がした。打球は彼女の頭の上を越えて、まっすぐ川の方へ飛んでいった。
# speaker: gt_sonia
六点。……そっちの勝ち。ボールは、あなたが拾ってくること
{ romance_result == "negative":
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    今の、わたしの頭のすぐ上だったよ。……本気で、とは言ったけど。本気すぎ
    # speaker: heroine
    拾いに行くのは、そっちだからね。わたしは、ここで待ってる
- else:
    # speaker: heroine
    # reaction: heroine,surprised_big,sparkle
    わ、見た？　わたしの頭の上、まっすぐ越えていった！
    # speaker: heroine
    # reaction: heroine,teasing,music
    悔しいのに、ちょっと見とれちゃった。……拾いに行くの、一緒に走ってあげる。投げた責任があるから
}
# speaker: narrator
テープのボールは、川べりの草の中ですぐに見つかった。戻ってくると、こちらの組の子どもたちが、まだ跳びはねていた。
->->

=== gt_agra_mehtab_bagh_ball_over_wall ===
{ romance_result == "negative":
    # speaker: narrator
    振った板きれが、思った以上に大きな音を立てた。彼女が一瞬、肩をすくめる。
- else:
    # speaker: narrator
    ボールは、思ったよりまっすぐ来た。振った板きれに、手ごたえがあった。
}
# speaker: narrator
# photo: gt_album_a32 # photo_caption: 最後の一球、塀を越えてアウト
打球は高く上がり、そのまま――庭の塀を越えていった。一瞬の静けさのあと、ソニアが両手を上げた。
# speaker: gt_sonia
アウト！　塀を越えたらアウト！　わたしたちの勝ち！
# speaker: heroine
# reaction: heroine,teasing_big,music
ふふっ、あははっ！　打てたのに負けてる！　今日いちばんの当たりだったのに！
# speaker: heroine
でも、ちゃんと本気で打ってくれた。うれしい。勝ったのも、うれしいけど
->->

=== gt_agra_mehtab_bagh_ball_edge ===
# speaker: narrator
振るのが、ほんの少し遅れた。ボールは板きれの端に当たって、土の上を転がり、彼女の靴の先で止まった。
# speaker: gt_sonia
当たった。でも、点はなし。……引き分け
{ romance_result == "negative":
    # speaker: heroine
    # reaction: heroine,worried,sigh
    引き分け、か。……今日くらいは、勝ちたかったな
- else:
    # speaker: heroine
    # reaction: heroine,teasing,anger
    当てられた。悔しい。次は、ちゃんと煉瓦を落とすから
}
# speaker: narrator
彼女はボールを拾い上げて、手のひらの上で一度だけ転がした。
->->

=== gt_agra_mehtab_bagh_ball_bowled ===
# speaker: narrator
思いきり振った板きれは、空を切った。背中の後ろで、煉瓦の崩れる音がした。
# speaker: gt_sonia
アウト。わたしたちの勝ち
{ romance_result == "negative":
    # speaker: heroine
    # reaction: heroine,surprised_big,exclamation
    落ちた！　二つ目！　わたしの球で、今日、二つ目！
    # speaker: heroine
    # reaction: heroine,shy,sweat
    ……あ。ごめん、喜びすぎた。空振りした人の、目の前で
- else:
    # speaker: heroine
    # reaction: heroine,surprised_big,exclamation
    また落ちた！　二つ目！　今日、わたし、二つ目だよ！
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    ふふっ、今の空振り、すっごく本気だった。風の音、ここまで聞こえたもん
    # speaker: heroine
    本気で振ってくれたから、ちゃんと勝った気がする
}
->->

// 【3】手伝いの knot：写真代（噛み合いでない選択）
=== gt_agra_mehtab_bagh_photo ===
* [写真代を払って、みんなで撮る # option: pay_photo]
    # money: -10
    # speaker: narrator
    子どもたちが煉瓦の前に並び、真ん中にソニアが板きれを構えて立った。後ろの白いドームは、写真の中で、ちょうど打球の行き先みたいに見えた。
* [「撮る前に、写真代の使い道を聞いてもいい？」 # option: ask_photo_money]
    # money: -10
    # rel: trust +1
    # speaker: gt_sonia
    全部バット。……うそ。半分バット、半分は妹のノート
    # speaker: heroine
    # emotion: smile
    正直なキャプテン。払う価値、あるね
* [「写真はいいから、もう一回握手しよう」 # option: shake_instead]
    # speaker: narrator
    ソニアは少しむっとした顔をしてから、差し出された手を、思いきり握り返した。
    # speaker: gt_sonia
    商売にならない。……でも、いい試合だった
- ->->
