INCLUDE modules.ink
-> DONE

// ダルセナ（都市フィナーレの会場）の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 都市フィナーレ（travel/milano.json の milano_finale の地点 p_darsena）の前の「ダルセナの一音」、フィナーレ、告白のデート（地図の出来事がダルセナにある）と、エピローグ。

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
岸の階段の途中で、小さなギターを膝にのせた少年がいた。城の中庭のティノだ。今日も親指で弾いている。
# speaker: milano_tino
あ、お城の。……ここ、水の音があるから、間違えても目立たないんだ
# speaker: narrator
ポケットの中で、青いピックの角が指に当たった。
# speaker: heroine
# item_show: blue_pick
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
    わたしは、渡してもいいと思ったけどな。……決めたなら、旅の終わりまでちゃんと持ってて
    -> END

// ───── 都市フィナーレ。battles/catalog.json の milano_city_boss_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_city_boss_01 ===
# scene: battle
# background: milano_darsena_finale
# speaker: narrator
ダルセナの岸に折り畳み椅子と小さな送信機がある。椅子に座ったリヴィオは、膝にパン屑を落としたまま片手を挙げた。
# speaker: enemy
# cutin: name
# reaction: heroine,surprised
一枠だけ空いた。十秒。ミラノを知らない人に何を聴かせる？
# speaker: heroine
先に聞きたいです。誰が、どこで聴いてるの？
# speaker: enemy
小さなネット放送だ。仕事帰りにひとり、飯作りながらひとり。あとは知らない。知らん人の夕飯にお邪魔するんだ
# speaker: player
じゃあ、空腹の音は避けたほうが
# speaker: enemy
あれは朝の番組に取っといた
-> quiz(1) ->
# background: milano_darsena_finale
{ quiz_correct:
# speaker: heroine
昔は、水辺で荷を待つ人がいたんですね
- else:
# speaker: heroine
あの散歩道、昔は港だったんだ。岸で待つ人にも、別の用事があった
}
# speaker: narrator
岸を歩く足音に自転車のベルが重なる。リヴィオは水面にマイクを向けた。
# speaker: enemy
水だけじゃ、ここが何に使われてきたかまでは録れんな
# speaker: heroine
広場だって地下に人がいた。最初の十秒、上ばっかり向いてましたね
-> quiz(2) ->
# background: milano_darsena_finale
{ quiz_correct:
# speaker: heroine
ここからあの広場まで、石も旅をした
- else:
# speaker: heroine
運ばれたのは大聖堂の石。広場の重さを、ここの水が引き受けたんですね
}
# speaker: heroine
荷物を下ろす人の声、録れてたら聴きたいな
# speaker: enemy
ない音をあるとは言えない。代わりに君がそう言えば、聴く人は想像できる
# speaker: narrator
差し出されたマイクを、彼女はまだ受け取らなかった。
-> quiz(3) ->
# background: milano_darsena_finale
{ quiz_correct:
# speaker: heroine
見られる時間の短さにも、絵を守る理由があった
- else:
# speaker: heroine
短い時間ずつ案内するのは絵のため。あの三秒は、自分で持っていよう
}
# speaker: narrator
旧食堂で止めた三秒を、彼女は自分だけで聴いた。消さず、人にも渡さず、鞄へ戻した。
# speaker: heroine
残しておくのと、聴かせるのって、別ですね
# speaker: enemy
放送屋としては残念だが、本人の持ち物だ
-> quiz(4) ->
# background: milano_darsena_finale
{ quiz_correct:
# speaker: heroine
床を空けると、聴く人が踊る人に変わる
- else:
# speaker: heroine
桟敷じゃなく、動かせる平土間の椅子。片づければ、その足で踊れる
}
# speaker: narrator
リヴィオは椅子から腰を上げ、彼女に席を譲った。ポケットからパン屑が落ちる。
# speaker: heroine
# emotion: smile
これ、生放送でしゃべってもいいですか？
# speaker: enemy
# reaction: heroine,teasing
椅子の話はいい。パンの話なら提供料を払ってほしい
# speaker: narrator
彼女が吹き出した。まだスイッチは入っていない。
-> quiz(5) ->
# background: milano_darsena_finale
{ quiz_correct:
# speaker: heroine
水の音の中に、働いていた人の手が見える気がします
- else:
# speaker: heroine
石だからって荷役の道具とは限らない。あの小路では衣服を洗うのが仕事だったんだ
}
# speaker: narrator
指が三、二、一と折れた。彼女は岸に向き直って、マイクを持った。
# speaker: heroine
ミラノのダルセナにいます。隣に、一緒にここまで歩いた人がいます。……ちょっとだけ、聴いていってください
# speaker: narrator
残りは水が岸を打つ音だった。リヴィオは指を下ろした。誰もすぐにはしゃべらなかった。
# speaker: enemy
俺だったら、あの隙間に曲を入れた
# speaker: heroine
知ってます。だから今日は、私が持ってたんです
# speaker: narrator
マイクを返すと、掌に網目がついていた。
{ battle_score >= 3:
# speaker: enemy
番組名、君がつけてよ
# speaker: heroine
「十秒のミラノ」。次は、聴く側でもいいですか？
- else:
# speaker: enemy
俺の番組、また聴いてくれるか。たまに場所を取り違える
# speaker: heroine
その時は、お便りを出します。匿名で
}
-> END

// デート（本筋）「橋の途中で、こちらを向く」。romance/date_catalog.json の milano_confession_01 の storyId がこの knot を指す（地図の出来事はダルセナ、場面はナヴィリオの橋）。
// 2026-11-13 に 1場面1ファイル（stories/dates/milano_date_confession.ink）から移した。文は今のまま。
// 告白のデートでは噛み合いの札（# profile:）と関係値の札を書かない。返事は、デートを始めたときにゲームが関係状態から決めた confession_result で分ける。
// どの選択肢でも思い出 milano_confession_promise（橋の途中で告白したこと）を残す。マウリツィオ教会のデートを遊んでいれば、待ち合わせの話を一言足す。
=== milano_confession_01 ===
# scene: date
# title: 橋の途中で、こちらを向く
# background: milano_night_landmark
# speaker: narrator
ナヴィリオの橋に半分ほど上がったところで、彼女の方から立ち止まった。運河を見ないで、こちらを向いている。
# speaker: heroine
何か言いかけたよね。渡り切る前に聞きたい
{ cond("date milano_maurizio_date_sound"):
    # speaker: heroine
    あの教会で、別々に見て戻ったときも思った。待ち合わせるの、私けっこう好きです
}
* [「恋人として、これからも会いたい」 # option: as_lovers]
    # memory: milano_confession_promise
    # speaker: narrator
    彼女は息を吸って、手すりから手を離した。
* [「好きです。あなたはどう思ってる？」 # option: ask_her_heart]
    # memory: milano_confession_promise
    # speaker: narrator
    彼女は一度だけうなずいた。問いを受け取った、という小さな動きだった。
* [「帰った後の僕の予定に、君がいてほしい。付き合ってほしい」 # option: after_the_trip]
    # memory: milano_confession_promise
    # speaker: narrator
    目の前の人波が切れた。彼女は渡り始めず、その場に残った。
-
{
- confession_result == "accepted":
    # speaker: heroine
    # emotion: shy
    うん。付き合いたい。私、明日何時に会うかまで、さっきから考えてた
    # speaker: player
    何時？
    # speaker: heroine
    # emotion: teasing
    それは恋人に相談します。……あなたなんだけど
    # speaker: narrator
    彼女が先に手を出した。指が重なったところで、ようやく二人は橋の残り半分を渡った。
- confession_result == "deferred":
    # speaker: heroine
    うれしい。だからこそ、その勢いで「うん」って言うのを待って。私はもう少し、自分の言葉で考えたい
    # speaker: player
    分かった。明日は、普通に会える？
    # speaker: heroine
    うん。普通に会いたいっていうのは、いま答えられる
    # speaker: narrator
    先に足を出したのは彼女だった。橋の下で、水が一度だけ石に当たった。
- else:
    # speaker: heroine
    # emotion: serious
    恋人としては、今は会えません。遠回しにすると、あなたに待たせてしまうから
    # speaker: player
    聞かせてくれてありがとう。……少しだけ、ここで休んでいく
    # speaker: heroine
    うん。先に橋の向こうにいるね
    # speaker: narrator
    すぐ隣にいなくても見えるところで、彼女は運河の方を向いた。
}
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。放送の後のダルセナ。
=== milano_epilogue ===
# scene: epilogue
# background: milano_darsena_finale
# speaker: narrator
放送が終わったダルセナで、彼女は左の掌を開いた。さっきの網目はもう消えている。
# speaker: player
最後に自分で話すって、いつ決めた？
# speaker: heroine
あの人が椅子を空けてくれたとき。座ってみたら、水がよく聴こえたから
{
- ending_reached:
# speaker: heroine
# emotion: shy
帰ったら、うちで聴こう。恋人の声って、録ると他人みたいか、試したい
- romance_stage >= 3:
# speaker: heroine
# emotion: teasing
今の話も録りたかった？　もう一回聞いてくれたら、違う答えを言うかも
- romance_stage == 2:
# speaker: heroine
# emotion: smile
次はそっちの好きな音も教えて。十秒、私が黙ってるから
- else:
# speaker: heroine
いまは、マイクなしで少しだけ歩きたいです。一緒にどうですか
}
# speaker: narrator
上着がかすかに鳴った。彼女は袖を押さえなかった。
-> END
