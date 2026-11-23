INCLUDE modules.ink
-> DONE

// ジャイプールの宿の屋上：告白のデートと、「待って」と言われた後のデート（どちらも2026-11-09 に足すと決めたデート）。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は confession_result で分ける。前置きも、同じ返事で分ける（2026-11-09 の直し）。
// 都市ごとに同じ形のファイルがある（gt_agra_hotel_hub_dates.ink）。デリーには告白のデートを置かない（2026-11-20 のユーザー判断）。
// ジャイプールだけ、最後に「待って」の後の彼女の返事（gt_jaipur_date_answer。2026-11-13）がある。地図の出来事は宿で、場面は宿の近くの通り。
// ジャイプールだけ、彼女から先に告白するデート（gt_jaipur_date_her_confession。2026-11-20）がある。出る間は、主人公の告白のデートは出ない。
// 前の都市の告白で断られた後は、新しい通常デートを1つ終えてから告白のデートが出る（# when: date_since_rejection。2026-11-15 から書く人が決める）。
// 選択肢は、告白する3つと、告白しない2つ（# withhold。2026-11-20 のユーザー判断）。告白しない選択肢を選ぶと、返事は決まらず
// （告白の記録は前のまま）、このデートは遊んだことになるので、ジャイプールではもう告白できない。告白した選択肢は gt_jaipur_confessed を立てる
// （「待って」の後の彼女の返事が読む）。前の町で告白したかは、アーグラの告白で立つ gt_agra_confessed で読む（告白しない選択肢では立たない）。

// 【3】
=== gt_jaipur_date_confession ===
# scene: date
# title: 屋上の、言いたいこと
# when: episodes jaipur >= 1
# when: not couple
# when: time night
# when: date_since_rejection
# when: not condition gt_jaipur_her_turn
# background: gt_bg_jaipur_hotel_rooftop_night
# tint: off
# bgm: immersed
# speaker: narrator
# photo: gt_album_j098 # photo_caption: 楽隊の鳴る、夜の屋上
宿の屋上から見る旧市街は、夜になると、桃色が橙色に変わる。どこか遠くで、結婚式の楽隊が鳴っていた。太鼓と、ラッパと、誰かの歓声。
# speaker: heroine
# voice: gt_jaipur_date_confession_001
この町、毎晩、誰かが結婚してるのかな。楽隊の音って、知らない人のなのに、こっちまでうれしくなるね
-> gt_jaipur_confession_lead ->
* [「この旅が終わっても、一緒にいたい。付き合ってほしい」 # option: stay_together]
    # set: gt_jaipur_confessed
    # speaker: narrator
    眼下の旧市街を、よその花婿の行列が、ゆっくり横切っていく。彼女は息を止めたまま、それが角を曲がるまで動かなかった。
* [「好きだ。君は、どう思ってる？」 # option: ask_her_heart]
    # set: gt_jaipur_confessed
    # speaker: narrator
    遠くの楽隊の音が、ふっと途切れた。彼女は、こちらから目をそらさなかった。
* [「黙っていたら、誰も気づかない。だから言う。……好きです」 # option: say_it_now]
    # set: gt_jaipur_confessed
    # speaker: narrator
    # emotion: smile
    カムラから借りた言葉だ。言った本人も、今はこの町のどこかにいる。彼女は旧市街の方をちらりと見て、ふっと笑った。
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
    # voice: gt_jaipur_date_confession_002
    ……うん。わたしも、好き
    # speaker: heroine
    # emotion: serious
    # voice: gt_jaipur_date_confession_018
    迷ったけど、ちゃんと、わたしの言葉で言いたかった。言われたから、うなずくんじゃなくて
    # speaker: heroine
    # emotion: serious
    # voice: gt_jaipur_date_confession_019
    ……わたしも、一緒にいたい。旅が終わっても
    # speaker: heroine
    # reaction: heroine,teasing,heart
    # photo: gt_album_j100 # photo_caption: 楽隊の音の屋上の告白
    # voice: gt_jaipur_date_confession_004
    ふふ。顔、すごいことになってる。わたしも、たぶん、同じ顔してるけど
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_date_confession_005
    旅が終わったあとのことは、一緒に決めようね。どこに行くかも、何を食べるかも。決めてもらうんじゃなくて、二人で
// 前の町（アーグラ）で告白していた場合（2026-11-15）：前と同じ断り方・「待って」を二度聞かせない。
// 前の返事が断りだったか「待って」だったかはゲームの記録で分けられないので、どちらの後でも本当になる言い方にする。
// ここの「待って」の後は、次の日の昼の返事（gt_jaipur_date_answer）が「楽隊と、灯りのせいに」を受けるので、その言葉を残す。
- confession_result == "rejected":
    {
    - cond("flag gt_agra_confessed"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_confession_012
        前の屋上のことも、ちゃんと覚えてる。だから、今夜は、ぼかさずに言うね
        # speaker: heroine
        # voice: gt_jaipur_date_confession_013
        ごめんなさい。恋人にはなれない。最後の町まで考えて、そう決めたの
        # speaker: narrator
        遠くの通りで、楽隊がひときわ大きく鳴った。どこかの花婿が、角を曲がったらしい。
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_confession_014
        あれは、よその人のお祝い。……でも、ここまで一緒に来た旅は、わたしたちのだよ
    - else:
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_confession_006
        ありがとう。言ってくれて、うれしかった。それは、本当
        # speaker: heroine
        # voice: gt_jaipur_date_confession_007
        でも、ごめんなさい。今のわたしは、同じ気持ちで返せない。うそで返すのは、もっと嫌だから
        # speaker: narrator
        どこか遠くの通りで、また別の楽隊が鳴りはじめた。
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_confession_008
        旅は、最後まで一緒に行きたい。それも、本当。明日も、いつもみたいに、どこへ行くか一緒に決めてくれる？
    }
- else:
    {
    - cond("flag gt_agra_confessed"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_confession_015
        前の夜も、今夜も、ちゃんと聞いてた。軽く聞いたことは、一回もないよ
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_confession_016
        でも、今夜答えたら、楽隊と灯りのせいにしちゃう。……こんなに、にぎやかなんだもん
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_confession_017
        だから、明るいところで、わたしから言う。今度は、答えを持っていくから
        # speaker: narrator
        # stand: close
        遠くの楽隊が、また鳴りはじめた。彼女はその拍子に合わせて、肩をこちらの肩に一度だけぶつけた。
    - else:
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_confession_009
        うれしい。本当に、うれしい
        # speaker: heroine
        # voice: gt_jaipur_date_confession_020
        でも、今ここで答えたら、旅の夜のせいにしちゃいそうで。屋上と、楽隊の音と、遠くの灯りのせいに
        # speaker: heroine
        # voice: gt_jaipur_date_confession_021
        ……それは、嫌なの。ちゃんと、わたしが決めたいから
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_confession_011
        待たせるの、ずるいって分かってる。でも、軽く返したくない。……少しだけ、待ってくれる？
        # speaker: narrator
        # stand: close
        言い終えると、彼女は橙色の町を見下ろしたまま、指先で、こちらの袖のはしを小さくつまんだ。
    }
}
-> END

// 告白しない選択肢（# withhold）の後。返事は決まらない。前置きで彼女から誘った（confession_result が accepted）か、
// こちらから誘ったかで、彼女の受け止め方を分ける。彼女から誘った道では、彼女も言いかけたことを言わずに終わる
// （この後、彼女からの告白 gt_jaipur_date_her_confession が出ることがある。アーグラの告白で告白していなければ）。
= listen_to_her
{
- confession_result == "accepted":
    # speaker: narrator
    彼女は、言葉の途中で止められたみたいな顔をした。
    # speaker: heroine
    # reaction: heroine,teasing,sweat
    # voice: gt_jaipur_date_confession_022
    わたし？　……先に聞かせてって言ったの、わたしなのに。順番、ずるくない？
    # speaker: heroine
    # emotion: serious
    # voice: gt_jaipur_date_confession_023
    話したいことは、ある。アーグラで、人前でちゃんと言えた日から、ずっと
    # speaker: heroine
    # voice: gt_jaipur_date_confession_024
    ……でも、いざ番が回ってきたら、楽隊の音に全部持っていかれちゃった
    # speaker: narrator
    遠くの通りで、ラッパがひときわ高く鳴った。
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_date_confession_025
    今夜は、いい。言いたいことは、言いたいときに言う。……今は、まだその『とき』じゃないみたい。来たら、ちゃんと言うね
- else:
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_jaipur_date_confession_026
    わたしの話？　……てっきり、そっちから何か言うのかと思った
    # speaker: narrator
    彼女は手すりにもたれ直して、楽隊の鳴る方を見た。
    # speaker: heroine
    # voice: gt_jaipur_date_confession_027
    この町の楽隊、毎晩ちがう曲なの、気づいてた？　昨日のは、ラッパが一本だけ、ずっと半音ずれてた
    # speaker: heroine
    # voice: gt_jaipur_date_confession_028
    # photo: gt_album_j102 # photo_caption: 半音ずれたラッパ
    ずれてるのに、いちばん楽しそうだったの。ずれても、鳴らした方がいいんだよ、きっと
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_jaipur_date_confession_029
    ……今の、誰かさんに言ったんじゃないからね
    # speaker: narrator
    言うはずだった言葉は、楽隊の音にまぎれて、どこかへ行ってしまった。
}
-> END

= night_breeze
{
- confession_result == "accepted":
    # speaker: narrator
    彼女はこちらの顔をじっと見て、それから、ふふ、と小さく笑った。
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_date_confession_030
    ……うん、気持ちいい。昼の熱が、石から抜けていく感じ
    # speaker: heroine
    # reaction: heroine,teasing
    # voice: gt_jaipur_date_confession_031
    言いかけた顔のまま、風の話。……いいよ、付き合う。わたしも、今夜は言いそびれることにする
    # speaker: narrator
    楽隊の音が遠ざかって、また近づいた。二人とも言いそびれたまま、橙色の町を見ていた。
- else:
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_jaipur_date_confession_032
    うん、気持ちいいね。……え、それを言うのに、あの顔？
    # speaker: narrator
    彼女は吹き出しそうになって、口元を手で隠した。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_jaipur_date_confession_033
    夜風の感想に、そんなに覚悟がいるんだ。……ふふ。でも、この町の夜風なら、それくらい言う価値あるかも
    # speaker: narrator
    言うはずだった言葉は、楽隊の拍子にまぎれて、もう一度、胸の奥へ戻っていった。
}
-> END

// 告白の前置き。返事（confession_result）はデートを始めたときに決まっているので、前置きもそれで分ける。
// 交際が始まる道だけ、彼女から屋上に誘い、背中の字を明かす（交際は旅で1回なので、背中の字も1回）。ロータス寺院のデートを
// した人に明かす（あの場面では読めない。「読めなかった」と答えた人には、約束どおり声で言い直す形で）。
// 断る・「待って」の道は、主人公から誘って言い出す。前に告白していれば、挑み直しの言い出しにする。
// 告白のデートは、ほかのデートと同じく各都市で1回（2026-11-13。返事にかかわらず思い出になる）。前の告白はアーグラのもので、
// アーグラで告白する選択肢を選んだときに立つ gt_agra_confessed で読む。
// 【3】手伝いの knot：告白の前置き（選択なし）
=== gt_jaipur_confession_lead ===
# speaker: narrator
# quiet: scene
下の通りの店の灯りが、一つ、また一つと消えていく。黙っていても気まずくない、と気づいたのは、どの町でだっただろう。
{
- confession_result == "accepted":
    {
    - cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_confession_lead_001
        この前の続き、したくて、屋上に誘ったの。答えは、わたしから言いたかったから
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_002
        でも、わたしが答える前に、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - cond("flag gt_agra_confessed"):
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_confession_lead_003
        今夜は、わたしが誘ったの。前に言ってくれたこと、あれからずっと考えてた
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_004
        だから、もう一回だけ、聞かせてほしい。今度は、ちゃんと受け取るから
    - else:
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_confession_lead_005
        話したいことがあって、屋上に誘ったの。今夜は、わたしから誘いたかった
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_006
        でも、その前に。……何か言いかけてる顔、ずっとしてるよ。先に、聞かせて
    }
    {
    - cond("flag gt_delhi_back_word_secret"):
        // 「読めなかった」と答えた人：ロータス寺院で約束したとおり、声で言い直す。
        # speaker: heroine
        # recall: gt_album_d61
        # voice: gt_jaipur_confession_lead_012
        あ、その前に、一つだけ。ロータス寺院で、背中に書いた字。読めなかったって言ってたでしょ
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_013
        あれね、『まだいたい』って書いたの
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_jaipur_confession_lead_008
        背中じゃなくて、声で言うって約束したから。……はい、言った。じゃあ、次はそっちの番
    - cond("date gt_delhi_date_lotus_temple"):
        // ほかの答えの人：あの場面では読めなかった字を、ここで初めて明かす（2026-11-16）。
        # speaker: heroine
        # recall: gt_album_d61
        # voice: gt_jaipur_confession_lead_014
        あ、その前に、一つだけ。ロータス寺院で、最後に背中に書いた字
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_015
        あれね、『まだいたい』って書いたの
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_jaipur_confession_lead_016
        書いたときは、声に出す勇気がなかったの。……はい、言った。じゃあ、次はそっちの番
    }
    { cond("flag gt_jaipur_mehndi_her_secret") and cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        # recall: gt_album_j096
        彼女は、手のひらを一度開いて、また閉じた。孔雀の羽の付け根に、こちらの名前が、まだ濃く残っている。
    }
- else:
    {
    - cond("flag gt_agra_confessed"):
        # speaker: narrator
        屋上に誘ったのは、今夜もこちらだった。彼女も、たぶん分かっている。楽隊の音のする方を見たまま、こちらが口を開くのを待っていた。
        { cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
            # speaker: narrator
            答えは彼女から、と一度は言われていた。それでも、言わずにいられなかった。
        }
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_009
        話、あるんでしょ。いいよ。最後まで、ちゃんと聞く
    - else:
        # speaker: narrator
        夕食のあと、少し涼もうと屋上に誘ったのは、こちらだった。彼女は手すりにもたれて、遠くの楽隊に合わせて、指で拍子をとっている。
        言うなら、今だと思った。
        # speaker: heroine
        # voice: gt_jaipur_confession_lead_010
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
# until: date gt_agra_date_reassurance
# background: gt_bg_jaipur_hotel_rooftop_night
# tint: off
# bgm: stages_of_grief
# speaker: narrator
# photo: gt_album_j104 # photo_caption: チャイ、二つ
宿の屋上に上がると、彼女が素焼きのカップを二つ持って待っていた。橙色の旧市街を背に、湯気が二本、並んで上っている。
# speaker: heroine
# voice: gt_jaipur_date_reassurance_001
チャイ、二つもらってきた。一つは、そっちの
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_reassurance_002
この前の返事の話は、今日はしない。……そのかわり、チャイが冷めるまでは、普通の話をしよう。いつもの、どうでもいい話
* [「明日、どこへ行く？」 # option: where_tomorrow]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # voice: gt_jaipur_date_reassurance_003
        明日の話……。うん、普通だね。普通、なんだけど、ちょっとだけ緊張する
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_reassurance_004
        それ、いちばん普通の話。うれしい。明日は、わたしが一つ、行きたい所を言ってもいい？
    }
* [「今日見た、いちばん変なものの話」 # option: strangest_thing]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_reassurance_005
        変なもの……。ごめん、今日は、あんまり周りを見てなかったかも
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_jaipur_date_reassurance_006
        変なもの？　屋根の上を歩いてた山羊。あれ、どうやって上ったんだろうね
    }
* [「日本に帰ったら、最初に何を食べる？」 # option: first_meal_home]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_reassurance_007
        帰ったら……。帰る話は、今はちょっと、さみしいかも
    - else:
        { cond("date gt_agra_date_ram_bagh"):
            # speaker: heroine
            # reaction: heroine,teasing,music
            # voice: gt_jaipur_date_reassurance_008
            鮭のおにぎり。三か所はがすやつ。ラーム・バーグで言ったの、覚えてた？
        - else:
            # speaker: heroine
            # reaction: heroine,teasing,music
            # voice: gt_jaipur_date_reassurance_009
            鮭のおにぎり。コンビニの、三か所はがすやつ。ちょっと恋しい
        }
    }
-
# speaker: narrator
チャイが冷めるまで、二人は本当に、どうでもいい話だけをした。カップの底に、香辛料の粒が沈んでいく。
# speaker: heroine
# voice: gt_jaipur_date_reassurance_010
待っててくれて、ありがとう。待たせてごめんね、じゃなくて、ありがとうって言いたかったの
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_reassurance_011
答えは、わたしから言うね。ちゃんと決めたら。それまでは、いつもどおりでいて。いつもどおりが、いちばん助かる
-> END

// 【3】「待って」の後の、彼女の返事（kind: answer。2026-11-13 のユーザー判断「彼女から返事をする場面を足す」）。
// ジャイプールは旅の最後の都市なので、ここの告白で「待って」と言われると、後の都市の告白で告白し直せない。そこで、彼女から返事をする。
// 主人公はもう一度告白しない（告白は各都市で1回）。彼女が誘い、彼女が先に話す。
// 地図に出るのは、ジャイプールの告白のデートで「待って」と言われた後（JSON の needsDeferred と、頭の # when: flag。ジャイプールで告白する
// 選択肢を選んだ印。告白しない選択肢を選んだときは、アーグラの「待って」が残っていても出ない）の昼（# when: time day）。
// 告白は夜にしか出ないので、返事は早くても次の日の昼になる（「旅の夜のせいにしたくない」と言った彼女が、昼を選ぶ）。
// 地図の # when: は出かける前の時刻で読むので、遠くから夕方に出ると夜に始まってしまう。そこで travel/jaipur.json のこの出来事に
// endWindows（18:00までに終わる）を書き、宿に着くのが17:30を過ぎる日は始められないようにした（2026-11-23）。
// インド編はフィナーレを終えるとすぐエピローグが始まり、旅が終わる（manifest.json の cityTransition）。「待って」は夜で、フィナーレは昼なので、
// 次の日の朝、宿の出来事として、フィナーレより先に選べる（強制はしない）。フィナーレを先に遊んでも、旅の後の街歩きにまだ出る（# until: を書かない）。
// 返事は、デートを始めたときの関係の値で決まる（confession_result：告白が成立する条件を満たせば accepted、満たさなければ rejected。
// 乱数では決めず、もう一度「待って」にもならない）。噛み合いの札（# profile:）と関係値の札は書かない。
// 選択は、返事を聞いた後の主人公の返し（1回。choiceCount）。交際が始まる道だけ、思い出 gt_jaipur_date_answer_memory を残す。
// 場所：宿（バディー・チャウパル付近）から角をひとつ曲がったハワー・マハルの正面の通り。格子窓の目的・窓の数・入口・町の色の由来は
// 観光とフィナーレのクイズの答えなので、ここでは言わない（見えるもの：桃色の正面と、たくさんの小さな窓だけ）。
// 前の「待って」の後のデート（どの都市でも）を遊んでいれば、「わたしから言う」の約束を一言。フィナーレの後なら、通りで踊った夜を一言。
=== gt_jaipur_date_answer ===
# scene: date
# title: 夜のせいにしない返事
# when: flag gt_jaipur_confessed
# when: time day
# background: gt_bg_jaipur_hawa_mahal
# bgm: inner_light
# speaker: narrator
宿の玄関で、彼女が先に待っていた。「すぐそこだから」とだけ言って、角をひとつ曲がる。
ハワー・マハルの正面に、日の光が当たっていた。夜の屋上からは橙色に見えた町が、いまは、ちゃんと桃色をしている。
# speaker: heroine
# voice: gt_jaipur_date_answer_001
# photo: gt_album_j110 # photo_caption: 昼の桃色の町で
見て。夜と、ぜんぜん色がちがう。……こっちが、この町のふだんの顔なのかな
# speaker: narrator
どこかの店のシャッターが上がる音。牛が一頭、ゆっくり通りを渡っていく。楽隊の音は、どこにもしない。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_answer_002
屋上で、夜のせいにしたくないって言ったでしょ。楽隊と、灯りのせいに。だから、昼にしたの。いちばん普通の時間に
{ cond("date gt_agra_date_reassurance") or cond("date gt_jaipur_date_reassurance"):
    # speaker: heroine
    # voice: gt_jaipur_date_answer_003
    答えは、わたしから言うって約束したもんね。だから、今日はわたしから
}
{ cond("episode gt_jaipur_finale"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_date_answer_004
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
# voice: gt_jaipur_date_answer_005
好き。……付き合いたい。旅が終わっても、一緒にいたい
# speaker: heroine
# reaction: heroine,teasing,blush
# voice: gt_jaipur_date_answer_006
# photo: gt_album_j111 # photo_caption: 牛の横で言う「好き」
昼間に、牛の横で言ってるんだからね。もう、夜のせいにはできないよ
# speaker: narrator
すぐ後ろを、さっきの牛が通っていった。彼女は笑いそうになるのをこらえて、こちらを見たままでいた。
* [「僕も、好きだ。昼でも、同じだ」 # option: same_by_day]
    # memory: gt_jaipur_date_answer_memory
    # speaker: heroine
    # reaction: heroine,shy_deep,heart
    # voice: gt_jaipur_date_answer_007
    知ってた。……うそ。ちょっとだけ、こわかった。今、聞けてよかった
* [「もう一回、言って」 # option: say_it_again]
    # memory: gt_jaipur_date_answer_memory
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_jaipur_date_answer_008
    だめ。一日一回まで。……うそ。好き。はい、二回目。三回目は、夜に取っておく
* [黙って、手を差し出す # option: offer_hand]
    # memory: gt_jaipur_date_answer_memory
    # speaker: narrator
    彼女は少しだけ迷ってから、自分の手を重ねた。
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_jaipur_date_answer_009
    ……ふふ。窓がこんなにあるのに。まあ、いいか。見られても
-
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_answer_010
じゃあ、恋人になって最初の行き先、わたしが決めていい？　……もう、決めてあるんだけど
-> END

= not_now
# speaker: heroine
# quiet: scene
# voice: gt_jaipur_date_answer_011
ちゃんと考えた。夜の気持ちじゃなくて、昼の明るさで。……それで、決めた
# speaker: heroine
# voice: gt_jaipur_date_answer_012
恋人としては、今は、一緒にいられない。これが、わたしの答え。待たせたのに、ごめんなさい
# speaker: narrator
彼女は目をそらさなかった。たくさんの小さな窓が、上から二人を見下ろしていた。
# speaker: heroine
# voice: gt_jaipur_date_answer_013
この旅で隣にいてくれたのは、本当にうれしかった。それは、答えとは別に、ちゃんと本当
* [「聞かせてくれて、ありがとう」 # option: thank_her]
    # speaker: heroine
    # voice: gt_jaipur_date_answer_014
    うん。……言うの、こわかった。でも、黙ったまま旅を終えるほうが、もっといやだった
* [「少しだけ、一人で歩いてくる」 # option: walk_alone]
    # speaker: heroine
    # voice: gt_jaipur_date_answer_015
    うん。宿で待ってる。戻ってきたら、チャイにしよう。今度は、わたしがおごる
* [「残りの旅も、いつもどおりで」 # option: as_usual]
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_jaipur_date_answer_016
    それ、わたしが言おうと思ってたのに。……先に言われちゃった
-
# speaker: narrator
通りの向こうで、また一枚、シャッターが上がった。町は、いつもどおりに動いていた。
-> END

// 【3】彼女から先に告白するデート（kind: confession。2026-11-20 のユーザー判断「インド編ではヒロインから先に告白される展開も作りたい」）。
// デリーでカムラに言われた「言いたいことは言いなさい」（デリーのエピローグ）と、アーグラで、人前で自分の言葉で言えたこと（アーグラの
// フィナーレとエピローグ）を受けて、彼女が自分から言う。アーグラはフィナーレの後すぐエピローグが始まり、そのままジャイプールへ出発する
// （manifest.json の cityTransition）ので、成長の後の最初の夜は、ジャイプールにある。そこで、ジャイプールにだけ置く。
// 出る条件は名前付きの条件 gt_jaipur_her_turn（progression/story.json）：まだ恋人でない、今告白すれば受け入れられる関係
// （confession_ready。親しさ・信頼・恋愛の意識・終えたデートの数が、告白が成立するしきい値に届いている）、主人公がアーグラ・
// ジャイプールの告白のデートで告白していない（gt_agra_confessed・gt_jaipur_confessed）、まだこのデートを遊んでいない。
// アーグラで条件を満たしていれば、ジャイプールで観光を1つ終えた最初の夜から、ジャイプールで満たせば、その後の夜から出る。
// これが出る間は、主人公の告白のデート（gt_jaipur_date_confession）は出ない（彼女が先）。
// 返事（confession_result）は、ほかの告白と同じく、デートを始めたときの関係の値で決まる（乱数では決めない）。出る条件が
// confession_ready なので、ふつうは accepted。始めるまでに関係の値が変わって受け入れられない値になったときだけ、彼女は言いかけて
// やめる（告白しない選択肢 # withhold だけの道。返事は決まらず、主人公の告白のデートがまた出る）。
// 交際が始まる道では、ほかの屋上の告白と同じく、背中の字（ロータス寺院）とメヘンディの名前を一度だけ受ける。
=== gt_jaipur_date_her_confession ===
# scene: date
# title: 先に、言わせて
# when: episodes jaipur >= 1
# when: time night
# when: condition gt_jaipur_her_turn
# background: gt_bg_jaipur_hotel_rooftop_night
# tint: off
# bgm: immersed
# speaker: narrator
夕食のあと、部屋へ戻る階段の前で、袖を引かれた。振り向くと、彼女が上を指さしていた。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_her_confession_001
屋上、来て。……今夜は、わたしが誘う番
# speaker: narrator
屋上から見下ろす旧市街は、橙色ににじんでいた。遠くの通りで、今夜もどこかの楽隊が鳴っている。
彼女は手すりの前で振り返り、こちらが隣に並ぶ前に、正面に立った。
# speaker: heroine
# voice: gt_jaipur_date_her_confession_002
# photo: gt_album_j107 # photo_caption: 「並ばないで」
並ばないで。……今夜は、顔を見て言いたいから
{ confession_result == "accepted":
    -> say_it
- else:
    -> not_tonight
}

= say_it
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_her_confession_003
デリーの最後の朝、カムラさんが言ってたでしょ。言いたいことは言いなさいって
# speaker: heroine
# voice: gt_jaipur_date_her_confession_004
六十年、言わなかった人の言葉だから、重かった。アーグラで、新婚じゃないって言えなかったときも、ずっと耳の中で鳴ってた
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_her_confession_005
でも、タージの前で、人前で、ちゃんと言えた。言えたら、思ってたより、こわくなかった
{ cond("date gt_agra_date_confession"):
    # speaker: heroine
    # voice: gt_jaipur_date_her_confession_006
    アーグラの屋上で、何か言いかけてたでしょ。……わたしも、あのとき、言いかけてた
}
# speaker: heroine
# quiet: scene
# pause: 800
# voice: gt_jaipur_date_her_confession_007
だから、言うね。……好き
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_her_confession_008
わたしが立ち止まると、何も言わずに待ってくれるところ。決めてって言わないで、どうしたいって聞いてくれるところ
# speaker: heroine
# voice: gt_jaipur_date_her_confession_009
……そういうところが、好き
# speaker: heroine
# voice: gt_jaipur_date_her_confession_010
付き合ってほしい。旅が終わっても、一緒にいたい。誰かに言われたからじゃなくて、わたしが、そうしたいの
{
- cond("flag gt_delhi_back_word_secret"):
    // 「読めなかった」と答えた人：ロータス寺院で約束したとおり、声で言い直す。
    # speaker: heroine
    # recall: gt_album_d61
    # voice: gt_jaipur_date_her_confession_011
    ロータス寺院で、背中に書いた字。読めなかったって言ってたでしょ。あれね、『まだいたい』って書いたの
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_jaipur_date_her_confession_012
    背中じゃなくて、声で言うって約束したから。……今のが、その続き
- cond("date gt_delhi_date_lotus_temple"):
    # speaker: heroine
    # recall: gt_album_d61
    # voice: gt_jaipur_date_her_confession_013
    ロータス寺院で、最後に背中に書いた字。あれね、『まだいたい』って書いたの
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_jaipur_date_her_confession_014
    書いたときは、声に出す勇気がなかったの。……今のが、その続き
}
{ cond("flag gt_jaipur_mehndi_her_secret") and cond("seen gt_jaipur_hotel_mehndi_morning"):
    # speaker: narrator
    # recall: gt_album_j096
    彼女は、握っていた手のひらを開いた。孔雀の羽の付け根に、こちらの名前が、まだ濃く残っている。
}
# speaker: narrator
# photo: gt_album_j108 # photo_caption: だから、言うね
言い終えると、彼女は大きく息を吐いた。耳まで赤いのが、橙色の灯りの中でも分かった。
# speaker: heroine
# reaction: heroine,teasing,blush
# voice: gt_jaipur_date_her_confession_015
……はい、言った。六十年は、かからなかったよ。次は、そっちの番
* [「僕も、好きだ。……先に言われるとは思わなかった」 # option: me_too]
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_jaipur_date_her_confession_016
    ふふ。言ったもの勝ち、ってことで
    # speaker: heroine
    # reaction: heroine,shy_deep,heart
    # voice: gt_jaipur_date_her_confession_017
    ……でも、聞けてよかった。こわかったの、本当だから
* [「ずっと、言おうと思ってた。……一緒にいよう」 # option: stay_together]
    # speaker: heroine
    # reaction: heroine,teasing,heart
    # voice: gt_jaipur_date_her_confession_018
    知ってた。屋上に来るたび、そういう顔してたもん
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # voice: gt_jaipur_date_her_confession_019
    ……うん。一緒にいよう
* [「カムラさんに、報告しなきゃね」 # option: tell_kamla]
    # speaker: heroine
    # reaction: heroine,surprised,interrobang
    # voice: gt_jaipur_date_her_confession_020
    ……それ、今言う？　返事より先に？
    # speaker: narrator
    好きだ、と短く返すと、彼女は吹き出して、それから、こちらの肩に額を一度だけ押し当てた。
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_jaipur_date_her_confession_021
    うん。報告しよう。二人で。『言いたいことは、ちゃんと言いました』って
-
# speaker: heroine
# reaction: heroine,teasing,heart
# photo: gt_album_j109 # photo_caption: 先に言われた屋上
# voice: gt_jaipur_date_her_confession_022
旅が終わったあとのことは、一緒に決めようね。……最初の一個は、わたしが決めちゃったけど
# speaker: narrator
遠くの楽隊が、ひときわ大きく鳴った。よその人のお祝いだと分かっていても、今夜は少しだけ、自分たちのために鳴っている気がした。
-> END

// 始めるまでに関係の値が変わり、今は受け入れられない値になった道（ふつうは通らない）。彼女は言いかけてやめる。返事は決まらない。
= not_tonight
# speaker: heroine
# emotion: worried
# voice: gt_jaipur_date_her_confession_023
……あのね。……ごめん。やっぱり、今夜はやめておく
# speaker: heroine
# voice: gt_jaipur_date_her_confession_024
言おうと思ってたことが、急に、ちゃんとした形にならなくなっちゃった。呼び出しておいて、ごめんね
* [「いつでも聞くよ」 # option: anytime]
    # withhold
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_date_her_confession_025
    ……うん。ありがとう。そう言ってくれるの、分かってた
-
# speaker: narrator
二人はしばらく、楽隊の音を聞いていた。言いかけたことは、まだ、彼女の手の中にあった。
-> END
