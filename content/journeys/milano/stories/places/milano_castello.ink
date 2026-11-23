INCLUDE modules.ink
-> DONE

// スフォルツェスコ城の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦と道中交流（バトルの後の「弦を一本、余らせて」）。
// 2026-11-23 の全面改稿：ヴィオラのリストの「仕上げ」。ショーの前に姿を消した相棒の仕立て屋ルーカが、城の中庭で一着の上着を縫ってはほどいている。
// 言い訳は「ミケランジェロだって死ぬまで直した」（第2問）。ヒロインは「直しかけの像も、今はまわりから見てもらっている」（第3問）と返す。
// 反転：その上着はヴィオラの寸法の服で、仕上げて渡せば、気持ちを言うことになる。結末は「考えとく」（フィナーレで、ほつれた裾の場面に現れる）。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== castello_sforzesco_guide ===
# scene: guide
# background: milano_castello
# speaker: narrator
スフォルツェスコ城の中庭。煉瓦の壁の前のベンチで、若い男の人が膝に上着を広げ、縫い目を小さな刃でほどいていた。
# speaker: narrator
足もとには、ほどいた糸が、鳥の巣みたいに丸まっている。
# speaker: heroine
せっかく縫ってあるのに……ほどいちゃうのかな
# speaker: narrator
男の人は顔も上げずに、もう一目、糸を切った。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_castello_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// リストの5行目（仕上げ）を見せる。
=== milano_castello_01 ===
# scene: battle
# background: milano_castello
{ not cond("episode milano_duomo_episode") and not cond("episode milano_galleria_episode") and not cond("episode milano_last_supper_episode"):
    -> milano_castello_01_viola ->
}
# speaker: heroine
あの……その上着、もうきれいに縫えてるのに
# speaker: enemy
まだだ。左の肩が、一ミリ落ちてる
# speaker: narrator
彼はまた一目、糸を切った。めくれた襟の裏に、細い刺繍が見えた。ヴィオラの服と、同じ刺繍だ。
# speaker: narrator
# letter: note
仕上げ：相棒のルーカが消えた。あいつは迷うと、城の中庭に行く。
# speaker: heroine
……もしかして、ルーカさん？　ヴィオラさんの
# speaker: enemy
# cutin: name
……あいつに言われて来たのか
# speaker: heroine
いいえ。リストに、迷うとお城の中庭に行くって、書いてあって
# speaker: enemy
あいつ、余計なことを
# speaker: enemy
ショーには出ない。あいつの服は、まだ人に見せられる出来じゃない。俺の仕上げが、追いつかないんだ
# speaker: narrator
ルーカは上着を抱えて立ち上がった。
# speaker: enemy
迷ったときは、あの像を見に行くことにしてる。……ついてきてもいいけど
# speaker: narrator
城の博物館の奥。天井の高い、細長い部屋に、白い石の像が立っていた。寄りそう二人の人の形が、途中で溶けたように見える。
# speaker: enemy
この部屋、昔は何の部屋だったと思う？
-> quiz(1) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    病院、ですよね。病気の兵士たちが、ここで寝てた
- else:
    # speaker: enemy
    病院だよ。病気の兵士たちが、ここで療養してた
}
# speaker: enemy
治るのを待つ部屋だったんだ。……俺も、ここで、自分が治るのを待ってる
# speaker: heroine
どこか、具合が悪いんですか？
# speaker: enemy
縫っても縫っても、まだ足りない気がする病気
# speaker: narrator
ルーカは像を見上げた。
# speaker: enemy
ミケランジェロは、この像を、死ぬまで直してたんだ
-> quiz(2) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    晩年の十年くらい、何度も作り変えた像なんですね
- else:
    # speaker: enemy
    一回で彫ったんじゃない。晩年の十年近く、作り変え続けた
}
# speaker: enemy
だから、俺もまだ直していい。ミケランジェロだって、そうしたんだから
# speaker: heroine
……でも、この像、今は、みんなに見てもらってますよね
-> quiz(3) ->
# background: milano_castello
{ quiz_correct:
    # speaker: heroine
    正面からだけじゃなくて、まわりを歩いて、どこからでも見られる。直してる途中の形のまま
- else:
    # speaker: enemy
    まわりを歩いて見られるように置いてある。……直してる途中の形のまま
}
# speaker: heroine
直しかけのままでも、ここに置いてある。みんな、ぐるっと回って見てる。……それでも、きれいだと思います
# speaker: narrator
ルーカは、黙って像のまわりを一周した。戻ってきたとき、腕の中の上着を、少しだけ強く抱えていた。
# speaker: enemy
……この上着は、ショーの服じゃないんだ
# speaker: enemy
あいつの寸法で作ってる。初めてのショーの日に、渡そうと思って。……三か月、ほどいては縫ってる
# speaker: heroine
どうして、仕上げないんですか
# speaker: enemy
仕上げたら、渡さなきゃいけない。渡したら、何か言わなきゃいけなくなる
# speaker: narrator
{heroine_name}は、言いかけたことを一度飲みこんだ。それから、口を開いた。
# speaker: heroine
# emotion: serious
渡すかどうかは、ルーカさんが決めていいと思います。……でもヴィオラさんは、仕上げてくれる人を待ってます。それは、上着とは別に
# speaker: enemy
……考えとく
# speaker: narrator
# leave: enemy
ルーカは、ほどきかけた糸を一本、指に巻きつけた。今度は、切らなかった。
# speaker: heroine
仕上げは、『考えとく』。……待つしかないね
-> END

// ヴィオラとの出会い（手伝いの knot）。本筋4回のうち、この回を最初に遊んだときだけ、クイズの頭で流れる（ルーカを探しに来たヴィオラから、ルーカが隠れる）。
// ショーとリスト（4つの空欄と心当たり）を見せる。品物は渡さない（クイズの中では品物を渡せないため、リストは # letter: で見せる）。
=== milano_castello_01_viola ===
# speaker: narrator
そのとき、中庭の門から、衣装袋をいくつも抱えた女の人が駆けこんできた。
# speaker: narrator
ベンチの男の人がさっと立ち上がって、{heroine_name}の背中に隠れた。
# speaker: milano_viola
ルーカ！　……いない？　ここにもいないの？
# speaker: narrator
# se: cloth_flap
きょろきょろしながら走ってきた彼女と、{heroine_name}は正面からぶつかった。衣装袋が、いくつも石畳に散らばる。
# speaker: milano_viola
# cutin: name
ごめん、ごめん、ごめん！　拾って、でも踏まないで！　……あ、それ引きずらないで。世界に一着しかないの
# speaker: heroine
# reaction: heroine,surprised,sweat
は、はい！
# speaker: narrator
{heroine_name}が拾い上げたのは、厚い木綿の上着だった。仕事着みたいに丈夫そうなのに、襟の裏にだけ、細い刺繍がある。
# speaker: heroine
……きれい。作業着みたいなのに、裏だけ、すごく丁寧
# speaker: milano_viola
裏に気づいた人、初めて。ヴィオラ。服を作ってる。……作ってるけど、まだ誰にも見せたことがない
# speaker: narrator
ヴィオラは荷物を抱え直すと、{heroine_name}を頭からつま先まで眺めた。
# speaker: milano_viola
ねえ、あなた。モデルやらない？
# speaker: heroine
む、無理です
# speaker: milano_viola
即答。いいね、正直で
# speaker: milano_viola
大きなショーには、全部断られたの。『働く人の服なんて地味すぎる』って。だから、自分でやる。ダルセナの岸で、日暮れに
# speaker: milano_viola
ミラノで働く人の服を、ミラノで働く人に着て歩いてもらうショー。……でも、穴だらけ
# speaker: narrator
ヴィオラは、ポケットから折りたたんだ紙を出して広げた。
# speaker: narrator
# letter: note
音楽：まだ。ドゥオモの前に、昔すごいアコーディオン弾きがいた。今もいる？
# speaker: narrator
# letter: note
モデル：まだ。ガッレリアで五十年、毎日お茶をしてる夫婦がいるらしい。
# speaker: narrator
# letter: note
お客の整理：まだ。『最後の晩餐』の係の人は、行列をさばくのが鬼のようにうまい。
# speaker: narrator
# letter: note
仕上げ：まだ。相棒のルーカが消えた。あいつは迷うと、城の中庭に行く。
# speaker: milano_viola
心当たりは書いたけど、探して回る暇がないの。針が二本しかないのに、穴が四つ
# speaker: narrator
{heroine_name}は紙を見つめたまま、しばらく黙っていた。それから、ゆっくり顔を上げた。
# speaker: heroine
# emotion: serious
モデルは、無理です。でも……旅のあいだに、この人たちに会えたら、声をかけてみます
# speaker: milano_viola
それ、モデルより大変だよ？　ミラノの人は、みんな忙しいから
# speaker: milano_viola
その紙、あげる。四つ埋まったら、ダルセナで会おう
# speaker: milano_viola
最後の一着は、もう縫い始めてるから！　モデルが決まってないだけ！
# speaker: narrator
ヴィオラは中庭をもう一度見回して、ため息をつくと、門のほうへ駆けていった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……言っちゃった。知らない人に頼みごとするの、いちばん苦手なのに
# speaker: player
手伝うよ
# speaker: heroine
# emotion: smile
うん、ありがとう。……でも、頼むのはわたしがやる。言いだしたの、わたしだから
# speaker: narrator
背中のほうで、男の人が小さく息を吐いた。
# speaker: enemy
……行った？
# speaker: heroine
……今の人から、隠れてました？
# speaker: enemy
見つかったら、連れ戻される
# speaker: narrator
彼はベンチに戻ると、何事もなかったように、また縫い目をほどき始めた。
->->

// 道中交流「弦を一本、余らせて」（knot の名前 castello_pick が交流のID）。
// スフォルツェスコ城の訪問の本筋の後（# priority: +1）：城のバトルの結果を閉じた後。条件はない（城にはデートがないので「また今度」もない）。
// 青いピック（ドゥオモの「切れた三本目」でもらう）を持っていれば、ティノに渡すか、持っておく（どちらも完了）。
// 持っていなければ、聴く・尋ねる・通り過ぎる（どれも完了し、フラグ milano_tino_needs_pick を立てる。後でピックをもらったら、フィナーレの前のダルセナで渡せる）。
// 城が砦から宮廷の住まいへ、今は博物館や図書館の入る場所になったことは scenes/catalog.json の出典。
=== castello_pick ===
# scene: encounter
# title: 弦を一本、余らせて
# at: visit castello_sforzesco
# priority: +1
# person: milano_tino
# background: milano_castello
# speaker: narrator
城の中庭の端で、男の子が小さなギターを抱えていた。親指に絆創膏を巻き直しては、同じ和音を弾いている。
# speaker: milano_tino
# cutin: name
ここ、音が壁に当たって返ってくるんだ。家だと、隣の人が壁を叩き返してくるけど
# speaker: heroine
お城の中で練習していいの？
# speaker: milano_tino
もとは砦で、そのあと宮廷の住まいだったんだって。今は博物館と図書館が入ってるから、中庭は誰でも歩ける。ぼくみたいなのでも
# speaker: narrator
開いたケースの内張りに、青い三角の跡だけが残っていた。
{ cond("item blue_pick held"):
    # speaker: heroine
    # item_out: blue_pick
    ……ノラさんのピック、あの跡と同じ形だ
    -> castello_pick_with_pick
- else:
    # speaker: heroine
    あの跡、何が入ってたんだろう。……聞いたら悪いかな
    -> castello_pick_without_pick
}

// ピックを持っているとき（渡す・一音を頼む・持っておく）。
=== castello_pick_with_pick ===
* [Would this pick fit your hand? # option: give # translation: このピック、手に合いそう？]
    # give: blue_pick milano_tino
    # speaker: narrator
    ティノは弦を一本だけ弾いた。
    # speaker: milano_tino
    うわ。自分の指だと、こんなに強く弾けなかった
    # speaker: narrator
    中庭の壁から、細く音が返ってきた。
    # speaker: heroine
    最初に鳴らしたのが一音なの、いいね
    -> END

* [Could you play one note with this? # option: ask # translation: これで一音弾いてくれる？]
    # give: blue_pick milano_tino
    # speaker: milano_tino
    曲じゃなくて一音なら、外しようがないね
    # speaker: narrator
    豪快に隣の弦をはじいて、本人がいちばん驚いた。
    # speaker: heroine
    今のがいい。二回目は、きっと違う音になっちゃうから
    # speaker: narrator
    ピックは、そのままティノの指に残った。
    -> END

* [I'll hold on to it for now. # option: keep # translation: 今は自分で持っておくよ。]
    # speaker: narrator
    彼女はケースの青い跡に落ちた葉を払い、ティノに目で挨拶した。ピックは、まだ手もとにある。
    # speaker: heroine
    渡すなら、あの子がほしいって言ってからでもいいよね
    -> END

// ピックを持っていないとき（聴く・尋ねる・通り過ぎる）。どれも、後でダルセナで渡せるようにフラグを立てる。
=== castello_pick_without_pick ===
* [Can I listen for a while? # option: listen # translation: しばらく聴いていてもいい？]
    # set: milano_tino_needs_pick
    # speaker: narrator
    ティノは同じ和音を三回弾いた。三回目だけ、壁からの返事が少し遅れた。
    # speaker: milano_tino
    今の、聞こえた？　お城が一拍おくれて弾くんだ
    # speaker: heroine
    聞こえた。……壁が相棒なんだね
    -> END

* [Did something use to sit in that case? # option: wonder # translation: そのケース、何か入ってたの？]
    # set: milano_tino_needs_pick
    # speaker: milano_tino
    青いピック。ドゥオモの前で弾いてる人にもらったんだけど、どこかに落とした。親指でも弾けるし
    # speaker: narrator
    絆創膏の下の親指は、少し赤かった。
    # speaker: heroine
    ……そっか。見かけたら、覚えておくね
    -> END

* [Let's not interrupt him. # option: pass # translation: 邪魔しないでおこう。]
    # set: milano_tino_needs_pick
    # speaker: narrator
    二人は中庭の反対側を回った。背中のほうで、和音が一つ、壁に当たって返ってきた。
    -> END
