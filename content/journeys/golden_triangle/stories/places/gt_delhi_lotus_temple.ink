INCLUDE modules.ink
-> DONE

// ロータス寺院のデート（二人きり。噛み合いの選択は2回）。
// 背中に書いた最後の言葉は、この場面では読めない（何と書いたかは、交際が始まる告白の夜に彼女が明かす。
// gt_<都市>_hotel_hub_dates.ink。2026-11-16 のユーザー判断：「まだいたい」と書いたことは、この場面の中では分からないように）。
// 「読めなかった」と答えると、彼女は「いつか声で言う」と約束し、告白の夜にその約束どおり言い直す。

// 【3】
=== gt_delhi_date_lotus_temple ===
# scene: date
# title: 背中の字あて
# when: episodes delhi >= 1
# hint: デリーの観光を一つ終えてから
# background: gt_bg_delhi_lotus_temple
# speaker: narrator
芝生の向こうに、白い大理石の花びらを重ねた建物が浮かんでいた。
# speaker: narrator
ロータス寺院。蓮の花をかたどった、バハイ信仰の礼拝堂だ。
# speaker: narrator
入口の手前で、ボランティアの若者が静かに説明していた。どの宗教の人でも入れる。決まった儀式も、説教も、楽器の演奏もない。
# speaker: narrator
最後に彼は、唇の前に人さし指を一本立てた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_lotus_temple_001
しゃべっちゃだめなんだ。わたし、ちょっと苦手かも。思ったこと、すぐ言いたくなるから
# speaker: heroine
# emotion: teasing
# voice: gt_delhi_date_lotus_temple_002
先に言っておくね。中で笑わせてきたら、怒るから
# speaker: narrator
# quiet: line
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
        # emotion: shy_deep
        三文字目で、彼女の肩が大きく揺れた。彼女は真っ赤になってうつむき、それきり、こちらを見なかった。
    - else:
        # speaker: narrator
        三文字目を書き終える前に、彼女の肩が震えだした。声を出さずに笑うのは、声を出して笑うより、ずっと難しい。
        # emotion: exasperated
        彼女は両手で口を押さえ、涙目でこちらをにらんだ。怒るから、と言ったでしょ、という目だった。
    }
* [背中に「しずかに」と書き返す # option: hush_back]
    # profile: honest
    # memory: gt_delhi_date_lotus_temple_memory
    { romance_result == "negative":
        # speaker: narrator
        # emotion: worried
        書き終えると、彼女の指先が、すっと離れた。叱られた子どもみたいに、膝の上で手を重ねる。少しだけ、寂しそうな横顔だった。
    - else:
        # speaker: narrator
        # emotion: exasperated
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
# quiet: line
今度こそ、本当の静けさだった。誰かの咳。遠くの子どもが靴下で床を擦る音。光の角度が、少しずつ変わっていく。
{ cond("stage >= 2"):
    # speaker: narrator
    # stand: close
    いつの間にか、彼女の肩が、こちらの肩に触れていた。離れるきっかけを、どちらも探さなかった。
}
# speaker: narrator
# pause: 1000
どれくらい経っただろう。立ち上がる前に、もう一度だけ、指先が背中に触れた。
# photo: gt_album_d61 # photo_caption: 背中の字あて
さっきより、ずっとゆっくりだった。一画ずつ、確かめるように。
一つ目を追っているうちに、もう次の字が始まっていた。背中の上の線は、書かれたそばからほどけていく。読もうとするほど、指先のあたたかさばかりが残った。
# leave: heroine
書き終えると、彼女はすぐに立ち上がり、こちらを振り返らずに出口へ歩きだした。
靴を受け取り、建物を囲む池のそばまで来て、ようやく彼女は大きく息を吐いた。
# speaker: heroine
# reaction: heroine,happy,sparkle
# stand: near
# voice: gt_delhi_date_lotus_temple_003
はあっ。しゃべれる！　すごかった。何もないのに、ずっと見ていられた
# speaker: heroine
# voice: gt_delhi_date_lotus_temple_004
でもね、静かにしてたら、頭の中がすごくうるさかったの。考えないようにするほど、考えちゃう。あれは、修行だね
{ cond("flag gt_delhi_lotus_made_her_laugh"):
    # speaker: heroine
    # emotion: exasperated
    # voice: gt_delhi_date_lotus_temple_005
    それと。笑わせないでって、言ったよね？　あの『じぶんも』、一生忘れないから
}
# speaker: heroine
# emotion: teasing
# voice: gt_delhi_date_lotus_temple_006
……で。最後の、読めた？
* [「読めたよ。……でも、内緒」 # option: bluff_read]
    # profile: provocative
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy_deep,sweat
        # voice: gt_delhi_date_lotus_temple_019
        え……ほんとに？　……ずるい、そういう言い方
        # speaker: narrator
        彼女は池のほうへ顔をそむけた。こちらから見えるのは、赤くなった耳だけだった。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_lotus_temple_020
        うそ。読めた人は、そんな得意そうな顔しないもん
        # speaker: heroine
        # emotion: shy
        # voice: gt_delhi_date_lotus_temple_021
        ……よかった。ほんとに読めてたら、ここで逃げてた
    }
* [「『ひま』の続き？」 # option: guess_tease]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_lotus_temple_022
        ……ちがうよ。ふざけて書いたんじゃないもん
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_delhi_date_lotus_temple_023
        ふふっ。ちがいます
        # speaker: heroine
        # emotion: smile
        # voice: gt_delhi_date_lotus_temple_024
        続きなのは、ちょっと合ってるかな。……正解は、まだ教えない
    }
* [「読めなかった」 # option: couldnt_read]
    # profile: attentive
    # set: gt_delhi_back_word_secret
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_lotus_temple_013
        ……そっか。ゆっくり書いたのにな
        # speaker: heroine
        # voice: gt_delhi_date_lotus_temple_014
        ううん、いい。いつか、ちゃんと声で言うね。背中じゃなくて
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_delhi_date_lotus_temple_015
        そっか。……じゃあ、いい。読めなかったなら、その方がいいのかも
        # speaker: heroine
        # voice: gt_delhi_date_lotus_temple_016
        声に出すと、なんだか本当になっちゃいそうだったから、背中に書いたの。いつか、ちゃんと声で言うね。背中じゃなくて
    }
-
# speaker: narrator
池の水面に、白い花びらがもう一つ映っていた。彼女はしばらくそれを眺めてから、靴のかかとを直した。
# speaker: heroine
# voice: gt_delhi_date_lotus_temple_017
ここ、何を祈ってもいいし、何も祈らなくてもいいんだって。わたし、祈るかわりに、字を書いちゃった
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_date_lotus_temple_018
怒られなかったから、セーフ。ね？
-> END
