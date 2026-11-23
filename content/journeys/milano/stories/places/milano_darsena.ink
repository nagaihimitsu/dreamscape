INCLUDE modules.ink
-> DONE

// ダルセナ（都市フィナーレの会場）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 都市フィナーレの前の「ダルセナの一音」、フィナーレ、
// 告白のデートと「待って」の後の彼女の返事（どちらも地図の出来事がダルセナにある）と、エピローグ。
// 2026-11-23 の全面改稿：デザイナーのヴィオラが、ダルセナの岸で勝手にファッションショーを開く。足りない四つ（音楽・モデル・お客の整理・仕上げ）を、
// ヒロインが四か所で頼んで回る。ヴィオラとの出会いは、本筋4回のうち最初に遊んだ回のクイズの頭（各ファイルの <バトル>_viola）。
// 設計は authoring/journeys/milano/drafts/SCENARIO_REWRITE.md。

// 道中交流「ダルセナの一音」（knot の名前 milano_darsena_tino）。都市フィナーレの前（# at: finale milano、# priority: -1）。
// 城でピックを持たずにティノに会い（flag milano_tino_needs_pick）、その後ドゥオモでノラの青いピックをもらって、まだ持っているときだけ起こる。
// 城を先に回ったときの小さな回収。渡す・持っておくのどちらでも完了する。
// ヴィオラは出さない。フィナーレのクイズの題材（港・大理石・洗い場・椅子・人数の制限）には触れない。土地の事実は言わない（# sources: none）。
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

// ───── 都市フィナーレ「ダルセナのランウェイ」。battles/catalog.json の milano_city_boss_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 流れ：岸の準備（第1問：港。口上の「のんびりした水辺」を直す）→ 最後の一着の色（第2問：大理石）→ 洗濯屋小路の楽屋（第3問：洗い場。
// ヴィオラの服が何のための服か）→ ほつれた裾にルーカが来る → 岸に人が押し寄せ、ジョヴァンナが来る（第4問：旧食堂の人数の制限）
// → 演奏にネッロが加わり、エツィオとピエラが歩く → 最後の一着をヒロインが自分で選んで着て歩き、振り返って皆を撮る
// → 椅子を片づけて踊る（第5問：スカラ座の平土間）→ ルーカの上着。
// クイズの順は quizzes/milano_finale_quiz.json の並び（2026-11-23 に、洗い場を3問目へ入れ替えた）。
// 4回の仲間は全員来る（フィナーレは4回を終えた後にしか出ない）。返事が「考えとく」「断る」だった人は、ピンチのときに現れる。
// 寄り道の回収：スカラ座の推理クイズを遊んでいればアダが椅子を積んで来る。ブレラの推理クイズを遊んでいればミーナが歩き方を教える。
// 時刻は言わない（フィナーレは 9:00–22:00 のどこで始まってもよい。準備のあいだに日が傾く）。
=== milano_city_boss_01 ===
# scene: battle
# background: milano_darsena_finale
# speaker: narrator
ダルセナの岸にロープが一本張られて、洗濯ばさみで吊られた服が一列に揺れていた。
# speaker: narrator
その前で、ヴィオラが電話を二台いっぺんに耳に当てている。
# speaker: enemy
# cutin: name
来た！　来てくれた！　……で、何人来るの？
# speaker: narrator
{heroine_name}は、ヴィオラにもらったリストを広げた。四つの行の横に、自分の字で書き足してある。
# speaker: narrator
# letter: note
音楽：ジャーダのバンド。ネッロさんは「考えとく」
# speaker: narrator
# letter: note
モデル：エツィオさんとピエラさん。二人で来る
# speaker: narrator
# letter: note
お客の整理：ジョヴァンナさんに断られた
# speaker: narrator
# letter: note
仕上げ：ルーカさんは「考えとく」
# speaker: heroine
……来るって言ってくれたのは、半分です
# speaker: enemy
半分！　半分あれば、ショーは半分できる！　……半分のショーって何？
# speaker: narrator
岸の段では、もうジャーダたちが楽器を出していた。エツィオは吊られた上着を一着ずつ裏返して、縫い目を確かめている。
# speaker: milano_ezio
この上着は、裏のほうがいい仕事をしてる
# speaker: enemy
でしょう！　分かる人には分かるの
{ cond("battle milano_la_scala_b01"):
    # speaker: narrator
    そこへ、古い椅子を山のように積んだ小さな車が止まった。スカラ座の前で会った、椅子の修理屋のアダだ。
    # speaker: milano_ada
    椅子が足りないって聞いたから。直しを待ってる椅子が、うちに山ほどあるの
}
# speaker: enemy
始める前に、最初の口上を読むね。聞いてて
# speaker: narrator
# letter: card
ダルセナ。ミラノでいちばん、のんびりした水辺。
# speaker: heroine
……ここって、のんびりした場所だったのかな
-> quiz(1) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    二つの運河が出合う港だったんだ。舟と荷物と、それを待つ人の場所。のんびりなんて、してなかったと思う
- else:
    # speaker: enemy
    港だった……。運河が二本、ここで出合う港。荷を待つ人で、いっぱいだったのね
}
# speaker: enemy
完璧。働く人の服のショーなら、ここしかないってこと。書き直す
# speaker: narrator
# letter: card
ダルセナ。ミラノでいちばん、働いてきた水辺。
# speaker: narrator
ヴィオラは衣装袋のいちばん奥から、一着を取り出した。白に近い、ほんのり桃色の布。光の向きで、細い筋が浮かぶ。
# speaker: enemy
最後の一着。この色は、ドゥオモの石から取ったの
# speaker: heroine
ドゥオモと、この水辺って……
-> quiz(2) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    大聖堂の大理石は、この水の道を通って運ばれたんだ。あの石も、ここを通っていった
- else:
    # speaker: enemy
    大聖堂の大理石よ。この水の道を通って、街の真ん中まで運ばれた
}
# speaker: enemy
大聖堂の石が通った水の上を、最後の一着が歩く。……モデルは、まだ決まってないけど
# speaker: narrator
ヴィオラは、{heroine_name}のほうを見なかった。わざと見ないようにしているようだった。
# speaker: enemy
楽屋に行こう。岸じゃ、着替える場所がない
# background: milano_navigli_date
# speaker: narrator
運河沿いを少し歩いて、細い小路に入った。洗濯屋小路。水ぎわに、斜めに傾いた石の台が並んでいる。
# speaker: enemy
ここが楽屋。……この石の台、何だか分かる？
-> quiz(3) ->
# background: milano_navigli_date
{ quiz_correct:
    # speaker: heroine
    石の洗い場。洗濯を仕事にしてた人たちが、ここで服を洗ってたんですね
- else:
    # speaker: enemy
    洗い場よ。洗濯を仕事にしてた人たちが、ここで服を洗ってた
}
# speaker: enemy
わたしの祖母も、よその家の服を洗って暮らしてたの。ここじゃないけどね
# speaker: enemy
誰かのいちばんいい服を、誰にも見られないところで、きれいにする仕事。……わたしの服は、そういう手のための服
# speaker: heroine
……だから、裏だけ、あんなに丁寧なんですね
# speaker: enemy
ばれてた？
# speaker: narrator
ヴィオラは上着を一着持ち上げて、手を止めた。裾の折り返しが、まだ仮縫いの糸のままだった。一着だけではない。
# speaker: enemy
……裾。仕上げが、ほとんど終わってない。ルーカがいたら、一時間でできるのに
# speaker: narrator
# se: footsteps_run
小路の入口で、駆けてくる足音がした。
# speaker: milano_luca
一時間もかからない
# speaker: narrator
ルーカだった。裁縫道具の箱を抱えて、息を切らしている。
# speaker: enemy
……遅い
# speaker: milano_luca
ほどくのは遅いけど、縫うのは速いんだ
# speaker: narrator
ルーカは洗い場の石の縁に腰を下ろして、針を動かし始めた。何か月もほどき続けていたとは思えない速さだった。
# speaker: narrator
彼の鞄の口から、あの上着の袖が、少しだけのぞいていた。
# background: milano_darsena_finale
# speaker: narrator
岸に戻ると、人がさっきの倍に増えていた。散歩の人、グラスを持った人、何が始まるのかとのぞきこむ人。
# speaker: narrator
水に映る空は、もう夕方の色になっていた。
# speaker: narrator
狭い岸の縁に、人が押し寄せていく。
# speaker: narrator
# se: glass_break_small
誰かのグラスが落ちて、割れた。
# speaker: enemy
待って、待って、押さないで……！　水に落ちる！
# speaker: narrator
ピッ、と短い電子音が鳴った。
# speaker: milano_giovanna
はい、そこで止まってください。ここから先は、一度に二十人までです
# speaker: narrator
黒い上着の女の人が、ストップウォッチを高く掲げていた。ジョヴァンナだ。その後ろで、アッスンタが手を振っている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
ジョヴァンナさん！
# speaker: milano_giovanna
持ち場は離れない主義です。今日の持ち場を、ここにしただけです
# speaker: enemy
二十人？　せっかく、こんなに来てくれたのに？
-> quiz(4) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    『最後の晩餐』の部屋も、人数と時間を区切ってた。傷みやすい壁の絵を守るために
- else:
    # speaker: milano_giovanna
    旧食堂で人数と時間を区切るのは、傷みやすい壁の絵を守るためです
}
# speaker: milano_giovanna
守りたいものがあるときは、近づく人を区切るんです。ここなら、狭い岸と、お客さんの足
# speaker: milano_giovanna
……始めてください。組ごとに入れ替えます
# speaker: narrator
ジョヴァンナの声ひとつで、人の波がうそみたいに並び直した。岸の縁に、細い一本の道が空いた。
# speaker: enemy
……ランウェイができた
# speaker: narrator
ジャーダが弓を上げて、曲が始まった。三小節目の手前で、横からアコーディオンの音が割りこんできた。
# speaker: milano_nello
年寄りは早く寝る。……寝る前に、一曲だけだ
# speaker: milano_giada
おじいちゃん！
# speaker: milano_nello
おじいちゃんじゃない
# speaker: narrator
三小節目で、音がふわりと上がった。最初に岸を歩きだしたのは、エツィオとピエラだった。
# speaker: narrator
ヴィオラの上着を着たエツィオは、五十年分の歩幅で、ゆっくり歩いた。ピエラはその腕につかまって、ときどき、くるりと回った。
# speaker: narrator
# se: applause
岸じゅうから、拍手が起きた。
{ cond("battle milano_brera_c01"):
    # speaker: narrator
    段の上では、ブレラで会った演出家のミーナが、次に歩く人に耳打ちしていた。
    # speaker: milano_mina
    四歩で止まって。戻らないで
}
# speaker: narrator
仕上がったばかりの裾をなびかせて、一人、また一人と、ヴィオラの服を着た人が歩いていく。ジャーダのバンドの男の子も、太鼓をたたきながら歩いた。
# speaker: narrator
最後の一着だけが、楽屋から出てこなかった。ヴィオラは桃色の布を腕にかけて、岸の端に立っている。
# speaker: enemy
最後の一着は、なしにする。モデルが決まってないから。……それでも、いいショーだった
# speaker: narrator
ヴィオラは、{heroine_name}に頼まなかった。一度も、こちらを見なかった。
# speaker: narrator
{heroine_name}は、首から下げたカメラを握りしめていた。指先が、少し白くなっている。

# speaker: narrator
声をかけようとしたとき、{heroine_name}がこちらを見た。何か言われるより先に、小さく息を吸った。
# speaker: narrator
彼女はカメラを首から外して、こちらの手にのせた。
# speaker: heroine
# emotion: serious
今日は、あなたが撮る係。……わたし、歩いてくる
# speaker: enemy
……いいの？
# speaker: heroine
怖いです。でも、やってみたい。……自分で決めました
# speaker: narrator
# pause: 1000
しばらくして、桃色の一着を着た{heroine_name}が、楽屋の小路から出てきた。
# speaker: narrator
ネッロのアコーディオンが、三小節目で、音を上げた。
# speaker: narrator
# quiet: line
彼女は岸の縁を歩きだした。最初の三歩は、足もとを見ていた。四歩目で、顔を上げた。
# speaker: narrator
ファインダーの中で、彼女がこちらを探して、見つけて、少しだけ笑った。
# speaker: narrator
# se: camera_shutter
シャッターを切った。
# speaker: narrator
岸の端まで歩くと、彼女は立ち止まった。それから、いつもの癖のように、くるりと振り返った。
# speaker: narrator
ポケットからスマホを出して、構える。画面の中には、岸じゅうの人がいた。
# speaker: narrator
手を叩くピエラ。弾きながら顎を上げるネッロ。ストップウォッチを止めたジョヴァンナ。
# speaker: narrator
針を持ったまま拍手するルーカ。泣きそうな顔のヴィオラ。
# speaker: narrator
# se: camera_shutter
彼女も、シャッターを切った。
# speaker: narrator
曲が終わると、ネッロがアコーディオンを抱え直して、岸に向かって怒鳴った。
# speaker: milano_nello
よし、椅子を片づけろ。踊らないやつは帰れ
# speaker: enemy
椅子を？　お客さん、まだ座ってるのに
# speaker: heroine
スカラ座も、昔は似たようなことをしてたみたいですよ
-> quiz(5) ->
# background: milano_darsena_finale
{ quiz_correct:
    # speaker: heroine
    平土間の椅子は、昔は動かせたんです。椅子を片づければ、聴いてた人が、そのまま踊れる
- else:
    # speaker: enemy
    平土間の椅子が動かせたのね。片づけたら、床がそのまま舞踏会になる
}
# speaker: narrator
岸の椅子が、次々に重ねられていった。空いた石畳で、知らない人どうしが手を取って踊りだす。
# speaker: narrator
エツィオがピエラの手を取って、その場で一回、くるりと回してやった。
# speaker: milano_ezio
雄牛の上じゃないから、数に入らん
# speaker: narrator
踊りの輪の外で、ルーカが鞄から上着を出した。三か月、ほどいては縫い直していた、あの上着だった。
# speaker: milano_luca
……ショーの服じゃない。お前の寸法で縫った
# speaker: enemy
……わたしの？
# speaker: milano_luca
前からだけじゃなく、まわりのどこから見ても合うように。……言いたいことは、それだけじゃないけど
# speaker: narrator
ヴィオラは上着を受け取って、黙って袖を通した。それから、こちらを振り返った。
# speaker: enemy
その一着、返さなくていいからね。最初から、あなたの袖丈で縫ってたの
# speaker: heroine
# reaction: heroine,exasperated,sweat
……ずるいです
# speaker: enemy
モデルは頼んでないでしょ。服を縫っただけ
# speaker: narrator
そう言うと、ヴィオラはルーカの手を引いて、踊りの輪に入っていった。
{ battle_score >= 3:
    # speaker: enemy
    口上も楽屋も、あなたの言ったとおりだった。……次のショーの台本、書いてくれない？
    # speaker: heroine
    # emotion: smile
    考えとく、です
- else:
    # speaker: enemy
    間違えたところは、みんなで直した。……服と同じね
}
# speaker: narrator
桃色の裾を揺らして、{heroine_name}がこちらへ戻ってきた。頬が、まだ少し赤い。
# speaker: heroine
# emotion: smile
……歩けた
-> END

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
// 港・大理石・洗い場はフィナーレのクイズの答えなので、ここでは言わない。フィナーレの後なら、ショーで自分で決めて歩いたことを一言。
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
    ダルセナで、自分で決めて歩いたでしょ。あれで分かったの。自分で決めたことは、ちゃんと自分のものになるって
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


// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。ショーと踊りの後のダルセナ。
// 2026-11-23 の全面改稿：主人公が撮った「歩く彼女」と、彼女が撮った「集まった人たち」の二枚を見る。いつも撮る係だった彼女が、写真の真ん中にいる。
=== milano_epilogue ===
# scene: epilogue
# background: milano_darsena_finale
# speaker: narrator
踊りの輪がほどけたあと、岸には片づけ損ねた椅子が何脚か残っていた。二人は、そのうちの二脚に並んで座った。
# speaker: narrator
こちらの手には、まだ彼女のカメラがある。画面を開くと、岸の縁を歩く{heroine_name}が写っていた。
# speaker: heroine
わたしが、写ってる。……ちゃんと、真ん中に
# speaker: player
いい顔してる
# speaker: heroine
# reaction: heroine,shy,blush
……そういうことは、カメラを返してから言って
# speaker: narrator
彼女は自分のスマホも開いて、こちらに見せた。岸じゅうの人が、こちらを向いて手を叩いている。
# speaker: heroine
こっちは、わたしが撮ったの。歩いてる途中で、どうしても撮りたくなっちゃって
# speaker: heroine
撮られるのも、撮るのも、今日は両方できた
{
- ending_reached:
# speaker: heroine
# emotion: shy
……ねえ。まだ、音楽が少し残ってる。一曲だけ、踊ってくれる？　恋人の分
- romance_stage >= 3:
# speaker: heroine
# emotion: teasing
さっき、踊りそびれちゃった。……次の曲が始まったら、今度はわたしから誘ってもいい？
- romance_stage == 2:
# speaker: heroine
# emotion: smile
次の旅でも、撮る係、ときどき代わってね
- else:
# speaker: heroine
手伝ってくれて、ありがとう。……いい旅になった
}
# speaker: narrator
運河の水に、岸の灯りが揺れていた。桃色の裾も、いっしょに揺れていた。
-> END
