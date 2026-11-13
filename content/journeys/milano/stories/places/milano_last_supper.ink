INCLUDE modules.ink
-> DONE

// 『最後の晩餐』（旧食堂）の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// 観光案内、通常戦と、特殊戦B・C（どちらも旧食堂が舞台）、道中交流。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== last_supper_guide ===
# scene: guide
# background: milano_refectory
# speaker: narrator
旧食堂に入った瞬間、絵の横幅を目で追うだけで首が動いた。{heroine_name}はスマホを出しかけて、鞄の底にしまう。
# speaker: heroine
今日はあとで録ります。ここで、私が何を言いそうになったか
# speaker: narrator
隣の男が手のひらを少し開いた。連れの女性が男の手から、自分の手首へと目を移す。
# speaker: player
知ってる合図？
# speaker: heroine
いいえ。でも、あの人に何か必要なら……
# speaker: narrator
声をかける前に、女性が首を振った。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_last_supper_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_last_supper_01 ===
# scene: battle
# background: milano_refectory
# speaker: heroine
お水、いりますか？
# speaker: narrator
男は片手を上げた。彼女がもう一歩寄ると、連れの女性が二人の間に入った。
# speaker: enemy
# cutin: name
# reaction: heroine,surprised
兄には声を休める約束があるの。夕方、小さな舞台が一本。聞き返されると、この人は絶対しゃべっちゃう
# speaker: narrator
兄は唇を結んだままうなずいた。
# speaker: heroine
あの手、助けてっていう意味かと……
# speaker: enemy
# reaction: heroine,shy
それ、私に「あと五分」の手。子どもの頃、風呂から出ないときも同じ手だった
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
描いた光が、こちらの壁まで届いたみたい
- else:
# speaker: heroine
ランプを探してた。こっちの部屋の窓と、絵の光を合わせたんですね
}
# speaker: narrator
妹は腕時計を外し、兄の手にのせた。兄は時刻を見ず、時計を持ったまま絵を見た。
# speaker: heroine
あれじゃ、何時に出たらいいか分からないよね
# speaker: player
見てほしいのは、そっちじゃないのかも
# speaker: narrator
彼女は助け舟を出しかけて、絵の中の人の手を見た。
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
顔が向く先と腕が指す先、両方いるんだ
- else:
# speaker: heroine
手だけ見たから読み違えた。マタイは隣の人にも、あの言葉に気づいてほしかったんだ
}
# speaker: heroine
同じ手でも、誰に向けたかで違うんですね
# speaker: enemy
うちの五分はたいてい七分。それは絵を見ても分かんないよ
# speaker: narrator
兄の肩が一度だけ上がった。声を出さずに笑って、時計を妹に返した。
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
# speaker: heroine
描きながら変えられる時間を選んだんですね
- else:
# speaker: heroine
乾いた壁を選んだのは、急がずに手を入れられるから。絵を前に立ち止まるのは、見る人だけじゃなかったんだ
}
# speaker: narrator
外へ出ると、彼女は録音を始めた。三秒で止めた。
# speaker: heroine
さっき、あの人の静かな時間を、私がいい話にして持って帰ろうとした。なんて言えばいいかな
# speaker: player
三秒のままでも、いいんじゃない
# speaker: narrator
兄妹は向こうの角を曲がった。曲がり切るところで兄が手を上げた。今度は二人とも、意味を決めずに手を振り返した。
-> END

// ───── 特殊戦B（矛盾追及）。battles/catalog.json の milano_last_supper_b01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張・追及は手伝いの knot milano_last_supper_b01_claim、milano_last_supper_b01_press（knot の名前＋_claim・_press）。
// Phase 6 / B型。証拠の判定と英語3択はJSON・TypeScript側。
// claimは証拠帳でも繰り返し参照する、短い日本語の主張。
=== milano_last_supper_b01 ===
# scene: battle
# background: milano_refectory
# speaker: narrator
『最後の晩餐』の前で、男が帳簿に「同上」の印を押していた。まだ一行目だった。
# speaker: enemy
原因はひとつ。それ以外は、原因を増やしたがる人間のせいだ
# speaker: heroine
……もう二つ、ありませんか
# speaker: narrator
男は印を押す手を止めず、帳簿を少し遠ざけた。
# speaker: enemy
ニーノ・ウニコ。世界を、一つの原因欄に収める男だ。この絵の傷みも、レオナルドの技法で片付く
実験などしなければよかった。まずは、その妙な描き方に何の得があったか聞こう
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    ゆっくり直せる……私の帳簿には、やり直す欄がない
    # speaker: heroine
    余白は、ありますよ
    # speaker: enemy
    それは将来の『同上』のために確保してある！
- else:
    # speaker: enemy
    乾いた下地なら、時間をかけて細部を直せる。湿った漆喰が乾く前に描く方法とは違う
    もっとも、私は間違えた行も『同上』で押し切る。修正時間はゼロだ
    # speaker: heroine
    ……間違いは、残るんですね
}
# speaker: narrator
ニーノは、絵の傷みを指でひとまとめにした。空中に、大きな丸ができた。
-> milano_last_supper_b01_claim ->
// 矛盾追及の導入。証拠や結論を先に明かさない。
# background: milano_refectory
# speaker: heroine
# emotion: surprised
待って。本当に、全部が同じ理由なんですか？
# emotion: serious
一つでも違う出来事が見つかれば、その説明は揺らぎますよね
# emotion: neutral
わたしも気になる。資料を一緒に見直してみましょう
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> milano_last_supper_b01_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: milano_refectory
    # speaker: enemy
    その資料で、別の原因による損傷が示せるかね？　私の大きな丸は、まだ消せん
    # speaker: heroine
    構図の説明だけでは足りないみたい。傷んだ場所と、そこで後から起きた出来事を比べてみよう
    -> stop
}
# background: milano_refectory
# speaker: narrator
ニーノは差し出された資料を見て、押しかけた「同上」の印を宙に浮かせた。
# speaker: enemy
……その資料は受け取ろう。ただし、反論はまだだ。私の『すべて』に、どう関わる？
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    十七世紀の出入口の拡張……絵の具が弱いのと、壁を広げて通るのは、別の出来事か
    原因欄が二つ要る。困った。私の定規は、縦線を引いたことがない
    # speaker: heroine
    横に持っているから、だと思います
- else:
    # speaker: enemy
    扉が後から広げられた。それは技法とは別の損傷だ。だが、絵の具が丈夫だった証明にもならん
    # speaker: narrator
    ニーノは自分の説明を聞き、帳簿と絵を交互に見た。
    # speaker: enemy
    ……待て。今、私が原因を二つに分けたのか
}
# speaker: enemy
では現在の保存だ。原因を分けて考えると、何を守る手が増える？
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    湿気や微粒子を減らす。過去の扉は戻せなくても、今の空気には手を打てる……
- else:
    # speaker: enemy
    空気の管理と入場制限で、湿気や微粒子の負担を減らす。熱く乾かせば済む話ではないのだな
}
{
- battle_score == 3:
    # speaker: narrator
    ニーノは定規を九十度回し、原因欄を二つに分けた。三つ目の余白も残した。
    # speaker: enemy
    訂正しよう。原因を一つにしても、問題は一つも減っていなかった
    この『同上』の印は……同じ原因だと調べた後に押す。仕事が増えたぞ
    # speaker: heroine
    そのほうが、印も落ち着きそう
    # speaker: narrator
    彼は印にふたをして去った。今日、初めて押さずに済んだ欄が残った。
    # speaker: heroine
    空欄って、放っておくことだけじゃないんだね。まだ決めない、ってこともある
- battle_score == 2:
    # speaker: enemy
    君たちにも一つ見落としがあった。だが、私の『全部同じ』は持ち帰れん
    # speaker: narrator
    ニーノは原因欄の横に「ほかは？」と小さく書いた。
    # speaker: enemy
    新しい部署だ。担当者は、ひとまず私だ
    # speaker: narrator
    帳簿を閉じてから、彼はもう一度だけ開き、疑問符を大きくした。
    # speaker: heroine
    ……あの人の帳簿、急に続きが気になってきた
- else:
    # speaker: enemy
    私の『すべて』が残った！　原因は私の――
    # speaker: narrator
    ニーノは言いかけて、口をつぐんだ。帳簿の「同上」を見つめている。
    # speaker: enemy
    いや、君たちの見落としもある。まずい。残った理由まで一つにできない
    次までに、欄を増やしておく。……帳簿を買い直すほどではないはずだ
    # speaker: narrator
    去り際、彼は予備の鉛筆を取り出した。印はポケットに入ったままだった。
    # speaker: heroine
    悔しい。でも、わからないところを『同上』にはしたくないね。私も、もう一度読んでみる
}
-> END

=== milano_last_supper_b01_claim ===
# background: milano_refectory
# speaker: enemy
この絵の損傷は、すべてレオナルドの実験的な絵画技法が原因だ。中央の下部まで、例外はない！
->->

=== milano_last_supper_b01_press ===
# background: milano_refectory
# speaker: enemy
『すべて』だ。絵の具が弱かった。それで上から下まで説明できる。後から起きたことなど、備考で十分！
# speaker: heroine
……その備考に、原因欄へ移したほうがいい出来事はありませんか
->->

// ───── 特殊戦C（証拠連結）。battles/catalog.json の milano_last_supper_c01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。主張は手伝いの knot milano_last_supper_c01_claim（knot の名前＋_claim）。
// Phase 6 / C型。観察できる配置と、その働きの解釈を区別する。
// 正しい証拠二枚を選んでも、結論は英語3択でプレイヤーが答える。
=== milano_last_supper_c01 ===
# scene: battle
# background: milano_refectory
# speaker: narrator
男が一枚のメモを二枚に切った。片方には名前、もう片方には名字が書いてある。
# speaker: enemy
エットレ。……セパラート。別々に覚えてくれ。隣同士にすると、すぐ仲間だと思われる
# speaker: heroine
同じ人の名前では……
# speaker: enemy
だから困る！　パンとチーズも、隣に置くと勝手にサンドイッチを名乗る。私は仕切りを入れる
# speaker: narrator
彼の手帳には、ページより多くの仕切りが挟まっていた。
# speaker: enemy
この絵も一つずつ見る。まず人物だ。線や壁の都合を持ち込まず、並び方だけ確かめたまえ
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    三人ずつ四組。よし、四つの封筒に分けられる
    # speaker: heroine
    ……中央の人は？
    # speaker: enemy
    別便だ。封筒同士が話し始める前に、次へ行くぞ
- else:
    # speaker: enemy
    左右に六人ずつだが、その中でも三人ずつに分かれる。全部で四組だ
    # speaker: heroine
    まとまりを見分けるには、隣の人も見るんですね
    # speaker: narrator
    エットレは手帳に仕切りを一枚足した。返事の代わりらしかった。
}
# speaker: enemy
今度は部屋だ。人物とは別のページを使いたまえ
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    絵の部屋が、実際の食堂の続きに見える……壁が仕切りの仕事をしていない！
    # speaker: heroine
    私は、その続いて見える感じが好きです
- else:
    # speaker: enemy
    遠近法や光で、描かれた空間が実際の食堂の続きに見える。別の箱に収まった小さな絵、ではないのだ
    ……説明したら、私まで壁の向こうへ招かれた気がしてきた
    # speaker: heroine
    お断りするほどのことでは、ないと思います
}
# speaker: enemy
部屋と部屋なら、例外として認めよう。だが、人物の並びと、天井の線は別々だ
# speaker: narrator
エットレは二枚のメモの間に、最後の仕切りを立てた。
-> milano_last_supper_c01_claim ->
// 証拠連結の導入。証拠や結論を先に明かさない。
# background: milano_refectory
# speaker: heroine
# emotion: surprised
えっ、並びと奥行きは無関係？　本当にそうかな
# emotion: serious
別々に見るだけでは、見落とすことがあるかもしれません
# emotion: smile
二つの資料を、並べて確かめてみましょう！
- (stop)
-> reasoning ->
{ evidence_result == "failure":
    # background: milano_refectory
    # speaker: enemy
    二枚あるだけなら、私の名前と名字でもよいだろう。絵の中で、何がつながる？
    # speaker: heroine
    人物がどうまとまるか。線がどこへ向かうか。その二つを比べられる資料が、まだ揃っていないみたい
    -> stop
}
# background: milano_refectory
# speaker: narrator
エットレは二枚の資料を並べ、仕切りを少しずらした。絵を見上げてから、また資料に目を戻す。
# speaker: enemy
……この二枚なら、比較はできる。だが、机の上で隣り合っただけでは結論にならん。何が読み取れる？
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: enemy
    人物のまとまりと、頭部へ集まる線。違う仕組みで、中央への注意を強めると読める……
    無関係として片付けたのは早かった。だが、作者の頭の中を読んだことにはならんぞ
    # speaker: heroine
    うん。見えるものから、そう考えられる、という話ですね
- else:
    # speaker: enemy
    二枚は、中央への注意を強める構図だと読む手がかりになる。だが、使徒を見せたくなかったという作者の気持ちまでは証明できん
    # speaker: heroine
    つなげて考えるのと、何でも言い切るのは、別なんですね
}
{
- battle_score == 3:
    # speaker: narrator
    エットレは最後の仕切りを抜いた。倒れると思った二枚のメモは、そのまま残った。
    # speaker: enemy
    認めよう。一人ずつ見るために、関係を全部切っていた。だが、隣に誰がいるかも、その人の見え方に関わるのだな
    帰ったらパンとチーズを……一度、同じ皿に乗せる。名前は食べてから決める
    # speaker: heroine
    おいしかったら、仕切りには内緒ですね
    # speaker: narrator
    エットレは二枚の名札を重ねて持ち、出口へ向かった。
    # speaker: heroine
    ……{player_address}。私、三人ずつの表情も、もう少し見たくなった。中央を見たら、周りも気になった
- battle_score == 2:
    # speaker: enemy
    見落としは一つ。だが、無関係だと決めつけた私の仕切りは、もう立たない
    # speaker: narrator
    エットレはメモの間に、細い矢印を描いた。
    # speaker: enemy
    仮の橋だ。両側をちゃんと見てから渡る。……通行料は取らん
    # speaker: narrator
    彼は手帳を閉じた。今日は初めて、すんなり閉じた。
    # speaker: heroine
    一枚減っただけなのに、ずいぶん持ちやすそうになったね
- else:
    # speaker: enemy
    私の仕切りは立ったままだ。だが、関係なしの判は押せなくなった
    # speaker: narrator
    エットレは二枚のメモを別々の封筒に入れた。少し考えて、封筒同士をクリップで留めた。
    # speaker: enemy
    判定保留。次は、私も二枚まとめて持ってくる
    # speaker: heroine
    ……持ち方は、もう変わったんですね
    # speaker: narrator
    彼はクリップを見ないようにして去った。{heroine_name}は、残った絵をゆっくり見直した。
    # speaker: heroine
    私たちも、答えを急いだかも。二つとも読んで、どこまで言えるか考えたいね
}
-> END

=== milano_last_supper_c01_claim ===
# background: milano_refectory
# speaker: enemy
人の並びと、部屋の奥行きは無関係だ。二つの資料で、この絵の見え方について何か言えるかね？
->->

// 道中交流「広場の無声映画」（knot の名前 supper_pantomime が交流のID）。
// 今は起こらない：条件『最後の晩餐を終えた』（頭の # when: episode …）は、最後の晩餐のバトルを終えると満たす。その後は交流が始まる観察がない。
// バトルを終えると、最後の晩餐は地図の行き先に出なくなる。バトルの画面（結果の画面も）から観察に戻れるが、バトルの途中なので交流は始まらない。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
// 2026-11-13 に 1場面1ファイル・encounters/catalog.json・entry-rules.json からこの場所のファイルへ移した。観察で「進む」を押した後（# priority: after observe）に始まり、終わると観察に戻る。起こる時・順・選択の働き（お金・品物・「また今度」）は前と同じ。
=== supper_pantomime ===
# scene: encounter
# title: 広場の無声映画
# at: visit last_supper
# priority: after observe
# when: episode milano_last_supper_episode
# background: milano_refectory
# speaker: narrator
グラツィエ教会前で、イーダが両腕を伸ばして静止した。兄が首を振る。
# speaker: milano_last_supper_brother
ちがう、それだと『大きな魚』！
# speaker: milano_last_supper_brother
今日の声は店じまい。あとは妹が代わりに晩ご飯を注文する
# speaker: narrator
どうやら、見本を見せるために一言だけ解禁したらしい。

* [May I try a gesture? # option: act # translation: 身振りを一つ試してもいい？]
    # speaker: narrator
    指を一本立て、くるくる回した。兄はフォークを巻き取る真似で応じた。
    # speaker: heroine
    通じた。食べたいものの話になると、みんな役者なんですね
    -> END

* [What do you actually want for dinner? # option: ask # translation: 本当は夕食に何が食べたいの？]
    # speaker: narrator
    兄は両手で丸を作った。
    # speaker: milano_ida
    ……ピザ？　さっき魚じゃないって言ってたから、私が勝手にパスタにした
    # speaker: heroine
    当てるのが上手な人ほど、聞くのを忘れるのかも
    -> END

* [Enjoy your dinner together. # option: leave # translation: 二人で夕食を楽しんで。]
    # later
    # speaker: narrator
    兄は指にキスをして、こちらへ小さく投げた。
    # speaker: milano_ida
    それだけは通訳がいらないね
    # speaker: heroine
    あれ、私もいつか自然にやってみたい
    -> END
