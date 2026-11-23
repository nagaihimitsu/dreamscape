INCLUDE modules.ink
-> DONE

// ダルセナ（都市フィナーレの会場）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 都市フィナーレ（travel/milano.json の milano_finale の地点 p_darsena）の前の「ダルセナの一音」、フィナーレ、告白のデートと「待って」の後の彼女の返事
// （どちらも地図の出来事がダルセナにある）と、エピローグ。

// 道中交流「ダルセナの一音」（knot の名前 milano_darsena_tino）。都市フィナーレの前（# at: finale milano、# priority: -1）。
// 城でピックを持たずにティノに会い（flag milano_tino_needs_pick）、その後ドゥオモでノラの青いピックをもらって、まだ持っているときだけ起こる。
// 城を先に回ったときの小さな回収。渡す・持っておくのどちらでも完了する。
// リヴィオは出さない。フィナーレのクイズの題材（港・大理石・洗い場・椅子・人数の制限）には触れない。土地の事実は言わない（# sources: none）。
=== milano_darsena_tino ===
# scene: encounter
# title: ダルセナの一音
# at: finale milano
# priority: -1
# when: flag milano_tino_needs_pick
# when: item blue_pick held
# person: milano_tino
# sources: none
# background: milano_darsena_finale
# speaker: narrator
岸の階段の途中で、小さなギターを膝にのせた男の子がいた。城の中庭にいたティノだ。今日も親指で弾いている。
# speaker: milano_tino
あ、お城の。……ここ、水の音があるから、間違えても目立たないんだ
# speaker: narrator
ポケットの中で、青いピックの角が指に当たった。
# speaker: heroine
# item_out: blue_pick
ねえ、これ。あのケースの跡と、同じ形

* [Here, this is yours. # option: give # translation: はい、これはきみの。]
    # give: blue_pick milano_tino
    # speaker: narrator
    ティノはピックを指先でつまみ、弦を一本だけ弾いた。音は、水の上を渡っていった。
    # speaker: milano_tino
    ……親指より、ちょっと遠くまで行く
    # speaker: heroine
    一音目、聴けてよかった
    -> END

* [I'll keep it a little longer. # option: keep # translation: もう少し持っておくね。]
    # speaker: narrator
    ピックはポケットに戻った。ティノは気にしたふうもなく、また親指で弦をはじいた。
    # speaker: heroine
    わたしは、渡してもいいと思ったけどな。……持っておくって決めたなら、旅の終わりまで、ちゃんと持っててね
    -> END

// ───── 都市フィナーレ。battles/catalog.json の milano_city_boss_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 2026-11-22 の改稿：リヴィオの「人の気配なし」の注文の客は、八年口をきいていない娘キアラだった（ドゥオモの回の前振りを回収する）。
// 流れ：ダルセナの岸（第1問：港）→ 注文帳の四か所（第2問：大理石）→ ヒロインが「子どもの日曜日の散歩」と気づき、客が娘だと分かる
// → なぜ十秒ずつなのか（第3問：旧食堂の人数の制限）→ 階段の端の女の人が消える → 椅子を片づけて踊りだす岸（第4問：スカラ座の平土間）
// → 洗濯屋小路（第5問：洗い場）→ 最後の十秒。知っている足音。十秒を過ぎても停止を押さない。
// 四か所の「子ども」は、本筋の4回にいる（ドゥオモの鳩を追う子と団体の子、ガッレリアの雄牛で回る男の子、城のルチア）。フィナーレは4回を終えた後にしか出ない。
// 締め切りは「今夜のうち」（フィナーレは 9:00–22:00 のどこで始まってもよいので、時刻を言わない）。物語の中で日暮れまで時間を進める。
// キアラは名札だけの人物（milano_chiara）。外国に住み、仕事で数日だけミラノに来ている（本文では言わない。設計は drafts/SCENARIO_REWRITE.md）。
=== milano_city_boss_01 ===
# scene: battle
# background: milano_darsena_finale
# speaker: narrator
ダルセナの岸の階段に、折り畳み椅子が一脚。マイクを立てた男が、膝に肘をついて頭を抱えていた。
# speaker: narrator
録音機の側面に、色あせたイルカのシール。ドゥオモ広場で会った録音屋の、リヴィオだ。
# speaker: enemy
# cutin: name
……ああ、袖の二人か。ちょうどいい。手を貸してくれ。今度は払う。たぶん
# speaker: heroine
また、人の気配なしの注文ですか？
# speaker: enemy
いつもの客だ。今度は『日暮れのダルセナ、人の気配なし』。今夜のうちに十秒
# speaker: narrator
リヴィオは顎で岸を示した。散歩する人、自転車、グラスを手にした人の輪。水ぎわの段は、座る場所を探す人で埋まっている。
# speaker: enemy
夕方になると、人が集まる岸だ。そこで無人の十秒。客は、ここを静かな水辺だと思ってる
# speaker: player
ミラノに来たことがない人、でしたっけ
# speaker: enemy
本人はそう書いてくる。毎月『初めてミラノの音を聴きます』ってな。五年間、毎月だ
# speaker: heroine
ここって、静かな水辺だったことがあるのかな
-> quiz(1) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    二つの運河が出合う港だったんだ。夕方の散歩道になる前は、舟と荷物と、それを待つ人の場所
- else:
    # speaker: enemy
    港だよ。運河が二本、ここで出合う。舟と荷を待つ人で、いっぱいだったはずだ。……録ってないから、音は知らんがな
}
# speaker: enemy
静かだったことなんか、一度もないってわけか。客に教えてやりたいね
# speaker: narrator
リヴィオは試しにマイクを上げた。
# speaker: narrator
階段の端に、ひとりで座っている女の人がいた。マイクが上がると、彼女は口を閉じ、膝を抱えて息を止めた。
# speaker: heroine
……あの人、マイクが上がったとたん、息を止めた
# speaker: enemy
いい客だ。全員ああなら、仕事が早い
# speaker: narrator
# se: bicycle_bell
試しの十秒は、自転車のベルと、誰かの乾杯の声で終わった。
# speaker: narrator
リヴィオは上着のポケットから手帳を出した。ドゥオモで見た、注文の帳面だ。
# speaker: enemy
見てくれ。五年分の、無理な注文だ
# speaker: narrator
# letter: note
ドゥオモ広場、朝。人の気配なし。
# speaker: narrator
# letter: note
ガッレリア、雄牛の前。人の気配なし。
# speaker: narrator
# letter: note
スフォルツェスコ城、中庭。人の気配なし。
# speaker: narrator
# letter: note
ダルセナ、日暮れ。人の気配なし。
# speaker: enemy
この四つの繰り返しだ。毎月一か所ずつ、この順番で。物好きな客だよ
# speaker: heroine
ドゥオモ広場で始まって、ダルセナで終わる。……ドゥオモとここって、何かつながってるのかな
-> quiz(2) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    大聖堂の大理石は、この水の道を通って運ばれたんだ。始まりの広場と終わりの水辺が、水でつながってる
- else:
    # speaker: enemy
    大聖堂を建てる大理石だ。この水の道を通って、街の真ん中まで運ばれた。……始まりと終わりが、つながってやがる
}
# speaker: narrator
{heroine_name}は帳面の四行を、もう一度指でたどった。
# speaker: heroine
鳩のいる広場。雄牛の上で回る通路。お城の中庭。最後に水辺
# speaker: heroine
わたし、ここに来るまでに、三つとも歩いたの。どこにも子どもがいた。鳩を追いかける子、雄牛の上で回る子、お父さんの顔を粘土で作る子
# speaker: heroine
……これ、子どもの日曜日の散歩みたい
# speaker: narrator
リヴィオの手から、帳面が落ちかけた。
# speaker: enemy
……日曜は、ドゥオモで鳩を追いかけた。ガッレリアで雄牛の上を三回まわって、城の中庭で鬼ごっこ。最後に、ここでジェラート
# speaker: enemy
あいつが小さいころ、毎週その順で歩いた。俺と、娘で
# speaker: player
娘さん？
# speaker: enemy
キアラ。今は外国にいる。……八年、口をきいてない。ミラノに来たことがないだなんて、よく言う
# speaker: narrator
リヴィオは、録音機のイルカのシールを親指でこすった。前の持ち主の趣味だと、ドゥオモでは言っていた。
# speaker: enemy
あいつが二十のとき、小さな店で、初めて人前で歌った。俺が録った。二番で、声が裏返った
# speaker: enemy
だから消した。失敗した音は残さない。あいつのためだと思った
# speaker: enemy
次の朝、あいつは家を出ていった。『わたしの失敗も、わたしなのに』ってな
# speaker: heroine
# emotion: serious
……ドゥオモでも、子どもの笑い声を切ってましたよね
# speaker: enemy
癖だ。直らん
# speaker: narrator
リヴィオは帳面を閉じて、膝の上で握りしめた。
# speaker: enemy
五年分、全部十秒だ。言いたいことがあるなら、電話の一本でもすりゃいい。なんで十秒なんだ
# speaker: heroine
『最後の晩餐』の部屋も、少しの人数ずつ、決まった時間しか入れなかった
-> quiz(3) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    傷みやすい壁の絵を守るために、近づける人と時間を区切ってるんだ
- else:
    # speaker: enemy
    絵を守るため、か。傷みやすい壁の絵だから、人と時間を区切る
}
# speaker: heroine
壊れやすいものに近づくときは、少しずつなのかも。……キアラさんの十秒も
# speaker: heroine
それに、人の気配なしの十秒なら、聞こえる人は一人だけになる
# speaker: enemy
……俺か
# speaker: heroine
ドゥオモで、四十人は黙ってくれたのに、あなたの息だけは残ってた
# speaker: heroine
キアラさんが一度も文句を言わなかったのは、たぶん、それが聴きたかったから
# speaker: narrator
リヴィオは何も言わなかった。{heroine_name}は、ふと階段の端を見た。
# speaker: narrator
さっきの女の人が座っていた場所が、空いていた。
# speaker: heroine
# reaction: heroine,surprised,question
……リヴィオさん。さっき、マイクが上がるたびに息を止めてた人
# speaker: narrator
リヴィオが振り向いた。階段の端には、もう誰もいない。
# speaker: enemy
顔は見てない。……この人ごみじゃ、足音も聞き分けられん
# speaker: enemy
どうせ今夜も、十秒送って終わりだ。いつもどおりにな
# speaker: narrator
岸の端で、アコーディオンが鳴りだした。店の人が椅子を重ねて片づけ、空いた石畳で、何組かが踊り始める。
# speaker: enemy
なんで椅子をどけるんだ、あいつら。これじゃ一秒も録れん
# speaker: heroine
スカラ座も、昔は似たようなことをしてたみたいですよ
-> quiz(4) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    平土間の椅子は、昔は動かせた。椅子をどければ、床で踊れる。聴いてた人が、踊る人になるんだ
- else:
    # speaker: enemy
    平土間の椅子が動かせたのか。片づければ床が空いて、舞踏会になる、と
}
# speaker: narrator
リヴィオは、踊る人たちをしばらく眺めていた。
# speaker: enemy
……キアラが六つのとき、居間のソファをどけろってうるさくてな。床を空けて、二人で踊った
# speaker: enemy
あいつは三回転んだ。三回とも、笑い転げた。……あの録音は、消してない
# speaker: heroine
# emotion: smile
失敗、入ってるのに？
# speaker: enemy
……ああ。入ってるのに、だ
# speaker: narrator
リヴィオは椅子をたたみ、マイクを肩にかついだ。
# speaker: enemy
ここは無理だ。静かなところへ行く。今夜のうちなら、まだ間に合う
# background: milano_navigli_date
# speaker: narrator
運河沿いを少し歩くと、細い小路が口を開けていた。洗濯屋小路。岸のざわめきが、建物ひとつ向こうへ遠のく。
# speaker: narrator
いつの間にか、運河の水に灯りが映り始めていた。小路の水ぎわに、斜めに傾いた石の台が並んでいる。
# speaker: enemy
ここならいける。……この石の台は、何だ。荷の積みおろしか？
-> quiz(5) ->
# background: milano_navigli_date
{ quiz_correct:
    # speaker: heroine
    洗濯の洗い場。洗濯を仕事にしてた人たちが、ここで毎日、服を洗ってたんだ
- else:
    # speaker: heroine
    荷物の台じゃなくて、石の洗い場。洗濯を仕事にしてた人たちが、ここで服を洗ってたんだって
}
# speaker: heroine
ここで働いてた人の名前は、たぶん、どこにも残ってない。でも、仕事の跡は、石に残ってる
# speaker: narrator
{heroine_name}はスマホを出して、一つの録音を開いた。
# speaker: heroine
これ、ドゥオモで最初に録った十秒。広場の音を録るつもりだったのに、わたしの袖の音しか入ってなかったの
# speaker: narrator
再生すると、ごそっ、ごそっ、と布のこすれる音がした。
# speaker: heroine
恥ずかしくて、何回も消そうとした。でも今聴くと、あの広場で、わたしがわくわくしてたのが分かる
# speaker: heroine
# emotion: serious
キアラさんが五年間買ってたのも、きっとこういう音です。……今夜は、消さないであげてください
# speaker: enemy
俺の息なんか、ただの雑音だ
# speaker: heroine
雑音じゃないです。あなたがそこにいたっていう音です
# speaker: narrator
リヴィオは長いあいだ、洗い場の石を見ていた。それから、イヤホンを耳に入れた。
# speaker: enemy
……十秒だ。二人とも、息は止めなくていい
# speaker: narrator
# pause: 1000
録音ボタンが押された。
# speaker: narrator
# quiet: line
水が石に当たる音。遠くのアコーディオン。リヴィオの、少し長い息。
# speaker: narrator
# se: footstep
五秒目に、小路の入口で足音がした。
# speaker: narrator
リヴィオの肩が、びくりと跳ねた。目を閉じたまま、彼は停止ボタンから指を離した。
# speaker: enemy
……この足音は、知ってる
# speaker: narrator
足音はまっすぐ近づいてきて、洗い場の手前で止まった。さっき階段の端で息を止めていた女の人だった。
# speaker: milano_chiara
# cutin: name
……パパ。人の気配、入っちゃったね
# speaker: enemy
……注文と違うぞ
# speaker: milano_chiara
いいの。注文主は、わたしだから
# speaker: narrator
# pause: 1200
十秒が過ぎた。リヴィオは、停止ボタンを押さなかった。
# speaker: enemy
……腹は、減ってるか
# speaker: milano_chiara
え？
# speaker: enemy
ジェラート。日曜のやつだ
# speaker: narrator
キアラが笑った。笑い声の終わりが、少し裏返った。録音機の赤い光は、ついたままだった。
{ battle_score >= 3:
    # speaker: enemy
    注文は台無しだ。……君たちのせいだからな。払わんぞ
    # speaker: heroine
    # emotion: smile
    払わなくていいです
- else:
    # speaker: enemy
    ずいぶん遠回りしたが、着いたな。……俺もだ
}
# speaker: narrator
# leave: enemy
二人は、そっと小路を出た。振り返ると、洗い場の前に、親子の影が並んでいた。
# speaker: heroine
# emotion: smile
録音、まだ止まってなかったね
-> END

// デート（本筋）「橋の途中で、こちらを向く」。romance/date_catalog.json の milano_confession_01 の storyId がこの knot を指す（地図の出来事はダルセナ、場面はナヴィリオの橋）。
// 2026-11-13 に 1場面1ファイル（stories/dates/milano_date_confession.ink）から移した。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は、デートを始めたときにゲームが関係状態から決めた confession_result で分ける。
// 告白のデートは、ほかのデートと同じく1回だけ（2026-11-13。返事にかかわらず思い出になり、保留・拒否の後も同じ告白をもう一度選べない）。
// 「待って」の後は、ガッレリアの「今日は返事をしない日」の次の日以降に、彼女から返事をする（下の milano_answer_01）。
// どの選択肢でも思い出 milano_confession_promise（橋の途中で告白したこと）を残す。マウリツィオ教会のデートを遊んでいれば、待ち合わせの話を一言足す。
=== milano_confession_01 ===
# scene: date
# title: 橋の途中で、こちらを向く
# background: milano_night_landmark
# speaker: narrator
ナヴィリオの橋を半分ほど上がったところで、彼女のほうから立ち止まった。運河ではなく、こちらを向いている。
# speaker: heroine
さっき、何か言いかけたよね。渡り切る前に聞きたい
{ cond("date milano_maurizio_date_sound"):
    # speaker: heroine
    あの教会で、別々に見てから会ったときも思ったの。わたし、待ち合わせるの、けっこう好き
}
* [「恋人として、これからも会いたい」 # option: as_lovers]
    # memory: milano_confession_promise
    # speaker: narrator
    彼女は息を吸って、手すりから手を離した。
* [「好きです。あなたはどう思ってる？」 # option: ask_her_heart]
    # memory: milano_confession_promise
    # speaker: narrator
    彼女は一度だけうなずいた。問いを受け取った、という小さなうなずきだった。
* [「帰った後の僕の予定に、君がいてほしい。付き合ってほしい」 # option: after_the_trip]
    # memory: milano_confession_promise
    # speaker: narrator
    目の前の人波が切れた。彼女は渡り始めず、その場に残った。
-
{
- confession_result == "accepted":
    # speaker: heroine
    # emotion: shy
    うん。付き合いたい。わたし、明日何時に会うかまで、さっきから考えてた
    # speaker: player
    何時？
    # speaker: heroine
    # emotion: teasing
    それは恋人に相談します。……あなたなんだけど
    # speaker: narrator
    彼女のほうが先に手を出した。指が重なったところで、ようやく二人は、橋の残り半分を渡った。
- confession_result == "deferred":
    # speaker: heroine
    うれしい。だからこそ、その勢いで「うん」って言うのを待って。わたしはもう少し、自分の言葉で考えたい
    # speaker: player
    分かった。明日は、普通に会える？
    # speaker: heroine
    うん。普通に会いたいっていうのは、いま答えられる
    # speaker: narrator
    先に足を踏み出したのは彼女だった。橋の下で、水が一度だけ石に当たった。
- else:
    # speaker: heroine
    # emotion: serious
    恋人としては、会えない。遠回しに言うと、あなたを待たせてしまうから
    # speaker: player
    聞かせてくれてありがとう。……少しだけ、ここで休んでいく
    # speaker: heroine
    うん。先に、橋の向こうにいるね
    # speaker: narrator
    すぐ隣ではなくても、こちらから見えるところで、彼女は運河のほうを向いていた。
}
-> END

// デート「今日は返事をする日」：「待って」の後の、彼女の返事（kind: answer。2026-11-13 のユーザー判断「彼女から返事をする場面を足す」）。
// romance/date_catalog.json の milano_answer_01 の storyId がこの knot を指す（地図の出来事はダルセナ）。
// ミラノ編は1都市で、告白のデートは1回なので、「待って」の後に告白し直す場面がない。そこで、彼女から返事をする（主人公はもう一度告白しない）。
// 地図に出るのは、「待って」と言われ（JSON の needsDeferred）、ガッレリアの「今日は返事をしない日」（milano_reassurance_01）を遊んだ後の昼
// （JSON の when）。「今日は返事をしない日」は夜だけ出るので、返事は早くてもその次の日になる（「今日はしない」と言った日には言わない）。
// エピローグの前でも後でも出る（エピローグは街歩きか夜の画面から読むので、先に休めば必ず間に合う）。
// 返事は、デートを始めたときの関係の値で決まる（confession_result：告白が成立する条件を満たせば accepted、満たさなければ rejected。
// 乱数では決めず、もう一度「待って」にもならない）。噛み合いの札（# profile:）と関係値の札は書かない。
// 選択は、返事を聞いた後の主人公の返し（1回。choiceCount）。交際が始まる道だけ、思い出 milano_answer_memory を残す。
// 場所：ダルセナから運河沿いに延びる通り Alzaia Naviglio Grande の入口。alzaia は「水路で舟を岸から引く綱」と「その引き道」
// （Treccani「alzaia」）。市内の区間は、昔は舟を綱で上流へ引いた二本の引き道に沿う（italia.it「Naviglio Grande」ドイツ語版）。どちらも2026-11-13に確認。
// 港・大理石・洗い場はフィナーレのクイズの答えなので、ここでは言わない。フィナーレの後なら、リヴィオが最後の十秒を止めなかったことを一言。
=== milano_answer_01 ===
# scene: date
# title: 今日は返事をする日
# background: milano_darsena_finale
# speaker: narrator
昼のダルセナは、水に空が映っていた。岸の段には、人がまばらに座っている。
彼女は運河沿いの通りの入口で立ち止まり、角の標識を指さした。
# speaker: heroine
『アルザイア・ナヴィリオ・グランデ』。この名前、あれから調べたの
# speaker: heroine
アルザイアって、岸から舟を引っぱる綱のこと。昔は、流れに逆らって上る舟を、この道から綱で引いてたんだって
# speaker: heroine
# emotion: serious
橋の上で「待って」って言ったのは、流れで「うん」って言いたくなかったから
# speaker: heroine
# emotion: serious
勢いに運ばれるんじゃなくて、自分で引っぱって行きたかった
# speaker: heroine
# reaction: heroine,teasing
……今の、ちょっと格好つけた。でも、本当にそう思ってたの
{ cond("episode milano_finale"):
    # speaker: heroine
    リヴィオさん、最後の十秒を止めなかったでしょ。あれを見て、わたしも自分の声は消さないって決めたの
}
# speaker: heroine
ガッレリアで、今日は返事をしないって言った。だから、今日はする。わたしから
{ confession_result == "accepted":
    -> yes
- else:
    -> not_now
}

= yes
# speaker: heroine
# emotion: shy
付き合いたい。恋人として、帰ってからも会いたい
# speaker: player
……今のは、勢いじゃない？
# speaker: heroine
# reaction: heroine,teasing
勢いだったら、こんなに時間かからないでしょ。ちゃんと、自分で引っぱってきた答え
* [「待ってよかった」 # option: worth_waiting]
    # memory: milano_answer_memory
    # speaker: heroine
    # emotion: smile
    待たせたわたしが言うのも変だけど、わたしも、待ってよかった。自分の言葉、ちゃんと見つかったから
* [「明日の予定、一緒に決めよう」 # option: plan_tomorrow]
    # memory: milano_answer_memory
    # speaker: heroine
    # emotion: smile
    うん。明日の朝ごはんは、わたしが選ぶ。その次は、あなた。順番にね
* [「もう一回、言ってほしい」 # option: say_again]
    # memory: milano_answer_memory
    # speaker: heroine
    # reaction: heroine,teasing
    一回で覚えてほしかったな。……付き合いたい。はい。今の、録っておけばよかったね
-
# speaker: narrator
差し出された手を取ると、彼女は標識の下をくぐって、運河沿いを歩きだした。綱を引くみたいに、ほんの少しだけ前を。
-> END

= not_now
# speaker: heroine
# emotion: serious
恋人には、今はなれない。何度考えても、そこに戻ってきた
# speaker: heroine
待っててくれたのに、ごめんなさい。これが、わたしの答え。遠回しにはしない
# speaker: player
……うん
# speaker: heroine
この旅で、あなたと歩いたのは、本当に楽しかった。それは答えとは別に、ちゃんと残しておきたい
* [「自分の言葉で言ってくれて、ありがとう」 # option: thank_her]
    # speaker: heroine
    うん。借りてきた言葉で答えたら、あなたに失礼だと思ったから
* [「少し、一人で運河を歩いてくる」 # option: walk_alone]
    # speaker: heroine
    うん。わたしは、ここの段に座ってる。戻ってきたら、普通の話からしよう
* [「明日も、普通に会える？」 # option: see_you_tomorrow]
    # speaker: heroine
    # emotion: smile
    うん。それは、橋の上で答えたときから変わってない。普通に会いたい
-
# speaker: narrator
水に映った空が、風で少しだけ揺れて、また元に戻った。
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。洗濯屋小路を出た後のダルセナ。
// 2026-11-22 の改稿：いつも録る側だったヒロインが、初めて主人公に自分の十秒を録ってもらう。最初に袖の音が入るが、今度は押さえない。
=== milano_epilogue ===
# scene: epilogue
# background: milano_darsena_finale
# speaker: narrator
ダルセナの岸に戻ると、アコーディオンはもう止んでいた。キアラが座っていた階段の端が、空いている。
# speaker: narrator
二人は、そこに並んで座った。
# speaker: player
消さないでって言ったとき、声、震えてなかった
# speaker: heroine
震えてたよ。……ドゥオモのときより、少しだけましだったけど
# speaker: narrator
{heroine_name}は自分のスマホをしばらく見つめてから、こちらに差し出した。録音の画面が開いている。
# speaker: heroine
わたし、自分の声が入ってる録音、一つも持ってないの。いつも、録るほうだったから
# speaker: heroine
十秒、わたしを録って
# speaker: narrator
# pause: 800
録音ボタンを押した。彼女は水のほうを向いて、小さく息を吸った。
{
- ending_reached:
# speaker: heroine
# emotion: shy
ミラノのダルセナにいます。隣に、恋人がいます。……帰ったら、これ、一緒に聴こうね
- romance_stage >= 3:
# speaker: heroine
# emotion: teasing
ミラノのダルセナにいます。隣の人に言いたいことは、録音じゃなくて、ちゃんと顔を見て言います
- romance_stage == 2:
# speaker: heroine
# emotion: smile
ミラノのダルセナにいます。今日は、知らない人の十秒を手伝いました。……次は、わたしの番
- else:
# speaker: heroine
ミラノのダルセナにいます。旅の連れと、ここまで歩きました。……以上です
}
# speaker: narrator
停止を押して、再生した。いちばん初めに、ごそっ、と袖の音が入っていた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……また袖
# speaker: heroine
# emotion: smile
でも、消さない。これも、わたしだから
# speaker: narrator
上着がかすかに鳴った。彼女は、袖を押さえなかった。
-> END
