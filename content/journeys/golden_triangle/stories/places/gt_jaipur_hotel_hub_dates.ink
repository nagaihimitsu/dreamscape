INCLUDE modules.ink
-> DONE

// ジャイプールの宿の屋上：告白のデートと、「待って」と言われた後のデート（どちらも新しく足すデート。2026-11-09 に足すと決めた）。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は confession_result で分ける。前置きも、同じ返事で分ける（2026-11-09 の直し）。
// 都市ごとに同じ形のファイルがある（gt_delhi_hotel_hub_dates.ink ほか）。
// ジャイプールだけ、最後に「待って」の後の彼女の返事（gt_jaipur_date_answer。2026-11-13）がある。地図の出来事は宿で、場面は宿の近くの通り。

// 【3】
=== gt_jaipur_date_confession ===
# scene: date
# title: 屋上の、言いたいこと
# when: episodes jaipur >= 1
# when: not couple
# when: time night
# background: gt_bg_hotel_rooftop_night
# tint: off
# bgm: immersed
# speaker: narrator
宿の屋上から見る旧市街は、夜になると、桃色が橙色に変わる。どこか遠くで、結婚式の楽隊が鳴っていた。太鼓と、ラッパと、誰かの歓声。
# speaker: heroine
この町、毎晩、誰かが結婚してるのかな。楽隊の音って、知らない人のなのに、こっちまでうれしくなるね
-> gt_jaipur_confession_lead ->
* [「この旅が終わっても、一緒にいたい。付き合ってほしい」 # option: stay_together]
    # speaker: narrator
    彼女は、息を吸ったまま、しばらく動かなかった。
* [「好きだ。君は、どう思ってる？」 # option: ask_her_heart]
    # speaker: narrator
    遠くの楽隊の音が、ふっと途切れた。彼女は、こちらから目をそらさなかった。
* [「黙っていたら、誰も気づかない。だから言う。……好きです」 # option: say_it_now]
    # speaker: narrator
    カムラの言葉だと気づいた彼女は、目を丸くして、それから、少しだけ笑った。
-
{
- confession_result == "accepted":
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # pause: 800
    ……うん。わたしも、好き
    # speaker: heroine
    # emotion: serious
    迷ったけど、ちゃんと、わたしの言葉で言いたかった。言われたから、うなずくんじゃなくて。……わたしも、一緒にいたい。旅が終わっても
    # speaker: heroine
    # reaction: heroine,teasing,heart
    # photo: gt_album_j43 # photo_caption: 楽隊の音の屋上の告白
    ふふ。顔、すごいことになってる。わたしも、たぶん、同じ顔してるけど
    # speaker: heroine
    # emotion: smile
    旅が終わったあとのことは、一緒に決めようね。どこに行くかも、何を食べるかも。決めてもらうんじゃなくて、二人で
- confession_result == "rejected":
    # speaker: heroine
    # emotion: serious
    ありがとう。言ってくれて、うれしかった。それは、本当
    # speaker: heroine
    でも、ごめんなさい。今のわたしは、同じ気持ちで返せない。うそで返すのは、もっと嫌だから
    # speaker: narrator
    彼女は目をそらさなかった。言葉は短く、迷いがなかった。
    # speaker: heroine
    # emotion: smile
    旅は、最後まで一緒に行きたい。それも、本当。明日も、いつもみたいに、どこへ行くか一緒に決めてくれる？
- else:
    # speaker: heroine
    # emotion: serious
    うれしい。本当に、うれしい
    # speaker: heroine
    でも、今ここで答えたら、旅の夜のせいにしちゃいそうで。屋上と、楽隊の音と、遠くの灯りのせいに。……それは、嫌なの。ちゃんと、わたしが決めたいから
    # speaker: heroine
    # emotion: worried
    待たせるの、ずるいって分かってる。でも、軽く返したくない。……少しだけ、待ってくれる？
    # speaker: narrator
    # stand: close
    彼女は、そう言ってから、こちらの袖のはしを、ほんの少しだけつまんだ。離れたいわけじゃない、と言うかわりに。
}
-> END

// 告白の前置き。返事（confession_result）はデートを始めたときに決まっているので、前置きもそれで分ける。
// 交際が始まる道だけ、彼女から屋上に誘い、背中の字を明かす（交際は旅で1回なので、背中の字も1回）。
// 断る・「待って」の道は、主人公から誘って言い出す。前に告白していれば、挑み直しの言い出しにする。
// 告白のデートは、ほかのデートと同じく各都市で1回（2026-11-13。返事にかかわらず思い出になる）。前の告白はデリーかアーグラのもので、
// 下の cond("date gt_jaipur_date_confession") は、この告白のデートを繰り返せるように（JSON の repeatable）したときだけ真になる。
// 【3】手伝いの knot：告白の前置き（選択なし）
=== gt_jaipur_confession_lead ===
# speaker: narrator
# quiet: scene
しばらく、二人とも黙っていた。黙っていても気まずくない、と気づいたのは、いつからだっただろう。
{
- confession_result == "accepted":
    {
    - cond("date gt_delhi_date_reassurance") or cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
        # speaker: heroine
        # emotion: serious
        この前の続き、したくて、屋上に誘ったの。答えは、わたしから言いたかったから
        # speaker: heroine
        でも、わたしが答える前に、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - cond("date gt_delhi_date_confession") or cond("date gt_agra_date_confession") or cond("date gt_jaipur_date_confession"):
        # speaker: heroine
        # emotion: serious
        今夜は、わたしが誘ったの。前に言ってくれたこと、あれからずっと考えてた
        # speaker: heroine
        だから、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - else:
        # speaker: heroine
        # emotion: serious
        話したいことがあって、屋上に誘ったの。今夜は、わたしから誘いたかった
        # speaker: heroine
        でも、その前に。……何か言いかけてる顔、ずっとしてるよ。先に、聞かせて
    }
    { cond("flag gt_delhi_back_word_secret"):
        # speaker: heroine
        # recall: gt_album_d61
        あ、その前に、一つだけ。ロータス寺院で、背中に書いた字。読めなかったって言ってたでしょ。あれね、『まだいたい』って書いたの
        # speaker: heroine
        # reaction: heroine,shy,blush
        背中じゃなくて、声で言うって約束したから。……はい、言った。じゃあ、次はそっちの番
    }
    { cond("flag gt_jaipur_mehndi_her_secret") and cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        # recall: gt_album_j26
        彼女は、手のひらを一度開いて、また閉じた。メヘンディの模様は、まだ濃く残っている。
    }
- else:
    {
    - cond("date gt_delhi_date_confession") or cond("date gt_agra_date_confession") or cond("date gt_jaipur_date_confession"):
        # speaker: narrator
        屋上に誘ったのは、今夜もこちらだった。彼女も、たぶん分かっている。楽隊の音のする方を見たまま、こちらが口を開くのを待っていた。
        { cond("date gt_delhi_date_reassurance") or cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
            # speaker: narrator
            答えは彼女から、と一度は言われていた。それでも、言わずにいられなかった。
        }
        # speaker: heroine
        話、あるんでしょ。いいよ。最後まで、ちゃんと聞く
    - else:
        # speaker: narrator
        夕食のあと、少し涼もうと屋上に誘ったのは、こちらだった。彼女は手すりにもたれて、遠くの楽隊に合わせて、指で拍子をとっている。
        言うなら、今だと思った。
        # speaker: heroine
        ん？　どうしたの、改まった顔して
    }
}
- ->->

// 【3】「待って」と言われた後のデート（kind: reassurance。JSON の needsDeferred で出る。噛み合いの選択は1回）
=== gt_jaipur_date_reassurance ===
# scene: date
# title: チャイが冷めるまで
# when: episodes jaipur >= 1
# when: not couple
# when: time night
# until: date gt_delhi_date_reassurance
# until: date gt_agra_date_reassurance
# background: gt_bg_hotel_rooftop_night
# tint: off
# bgm: stages_of_grief
# speaker: narrator
宿の屋上に上がると、彼女が素焼きのカップを二つ持って待っていた。湯気が、二本並んで上っている。
# speaker: heroine
チャイ、二つもらってきた。一つは、そっちの
# speaker: heroine
# emotion: serious
この前の返事の話は、今日はしない。……そのかわり、チャイが冷めるまでは、普通の話をしよう。いつもの、どうでもいい話
* [「明日、どこへ行く？」 # option: where_tomorrow]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        明日の話……。うん、普通だね。普通、なんだけど、ちょっとだけ緊張する
    - else:
        # speaker: heroine
        # emotion: smile
        それ、いちばん普通の話。うれしい。明日は、わたしが一つ、行きたい所を言ってもいい？
    }
* [「今日見た、いちばん変なものの話」 # option: strangest_thing]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        変なもの……。ごめん、今日は、あんまり周りを見てなかったかも
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        変なもの？　屋根の上を歩いてた山羊。あれ、どうやって上ったんだろうね
    }
* [「日本に帰ったら、最初に何を食べる？」 # option: first_meal_home]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        帰ったら……。帰る話は、今はちょっと、さみしいかも
    - else:
        { cond("date gt_agra_date_ram_bagh"):
            # speaker: heroine
            # reaction: heroine,teasing,music
            鮭のおにぎり。三か所はがすやつ。ラーム・バーグで言ったの、覚えてた？
        - else:
            # speaker: heroine
            # reaction: heroine,teasing,music
            鮭のおにぎり。コンビニの、三か所はがすやつ。ちょっと恋しい
        }
    }
-
# speaker: narrator
チャイが冷めるまで、二人は本当に、どうでもいい話だけをした。カップの底に、香辛料の粒が沈んでいく。
# speaker: heroine
待っててくれて、ありがとう。待たせてごめんね、じゃなくて、ありがとうって言いたかったの
# speaker: heroine
# emotion: smile
答えは、わたしから言うね。ちゃんと決めたら。それまでは、いつもどおりでいて。いつもどおりが、いちばん助かる
-> END

// 【3】「待って」の後の、彼女の返事（kind: answer。2026-11-13 のユーザー判断「彼女から返事をする場面を足す」）。
// ジャイプールは旅の最後の都市なので、ここの告白で「待って」と言われると、後の都市の告白で告白し直せない。そこで、彼女から返事をする。
// 主人公はもう一度告白しない（告白は各都市で1回）。彼女が誘い、彼女が先に話す。
// 地図に出るのは、ジャイプールの告白のデートで「待って」と言われた後（JSON の needsDeferred と、頭の # when: date）の昼（# when: time day）。
// 告白は夜にしか出ないので、返事は早くても次の日の昼になる（「旅の夜のせいにしたくない」と言った彼女が、昼を選ぶ）。
// 旅の終わり（エピローグ）の前でも後でも出る（エピローグは自由時間か夜の画面から読むので、先に休めば必ず間に合う）。
// 返事は、デートを始めたときの関係の値で決まる（confession_result：告白が成立する条件を満たせば accepted、満たさなければ rejected。
// 乱数では決めず、もう一度「待って」にもならない）。噛み合いの札（# profile:）と関係値の札は書かない。
// 選択は、返事を聞いた後の主人公の返し（1回。choiceCount）。交際が始まる道だけ、思い出 gt_jaipur_date_answer_memory を残す。
// 場所：宿（バディー・チャウパル付近）から角をひとつ曲がったハワー・マハルの正面の通り。格子窓の目的・窓の数・入口・町の色の由来は
// 観光とフィナーレのクイズの答えなので、ここでは言わない（見えるもの：桃色の正面と、たくさんの小さな窓だけ）。
// 前の「待って」の後のデート（どの都市でも）を遊んでいれば、「わたしから言う」の約束を一言。フィナーレの後なら、通りで踊った夜を一言。
=== gt_jaipur_date_answer ===
# scene: date
# title: 夜のせいにしない返事
# when: date gt_jaipur_date_confession
# when: time day
# background: gt_bg_jaipur_hawa_mahal
# bgm: inner_light
# speaker: narrator
宿の玄関で、彼女が先に待っていた。「すぐそこだから」とだけ言って、角をひとつ曲がる。
ハワー・マハルの正面に、日の光が当たっていた。夜の屋上からは橙色に見えた町が、いまは、ちゃんと桃色をしている。
# speaker: heroine
見て。夜と、ぜんぜん色がちがう。……こっちが、この町のふだんの顔なのかな
# speaker: narrator
どこかの店のシャッターが上がる音。牛が一頭、ゆっくり通りを渡っていく。楽隊の音は、どこにもしない。
# speaker: heroine
# emotion: serious
屋上で、夜のせいにしたくないって言ったでしょ。楽隊と、灯りのせいに。だから、昼にしたの。いちばん普通の時間に
{ cond("date gt_delhi_date_reassurance") or cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
    # speaker: heroine
    答えは、わたしから言うって約束したもんね。だから、今日はわたしから
}
{ cond("episode gt_jaipur_finale"):
    # speaker: heroine
    # emotion: smile
    それに、通りの真ん中で踊れたんだもん。通りの真ん中でなら、ちゃんと言える気がした
}
{ confession_result == "accepted":
    -> yes
- else:
    -> not_now
}

= yes
# speaker: heroine
# quiet: scene
# pause: 600
好き。……付き合いたい。旅が終わっても、一緒にいたい
# speaker: heroine
# reaction: heroine,teasing,blush
昼間に、牛の横で言ってるんだからね。もう、夜のせいにはできないよ
# speaker: narrator
すぐ後ろを、さっきの牛が通っていった。彼女は笑いそうになるのをこらえて、こちらを見たままでいた。
* [「僕も、好きだ。昼でも、同じだ」 # option: same_by_day]
    # memory: gt_jaipur_date_answer_memory
    # speaker: heroine
    # reaction: heroine,shy_deep,heart
    知ってた。……うそ。ちょっとだけ、こわかった。今、聞けてよかった
* [「もう一回、言って」 # option: say_it_again]
    # memory: gt_jaipur_date_answer_memory
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    だめ。一日一回まで。……うそ。好き。はい、二回目。三回目は、夜に取っておく
* [黙って、手を差し出す # option: offer_hand]
    # memory: gt_jaipur_date_answer_memory
    # speaker: narrator
    彼女は少しだけ迷ってから、自分の手を重ねた。
    # speaker: heroine
    # reaction: heroine,shy,blush
    ……ふふ。窓がこんなにあるのに。まあ、いいか。見られても
-
# speaker: heroine
# emotion: smile
じゃあ、恋人になって最初の行き先、わたしが決めていい？　……もう、決めてあるんだけど
-> END

= not_now
# speaker: heroine
# quiet: scene
ちゃんと考えた。夜の気持ちじゃなくて、昼の明るさで。……それで、決めた
# speaker: heroine
恋人としては、今は、一緒にいられない。これが、わたしの答え。待たせたのに、ごめんなさい
# speaker: narrator
彼女は目をそらさなかった。たくさんの小さな窓が、上から二人を見下ろしていた。
# speaker: heroine
この旅で隣にいてくれたのは、本当にうれしかった。それは、答えとは別に、ちゃんと本当
* [「聞かせてくれて、ありがとう」 # option: thank_her]
    # speaker: heroine
    うん。……言うの、こわかった。でも、黙ったまま旅を終えるほうが、もっといやだった
* [「少しだけ、一人で歩いてくる」 # option: walk_alone]
    # speaker: heroine
    うん。宿で待ってる。戻ってきたら、チャイにしよう。今度は、わたしがおごる
* [「残りの旅も、いつもどおりで」 # option: as_usual]
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    それ、わたしが言おうと思ってたのに。……先に言われちゃった
-
# speaker: narrator
通りの向こうで、また一枚、シャッターが上がった。町は、いつもどおりに動いていた。
-> END
