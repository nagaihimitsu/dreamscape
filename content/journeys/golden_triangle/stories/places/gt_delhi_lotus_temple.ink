INCLUDE modules.ink
-> DONE

// ロータス寺院のデート（二人きり。噛み合いの選択は2回）。
// 背中に書いた最後の言葉を「読めなかった」と答えると、告白の夜に彼女が声で言い直す（gt_<都市>_hotel_hub_dates.ink）。

// 【3】
=== gt_delhi_date_lotus_temple ===
# scene: date
# title: 背中の字あて
# when: episodes delhi >= 1
# background: gt_bg_delhi_lotus_temple
# speaker: narrator
芝生の向こうに、白い花びらを重ねた建物が浮かんでいた。大理石の花びらは二十七枚。三枚ずつ組になって、九つの面をつくっている。
入口の手前で、ボランティアの若者が、並んだ人たちに静かに説明していた。どの宗教の人でも入れる。決まった儀式も、説教も、楽器の演奏もない。いちばん大事な決まりは一つ。話さないこと。
# speaker: heroine
# reaction: heroine,exasperated,sweat
しゃべっちゃだめなんだ。わたし、ちょっと苦手かも。思ったこと、すぐ言いたくなるから
# speaker: heroine
# emotion: teasing
先に言っておくね。中で笑わせてきたら、怒るから
# speaker: narrator
靴を預け、素足で白い階段を上る。扉をくぐったとたん、音が消えた。
天井は高く、花びらの重なりの隙間から、白い光が落ちてくる。木の長椅子に、たくさんの人が黙って座っていた。目を閉じる人。手を合わせる人。ただ天井を見上げている人。
並んで座って、一分。二分。彼女の指先が、こちらの背中に触れた。
すっ、と一本の線。曲がって、もう一本。――字だ。子どものころ、誰でも一度はやった、背中に書いて当てる遊び。
ひ。それから、ま。
横を見ると、彼女はまっすぐ前を向いたまま、すました顔をしていた。ひま。この静けさの中で、いちばん書いてはいけない二文字だった。
* [背中に「じぶんも」と書き返す # option: me_too_back]
    # profile: playful
    # memory: gt_delhi_date_lotus_temple_memory
    # set: gt_delhi_lotus_made_her_laugh
    { romance_result == "negative":
        # speaker: narrator
        三文字目で、彼女の肩が大きく揺れた。後ろの列から、ボランティアの視線が刺さる。彼女は真っ赤になってうつむき、それきり、こちらを見なかった。
    - else:
        # speaker: narrator
        三文字目を書き終える前に、彼女の肩が震えだした。声を出さずに笑うのは、声を出して笑うより、ずっと難しい。
        彼女は両手で口を押さえ、涙目でこちらをにらんだ。怒るから、と言ったでしょ、という目だった。
    }
* [背中に「しずかに」と書き返す # option: hush_back]
    # profile: honest
    # memory: gt_delhi_date_lotus_temple_memory
    { romance_result == "negative":
        # speaker: narrator
        書き終えると、彼女の指先が、すっと離れた。叱られた子どもみたいに、膝の上で手を重ねる。少しだけ、寂しそうな横顔だった。
    - else:
        # speaker: narrator
        書き終えると、彼女は少しだけ口をとがらせた。それから、こちらの背中に、ゆっくり三文字。
        ま、じ、め。
    }
* [前を向いたまま、首を小さく横に振る # option: shake_head]
    # profile: provocative
    # memory: gt_delhi_date_lotus_temple_memory
    { romance_result == "negative":
        # speaker: narrator
        返事がないと分かると、指先は止まった。彼女は前を向き、それきり、背中に触れてこなかった。
    - else:
        # speaker: narrator
        返事がないと分かると、指先が背中をつついた。一回。二回。三回目で、こちらが肩をすくめると、彼女は満足そうに手を引っこめた。反応が見たかっただけらしい。
    }
-
# speaker: narrator
後ろの列から、ボランティアの視線を感じた。二人は同時に背筋を伸ばし、それきり動かなくなった。
今度こそ、本当の静けさだった。誰かの咳。遠くの子どもが靴下で床を擦る音。光の角度が、少しずつ変わっていく。
{ cond("stage >= 2"):
    # speaker: narrator
    いつの間にか、彼女の肩が、こちらの肩に触れていた。離れるきっかけを、どちらも探さなかった。
}
# speaker: narrator
どれくらい経っただろう。立ち上がる前に、もう一度だけ、指先が背中に触れた。
# photo: gt_album_d61 # photo_caption: 背中の字あて
さっきより、ずっとゆっくりだった。一画ずつ、確かめるように。
ま。……次は、た、だろうか。右上に点が二つあったような、なかったような。い。た。い。
書き終えると、彼女はすぐに立ち上がり、こちらを振り返らずに出口へ歩きだした。
靴を受け取り、建物を囲む池のそばまで来て、ようやく彼女は大きく息を吐いた。
# speaker: heroine
# reaction: heroine,happy,sparkle
はあっ。しゃべれる！　すごかった。何もないのに、ずっと見ていられた
# speaker: heroine
でもね、静かにしてたら、頭の中がすごくうるさかったの。考えないようにするほど、考えちゃう。あれは、修行だね
{ cond("flag gt_delhi_lotus_made_her_laugh"):
    # speaker: heroine
    # emotion: exasperated
    それと。笑わせないでって、言ったよね？　あの『じぶんも』、一生忘れないから
}
# speaker: heroine
# emotion: teasing
……で。最後の、読めた？
* [「『まだいたい』」 # option: read_mada]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy_deep,sweat
        こ、声に出して読まないでよ。……忘れて。今のは、なし
    - else:
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        読めちゃったか。点々、気づいたんだ
        # speaker: heroine
        ここに、って意味。……たぶん。今は、そういうことにしておいて
    }
* [「『またいたい』……？」 # option: read_mata]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        そっか。点々、届かなかったか。……ちゃんと書いたんだけどな
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        ふふっ。点々、背中だと消えちゃうんだね
        # speaker: heroine
        # emotion: smile
        でも、それも合ってるかも。また来たいもん。正解は、教えない
    }
* [「読めなかった」 # option: couldnt_read]
    # profile: attentive
    # set: gt_delhi_back_word_secret
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……そっか。ゆっくり書いたのにな
        # speaker: heroine
        ううん、いい。いつか、ちゃんと声で言うね。背中じゃなくて
    - else:
        # speaker: heroine
        # emotion: smile
        そっか。……じゃあ、いい。読めなかったなら、その方がいいのかも
        # speaker: heroine
        声に出すと、なんだか本当になっちゃいそうだったから、背中に書いたの。いつか、ちゃんと声で言うね。背中じゃなくて
    }
-
# speaker: narrator
池の水面に、白い花びらがもう一つ映っていた。彼女はしばらくそれを眺めてから、靴のかかとを直した。
# speaker: heroine
ここ、何を祈ってもいいし、何も祈らなくてもいいんだって。わたし、祈るかわりに、字を書いちゃった
# speaker: heroine
# reaction: heroine,teasing,music
怒られなかったから、セーフ。ね？
-> END
