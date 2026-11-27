INCLUDE modules.ink
-> DONE

// アーグラの宿の屋上：告白のデートと、「待って」と言われた後のデート（どちらも2026-11-09 に足すと決めたデート）。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は confession_result で分ける。前置きも、同じ返事で分ける（2026-11-09 の直し）。
// 都市ごとに同じ形のファイルがある（gt_jaipur_hotel_hub_dates.ink）。デリーには告白のデートを置かない（2026-11-20 のユーザー判断：
// 告白は物語の中盤〜後半の方が盛り上がる）。旅で最初の告白は、アーグラのこのデート。
// 選択肢は、告白する3つと、告白しない2つ（# withhold。2026-11-20 のユーザー判断）。告白しない選択肢を選ぶと、返事は決まらず
// （告白の記録は前のまま）、このデートは遊んだことになるので、アーグラではもう告白できない。告白した選択肢は gt_agra_confessed を立てる
// （ジャイプールの告白の言い出し・彼女からの告白が読む）。
// 告白のデートが出るのは、断られた後に新しい通常デートを1つ終えてから（# when: date_since_rejection。2026-11-15 から書く人が決める）。
// 旅で最初の告白なので、今は通らない（このデートを繰り返せるように JSON の repeatable にしたときに通る）。

// 【3】
=== gt_agra_date_confession ===
# scene: date
# title: 屋上の、言いたいこと
# when: episodes agra >= 1
# when: not couple
# when: time night
# when: date_since_rejection
# background: gt_bg_agra_hotel_rooftop_night
# tint: off
# bgm: immersed
# speaker: narrator
宿の屋上からは、タージのドームが見えた。夜の中で、そこだけが白く、薄く光っている。
# photo: gt_album_a123 # photo_caption: タージに背を向けて座る
彼女は手すりの前まで行きかけて、くるりと向きを変えた。
# speaker: narrator
ドームに背を向けて、反対側の、洗濯物と貯水タンクしかない方の縁に腰を下ろす。
# speaker: heroine
# voice: gt_agra_date_confession_001
タージの方を向いてると、なんだか、誰かの有名な恋の話の中にいるみたいで。こっち向きの方が、落ち着く
{ cond("date gt_agra_date_chini_rauza"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_confession_002
    チーニー・カ・ラウザーで聞いたこと、ちょっと分かる。誰かの物語の、背景にならない所がいいって
}
-> gt_agra_confession_lead ->
* [「この旅が終わっても、一緒にいたい。付き合ってほしい」 # option: stay_together]
    # set: gt_agra_confessed
    # speaker: narrator
    洗濯物が一枚、風にふくらんで、またしぼんだ。そのあいだ、彼女はまばたきもしなかった。
* [「好きだ。君は、どう思ってる？」 # option: ask_her_heart]
    # set: gt_agra_confessed
    # speaker: narrator
    彼女は縁に腰かけたまま、背筋を伸ばして、こちらを見上げた。
* [「黙っていたら、誰も気づかない。だから言う。……好きです」 # option: say_it_now]
    # set: gt_agra_confessed
    # speaker: narrator
    # emotion: smile
    デリーで、カムラが言った言葉だ。彼女は小さく吹き出して、すぐに口を結んだ。
* [「……ううん。それより、君の話を聞かせて」 # option: hear_her_out]
    # withhold
    -> listen_to_her
* [「夜風が、気持ちいいね」 # option: night_breeze]
    # withhold
    -> night_breeze
-
{
- confession_result == "accepted":
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # pause: 800
    # voice: gt_agra_date_confession_003
    ……うん。わたしも、好き
    # speaker: heroine
    # emotion: serious
    迷ったけど、ちゃんと、わたしの言葉で言いたかった。
    # speaker: heroine
    言われたから、うなずくんじゃなくて。
    # speaker: heroine
    ……わたしも、一緒にいたい。旅が終わっても
    # speaker: heroine
    # reaction: heroine,teasing,heart
    # photo: gt_album_a125 # photo_caption: タージに背を向けた告白
    # voice: gt_agra_date_confession_005
    ふふ。顔、すごいことになってる。わたしも、たぶん、同じ顔してるけど
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_confession_006
    旅が終わったあとのことは、一緒に決めようね。どこに行くかも、何を食べるかも。決めてもらうんじゃなくて、二人で
- confession_result == "rejected":
    # speaker: heroine
    # emotion: serious
    # voice: gt_agra_date_confession_007
    ありがとう。言ってくれて、うれしかった。それは、本当
    # speaker: heroine
    # voice: gt_agra_date_confession_008
    でも、ごめんなさい。今のわたしは、同じ気持ちで返せない。うそで返すのは、もっと嫌だから
    # speaker: narrator
    # emotion: serious
    # photo: gt_album_a126 # photo_caption: 背中に隠れたドーム
    彼女は縁から立ち上がった。肩の向こうのドームが、その背中に隠れる。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_confession_009
    旅は、最後まで一緒に行きたい。それも、本当。明日も、いつもみたいに、どこへ行くか一緒に決めてくれる？
- else:
    # speaker: heroine
    # emotion: serious
    # voice: gt_agra_date_confession_010
    うれしい。本当に、うれしい
    # speaker: heroine
    # voice: gt_agra_date_confession_019
    でも、今ここで答えたら、旅の夜のせいにしちゃいそうで。屋上と、遠くのドームと、夜の風のせいに
    # speaker: heroine
    # voice: gt_agra_date_confession_020
    ……それは、嫌なの。ちゃんと、わたしが決めたいから
    # speaker: heroine
    # emotion: worried
    # voice: gt_agra_date_confession_012
    待たせるの、ずるいって分かってる。でも、軽く返したくない。……少しだけ、待ってくれる？
    # speaker: narrator
    # stand: close
    # photo: gt_album_a127 # photo_caption: 袖のはしを、そっと
    彼女はこちらの袖のはしを、そっとつまんだ。タージの方は、一度も振り返らなかった。
}
-> END

// 告白しない選択肢（# withhold）の後。返事は決まらない。前置きで彼女から誘った（confession_result が accepted）か、
// こちらから誘ったかで、彼女の受け止め方を分ける。彼女から誘った道では、彼女も言いかけたことを言わずに終わる
// （ジャイプールの彼女からの告白 gt_jaipur_date_her_confession が、この夜を受ける）。
= listen_to_her
{
- confession_result == "accepted":
    # speaker: narrator
    彼女は、まばたきを二回した。それから、縁に置いていた手を、膝の上に戻した。
    # speaker: heroine
    # reaction: heroine,teasing,sweat
    # voice: gt_agra_date_confession_021
    わたしの？　……ずるい。先に聞かせてって、わたしが言ったのに
    # speaker: heroine
    # emotion: serious
    話したいことは、あるの。あるんだけど。
    # speaker: heroine
    ……いざ順番が回ってきたら、言葉が全部、洗濯物の向こうに飛んでいっちゃった
    # speaker: narrator
    物干しの綱で、シャツが一枚、風にあおられて裏返った。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_confession_023
    今夜は、やめておく。カムラさんに、言いたいことは言いなさいって言われたのにね
    # speaker: heroine
    # voice: gt_agra_date_confession_024
    ……でも、ちゃんと言える日が来たら、自分で言う。それは、約束
- else:
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_agra_date_confession_025
    わたしの話？　……てっきり、そっちが何か言うのかと思った
    # speaker: narrator
    彼女は少し考えてから、背中の方のドームを、親指で指した。
    # speaker: heroine
    # voice: gt_agra_date_confession_026
    # photo: gt_album_a128 # photo_caption: 白鳥と寝る話
    じゃあ、白鳥の話。サミールさんの白鳥、まだ部屋にいるの。毎晩、首でハートを作ったまま、こっちを見てる
    # speaker: heroine
    # reaction: heroine,teasing,sweat
    # voice: gt_agra_date_confession_027
    片付けてくださいって、言えばいいだけなのにね。言えないまま、今夜も白鳥と寝るの。……笑っていいよ
    # speaker: narrator
    笑うと、彼女もつられて笑った。言いかけたことは、ドームの見えない側の夜に、そのまま置いてきた。
}
-> END

= night_breeze
{
- confession_result == "accepted":
    # speaker: narrator
    彼女は、こちらの顔を少しのあいだ見ていた。それから、ふっと肩の力を抜いた。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_confession_028
    ……うん。気持ちいいね。昼間あんなに暑かったのが、うそみたい
    # speaker: heroine
    # reaction: heroine,teasing
    # voice: gt_agra_date_confession_029
    言いかけてた顔、まだしてるけど。……いいよ、今夜は風の話で。わたしの話も、また今度にする
    # speaker: heroine
    # voice: gt_agra_date_confession_030
    今夜は、二人とも言いそびれた夜ってことで
    # speaker: narrator
    # photo: gt_album_a129 # photo_caption: 二人とも言いそびれた夜
    洗濯物が、風にふくらんで、またしぼんだ。二人とも、それ以上は何も言わなかった。
- else:
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_agra_date_confession_031
    うん。……え、それだけ？　すごく改まった顔してたのに
    # speaker: narrator
    # photo: gt_album_a129 # photo_caption: 二人とも言いそびれた夜
    彼女は、くすっと笑って、膝を抱えた。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_date_confession_032
    夜風の話をするのに、そんなに覚悟がいるんだ。ふふ。……でも、分かる。ここ、いい風
    # speaker: heroine
    # voice: gt_agra_date_confession_033
    タージの方から吹いてるのかな。……ううん、向こうを向くと落ち着かないから、確かめない
    # speaker: narrator
    言うはずだった言葉は、喉の奥で、もう一度眠った。
}
-> END

// 告白の前置き。返事（confession_result）はデートを始めたときに決まっているので、前置きもそれで分ける。
// 交際が始まる道だけ、彼女から屋上に誘い、背中の字を明かす（交際は旅で1回なので、背中の字も1回）。ロータス寺院のデートを
// した人に明かす（あの場面では読めない。「読めなかった」と答えた人には、約束どおり声で言い直す形で）。
// 断る・「待って」の道は、主人公から誘って言い出す。前に告白していれば、挑み直しの言い出しにする。
// 告白のデートは、ほかのデートと同じく各都市で1回（2026-11-13。返事にかかわらず思い出になる）。アーグラは旅で最初の告白なので、
// 下の cond("date gt_agra_date_confession")・cond("date gt_agra_date_reassurance") は、この告白のデートを繰り返せるように
// （JSON の repeatable）したときだけ真になる（声の収録があるので消さない）。
// 【3】手伝いの knot：告白の前置き（選択なし）
=== gt_agra_confession_lead ===
# speaker: narrator
# quiet: scene
しばらく、二人とも黙っていた。彼女の肩の向こうで、白いドームが夜に浮かんでいる。
{
- confession_result == "accepted":
    {
    - cond("date gt_agra_date_reassurance"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_confession_lead_001
        この前の続き、したくて、屋上に誘ったの。答えは、わたしから言いたかったから
        # speaker: heroine
        # voice: gt_agra_confession_lead_002
        でも、わたしが答える前に、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - cond("date gt_agra_date_confession"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_confession_lead_003
        今夜は、わたしが誘ったの。前に言ってくれたこと、あれからずっと考えてた
        # speaker: heroine
        # voice: gt_agra_confession_lead_004
        だから、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - else:
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_confession_lead_005
        話したいことがあって、屋上に誘ったの。わたしたちの話は、こっち向きでしたかったから
        # speaker: heroine
        # voice: gt_agra_confession_lead_006
        でも、その前に。……何か言いかけてる顔、ずっとしてるよ。先に、聞かせて
    }
    {
    - cond("flag gt_delhi_back_word_secret"):
        // 「読めなかった」と答えた人：ロータス寺院で約束したとおり、声で言い直す。
        # speaker: heroine
        # recall: gt_album_d069
        # voice: gt_agra_confession_lead_011
        あ、その前に、一つだけ。ロータス寺院で、背中に書いた字。読めなかったって言ってたでしょ
        # speaker: heroine
        # voice: gt_agra_confession_lead_012
        あれね、『まだいたい』って書いたの
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_agra_confession_lead_008
        # photo: gt_album_a124 # photo_caption: 背中の字は『まだいたい』
        背中じゃなくて、声で言うって約束したから。……はい、言った。じゃあ、次はそっちの番
    - cond("date gt_delhi_date_lotus_temple"):
        // ほかの答えの人：あの場面では読めなかった字を、ここで初めて明かす（2026-11-16）。
        # speaker: heroine
        # recall: gt_album_d069
        # voice: gt_agra_confession_lead_013
        あ、その前に、一つだけ。ロータス寺院で、最後に背中に書いた字
        # speaker: heroine
        # voice: gt_agra_confession_lead_014
        あれね、『まだいたい』って書いたの
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_agra_confession_lead_015
        # photo: gt_album_a124 # photo_caption: 背中の字は『まだいたい』
        書いたときは、声に出す勇気がなかったの。……はい、言った。じゃあ、次はそっちの番
    }
- else:
    {
    - cond("date gt_agra_date_confession"):
        # speaker: narrator
        屋上に誘ったのは、今夜もこちらだった。彼女も、たぶん分かっている。
        # speaker: narrator
        縁に腰かけたまま、こちらが口を開くのを待っていた。
        { cond("date gt_agra_date_reassurance"):
            # speaker: narrator
            答えは彼女から、と一度は言われていた。それでも、言わずにいられなかった。
        }
        # speaker: heroine
        # voice: gt_agra_confession_lead_009
        話、あるんでしょ。いいよ。最後まで、ちゃんと聞く
    - else:
        # speaker: narrator
        夕食のあと、少し涼もうと屋上に誘ったのは、こちらだった。彼女は縁に腰かけて、洗濯物が風に揺れるのを眺めている。
        言うなら、今だと思った。
        # speaker: heroine
        # voice: gt_agra_confession_lead_010
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
# background: gt_bg_agra_hotel_rooftop_night
# tint: off
# bgm: stages_of_grief
# speaker: narrator
# photo: gt_album_a130 # photo_caption: チャイが冷めるまで
宿の屋上に上がると、彼女が素焼きのカップを二つ持って待っていた。湯気が二本、タージのドームの方へ流れていく。
# speaker: heroine
# voice: gt_agra_date_reassurance_001
チャイ、二つもらってきた。一つは、そっちの
# speaker: heroine
# emotion: serious
# voice: gt_agra_date_reassurance_002
この前の返事の話は、今日はしない。……そのかわり、チャイが冷めるまでは、普通の話をしよう。いつもの、どうでもいい話
* [「明日、どこへ行く？」 # option: where_tomorrow]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # voice: gt_agra_date_reassurance_003
        明日の話……。うん、普通だね。普通、なんだけど、ちょっとだけ緊張する
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_reassurance_004
        それ、いちばん普通の話。うれしい。明日は、わたしが一つ、行きたい所を言ってもいい？
    }
* [「今日見た、いちばん変なものの話」 # option: strangest_thing]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_reassurance_005
        変なもの……。ごめん、今日は、あんまり周りを見てなかったかも
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_agra_date_reassurance_006
        変なもの？　屋根の上を歩いてた山羊。あれ、どうやって上ったんだろうね
    }
* [「日本に帰ったら、最初に何を食べる？」 # option: first_meal_home]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_reassurance_007
        帰ったら……。帰る話は、今はちょっと、さみしいかも
    - else:
        { cond("date gt_agra_date_ram_bagh"):
            # speaker: heroine
            # reaction: heroine,teasing,music
            # voice: gt_agra_date_reassurance_008
            鮭のおにぎり。三か所はがすやつ。ラーム・バーグで言ったの、覚えてた？
        - else:
            # speaker: heroine
            # reaction: heroine,teasing,music
            # voice: gt_agra_date_reassurance_009
            鮭のおにぎり。コンビニの、三か所はがすやつ。ちょっと恋しい
        }
    }
-
# speaker: narrator
チャイが冷めるまで、二人は本当に、どうでもいい話だけをした。サミールの白鳥は、どっちの首が長かったか、とか。
# speaker: narrator
カップの底に、香辛料の粒が沈んでいく。
# speaker: heroine
# voice: gt_agra_date_reassurance_010
待っててくれて、ありがとう。待たせてごめんね、じゃなくて、ありがとうって言いたかったの
# speaker: heroine
# emotion: smile
# voice: gt_agra_date_reassurance_011
答えは、わたしから言うね。ちゃんと決めたら。それまでは、いつもどおりでいて。いつもどおりが、いちばん助かる
-> END
