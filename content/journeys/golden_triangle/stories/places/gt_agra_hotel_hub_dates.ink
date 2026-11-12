INCLUDE modules.ink
-> DONE

// アーグラの宿の屋上：告白のデートと、「待って」と言われた後のデート（どちらも新しく足すデート。2026-11-09 に足すと決めた）。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は confession_result で分ける。前置きも、同じ返事で分ける（2026-11-09 の直し）。
// 都市ごとに同じ形のファイルがある（gt_delhi_hotel_hub_dates.ink ほか）。

// 【3】
=== gt_agra_date_confession ===
# scene: date
# title: 屋上の、言いたいこと
# when: episodes agra >= 1
# when: not couple
# when: time night
# background: gt_bg_hotel_rooftop_night
# speaker: narrator
宿の屋上からは、タージのドームが見えた。夜の中で、そこだけが白く、薄く光っている。
彼女は手すりの前まで行きかけて、くるりと向きを変えた。ドームに背を向けて、反対側の、洗濯物と貯水タンクしかない方の縁に腰を下ろす。
# speaker: heroine
タージの方を向いてると、なんだか、誰かの有名な恋の話の中にいるみたいで。こっち向きの方が、落ち着く
{ cond("date gt_agra_date_chini_rauza"):
    # speaker: heroine
    # emotion: smile
    チーニー・カ・ラウザーで聞いたこと、ちょっと分かる。誰かの物語の、背景にならない所がいいって
}
-> gt_agra_confession_lead ->
* [「この旅が終わっても、一緒にいたい。付き合ってほしい」 # option: stay_together]
    # speaker: narrator
    彼女は、息を吸ったまま、しばらく動かなかった。
* [「好きだ。君は、どう思ってる？」 # option: ask_her_heart]
    # speaker: narrator
    彼女は縁に腰かけたまま、背筋を伸ばして、こちらを見上げた。
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
    # photo: gt_album_a59 # photo_caption: タージに背を向けた告白
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
    でも、今ここで答えたら、旅の夜のせいにしちゃいそうで。屋上と、遠くのドームと、夜の風のせいに。……それは、嫌なの。ちゃんと、わたしが決めたいから
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
// 断る・「待って」の道は、主人公から誘って言い出す。前に告白していれば（この都市か前の都市）、挑み直しの言い出しにする。
// 【3】手伝いの knot：告白の前置き（選択なし）
=== gt_agra_confession_lead ===
# speaker: narrator
# quiet: scene
しばらく、二人とも黙っていた。黙っていても気まずくない、と気づいたのは、いつからだっただろう。
{
- confession_result == "accepted":
    {
    - cond("date gt_delhi_date_reassurance") or cond("date gt_agra_date_reassurance"):
        # speaker: heroine
        # emotion: serious
        この前の続き、したくて、屋上に誘ったの。答えは、わたしから言いたかったから
        # speaker: heroine
        でも、わたしが答える前に、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - cond("date gt_delhi_date_confession") or cond("date gt_agra_date_confession"):
        # speaker: heroine
        # emotion: serious
        今夜は、わたしが誘ったの。前に言ってくれたこと、あれからずっと考えてた
        # speaker: heroine
        だから、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - else:
        # speaker: heroine
        # emotion: serious
        話したいことがあって、屋上に誘ったの。わたしたちの話は、こっち向きでしたかったから
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
- else:
    {
    - cond("date gt_delhi_date_confession") or cond("date gt_agra_date_confession"):
        # speaker: narrator
        屋上に誘ったのは、今夜もこちらだった。彼女も、たぶん分かっている。縁に腰かけたまま、こちらが口を開くのを待っていた。
        { cond("date gt_delhi_date_reassurance") or cond("date gt_agra_date_reassurance"):
            # speaker: narrator
            答えは彼女から、と一度は言われていた。それでも、言わずにいられなかった。
        }
        # speaker: heroine
        話、あるんでしょ。いいよ。最後まで、ちゃんと聞く
    - else:
        # speaker: narrator
        夕食のあと、少し涼もうと屋上に誘ったのは、こちらだった。彼女は縁に腰かけて、洗濯物が風に揺れるのを眺めている。
        言うなら、今だと思った。
        # speaker: heroine
        ん？　どうしたの、改まった顔して
    }
}
- ->->

// 【3】「待って」と言われた後のデート（kind: reassurance。JSON の needsDeferred で出る。噛み合いの選択は1回）
=== gt_agra_date_reassurance ===
# scene: date
# title: チャイが冷めるまで
# when: episodes agra >= 1
# when: not couple
# when: time night
# until: date gt_delhi_date_reassurance
# background: gt_bg_hotel_rooftop_night
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
