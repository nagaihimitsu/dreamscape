INCLUDE modules.ink
-> DONE

// メヘターブ・バーグのデート（噛み合いの選択は2回）。
// 岸辺の夕日のタージと「黒いタージ」の話はアーグラのフィナーレが使うので、ここでは庭の外の空き地のクリケットにし、タージは背景にとどめる。
// 写真代を払うかは、手伝いの knot の選択（払わなくても話は進む）。

// 【3】
=== gt_agra_date_mehtab_bagh ===
# scene: date
# title: 塀を越えたらアウト
# when: episodes agra >= 1
# background: gt_bg_agra_mehtab_bagh
# speaker: narrator
メヘターブ・バーグの庭をひと回りして外に出ると、塀の向こうは、隣の村の空き地になっていた。乾いた土の上で、子どもたちがクリケットをしている。打席の向こう、川の対岸には、白いドームが浮かんでいた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「見て。タージ・マハルの前で、クリケット。誰もタージの方、見てないね」
# speaker: narrator
三本の棒の代わりに、煉瓦が三つ積んである。バットは板きれ。一人だけ、髪を後ろで固く結んだ女の子が、全員に指示を飛ばしていた。
その子が、こちらに気づいて走ってきた。英語は短く、迷いがない。
女の子「一人足りない。入って。どっちでもいい。……ううん、やっぱり、投げられる方」
ソニア、十二歳。この空き地のキャプテンだという。ルールを三つ、指を折って教えてくれた。川まで飛ばしたら六点。ただし自分で拾いに行く。庭の塀を越えたら、アウト。
ソニア「塀の向こうは役所の庭だから、ボールを取りに行くと怒られる。だから、越えたらアウト」
# speaker: heroine
「……投げられる方、だって」
# speaker: narrator
彼女は、ソニアの手の中のボールを見ていた。テープを何重にも巻いた、でこぼこのボールだ。
# speaker: heroine
# emotion: serious
「わたし、やりたい。投げる方。体育のチーム分けで、いつも最後まで残ってた方なんだけど。それでも」
* [「いいね。自分は打つ方に入る」 # option: rival_team]
    # profile: playful
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「敵同士……。ちょっと心細いな。味方、知らない子ばっかりだし」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「じゃあ、敵同士だね。手加減しないから」
    }
* [「同じチームがいい」 # option: same_team]
    # profile: bold
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: narrator
        ソニア「だめ。打つ人が足りない方に入って。キャプテンが決める」
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「……子どもの前で、そういうこと言わないで。キャプテンに怒られちゃった」
    - else:
        # speaker: narrator
        ソニア「だめ。打つ人が足りない方に入って。キャプテンが決める」
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        「ふふ、キャプテンには逆らえないね。敵同士になっちゃった」
    }
* [「最初の一球、見てていい？」 # option: watch_first_ball]
    # profile: attentive
    # memory: gt_agra_date_mehtab_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「見られてると、ほんとに投げられないかも……。少しだけ、あっち向いてて」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「見られてると、緊張する。……でも、見てて。あとで笑ったら怒るけど」
    }
-
# speaker: narrator
彼女の最初の一球は、地面を三回はねて、打者の足もとで止まった。子どもたちが笑い、彼女も笑った。
二球目は、煉瓦の手前で失速した。三球目で、煉瓦が一つ落ちた。アウト。打った少年が信じられないという顔をして、ソニアが一番大きな声で叫んだ。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
「当たった！？　今の、わたし！？」
# speaker: narrator
それから先は、あっという間だった。ソニアの家の手伝いの時間が来る前に、終わらせなければならないらしい。
ソニア「最後の一球。あなたが打って。この人が投げる。打てなかったら、わたしたちの勝ち」
板きれのバットを渡された。マウンドの代わりの土の盛り上がりに、彼女が立つ。ボールを握り直して、まっすぐこちらを見た。
# speaker: heroine
# emotion: serious
「本気で投げるから。本気で打ってね」
* [本気で、思いきり振る # option: real_swing]
    # profile: honest
    { romance_result == "negative":
        # speaker: narrator
        振った板きれが、思った以上に大きな音を立てた。彼女が一瞬、肩をすくめる。
    - else:
        # speaker: narrator
        ボールは、思ったよりまっすぐ来た。振った板きれに、手ごたえがあった。
    }
    # speaker: narrator
    打球は高く上がり、そのまま――庭の塀を越えていった。一瞬の静けさのあと、ソニアが両手を上げた。
    ソニア「アウト！　塀を越えたらアウト！　わたしたちの勝ち！」
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    「ふふっ、あははっ！　打てたのに負けてる！　今日いちばんの当たりだったのに！」
    # speaker: heroine
    「でも、ちゃんと本気で打ってくれた。うれしい。勝ったのも、うれしいけど」
* [わざと空振りする # option: miss_on_purpose]
    # profile: provocative
    { romance_result == "negative":
        # speaker: narrator
        来た球に、わざと遅れて振った。板きれは空を切り、ボールは煉瓦に当たった。子どもたちが歓声を上げる。彼女だけが、笑っていなかった。
        # speaker: heroine
        # emotion: serious
        「……今の、わざと外したでしょ。それ、一番嫌」
        # speaker: heroine
        「本気で投げたのに、本気で打ってもらえなかったら、わたしの一球、なかったことになっちゃう」
    - else:
        # speaker: narrator
        来た球に、わざと遅れて振った。板きれは空を切り、ボールは煉瓦に当たった。子どもたちが歓声を上げる。彼女だけが、笑っていなかった。
        # speaker: heroine
        # emotion: exasperated
        「今の、わざとでしょ。優しいのは分かる。でも、それはだめ。わたしの一球、ちゃんと打ってほしかった」
    }
    # speaker: narrator
    ソニアが二人を見比べて、肩をすくめた。それから、ボールを彼女に投げ返した。
    ソニア「もう一球。今のは数えない。キャプテンが決める」
    二球目は、本気で振った。打球はぼてぼてと転がり、彼女の足もとで止まった。彼女はそれを拾って、ようやく笑った。
    # speaker: heroine
    「それでいいの。かっこよくなくていいから、本気の方がいい」
* [当てるだけにして、守る # option: block_ball]
    # profile: attentive
    { romance_result == "negative":
        # speaker: narrator
        ソニア「守った。……つまんない」
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「本気の球だったのに、本気で守られちゃった。ちょっと、ずるい」
    - else:
        # speaker: narrator
        ソニア「引き分け。つまらない。でも、ずるくはない」
        # speaker: heroine
        # reaction: heroine,teasing,anger
        「守られた。悔しい。次は倒すから」
    }
-
# speaker: narrator
試合が終わると、ソニアは手を差し出した。握手かと思ったら、手のひらは上を向いていた。
ソニア「タージと、クリケットと、あなたたち。写真代、ちょうだい。外国の人は、みんな撮りたがるから」
# speaker: heroine
# reaction: heroine,surprised,interrobang
「しっかりしてる！」
# speaker: narrator
ソニア「本物のバットが欲しいの。ちゃんとした革のボールも。州のチームの選考は、本物で打たないと笑われる」
-> gt_agra_mehtab_bagh_photo ->
# speaker: narrator
子どもたちが散っていくと、空き地には土ぼこりと、二人だけが残った。彼女は服の土を払いながら、塀に背中をあずけた。
# speaker: heroine
「チーム分けで、最初に選ばれたの、生まれて初めてかも。ソニアさん、わたしが投げたいって顔してたの、分かってたのかな」
# speaker: heroine
# emotion: smile
「投げたい、って言ってよかった。言わなかったら、たぶん今日も、見てるだけだった」
-> END

// 【3】手伝いの knot：写真代（噛み合いでない選択）
=== gt_agra_mehtab_bagh_photo ===
* [写真代を払って、みんなで撮る # option: pay_photo]
    # money: -10
    # speaker: narrator
    子どもたちが煉瓦の前に並び、真ん中にソニアが板きれを構えて立った。後ろの白いドームは、写真の中で、ちょうど打球の行き先みたいに見えた。
* [「撮る前に、写真代の使い道を聞いてもいい？」 # option: ask_photo_money]
    # money: -10
    # rel: trust +1
    # speaker: narrator
    ソニア「全部バット。……うそ。半分バット、半分は妹のノート」
    # speaker: heroine
    # emotion: smile
    「正直なキャプテン。払う価値、あるね」
* [「写真はいいから、もう一回握手しよう」 # option: shake_instead]
    # speaker: narrator
    ソニアは少しむっとした顔をしてから、差し出された手を、思いきり握り返した。
    ソニア「商売にならない。……でも、いい試合だった」
- ->->
