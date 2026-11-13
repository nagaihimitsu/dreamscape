INCLUDE modules.ink
-> DONE

// ガッレリアの場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、通常戦、道中交流とデート（告白を除く特別なデートも、地図の出来事がガッレリアにある）。道中交流「回らない願掛け」（クイズと抽選がある）とその結果は、今も 1場面1ファイル（stories/encounters/）。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== galleria_vittorio_emanuele_ii_guide ===
# scene: guide
# background: milano_galleria
# speaker: narrator
ガッレリアのガラス屋根に、靴の音がいくつも返る。{heroine_name}が十秒録る間、主人公は息まで止めていた。
# speaker: heroine
# emotion: smile
そんなに頑張らなくても。息くらい、入っていいですよ
# speaker: player
じゃあ、息もミラノの音ってことで
# speaker: narrator
目の前を通った赤い鞄が、引き返してもう一度同じ速さで通った。
# speaker: heroine
今の、巻き戻したの私じゃないよね
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_galleria_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_galleria_01 ===
# scene: battle
# background: milano_galleria
# speaker: enemy
# cutin: name
# reaction: heroine,serious
そのまま、そのまま。今度は初めて会った感じで、こっちに笑って
# speaker: heroine
初めて会ったんですけど
# speaker: narrator
男は棚から香水瓶を取り、二人の顔に重ねて画面を確認した。鞄の女はさっきから三度目の往復に入っている。
# speaker: enemy
瓶だけじゃ客は買わない。後ろに恋人がいれば、続きが気になる
# speaker: player
誰が撮っていいって？
# speaker: enemy
ガッレリアを歩いてて、背景になるなって方が難しいよ
-> quiz(1) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
二つの出口の用事は違っても、途中まで同じ道なんだ
- else:
# speaker: heroine
ここをまっすぐ行った人、買い物じゃなくてスカラ座に用があったのかも
}
# speaker: heroine
通り抜ける道で待っていれば、人はそりゃ映ります。でも、この人の顔はあなたの商品じゃないです
# speaker: enemy
# reaction: heroine,worried
君の手にも録音機があるけどね
# speaker: narrator
彼女の親指が止まった。再生すると、鞄の女が息を切らして値段を交渉する声まで入っていた。
# speaker: heroine
# emotion: serious
……ほんとだ。これは私が消します
-> quiz(2) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
座らなくても、ここが誰かの客間になるのか
- else:
# speaker: heroine
客間って呼ぶの、立ち話をしてるあの二人を見ると分かる気がする
}
# speaker: narrator
彼女は削除を押し、今度はレンズの前に立った。
# speaker: enemy
いい顔。そのまま香水持って
# speaker: heroine
持ちません。今撮ってるぶんを見せてください
# speaker: narrator
香水瓶で隠した画面の端に、鞄の女が手を差し入れた。「私にも」
-> quiz(3) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
劇が終わってからも、人の夜は続いたんですね
- else:
# speaker: heroine
幕が下りたら今度は夕飯。散歩まで含めて一晩のお出かけだったんですね
}
# speaker: narrator
三人に画面を囲まれて、男は二人の映ったテイクを消した。鞄の女は、自分の分の出演料を受け取るまで引かなかった。
# speaker: enemy
次は人形でやるよ。あれは時間単価が安い
# speaker: narrator
ケースにしまった瓶をもう一度出して、男は自分の顔の前に置いた。
# speaker: heroine
……私、記録してる側は景色に入ってないと思ってた
# speaker: player
消すとき、手が止まったね
# speaker: heroine
うん。いい音だったから。そこが一番いやだった
-> END

// 道中交流「版の実演、手はポケットに」（knot の名前 galleria_print が交流のID）。
// 今は、最後の晩餐をガッレリアより先に終えたときだけ起こる：ガッレリアの最初の観察から「進む」でバトルへ向かうとき、「回らない願掛け」に続けて始まる。
// 条件は『最後の晩餐を終えた』（頭の # when: episode …）。ガッレリアを先に終えると起こらない。
// ガッレリアのバトルを終えると、ガッレリアは地図の行き先に出なくなる。バトルの画面（結果の画面も）から観察に戻れるが、バトルの途中なので交流は始まらない。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
=== galleria_print ===
# scene: encounter
# title: 版の実演、手はポケットに
# at: visit galleria_vittorio_emanuele_ii
# priority: after observe
# when: episode milano_last_supper_episode
# background: milano_galleria
# speaker: narrator
ガッレリアで架空の出店「リナの紋章室」が、小さな手回しプレスを見せている。紙をめくると雄牛が現れ、子どもの列から鼻息の真似が返った。
# speaker: narrator
リナ「見本はそこに。実演一回は四ユーロ。紙が出るまで、私が何を刷ったか当てた顔をしないでね」

* [Show us a fresh print, please. # option: pay # translation: 刷りたてを見せてください。]
    # money: -4
    # speaker: narrator
    リナは版に薄く色を引いた。出てきた牛の片角だけ、インクが足りない。
    # speaker: narrator
    リナ「角がないのも一回のうち。二度目は請求しないよ」。二枚目の牛にはちゃんと角があった。
    # speaker: heroine
    二頭目を見ると、一頭目がかわいくなってきた
    -> END

* [Can we look at the sample? # option: sample # translation: 見本を見てもいい？]
    # speaker: narrator
    見本には同じ牛が三つ並ぶ。端の一頭だけにリナの指紋がついていた。
    # speaker: narrator
    リナ「それ、いちばん先に売れかけたの。私の指をどこに飾る気か、ちょっと聞きたかった」
    # speaker: heroine
    私も、そっちから見ました
    -> END

* [We'll come back another time. # option: leave # translation: また別のときに来ます。]
    # later
    # speaker: narrator
    リナは手の甲で挨拶した。掌は真っ青だった。
    # speaker: heroine
    あれで握手してたら、立派なお土産ができてたね
    -> END

// 道中交流「券を一枚、手の中へ」（knot の名前 galleria_ticket_press が交流のID）。
// 今は起こらない：後回しにする選択肢（option: later）以外は展示券が要る。展示券は「回らない願掛け」のクイズの当たりでしか手に入らず、そのクイズが今は起こらないため。
// 頭の # when: の条件は『最後の晩餐を終えた』（episode …）。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
// 頭の # when: item galleria_ticket held は、前のカタログの決まり（「また今度」のほかの選択肢がみな品物を要るとき、その品物がなければ始まらない）を書いたもの。
=== galleria_ticket_press ===
# scene: encounter
# title: 券を一枚、手の中へ
# at: visit galleria_vittorio_emanuele_ii
# priority: after observe
# when: episode milano_last_supper_episode
# when: item galleria_ticket held
# background: milano_galleria
# speaker: narrator
ガッレリアの架空の出店「リナの紋章室」。リナは展示券を光にかざし、券の角の切れ込みを親指で確かめた。
# speaker: narrator
リナ「これ、当たりの人用。今日は押す係も頼めるよ。ふちを押さえるか、持ち手を握るか」

* [I'll turn the handle. # option: press # translation: 私がハンドルを回します。]
    # use: galleria_ticket
    # speaker: narrator
    半回転で腕が重くなった。紙を持ち上げると、雄牛の腹がいちばん濃い。
    # speaker: heroine
    そのへんで頑張ったの、見てて知ってた
    -> END

* [Please make one for us. # option: watch # translation: 一枚、刷ってください。]
    # use: galleria_ticket
    # speaker: narrator
    リナが版を押し、彼女がそっと紙をはがした。リナ「そこが一番いい役。譲ったの、ちゃんと覚えといて」
    # speaker: heroine
    はい。はがすときの音まで、たぶん覚えてます
    -> END

* [I'll keep my ticket for later. # option: later # translation: 券はまた今度使います。]
    # later
    # speaker: narrator
    リナは切れ込みに指を置いたまま、券をそのまま返した。「まだ切ってない。またおいで」
    -> END

// デート（本筋）。romance/date_catalog.json の milano_invitation_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_invitation_01 ===
# scene: date
# title: 片道だけの先導
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの中央で、彼女がこちらの前に回った。手を伸ばし、袖に触れる直前で止める。
# speaker: heroine
今日は片道だけ、私が先を歩きたい。振り返ったら、そこにいてくれる？
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は触れかけた指を自分の袖口に戻した。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は見失わない距離まで、自分から歩幅を縮めた。
}

* [「一歩後ろにいる」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        あまり近いと引率みたいだね。見えるくらいにいてくれれば十分
    - else:
        # speaker: heroine
        うん。ついてきてるか、たまに反射で確かめるね
    }
    -> join_1

* [「横顔の見える位置なら」 # option: first_bold]
    # profile: bold
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        顔より行き先を見てほしい。私がどっちを選ぶか
    - else:
        # speaker: heroine
        # emotion: shy
        それ、私は道を見ていられるかな。試してみよう
    }
    -> join_1

* [「到着するまで質問は一つだけ」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        質問は聞きたいよ。私が先頭でも、二人で歩いてるから
    - else:
        # speaker: heroine
        じゃあ先に私から。お腹すいてる？　……そこで行き先が変わります
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
横を向いた彼女の口元に、言いかけた言葉が残った。
}
# speaker: narrator
彼女が選んだのは店ではなく、広場が初めてのぞく柱の間だった。「ここで、今日は私が待ってたかったの」
-> END

// デート（本筋）。romance/date_catalog.json の milano_reassurance_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_reassurance_01 ===
# scene: date
# title: 今日は返事をしない日
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの混雑が切れ、二人の前に柱二本ぶんの空間ができた。彼女がその真ん中で止まる。
# speaker: heroine
あの返事、今日はしないって先に言わせて。そうしたら、普通の話をしても逃げてるみたいにならないから
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は次の柱に向かって息を吐いた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は隣を見てから、二人に聞こえる声で話し始めた。
}

* [「じゃあ、夕飯の話がしたい」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_reassurance_01
    { romance_result == "negative":
        # speaker: heroine
        いきなり切り替えるの難しいね。もうちょっと並んで歩こう
    - else:
        # speaker: heroine
        いいね。お腹がすいたって、ずっと言いにくかった
    }
    -> join_1

* [「待つのは得意じゃない、と伝える」 # option: first_honest]
    # profile: honest
    # memory: sound_memory_reassurance_01
    { romance_result == "negative":
        # speaker: heroine
        今日はその言葉が、少しだけ急かす音に聞こえた。時間をください
    - else:
        # speaker: heroine
        言ってくれてありがとう。うまく待てなくてもいい。私が決めたら、私から話す
    }
    -> join_1

* [「普通の話、僕から失敗していい？」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_reassurance_01
    { romance_result == "negative":
        # speaker: heroine
        無理に面白くしなくていいよ。そばにいてくれるだけで
    - else:
        # speaker: heroine
        どうぞ。一つ目の話題に天気を持ってきたら、私も盛大に失敗してあげる
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
まだ返事のない二人の靴が、もう一本の柱まで進んだ。
}
# speaker: narrator
次の柱まで歩いて、彼女から「昨日、何食べた？」と尋ねた。その答えだけを、今日はちゃんと待った。
-> END

// デート（本筋）。romance/date_catalog.json の milano_city_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_city_date_01 ===
# scene: date
# title: 帰り道の予約
# background: milano_city_date_landmark
# speaker: narrator
二つの広場を結ぶガッレリア。その真ん中で、彼女は右でも左でもなく、来た方を向いた。
# speaker: heroine
帰り道って、行きたいところを言っても許される時間かな
# speaker: player
どこへ？
# speaker: heroine
いま通ったところ。あの店の前で話しかけようと思って、通り過ぎちゃった
この通路、ドゥオモ広場とスカラ広場をつないでるんだよね。今日はその途中で戻りたくなっちゃった
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
店の明かりが二人の間を横切った。彼女はまだ半歩先にいる。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は袖を少し引いて、来た方の柱を指した。
}

* [「じゃあ巻き戻そう」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        笑い話にするには、ちょっと勇気を使ったとこ。普通に戻ろう
    - else:
        # speaker: heroine
        足で巻き戻すの初めて。台詞まで同じだと私また言いそびれるから、そこは変えてね
    }
    -> join_1

* [「ここで聞かせて」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        場所も一緒に覚えておきたい。もう少しだけ付き合って
    - else:
        # speaker: heroine
        ありがとう。名所とか関係ない話でもいい？
    }
    -> join_1

* [「僕にも言いたいことがある」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        先にいい？　いま口を開けたところだから
    - else:
        # speaker: heroine
        それ、先に聞かせて……あっ、また私の番を譲っちゃった。今日は私から
    }
    -> join_1

= join_1
# speaker: narrator
閉じた店のガラスに二人の像が並ぶ。彼女は自分の方を向いて、小さく一度うなずいた。
# speaker: heroine
旅が終わったら、用事がない日に会ってみたい。ここみたいに、会うためだけに通る場所がほしい

* [「用事なら僕が作るよ」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        なくていいって言ったのに。埋めなくても、会いたいの
    - else:
        # speaker: heroine
        何にする？　あ、いま二人とも予定を作る気でいる
    }
    -> join_2

* [「最寄りの駅で待ち合わせよう」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        もう決めるのは少し早いかな。でも、聞いてくれたのはうれしい
    - else:
        # speaker: heroine
        いい。どっちが先に見つけるか、それだけ決めよう
    }
    -> join_2

* [「会いたいって言ってくれたら行く」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        毎回私からは寂しい。半分ずつがいい
    - else:
        # speaker: heroine
        言うよ。その代わり、そっちからも言ってね
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は店のガラスに映る二人を見てから歩き出した。
}
# speaker: narrator
今度こそ帰る方を向いた。ガラスの二人も、ほとんど同時に向きを変えた。
-> END

// デート（本筋）。romance/date_catalog.json の milano_rain_pause_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_rain_pause_01 ===
# scene: date
# title: 雨が決めた相席
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの端で雨が道を切った。傘を出した彼女は、開く寸前で柄を握り直した。
# speaker: heroine
いま傘を開いたら、せっかくの雨宿りが一秒で終わるんですよね
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
雨粒が線になる向こうを彼女は眺めた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は畳んだ傘を反対の手に移し、二人の間を空けた。
}

* [「一分だけ傘を預かる」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        預けなくても開かないよ。私が決めたんだから
    - else:
        # speaker: heroine
        はい。利息は一緒に雨音を聞く一分で
    }
    -> join_1

* [「僕はもう少しここにいたい」 # option: first_honest]
    # profile: honest
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        雨が強くなる前には歩こうね。ずっと、ではないよ
    - else:
        # speaker: heroine
        私も。二人とも帰りそびれた顔で、ちゃんと残りたいんだね
    }
    -> join_1

* [「屋根のどの音が好き？」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        今日は比べるより、ぼんやり聴きたいな
    - else:
        # speaker: heroine
        端っこ。ガラスの上と路面で二回鳴るところ
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
開く前の傘の柄に、二人の指の影が重なった。
}
# speaker: narrator
立ち止まる人と追い越す人が分かれていく。彼女が傘を開いたとき、雨はまだ小降りだった。
-> END

// デート（本筋）。romance/date_catalog.json の milano_recovery_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_recovery_01 ===
# scene: date
# title: 一言ずつ先に言う
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの端で彼女が人の流れをよけた。店の窓に、小さな隙間を空けた二人が映っている。
# speaker: heroine
# emotion: serious
今日どうしたいか、片方だけが決めると、もう片方は「いいよ」しか言えなくなるね。ひとつずつ言ってみない？
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は慌ててこちらの顔色を読もうとして、いったん自分の手を見た。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は窓に映る二人を指さし、先に主人公の名を呼んだ。
}

* [「先に、君のを聞かせて」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        また私だけが先？　小さいことでいいから、今日はそちらからも聞きたい
    - else:
        # speaker: heroine
        今日は広場まで歩く。ここで終わり。さあ、そっちの番
    }
    -> join_1

* [「僕の希望は、おやつ」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        お腹がすいてるのは分かった。私はゆっくり話せる所がいいな
    - else:
        # speaker: heroine
        いい。私の希望は、立ち食いしないこと。両方かなう場所を探そう
    }
    -> join_1

* [「さっきの沈黙を急いで埋めたくない」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        私は今、おしゃべりしたい日みたい。半分ずつにしよう
    - else:
        # speaker: heroine
        私も。じゃあ少しだけ、次の柱まで黙ってみようか
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
二人の間で先に伸びたのは、行き先を指す彼女の手だった。
}
# speaker: narrator
柱を一本過ぎたところで、彼女は自分から歩幅を決めた。隣には、一人ぶんの空きがある。
-> END
