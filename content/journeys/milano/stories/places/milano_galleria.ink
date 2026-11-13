INCLUDE modules.ink
-> DONE

// ガッレリアの場所のファイル。
// 観光案内、通常戦、道中交流と会話、デート（告白を除く特別なデートも、地図の出来事がガッレリアにある）。
// 訪問の流れ：案内 → 観察 → 「回らない願掛け」 → 「券を一枚」 → バトル → 「リナの紋章室」。観察の後の場面は、終わると次の場面か観察へ戻る。

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
今の、巻き戻したのわたしじゃないよね
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
……ほんとだ。これはわたしが消します
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
サンドロは画面を胸に伏せ、床のモザイクへ顎をしゃくった。雄牛の上で、また誰かがかかとで回っている。
# speaker: enemy
次はあれだ。「ミラノの幸運の香り」。回る人と、この街の牛。説明いらずだろ
# speaker: milano_galleria_bag_woman
その牛、ほんとにミラノの牛？
-> quiz(3) ->
# background: milano_galleria
{ quiz_correct:
# speaker: heroine
ミラノの真ん中で、みんなトリノの牛の上を回ってたんだ
# speaker: heroine
よその街の印に、ここの人が願掛けしてる。わたし、そういうの好きです
- else:
# speaker: heroine
ミラノの床でも、雄牛はトリノの印。「この街の牛」じゃなかったんですね
}
# speaker: enemy
……コピーは書き直しだ。「よその街の幸運」じゃ、香水は売れない
# speaker: narrator
伏せた画面の端に、鞄の女が手を差し入れた。
# speaker: milano_galleria_bag_woman
私にも
# speaker: narrator
三人に画面を囲まれて、男は二人の映ったテイクを消した。鞄の女は、自分の分の出演料を受け取るまで引かなかった。
# speaker: enemy
次は人形でやるよ。あれは時間単価が安い
# speaker: narrator
ケースにしまった瓶をもう一度出して、男は自分の顔の前に置いた。
# speaker: heroine
……わたし、記録してる側は景色に入ってないと思ってた
# speaker: player
消すとき、手が止まったね
# speaker: heroine
うん。いい音だったから。そこが一番いやだった
-> END

// 道中交流「回らない願掛け」（knot の名前 galleria_fortune が交流のID。2026-11-13 に 1場面1ファイル・encounters/catalog.json から移した）。
// ガッレリアの観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。どの選択肢でも完了する（「また今度」はない）。
// 観察を開き直すと、また会える（# repeat: always。前のカタログと同じ）。報酬は一度だけ。
// 完了すると、バトルの2問正解と同じ報酬（victory_galleria_first、AP+1）を一度だけ受け取る（# on_done: reward。docs/01 の文化交流の代わりの達成）。
// 雄牛がどこの紋章かは言わない（観察の資料と、バトルの第3問の答え）。言い伝えは言い伝えとして言う（出典は scenes/catalog.json）。
=== galleria_fortune ===
# scene: encounter
# title: 回らない願掛け
# at: visit galleria_vittorio_emanuele_ii
# priority: after observe
# repeat: always
# person: milano_galleria_boy
# person: milano_galleria_mother
# on_done: reward victory_galleria_first
# background: milano_galleria
# speaker: narrator
ガッレリアの真ん中の床、雄牛のモザイクの前で、少年が靴を脱いでいる。母親が、片足立ちの彼の肩を支えた。
# speaker: milano_galleria_boy
# cutin: name
かかとで回るといいことがあるんでしょ。僕の靴、昨日買ったばっかり。靴だけ良くなったら困る
# speaker: milano_galleria_mother
# cutin: name
そういう言い伝えなの。雄牛の上で、かかとで一回転。効いたかどうかは、誰も確かめてないけどね
# speaker: heroine
ちょっと回ってみたいな……。でも、靴下で回るの、怖くない？

* [I'll keep count for you. # option: believe # translation: 回数を数えるよ。]
    # speaker: narrator
    少年は靴を履き直し、かかとで一周だけして、自分で拍手した。
    # speaker: milano_galleria_boy
    一回でやめとく。残りは明日の僕の分
    # speaker: heroine
    いいね。使い切らない運
    -> END

* [I'd rather make my own luck. # option: doubt # translation: 運は自分で作りたいな。]
    # speaker: milano_galleria_mother
    なら、この子が転ばないように一歩あけて。いいこと一個、もうできた
    # speaker: heroine
    いまの一歩、けっこういいご利益ですね
    -> END

* [I'll leave the bull in peace. # option: leave # translation: 雄牛はそっとしておくよ。]
    # speaker: milano_galleria_boy
    牛にも休み時間いるもんね
    # speaker: narrator
    少年は靴紐を結び直し、順番を後ろの人へ譲った。
    # speaker: heroine
    ……ほんとは、わたしもちょっと回ってみたかった。次に来たときにしよう
    -> END

// 会話「券を一枚」（knot の名前 milano_galleria_ticket_gift）。願掛けを終えた後、同じ観察から「進む」で始まる。
// 少年の母親が、リナの紋章室の展示券をくれる（くじではなく、子どもの相手をしてくれた人へのお礼。どの選択肢の後でも同じ）。
// 券はバトルの後の「リナの紋章室」（galleria_print）で使う。今の版のセーブで願掛けを終えている人は、この会話に会わずに券を持たない（リナの見本と実演の道がある）。
=== milano_galleria_ticket_gift ===
# scene: talk
# at: visit galleria_vittorio_emanuele_ii
# priority: after observe
# when: done galleria_fortune
# person: milano_galleria_mother
# on_done: item galleria_ticket
# sources: none
# background: milano_galleria
# speaker: narrator
柱のそばで、少年の母親が財布から細長い紙を一枚抜いた。
# speaker: milano_galleria_mother
これ、リナの紋章室の券。手回しの版画の出店でね、この子の相手をしてくれた人に渡してって、何枚か預かってるの
# speaker: heroine
わたしたち、靴の話をしてただけですよ？
# speaker: milano_galleria_mother
この子、知らない人とは靴の話しかしないの。それを最後まで聞いてくれたら、十分
# speaker: narrator
# item_show: galleria_ticket
券の角には、切り込みが一つだけ入っていた。
-> END

// 道中交流「リナの紋章室」（knot の名前 galleria_print が交流のID。2026-11-13 の改稿で「券を一枚、手の中へ」（galleria_ticket_press）をまとめた）。
// ガッレリアの場所（p_galleria）の本筋の後（# priority: +1）：ガッレリアのバトルの結果を閉じた後と、ガッレリアのデートの後に始まる。願掛けを見た後だけ。
// 券（願掛けの後の会話でもらう）を持っていれば、刷る版を選ぶ：雄牛・屋根・列の少年に譲る（くじの代わりの「候補から選ぶ」。どれも正誤はない）。
// 券がなければ（今の版のセーブで願掛けを終えた人も）、見本を見るか、4ユーロで実演。どちらの道にも「また今度」があり、同じ場所の後の時点（デートの後）にまた会える。
// リナの出店はゲームの中の作り物（本文で実在の店と思わせない）。雄牛がトリノの紋章であること、屋根が鉄とガラスであることは scenes/catalog.json の出典。
// バトルの直後でもデートの後でも読めるように、直前の出来事を前提にしない。
=== galleria_print ===
# scene: encounter
# title: リナの紋章室
# at: place p_galleria
# priority: +1
# when: seen galleria_fortune
# person: milano_rina
# background: milano_galleria
# speaker: narrator
柱の陰に、折り畳みの台が一つ。手回しのプレス機の横で、刷り上がった紙が洗濯ばさみに吊られて揺れている。
# speaker: milano_rina
# cutin: name
紋章室へようこそ。部屋って言っても、この台一つだけどね
# speaker: narrator
吊られた一枚は、床のモザイクと同じ雄牛だった。
# speaker: milano_rina
床の雄牛は、トリノの紋章。ミラノの真ん中に、よその街の牛がいる。私はそういう物を刷るのが好きなの
{ cond("item galleria_ticket held"):
    # speaker: milano_rina
    その券、使う？　切り込みを入れる代わりに、好きな版で一枚刷ってあげる
    # speaker: narrator
    もう一枚の版には、細い線が格子に組まれていた。ガラスの面を、鉄の骨が区切っている。頭の上の屋根と同じ形だ。
    # speaker: heroine
    わたしなら屋根かな。床ばっかり見てたから、上のあの線に気づくの、遅くなっちゃった
    # speaker: narrator
    台の端に、雄牛の前で靴を脱いでいた少年がいた。券を持たずに、列の一番後ろでつま先立ちしている。
- else:
    # speaker: milano_rina
    見本はただ。実演は一回四ユーロ。紙が出るまで、私が何を刷ったか当てた顔をしないでね
}

* [The bull, please. # option: bull # translation: 雄牛でお願いします。]
    # use: galleria_ticket
    # speaker: narrator
    ハンドルを半回転。紙をはがすと、雄牛の腹がいちばん濃く出ていた。
    # speaker: heroine
    床では踏まれてる牛が、紙の上だと胸を張ってる。……うん、こっちも好き
    -> END

* [The roof, please. # option: roof # translation: 屋根でお願いします。]
    # use: galleria_ticket
    # speaker: narrator
    刷り上がった紙の上で、細い線が交差していた。リナが光にかざすと、線の間だけが白く抜ける。
    # speaker: heroine
    # emotion: happy
    わたしの言ったの、聞いてたんだ。……これなら、見上げなくても持って帰れるね
    -> END

* [Let the boy print his own. # option: boy # translation: あの子に自分で刷らせてあげて。]
    # give: galleria_ticket milano_galleria_boy
    # speaker: narrator
    少年は券を両手で受け取り、ハンドルに体ごとぶら下がった。出てきた雄牛は、角が片方かすれていた。
    # speaker: milano_galleria_boy
    これ、僕の。一回しか回してないから
    # speaker: heroine
    わたしも一枚ほしかったけど……あの顔は、刷っても出ないもんね
    -> END

* [Can we look at the sample? # option: sample # translation: 見本を見てもいい？]
    # requires: not item galleria_ticket held
    # speaker: narrator
    見本には同じ牛が三頭並ぶ。端の一頭だけに、リナの指の跡がついていた。
    # speaker: milano_rina
    それ、いちばん先に売れかけたの。私の指をどこに飾る気か、ちょっと聞きたかった
    # speaker: heroine
    わたしも、その一頭から見ました
    -> END

* [Show us a fresh print, please. # option: pay # translation: 刷りたてを見せてください。]
    # requires: not item galleria_ticket held
    # money: -4
    # speaker: narrator
    リナは版に薄く色を引いた。出てきた牛の片角だけ、インクが足りない。
    # speaker: milano_rina
    角がないのも一回のうち。二度目は請求しないよ
    # speaker: narrator
    二枚目の牛には、ちゃんと角があった。
    # speaker: heroine
    二頭目を見ると、一頭目がかわいくなってきた
    -> END

* [We'll come back another time. # option: leave # translation: また別のときに来ます。]
    # later
    # speaker: narrator
    リナは手の甲で挨拶した。掌は真っ青だった。
    # speaker: heroine
    あれで握手してたら、立派なお土産ができてたね
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
今日は片道だけ、わたしが先を歩きたい。振り返ったら、そこにいてくれる？
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
        顔より行き先を見てほしい。わたしがどっちを選ぶか
    - else:
        # speaker: heroine
        # emotion: shy
        それ、わたしは道を見ていられるかな。試してみよう
    }
    -> join_1

* [「到着するまで質問は一つだけ」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        質問は聞きたいよ。わたしが先頭でも、二人で歩いてるから
    - else:
        # speaker: heroine
        じゃあ先にわたしから。お腹すいてる？　……そこで行き先が変わります
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
横を向いた彼女の口元に、言いかけた言葉が残った。
}
# speaker: narrator
彼女が選んだのは店ではなく、広場が初めてのぞく柱の間だった。
# speaker: heroine
ここで、今日はわたしが待ってたかったの
-> END

// デート（本筋）。romance/date_catalog.json の milano_reassurance_01 の storyId がこの knot を指す。
// 「待って」の後に、夜だけ出る（JSON の when の time night。2026-11-13）。「今日は返事をしない」と言った日には返事をせず、次の日以降の昼に、
// ダルセナで彼女から返事をする（milano_darsena.ink の milano_answer_01）。
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
        言ってくれてありがとう。うまく待てなくてもいい。わたしが決めたら、わたしから話す
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
        どうぞ。一つ目の話題に天気を持ってきたら、わたしも盛大に失敗してあげる
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
        足で巻き戻すの初めて。台詞まで同じだとわたしまた言いそびれるから、そこは変えてね
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
        それ、先に聞かせて……あっ、またわたしの番を譲っちゃった。今日はわたしから
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
        毎回わたしからは寂しい。半分ずつがいい
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
        預けなくても開かないよ。わたしが決めたんだから
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
        わたしも。二人とも帰りそびれた顔で、ちゃんと残りたいんだね
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
        またわたしだけが先？　小さいことでいいから、今日はそちらからも聞きたい
    - else:
        # speaker: heroine
        今日は広場まで歩く。ここで終わり。さあ、そっちの番
    }
    -> join_1

* [「僕の希望は、おやつ」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        お腹がすいてるのは分かった。わたしはゆっくり話せる所がいいな
    - else:
        # speaker: heroine
        いい。わたしの希望は、立ち食いしないこと。両方かなう場所を探そう
    }
    -> join_1

* [「さっきの沈黙を急いで埋めたくない」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        わたしは今、おしゃべりしたい日みたい。半分ずつにしよう
    - else:
        # speaker: heroine
        わたしも。じゃあ少しだけ、次の柱まで黙ってみようか
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
