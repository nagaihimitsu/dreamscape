INCLUDE modules.ink
-> DONE

// ガッレリアの場所のファイル。
// 観光案内、通常戦、道中交流と会話、デート（告白を除く特別なデートも、地図の出来事がガッレリアにある）。
// 訪問の流れ：案内 → 観察 → 「回らない願掛け」 → 「券を一枚」 → バトル → 「リナの紋章室」。観察の後の場面は、終わると次の場面か観察へ戻る。
// 2026-11-22 の改稿：広告屋サンドロに「恋人役」にされる回。案内で二度通る赤い鞄の女は、雇われた通行人ヴァンダ。
// ヒロインも人の声を勝手に録っていたと分かって消し、最後に自分が写った一枚を「わたしにください」と頼む（録る係の旅の一歩）。
// 雄牛の上で回る男の子は、フィナーレでヒロインが注文帳を「子どもの日曜日」と読む手がかりの一つ。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== galleria_vittorio_emanuele_ii_guide ===
# scene: guide
# background: milano_galleria
# speaker: narrator
ガッレリアのガラスの屋根の下に、靴音がいくつも響いている。{heroine_name}はスマホを掲げて、十秒の録音を始めた。
# speaker: narrator
録音のあいだ、こちらは息まで止めていた。
# speaker: heroine
# emotion: smile
そこまでしなくていいのに。息くらい、入ってもいいよ
# speaker: player
じゃあ、息もミラノの音ってことで
# speaker: narrator
目の前を、赤い鞄の女の人が、電話で早口にしゃべりながら通り過ぎた。
# speaker: narrator
少しして、同じ人が引き返してきた。同じ速さで、同じ電話をしながら、もう一度通り過ぎていく。
# speaker: heroine
# reaction: heroine,surprised,question
……今の人、二回通ったよね。巻き戻したの、わたしじゃないよ？
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_galleria_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_galleria_01 ===
# scene: battle
# background: milano_galleria
# speaker: enemy
そのまま、そのまま！　そこの二人、動かないで！
# speaker: narrator
柱の陰に三脚が立っていた。カメラの後ろで、細身の男が両手を振っている。手前の台には、香水の瓶が一本。
# speaker: enemy
# cutin: name
サンドロ。広告の写真屋だ。今度は、恋人どうしが初めて会ったみたいな感じで、こっちに笑って
# speaker: heroine
# reaction: heroine,surprised,blush
こ、恋人じゃないです！　それに、初めて会ったわけでも……
# speaker: enemy
最高。その照れ方が欲しかった
# speaker: narrator
# se: camera_shutter_burst
シャッターの音が続いた。画面の中で、香水の瓶の向こうに、二人がしっかり写っている。
# speaker: player
誰が撮っていいって言いました？
# speaker: enemy
香水の広告でね、題は『ミラノの恋人たち』。瓶だけじゃ客は買わない。後ろに恋人がいると、続きが気になるんだ
# speaker: enemy
それに、ここは通り道だ。ガッレリアを歩いてて、背景にならないほうが難しい
-> quiz(1) ->
# background: milano_galleria
{ quiz_correct:
    # speaker: heroine
    ドゥオモ広場とスカラ座の広場をつなぐ道。買い物の人も、劇場へ行く人も、ここを通るんだ
- else:
    # speaker: enemy
    ドゥオモ広場から、スカラ座の広場へ抜ける道さ。店に用がなくても、誰でも通る
}
# speaker: heroine
# emotion: serious
通り道なのは分かりました。でも、通る人の顔まで、あなたの商品じゃないです
# speaker: enemy
# reaction: heroine,worried
へえ。じゃあ、君のそれは？
# speaker: narrator
サンドロが顎で示したのは、{heroine_name}のスマホだった。さっき録った十秒が、画面に残っている。
# speaker: narrator
再生すると、靴音の中に、知らない女の人の声がはっきり入っていた。電話で、何かの値段を言い争っている。
# speaker: heroine
……ほんとだ。わたしも、知らない人の声を勝手に持って帰ろうとしてた
# speaker: narrator
彼女はサンドロの前で、その録音を消した。
# speaker: heroine
# emotion: serious
わたしのは消しました。だから、あなたも消してください
# speaker: enemy
ミラノの人は、ここを『街の客間』って呼ぶ。客間ってのは、着飾って人に見せる部屋だろ。撮られるのも込みなのさ
-> quiz(2) ->
# background: milano_galleria
{ quiz_correct:
    # speaker: heroine
    客間は、人と会って過ごす部屋。見せるための部屋っていうより、人を迎える部屋なんだ
- else:
    # speaker: heroine
    客間って、人と会って過ごす部屋なんだ。立ち話の二人も、お茶を飲む人も、ここで誰かと会ってる
}
# speaker: heroine
客間に来た人には、先に『撮っていいですか』って聞くのが礼儀だと思います
# speaker: narrator
サンドロは口を開け、閉じて、それからしぶしぶ言った。
# speaker: enemy
……撮っていいか？
# speaker: heroine
恋人の役は、お断りします
# speaker: enemy
じゃあ、何の役ならいい
# speaker: heroine
通行人の役なら
# speaker: milano_galleria_bag_woman
# cutin: name
それ、私の役なんだけど
# speaker: narrator
赤い鞄の女の人が、腕を組んで立っていた。さっきから、同じ速さで何度も前を通っていた人だ。
# speaker: milano_galleria_bag_woman
ヴァンダ。この人に雇われた通行人よ。朝から三十七往復。さっきの電話は、私の出演料の話
# speaker: heroine
# reaction: heroine,exasperated,sweat
……わたしが録ったの、ヴァンダさんの値段の交渉だったんだ
# speaker: milano_galleria_bag_woman
恋人役がただで見つかるなら、通行人役の値段も上げてもらわないとね。これからは一往復ごとに払って
# speaker: enemy
待て待て。まだ、いちばんいい画が残ってる
# speaker: narrator
サンドロは床の真ん中を指さした。モザイクの雄牛の上で、男の子がかかとをつけて、くるりと回っている。
# speaker: enemy
次はあれだ。『ミラノの幸運の香り』。雄牛の上で回る子どもと、その後ろの恋人たち
# speaker: enemy
この街の牛に願いをかける。説明はいらないだろ
# speaker: milano_galleria_bag_woman
三十七回、あの牛の横を通ったけど。その牛、ほんとにミラノの牛？
-> quiz(3) ->
# background: milano_galleria
{ quiz_correct:
    # speaker: heroine
    雄牛はトリノの紋章。ミラノの真ん中で、みんなトリノの牛の上を回ってるんだ
- else:
    # speaker: milano_galleria_bag_woman
    トリノよ。あれはトリノの紋章の牛。ミラノの真ん中で、よその街の牛に願いをかけてるの
}
# speaker: enemy
……『ミラノの幸運の香り』が、トリノの幸運か。書き直しだ
# speaker: narrator
サンドロは三脚にもたれて、天井のガラスを見上げた。
# speaker: heroine
わたしは、そういうの好きですけど。よその街の印に、ここの人たちが願いをかけてるの
# speaker: enemy
広告にするには、話が一つ多すぎる
# speaker: narrator
彼はカメラの画面を開き、二人の写った写真を一枚ずつ消し始めた。
# speaker: narrator
最後の一枚のところで、{heroine_name}が手を上げた。
# speaker: heroine
あの……消す前に、それだけ見せてもらえますか
# speaker: narrator
画面の中で、彼女は笑っていた。香水の瓶も、カメラも見ていない。隣を見て、笑っている。
# speaker: heroine
わたしが写ってる旅の写真って、ほとんどないんです。いつも、撮るほうだから
# speaker: heroine
# emotion: shy
これ、広告じゃなくて、わたしにください
# speaker: enemy
広告屋が写真をただで渡すのは、これが初めてだ
# speaker: narrator
# se: phone_receive
彼女のスマホが短く震えた。写真が一枚、届いていた。
# speaker: player
……こっち見てる
# speaker: heroine
# reaction: heroine,shy,blush
見てない。……見てたかもしれないけど、言わないで
# speaker: narrator
ヴァンダは出演料を受け取ると、赤い鞄を提げて歩きだした。三十八回目は、出口までまっすぐだった。
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
ガッレリアの真ん中の床、雄牛のモザイクの前で、男の子が靴を脱いでいる。片足立ちの肩を、母親が支えていた。
# speaker: milano_galleria_boy
# cutin: name
かかとで回ると、いいことがあるんでしょ。でもこの靴、昨日買ったばっかりなの。すり減ったら怒られる
# speaker: milano_galleria_mother
# cutin: name
そういう言い伝えなの。雄牛の上で、かかとで一回転。効いたかどうかは、誰も確かめてないけどね
# speaker: heroine
ちょっと回ってみたいな……。でも、靴下で回るの、すべらない？

* [I'll keep count for you. # option: believe # translation: 回数を数えるよ。]
    # speaker: narrator
    男の子は靴下のまま、かかとで一周だけ回って、自分で拍手した。
    # speaker: milano_galleria_boy
    一回でやめとく。残りは、明日の僕の分
    # speaker: heroine
    いいね。使い切らない運
    -> END

* [I'd rather make my own luck. # option: doubt # translation: 運は自分で作りたいな。]
    # speaker: milano_galleria_mother
    じゃあ、この子が転ばないように、一歩下がってあげて。……ほら、いいことが一つできた
    # speaker: heroine
    いまの一歩、けっこうご利益ありますね
    -> END

* [I'll leave the bull in peace. # option: leave # translation: 雄牛はそっとしておくよ。]
    # speaker: milano_galleria_boy
    牛にも休み時間、いるもんね
    # speaker: narrator
    男の子は靴紐を結び直し、順番を後ろの人に譲った。
    # speaker: heroine
    ……ほんとは、わたしもちょっと回ってみたかった。次に来たときにしよう
    -> END

// 会話「券を一枚」（knot の名前 milano_galleria_ticket_gift）。願掛けを終えた後、同じ観察から「進む」で始まる。
// 男の子の母親が、リナの紋章室の展示券をくれる（くじではなく、子どもの相手をしてくれた人へのお礼。どの選択肢の後でも同じ）。
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
柱のそばで、男の子の母親が財布から細長い紙を一枚抜いた。
# speaker: milano_galleria_mother
これ、リナの紋章室の券。手回しの版画の出店でね、この子の相手をしてくれた人に渡してって、何枚か預かってるの
# speaker: heroine
わたしたち、靴の話をしてただけですよ？
# speaker: milano_galleria_mother
この子、知らない人とは靴の話しかしないの。それを最後まで聞いてくれたなら、十分
# speaker: narrator
# item_show: galleria_ticket
受け取った券の角には、切りこみが一つだけ入っていた。
-> END

// 道中交流「リナの紋章室」（knot の名前 galleria_print が交流のID。2026-11-13 の改稿で「券を一枚、手の中へ」（galleria_ticket_press）をまとめた）。
// ガッレリアの場所（p_galleria）の本筋の後（# priority: +1）：ガッレリアのバトルの結果を閉じた後と、ガッレリアのデートの後に始まる。願掛けを見た後だけ。
// 券（願掛けの後の会話でもらう）を持っていれば、刷る版を選ぶ：雄牛・屋根・列の男の子に譲る（くじの代わりの「候補から選ぶ」。どれも正誤はない）。
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
床の雄牛は、トリノの紋章。ミラノの真ん中に、よその街の牛がいる。私は、そういう物を刷るのが好きなの
{ cond("item galleria_ticket held"):
    # speaker: milano_rina
    # item_out: galleria_ticket
    その券、使う？　切りこみを入れる代わりに、好きな版で一枚刷ってあげる
    # speaker: narrator
    もう一枚の版には、細い線が格子に組まれていた。ガラスの面を、鉄の骨が区切っている。頭の上の屋根と同じ形だ。
    # speaker: heroine
    わたしなら屋根かな。床ばっかり見てたから、上のあの線に気づくのが遅くなっちゃった
    # speaker: narrator
    台の端に、雄牛の前で靴を脱いでいた男の子がいた。券を持たずに、列のいちばん後ろでつま先立ちしている。
- else:
    # speaker: milano_rina
    見本はただ。実演は一回四ユーロ。紙が出てくるまで、何を刷ったか当てた顔はしないでね
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
    刷り上がった紙の上で、細い線が交差していた。リナが光にかざすと、線のあいだだけが白く抜ける。
    # speaker: heroine
    # emotion: happy
    わたしが言ったの、聞いてたんだ。……これなら、見上げなくても持って帰れるね
    -> END

* [Let the boy print his own. # option: boy # translation: あの子に自分で刷らせてあげて。]
    # give: galleria_ticket milano_galleria_boy
    # speaker: narrator
    男の子は券を両手で受け取り、ハンドルに体ごとぶら下がった。出てきた雄牛は、角が片方かすれていた。
    # speaker: milano_galleria_boy
    これ、僕の。一回しか回してないから
    # speaker: heroine
    わたしも一枚ほしかったけど……あの顔は、刷っても出ないもんね
    -> END

* [Can we look at the sample? # option: sample # translation: 見本を見てもいい？]
    # requires: not item galleria_ticket held
    # speaker: narrator
    見本には、同じ牛が三頭並んでいる。端の一頭にだけ、リナの指の跡がついていた。
    # speaker: milano_rina
    それ、いちばん売れそうになった一枚。私の指の跡ごと買いたいって人がいてね
    # speaker: heroine
    わたしも、その一頭から見ちゃいました
    -> END

* [Show us a fresh print, please. # option: pay # translation: 刷りたてを見せてください。]
    # requires: not item galleria_ticket held
    # money: -4
    # speaker: narrator
    リナは版に薄く色を引いた。出てきた牛は、片方の角だけインクが足りない。
    # speaker: milano_rina
    角がないのも一回のうち。二枚目の分は請求しないよ
    # speaker: narrator
    二枚目の牛には、ちゃんと角があった。
    # speaker: heroine
    二頭目を見たら、一頭目がかわいくなってきた
    -> END

* [We'll come back another time. # option: leave # translation: また別のときに来ます。]
    # later
    # speaker: narrator
    リナは手の甲で挨拶した。手のひらが真っ青だった。
    # speaker: heroine
    あれで握手してたら、立派なお土産ができてたね
    -> END

// デート（本筋）。romance/date_catalog.json の milano_invitation_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
// ガッレリアのバトルより先に遊べるので、バトルのクイズの答え（二つの広場をつなぐ道・客間・雄牛）は言わない。
=== milano_invitation_01 ===
# scene: date
# title: 片道だけの先導
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの中央で、彼女がこちらの前に回った。手を伸ばし、袖に触れる手前で止める。
# speaker: heroine
今日は片道だけ、わたしが先を歩きたい。振り返ったら、そこにいてくれる？
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は触れかけた指を、自分の袖口に戻した。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は、見失わない距離まで、自分から歩幅を縮めた。
}

* [「一歩後ろにいる」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        あまり近いと引率みたい。見えるくらいのところにいてくれれば十分
    - else:
        # speaker: heroine
        うん。ついてきてるか、ときどきお店のガラスで確かめるね
    }
    -> join_1

* [「横顔の見える位置なら」 # option: first_bold]
    # profile: bold
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        顔より、行き先を見てほしいな。わたしがどっちを選ぶか
    - else:
        # speaker: heroine
        # emotion: shy
        それだと、わたしのほうが前を見ていられないかも。……試してみよう
    }
    -> join_1

* [「到着するまで質問は一つだけ」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_invitation_01
    { romance_result == "negative":
        # speaker: heroine
        質問はしてほしいよ。わたしが前を歩いてても、二人で歩いてるんだから
    - else:
        # speaker: heroine
        じゃあ、先にわたしから。お腹すいてる？　……答えで行き先が変わります
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
横を向いた彼女の口もとに、言いかけた言葉が残っていた。
}
# speaker: narrator
彼女が足を止めたのは、店の前ではなかった。屋根が途切れて、外の広場が初めて見える柱のあいだだった。
# speaker: heroine
ここ、通るたびに気になってたの。一人で来るより、連れてきたかった
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
ガッレリアの混雑が切れて、二人の前に柱二本ぶんの空間ができた。彼女がその真ん中で立ち止まる。
# speaker: heroine
あの返事、今日はしないって、先に言わせて。そうしたら、普通の話をしても逃げてるみたいにならないから
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は次の柱のほうを向いて、息を吐いた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は隣を見てから、二人にだけ聞こえる声で話し始めた。
}

* [「じゃあ、夕飯の話がしたい」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_reassurance_01
    { romance_result == "negative":
        # speaker: heroine
        いきなり切り替えるのは難しいね。もうちょっと、並んで歩こう
    - else:
        # speaker: heroine
        いいね。お腹すいたって、ずっと言いにくかったの
    }
    -> join_1

* [「待つのは得意じゃない、と伝える」 # option: first_honest]
    # profile: honest
    # memory: sound_memory_reassurance_01
    { romance_result == "negative":
        # speaker: heroine
        今日はその言葉が、少しだけ急かされてるように聞こえた。時間をください
    - else:
        # speaker: heroine
        言ってくれてありがとう。うまく待てなくてもいいよ。決めたら、わたしから話す
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
        どうぞ。一つ目の話題が天気だったら、わたしも盛大に失敗してあげる
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
返事を持たないまま、二人の靴がもう一本先の柱まで進んだ。
}
# speaker: narrator
次の柱まで歩いたところで、彼女のほうから聞いてきた。昨日、何を食べたの、と。その答えを、彼女は最後まで笑って聞いた。
-> END

// デート（本筋）。romance/date_catalog.json の milano_city_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_city_date_01 ===
# scene: date
# title: 帰り道の予約
# background: milano_city_date_landmark
# speaker: narrator
二つの広場を結ぶガッレリア。その真ん中で、彼女は右でも左でもなく、来たほうを向いた。
# speaker: heroine
帰り道って、行きたいところを言ってもいい時間かな
# speaker: player
どこへ？
# speaker: heroine
いま通ったところ。あのお店の前で話しかけようと思って、そのまま通り過ぎちゃった
ドゥオモ広場とスカラ広場をつなぐだけの道なのにね。今日は、途中で戻りたくなっちゃった
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
店の明かりが二人のあいだを横切った。彼女はまだ半歩先にいる。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女はこちらの袖を少し引いて、来たほうの柱を指さした。
}

* [「じゃあ巻き戻そう」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        笑い話にされると困るな。けっこう勇気を出して言ったから。普通に戻ろう
    - else:
        # speaker: heroine
        足で巻き戻すの、初めて。でも台詞まで同じだと、わたしまた言いそびれるから、そこは変えてね
    }
    -> join_1

* [「ここで聞かせて」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        場所も一緒に覚えておきたいの。もう少しだけ付き合って
    - else:
        # speaker: heroine
        ありがとう。名所とか関係ない話でもいい？
    }
    -> join_1

* [「僕にも言いたいことがある」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        先にいい？　いま、やっと口を開いたところだから
    - else:
        # speaker: heroine
        それ、先に聞かせて……あっ、またわたしの番を譲っちゃった。今日はわたしから
    }
    -> join_1

= join_1
# speaker: narrator
閉まった店のガラスに、二人の姿が並んで映っている。彼女は、ガラスの中の自分に小さく一度うなずいた。
# speaker: heroine
旅が終わっても、用事のない日に会ってみたい。ここみたいに、会うためだけに通る道がほしいの

* [「用事なら僕が作るよ」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        なくていいって言ったのに。用事で埋めなくても、会いたいの
    - else:
        # speaker: heroine
        何にする？　……あ、いま二人とも、予定を作る気になってる
    }
    -> join_2

* [「最寄りの駅で待ち合わせよう」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        もう決めるのは、少し早いかな。でも、聞いてくれたのはうれしい
    - else:
        # speaker: heroine
        いいね。どっちが先に見つけるか、それだけ決めよう
    }
    -> join_2

* [「会いたいって言ってくれたら行く」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_city_date_01
    { romance_result == "negative":
        # speaker: heroine
        毎回わたしからは、寂しいよ。半分ずつがいい
    - else:
        # speaker: heroine
        言うよ。その代わり、そっちからも言ってね
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は、ガラスに映る二人をもう一度見てから歩きだした。
}
# speaker: narrator
今度こそ、帰るほうを向いた。ガラスの中の二人も、ほとんど同時に向きを変えた。
-> END

// デート（本筋）。romance/date_catalog.json の milano_rain_pause_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_rain_pause_01 ===
# scene: date
# title: 雨が決めた相席
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの出口まで来ると、外の道が雨に変わっていた。傘を出した彼女は、開く寸前で柄を握り直した。
# speaker: heroine
いま傘を開いたら、せっかくの雨宿りが一秒で終わっちゃうね
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は、雨粒が線になる向こうを眺めていた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は畳んだ傘を反対の手に持ちかえて、二人のあいだを空けた。
}

* [「一分だけ傘を預かる」 # option: first_playful]
    # profile: playful
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        預けなくても開かないよ。わたしが決めたんだから
    - else:
        # speaker: heroine
        はい。利息は、一緒に雨の音を聞く一分で
    }
    -> join_1

* [「僕はもう少しここにいたい」 # option: first_honest]
    # profile: honest
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        雨が強くなる前には歩こうね。ずっと、じゃないよ
    - else:
        # speaker: heroine
        わたしも。二人とも帰りそびれた顔をして、本当は残りたいんだね
    }
    -> join_1

* [「屋根のどの音が好き？」 # option: first_attentive]
    # profile: attentive
    # memory: sound_memory_rain_pause_01
    { romance_result == "negative":
        # speaker: heroine
        今日は比べるより、ぼんやり聴いていたいな
    - else:
        # speaker: heroine
        端っこ。ガラスの上と道の上で、二回鳴るところ
    }
    -> join_1

= join_1
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
開く前の傘の柄の上で、二人の指の影が重なった。
}
# speaker: narrator
雨宿りをする人と、構わず出ていく人が分かれていく。彼女が傘を開いたのは、雨が小降りになってからだった。
-> END

// デート（本筋）。romance/date_catalog.json の milano_recovery_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_recovery_01 ===
# scene: date
# title: 一言ずつ先に言う
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの端で、彼女が人の流れをよけた。店の窓に、少しだけ間を空けて並ぶ二人が映っている。
# speaker: heroine
# emotion: serious
今日どうしたいか、片方だけが決めると、もう片方は「いいよ」しか言えなくなるよね。一つずつ言ってみない？
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はこちらの顔色を読もうとして、いったん自分の手もとに目を落とした。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は窓に映る二人を指さして、先にこちらの名前を呼んだ。
}

* [「先に、君のを聞かせて」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        また、わたしが先？　小さいことでいいから、今日はそっちからも聞きたい
    - else:
        # speaker: heroine
        今日は広場まで歩く。ここで、わたしの分はおしまい。さあ、そっちの番
    }
    -> join_1

* [「僕の希望は、おやつ」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        お腹がすいてるのは分かった。わたしは、ゆっくり話せるところがいいな
    - else:
        # speaker: heroine
        いいね。わたしの希望は、立ち食いしないこと。両方かなう場所を探そう
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
二人のあいだで先に伸びたのは、行き先を指す彼女の手だった。
}
# speaker: narrator
柱を一本過ぎたところで、彼女は自分の歩幅で歩きだした。すぐ隣は、こちらのために空けてあった。
-> END
