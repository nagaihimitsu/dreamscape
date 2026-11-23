INCLUDE modules.ink
-> DONE

// 『最後の晩餐』（旧食堂）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦と、道中交流。
// 2026-11-22 の改稿：声を休める歌手の兄ニコと、兄の身振りを「訳す」妹イーダ。イーダは兄の「一緒に」（今夜の舞台で一曲だけ一緒に歌おう）を、
// 言い返されないのをいいことに「あと五分」と訳し続けていた。ヒロインは最初に兄の手を勝手に「助けて」と読み違え、次は聞く側に回る。
// 見学の時間と人数が決まっていることは言うが、その理由（フィナーレの第3問の答え：絵を守るため）は言わない。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== last_supper_guide ===
# scene: guide
# background: milano_refectory
# speaker: narrator
旧食堂に入ると、壁いっぱいの絵が目に飛びこんできた。横幅を目で追うだけで、首が動く。
# speaker: narrator
{heroine_name}はスマホを出しかけて、鞄の底にしまった。
# speaker: heroine
ここは録らないで、見ておく。見られる時間が決まってるから、目のほうを使いたいの
# speaker: narrator
隣の男の人が、連れの女性に向かって、指を開いた手のひらを上げた。唇は固く結んだままだ。
# speaker: player
具合、悪いのかな
# speaker: heroine
# emotion: worried
……声が出ないのかも。わたし、ちょっと聞いてくる
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_last_supper_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== milano_last_supper_01 ===
# scene: battle
# background: milano_refectory
# speaker: heroine
あの、大丈夫ですか？　お水、いりますか？
# speaker: narrator
男の人は片手を上げて、首を振った。{heroine_name}がもう一歩寄ると、連れの女性がすっと二人のあいだに入った。
# speaker: enemy
# cutin: name
ありがと、でも平気。兄は今日、声を休めてるの。夜に舞台があるから。私はイーダ。兄の通訳
# speaker: heroine
通訳……？
# speaker: enemy
兄の身振りの通訳。子どものころからやってるの。さっきの手は、私への『あと五分』。お風呂から出ないときも、この手だった
# speaker: narrator
兄は唇を結んだまま、照れくさそうに肩をすくめた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
わたし、『助けて』だと思って……
# speaker: enemy
兄はニコ。歌手よ。ちなみに、本当にあと五分しかないの。ここ、見学の時間が決まってるから
# speaker: narrator
イーダは腕時計をのぞいた。ニコが絵を指さし、それから部屋の左の窓を指さした。
# speaker: enemy
『まぶしい』って
# speaker: narrator
ニコは首を横に振り、もう一度、絵と窓をかわるがわる指した。
-> quiz(1) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    まぶしいんじゃなくて、絵の光と窓の光が同じ向きだって言いたいんじゃないですか。絵の中の部屋が、この部屋の続きに見えるって
- else:
    # speaker: heroine
    絵の光は、この部屋の左の窓から来る光とそろえてあるんだって。……ニコさん、それが言いたかったんじゃないですか
}
# speaker: narrator
ニコは大きくうなずいて、親指を立てた。
# speaker: enemy
……細かいところに気づくのが、昔から好きなのよ、この人
# speaker: narrator
イーダは笑った。けれど、ニコのほうは見なかった。
# speaker: narrator
ニコが、人さし指と中指をそろえて二本の脚にし、並んで歩かせてみせた。その指先を、イーダに向ける。
# speaker: enemy
『もう出よう』
# speaker: narrator
ニコは首を振り、指をもう一度歩かせた。
# speaker: enemy
『トイレ』
# speaker: heroine
……今の、ちょっと違う気がします
# speaker: enemy
兄の言葉は、私がいちばん知ってるの
# speaker: narrator
ニコは指を下ろすと、片腕をイーダのほうへ伸ばした。顔だけは、{heroine_name}のほうを向いている。
# speaker: narrator
壁の絵の中にも、同じ格好をした人がいた。
-> quiz(2) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    マタイと同じ。腕で一人を指して、顔で隣の人たちに『今の、聞いた？』って知らせてる
- else:
    # speaker: heroine
    マタイは、腕をキリストのほうへ伸ばしたまま、顔で隣の人たちに『今の言葉、聞いた？』って知らせてるんだ
}
# speaker: heroine
腕はイーダさんに、顔はわたしに。……ニコさん、『この人にちゃんと聞いてもらって』って、わたしに頼んでます？
# speaker: narrator
ニコは、ゆっくりうなずいた。
# speaker: heroine
# emotion: serious
イーダさん。さっきの指、本当はなんて言ってるんですか
# speaker: narrator
イーダは腕時計を見た。時間を見ているのではないと、すぐに分かった。
# speaker: enemy
……『一緒に』。子どものころ、二人で歌うときの合図
# speaker: enemy
今夜の舞台で、一曲だけ一緒に歌えって言ってるの。音楽学校に受かったのは兄だけ。それから私は、歌う人の横で時計を見る係
# speaker: enemy
今日に限って、この人は声を休めてる。言い返されないから、ずっと『あと五分』って訳してた
# speaker: heroine
……わたしも、いつも写真を撮る側なんです。写るより、そっちのほうが楽で
# speaker: enemy
楽よ。横にいる係は、誰とも比べられないもの
# speaker: narrator
ニコが、イーダの腕時計を指でとん、と叩いた。
# speaker: enemy
分かってる。本番は今夜。考え直してる暇なんてないって言いたいんでしょ
# speaker: heroine
この絵、急がなくてもいい描き方で描かれたんですよね
-> quiz(3) ->
# background: milano_refectory
{ quiz_correct:
    # speaker: heroine
    乾いた壁に描けば、時間をかけて、描きながら直せる。だからレオナルドは、そっちを選んだんだ
- else:
    # speaker: heroine
    乾いた壁に描くと、ゆっくり描いて、あとから直せる。レオナルドは、急がない描き方を選んだんだ
}
# speaker: heroine
歌うかどうか、今ここで決めなくてもいいと思います。……決めるのは、イーダさんだから
# speaker: narrator
係員が、見学の時間の終わりを告げた。三人は、ほかの見学の人たちと一緒に外へ出た。
# speaker: narrator
教会の前の明るい道で、イーダはしばらく黙っていた。
# speaker: enemy
……今夜は、客席で聴く。歌うかどうかは、聴きながら考える。それでいい？
# speaker: narrator
ニコは、指を開いた手のひらを上げた。さっきの『あと五分』の手だ。
# speaker: enemy
……待つってこと？　うちの五分は、たいてい七分だけどね
# speaker: narrator
# leave: enemy
兄妹は向こうの角へ歩いていった。曲がり切るところで、ニコが振り返って手を上げた。
# speaker: narrator
今度は二人とも、その手の意味を決めないで、手を振り返した。
# speaker: heroine
わたし、最初にあの手を、勝手に『助けて』だと思った。……聞けばよかったんだよね、最初から
-> END

// 道中交流「広場の無声映画」（knot の名前 supper_pantomime が交流のID）。
// 『最後の晩餐』の訪問の本筋の後（# priority: +1）：バトルの結果を閉じた後（この場所にデートはないので、いつもバトルの直後）。条件はない。どの選択肢でも完了する。
// バトルの最後に角を曲がった兄妹に、その先でまた会う。声を休める兄ニコが、身振りで夕食を頼む。
// 絵の人物が手と顔の向きで反応を伝えることは scenes/catalog.json の出典（館の解説）。
=== supper_pantomime ===
# scene: encounter
# title: 広場の無声映画
# at: visit last_supper
# priority: +1
# person: milano_ida
# person: milano_last_supper_brother
# background: milano_refectory
# speaker: narrator
角を曲がった先の店の前で、さっきの兄妹が立ち止まっていた。ニコは声を休めたまま、両腕を大きく広げて固まっている。
# speaker: milano_ida
それだと『大きな魚』。……違うの？　夕飯の注文、この人、手でするって言いだして
# speaker: heroine
絵の中の人たちも、声じゃなくて、手と顔の向きで返事してましたね
# speaker: milano_ida
あの人たちは五百年、あの手のままで通じてるからいいのよ
# speaker: narrator
ニコは首を振り、今度は指で四角を描いた。

* [May I try a gesture? # option: act # translation: 身振りを一つ試してもいい？]
    # speaker: narrator
    {heroine_name}が人さし指を立て、くるくる回してみせた。ニコはすぐに、フォークで麺を巻き取る真似で応じた。
    # speaker: heroine
    通じた。食べたいものの話になると、みんな役者なんですね
    -> END

* [What do you actually want for dinner? # option: ask # translation: 本当は夕食に何が食べたいの？]
    # speaker: narrator
    ニコは少し考えてから、両手で大きな丸を作った。
    # speaker: milano_ida
    ……ピザ？　四角って言うから、私が勝手にパスタにしてた
    # speaker: heroine
    当てるより、聞いたほうが早かったね。……今日それ、二回目だ
    -> END

* [Enjoy your dinner together. # option: leave # translation: 二人で夕食を楽しんで。]
    # speaker: narrator
    ニコは指先にキスをして、こちらへ小さく投げた。
    # speaker: milano_ida
    それだけは、通訳がいらないね
    # speaker: heroine
    あれ、いつか自然にやってみたいな
    -> END
