INCLUDE modules.ink
-> DONE

// 『最後の晩餐』（旧食堂）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦と、道中交流。
// 2026-11-23 の全面改稿：ヴィオラのリストの「お客の整理」。時間に厳しい係員ジョヴァンナと、毎週同じ時間に来て、絵を見ずに立ち止まる老婦人アッスンタ。
// 反転（第2問から）：老婦人は係員の母で、娘の働く姿を見るために毎週予約を取っている。勤めて二十年、娘は絵をゆっくり見たことがない。
// 結末：ヒロインの誘いは断られる（フィナーレで、人が押し寄せたときに現れる）。
// 見学の時間と人数が決まっていることは言うが、その理由（フィナーレの第4問の答え：絵を守るため）は言わない。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== last_supper_guide ===
# scene: guide
# background: milano_refectory
# speaker: narrator
旧食堂に入ると、壁いっぱいの絵が目に飛びこんできた。横幅を目で追うだけで、首が動く。
# speaker: narrator
入口には、黒い制服の係員が立っていた。手にはストップウォッチ。見学の時間は決まっていて、一つの組の人数も多くない。
# speaker: narrator
同じ組に、小柄な老婦人がいた。絵の前で立ち止まったまま、絵ではなく入口のほうを見て、にこにこしている。
# speaker: heroine
……あのおばあさん、絵、見てない？
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_last_supper_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 相手は係員ジョヴァンナ。母アッスンタ（milano_assunta）は名札だけの人物。リストの4行目（お客の整理）を見せる。
=== milano_last_supper_01 ===
# scene: battle
# background: milano_refectory
{ not cond("episode milano_duomo_episode") and not cond("episode milano_galleria_episode") and not cond("episode milano_castello_episode"):
    -> milano_last_supper_01_viola ->
}
# speaker: enemy
シニョーラ。立ち止まらないでください。あと五分です
# speaker: narrator
係員が、老婦人の横に来た。手の中で、ストップウォッチがきっちり時を刻んでいる。
# speaker: milano_assunta
# cutin: name
はいはい。アッスンタよ。……ねえ、そこのお嬢さん。この絵って、どっちから光が来てるの？
# speaker: heroine
えっ、わたしですか？
# speaker: narrator
ヴィオラのリストの一行が、頭に浮かんだ。
# speaker: narrator
# letter: note
お客の整理：『最後の晩餐』の係の人は、行列をさばくのが鬼のようにうまい。
# speaker: heroine
……あの係の人だ
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    この部屋の左の窓から来る光と、そろえてあるんです。だから、絵の中の部屋が、この部屋の続きに見える
- else:
    # speaker: enemy
    左の窓です。絵の光は、この部屋の本物の窓とそろえて描かれています。……解説は、わたしの仕事ではありませんが
}
# speaker: milano_assunta
じゃあ、この部屋にいる人も、絵の続きにいるってことね
# speaker: narrator
アッスンタは、また入口のほうを見て、にこにこした。視線の先には、係員しかいない。
# speaker: enemy
# cutin: name
係のジョヴァンナです。見学の人数と時間は決まっています。一人のために延ばすことはできません
# speaker: heroine
少しだけ、待ってあげられませんか
# speaker: enemy
できません。毎日、たくさんの方が、予約したこの時間を待っているんです
# speaker: narrator
アッスンタは片腕を伸ばして、壁の絵を指さした。けれど、顔はやっぱり入口のほうを向いている。
# speaker: narrator
その格好に、見覚えがあった。壁の絵の中に、同じ姿の人がいる。
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    マタイと同じ。腕はキリストのほうへ伸ばして、顔は隣の人たちに向けてる。『今の、聞いた？』って
- else:
    # speaker: heroine
    マタイは、腕をキリストのほうへ伸ばしたまま、顔で隣の人たちに、今の言葉に気づかせようとしてるんだ
}
# speaker: heroine
アッスンタさんも、腕は絵を指してるのに、顔はずっと……
# speaker: narrator
{heroine_name}は、入口の係員を見た。ジョヴァンナは、ストップウォッチから目を上げない。耳が、少し赤かった。
# speaker: heroine
……もしかして、お母さん、ですか
# speaker: milano_assunta
ばれちゃった。毎週、この時間の予約を取ってるの。娘が働いてるところ、ここでしか見られないでしょう
# speaker: enemy
ママ。毎週来ないでって、言ったでしょう
# speaker: milano_assunta
絵を見に来てるのよ。ついでに、娘も
# speaker: enemy
逆でしょう
# speaker: milano_assunta
この子、ここに勤めて二十年。でも、この絵をゆっくり見たことは、一度もないのよ
# speaker: enemy
見る暇なんてありません。わたしが見るのは、時計と、お客さんの背中です
# speaker: heroine
レオナルドは、この絵を、急がなくてもいい描き方で描いたんですよね
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    乾いた壁に描けば、ゆっくり描いて、あとから直せる。急がないための描き方を選んだんだ
- else:
    # speaker: enemy
    乾いた壁に描いたのは、時間をかけて描いて、直せるようにです。……急がないための描き方
}
# speaker: heroine
急がないで描かれた絵なら、一回くらい、急がないで見てもいいと思います。……残りの時間の、ほんの少しだけでも
# speaker: narrator
ジョヴァンナはストップウォッチを見た。それから、ゆっくり顔を上げて、母親の隣に立った。
# speaker: narrator
# pause: 1000
二人は並んで、壁の絵を見上げた。ストップウォッチの数字だけが、静かに進んでいく。
# speaker: narrator
ピッ、と小さな音が鳴った。
# speaker: enemy
……時間です。出口は、こちらです
# speaker: narrator
声はいつもどおり、きっちりしていた。けれど、出口へ向かう組のいちばん後ろを、彼女は母親と腕を組んで歩いた。
# speaker: narrator
出口の手前で、{heroine_name}は思い切って振り返った。
# speaker: heroine
# emotion: serious
ジョヴァンナさん。ダルセナで、服のショーがあるんです。たぶん人がたくさん来て……さばいてくれる人が、いなくて
# speaker: enemy
お断りします。わたしは、持ち場を離れない主義です
# speaker: milano_assunta
この子、仕事が終わったら、家に帰るだけよ
# speaker: enemy
ママ
# speaker: milano_assunta
行列をさばかせたら、この子はミラノでいちばん。……ねえ？
# speaker: narrator
# leave: enemy
ジョヴァンナは答えずに、次の組の扉を開けに戻っていった。ストップウォッチは、もう次の時間を刻んでいる。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……お客の整理は、断られちゃった
-> END

// ヴィオラとの出会い（手伝いの knot）。本筋4回のうち、この回を最初に遊んだときだけ、クイズの頭で流れる（同じ組の見学で、スケッチ帳を落とすヴィオラと会う）。
// ショーとリスト（4つの空欄と心当たり）を見せる。品物は渡さない（クイズの中では品物を渡せないため、リストは # letter: で見せる）。
=== milano_last_supper_01_viola ===
# speaker: narrator
同じ組に、大きな鞄を肩にかけた若い女の人がいた。絵の前で、スケッチ帳に色鉛筆で何かを写している。
# speaker: narrator
係員にじろりと見られて、彼女は慌てて鞄を持ち直した。拍子に、スケッチ帳が床に落ちて、開いた。
# speaker: milano_viola
# cutin: name
ごめんなさい、ごめんなさい……！　あ、踏まないで、それ一冊しかないの
# speaker: heroine
# reaction: heroine,surprised,sweat
は、はい！
# speaker: narrator
{heroine_name}が拾い上げたスケッチ帳には、服の絵がびっしり描いてあった。仕事着みたいに丈夫そうな上着。襟の裏にだけ、細い刺繍の模様が描きこんである。
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
返事をする前に、係員に『立ち止まらないで』とにらまれて、ヴィオラは出口へ小走りで消えていった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……言っちゃった。知らない人に頼みごとするの、いちばん苦手なのに
# speaker: player
手伝うよ
# speaker: heroine
# emotion: smile
うん、ありがとう。……でも、頼むのはわたしがやる。言いだしたの、わたしだから
# speaker: narrator
その係員は、もう別の人の横に立っていた。絵を見ずに立ち止まっている、あの老婦人だ。
->->

// 道中交流「広場の無声映画」（knot の名前 supper_pantomime が交流のID）。
// 『最後の晩餐』の訪問の本筋の後（# priority: +1）：バトルの結果を閉じた後（この場所にデートはないので、いつもバトルの直後）。条件はない。どの選択肢でも完了する。
// 教会の前の段で待つアッスンタが、ガラス戸の向こうで働く娘ジョヴァンナと、身振りで晩ごはんの相談をする。
// 絵の人物が手と顔の向きで反応を伝えることは scenes/catalog.json の出典（館の解説）。
=== supper_pantomime ===
# scene: encounter
# title: 広場の無声映画
# at: visit last_supper
# priority: +1
# person: milano_assunta
# person: milano_giovanna
# background: milano_refectory
# speaker: narrator
教会の前の段に、アッスンタが座っていた。ガラス戸の向こうで働く娘に向かって、身振りで何か伝えている。
# speaker: milano_assunta
晩ごはんの相談。あの子、仕事中は口をきいてくれないから
# speaker: heroine
絵の中の人たちも、声じゃなくて、手と顔の向きで返事してましたね
# speaker: milano_assunta
あの人たちは何百年も、あの手のままで通じてるからいいのよ
# speaker: narrator
ガラスの向こうで、ジョヴァンナが指を七本立てた。
# speaker: narrator
アッスンタが両手で大きな丸を作ると、ジョヴァンナは首を振って、指で四角を描いた。

* [May I try a gesture? # option: act # translation: 身振りを一つ試してもいい？]
    # speaker: narrator
    {heroine_name}が人さし指を立てて、くるくる回してみせた。ガラスの向こうで、ジョヴァンナが小さくうなずいた。
    # speaker: milano_assunta
    パスタね。決まり。……あなた、うちの通訳になる？
    -> END

* [What are you two having for dinner? # option: ask # translation: 二人で、晩ごはんに何を食べるの？]
    # speaker: milano_assunta
    あの子の好きなもの。……あの子の四角はね、ピザのことなの。昔から、丸いピザを四角く描くのよ
    # speaker: heroine
    当てるより、聞いたほうが早いですね
    -> END

* [Enjoy your dinner together. # option: leave # translation: 二人で夕食を楽しんで。]
    # speaker: narrator
    アッスンタは、ガラス戸に向かって投げキスをした。ジョヴァンナはくるりと背を向けたが、耳が赤かった。
    # speaker: heroine
    今のは、通訳がいりませんね
    -> END
