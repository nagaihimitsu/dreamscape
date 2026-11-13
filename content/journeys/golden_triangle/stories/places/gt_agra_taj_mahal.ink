INCLUDE modules.ink
-> DONE

// タージ・マハルの場所のファイル（新しい書き方への形の移し替え。文は今のまま）。
// バトル（対決）と都市フィナーレは、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_agra_taj_mahal_guide ===
# scene: guide
# background: gt_bg_agra_taj_mahal
# speaker: narrator
タージ・マハルの手前で、車は入れない。二人は電動の小さなバスに乗り換え、手荷物検査の列に並んだ。前の家族が、持ち込めないお菓子を慌てて食べている。
# speaker: heroine
# reaction: heroine,teasing,music
ここで全部食べちゃうんだ。わたしも見習って、心の準備を全部しておこう
# speaker: narrator
赤い砂岩の大きな門をくぐる。暗いアーチの向こうに、白いものが四角く切り取られて見えた。
# speaker: narrator
# photo: gt_album_a05 # photo_caption: 門のアーチからはみ出していく白 # photo_show: large
一歩進むごとに、白がアーチからはみ出していく。最後の一歩で、全体が現れた。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# pause: 700
……あ
# speaker: narrator
{heroine_name}は、しばらく何も言わなかった。言葉が出てこない、という顔だった。
# speaker: heroine
# emotion: neutral
写真と、同じ形なのに。全然、同じじゃない。……大きいのに、浮いてるみたい
# speaker: narrator
まっすぐな水路が、建物まで続いている。水面に、もう一つのタージが逆さに揺れていた。
# speaker: narrator
水路の途中に、白い大理石のベンチ。その前に、記念写真の列が長く伸びている。
# speaker: heroine
# reaction: heroine,smile,question
あのベンチ、写真でよく見るやつだ。みんな、あそこで撮るんだね。……並んでる人、ほとんど二人組
# speaker: narrator
列の脇で、胸ポケットを何度も押さえている青年が、きょろきょろと誰かを探していた。
# speaker: heroine
なんだか、あの人の方が、建物より緊張してるみたい
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_agra_main_taj_mahal_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_agra_main_taj_mahal_battle ===
# scene: battle
# background: gt_bg_agra_taj_mahal
# speaker: narrator
タージ・マハルへ続く長い水路の途中に、白い大理石のベンチがある。記念写真の列が、今日も二十人ほど伸びていた。
# speaker: narrator
列を眺めていた{heroine_name}の前に、青年が飛び出してきた。額に汗。胸ポケットを、何度も手で押さえている。
# speaker: gt_agra_taj_young_man
お願いがあります！　あのベンチを、十分だけ確保してください！
# speaker: heroine
# reaction: heroine,surprised,interrobang
か、確保？
# speaker: enemy
# cutin: name
ニキルです。ラクナウで銀行員をしています。恋人のタンヴィが、今トイレの列に並んでいて。戻ってきたら、あのベンチで指輪を出すんです。三か月前から決めてたんです
# speaker: enemy
写真を撮るはずだった友達が来られなくなって。列に並び直したら、彼女が戻ってきてしまう。お二人がベンチに座って、ゆっくり写真を撮っててくれれば
# speaker: heroine
# reaction: heroine,shy,blush
わたしたちが、あそこに？　二人で？　……ゆっくり？
# speaker: narrator
ニキルは携帯を見せた。プロポーズの手順が三十枚のスライドになっている。七枚目に、ベンチの写真と赤い丸。
# speaker: heroine
# reaction: heroine,exasperated,sweat
スライドまで……。わ、分かりました。ゆっくり、ですね
# speaker: narrator
列の順番が来て、二人はベンチに並んで座った。後ろの視線が痛い。{heroine_name}は、意味もなく三回、髪を直した。
# speaker: narrator
予定より早く、緑のクルタの女性が戻ってきた。タンヴィだ。ベンチの二人と、汗だくの恋人と、彼の胸ポケットを順に見て、彼女はすべてを理解した顔になった。
# speaker: narrator
ニキルが、練習どおりの台詞を始める。
# speaker: enemy
シャー・ジャハーンは、ムムターズをそれほど愛して……
# speaker: narrator
タンヴィが静かに遮った。
# speaker: gt_tanvi
# cutin: name
ねえ、ニキル。ムムターズがどこで、どうやって亡くなったか、知ってる？
-> quiz(1) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: narrator
    タンヴィはうなずいた。
    # speaker: gt_tanvi
    そう。戦の旅の途中で、出産で。何人目の子かは、資料でも十三とか十四とか揺れるの。それくらい、何度も
- else:
    # speaker: narrator
    タンヴィは首を振った。
    # speaker: gt_tanvi
    ブルハーンプル。夫の遠征についていって、出産の途中で。何人目の子かは、資料でも十三とか十四とか揺れるの
}
# speaker: enemy
# reaction: enemy,sweat
で、でも、それだけ愛してたから、こんな建物を、すぐに……
# speaker: narrator
タンヴィは、白いドームを見上げた。怒っているというより、ずっと前から考えていたことを口にする顔だった。
# speaker: gt_tanvi
すぐ、じゃないよ。最初のお墓、どこだったと思う？
# speaker: narrator
ベンチの上で、{heroine_name}は身動きできなかった。立てば、ニキルの計画が終わる。座っていれば、二人の喧嘩の特等席。
-> quiz(2) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: gt_tanvi
    そう。遠くの庭に仮に埋めて、何か月もたってから、ここへ運ばれたの
- else:
    # speaker: gt_tanvi
    ブルハーンプルの庭に、仮に埋められたの。ここへ運ばれたのは、何か月もあと
}
# speaker: enemy
タンヴィ……君は、タージが嫌いなの？
# speaker: gt_tanvi
好きよ。建物としては、世界で一番。でも、ここで求婚されるのは、また別の話
# speaker: heroine
# emotion: serious
……わたしも、ちょっと分かります。きれいだからこそ、自分の話と重ねたくないこともあるのかなって
# speaker: narrator
言ってから、{heroine_name}ははっとした。ニキルの顔が、さらに一段沈んだ。
# speaker: heroine
# reaction: heroine,worried,sweat
ご、ごめんなさい。ニキルさんの三か月を、否定したいわけじゃなくて……
# speaker: narrator
タンヴィは、廟の左右に一つずつ建つ、そっくりな赤い建物を指さした。
# speaker: gt_tanvi
あっちはモスク。じゃあ、反対側のそっくりな方は、何のために建てたと思う？
-> quiz(3) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: gt_tanvi
    そう。釣り合いのため。片方があるから、もう片方が要る。きれいだけど、それだけの役目
- else:
    # speaker: gt_tanvi
    釣り合いのためよ。モスクの写し。きれいだけど、片方のためだけにある
}
# speaker: narrator
タンヴィはニキルに向き直った。
# speaker: gt_tanvi
わたし、誰かの設計図の釣り合いのために置かれる方には、なりたくないの
# speaker: enemy
設計図なんて、僕は……
# speaker: gt_tanvi
スライド三十枚。わたしは一枚も見てない。お母さんは見たのに
# speaker: narrator
# pause: 800
沈黙。{heroine_name}は、ずっと引っかかっていたことを、やっと言葉にした。
# speaker: heroine
タンヴィさんが嫌なのは、タージじゃなくて……一度も、聞かれなかったこと、ですよね
# speaker: narrator
タンヴィは少し驚いた顔をして、それから、ゆっくりうなずいた。
# speaker: enemy
……聞けばよかった。どこで、どうしたいか
# speaker: narrator
ニキルは胸ポケットから手を離した。指輪の箱は、出てこなかった。
# speaker: gt_tanvi
次は、場所から一緒に決めて。そうしたら、答えはたぶん同じだから
{
- battle_score == 3:
    # speaker: enemy
    あなた、三問とも彼女の側の答えでしたね。……僕の味方は、いないのか
- battle_score == 2:
    # speaker: enemy
    二問は彼女の言うとおりでした。残りの一問で、僕を励ましてください
- else:
    # speaker: enemy
    あなたも知らなかったんですね。……よかった。僕だけじゃなかった
}
# speaker: narrator
後ろの列から、拍手とも抗議ともつかない声が上がった。ベンチの番は、とっくに時間切れだった。
# speaker: narrator
二人が立ち上がると、ニキルとタンヴィは並んで、ベンチではなく出口の方へ歩いていった。さっきより、少しだけ近い距離で。
# speaker: heroine
# reaction: heroine,shy,blush
……ねえ。わたしたち、世界で一番ロマンチックなベンチに座っちゃったね。ふりで、だけど
-> END

// ───── 都市フィナーレ。battles/catalog.json の gt_agra_finale_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 【3】頭の札（結果を初めて記録したとき1回当たる）。足した札：アンワルの詫びのペーターを受け取る（アーグラのエピローグで食べ切る）
=== gt_agra_finale_battle ===
# scene: battle
# on_done: item gt_agra_anwar_petha
# background: gt_bg_agra_taj_mahal
# ambience: amb_crowd_outdoor
# speaker: narrator
タージ・マハルの正門の近くに、ひときわ大きな人だかりができていた。真ん中に、白いクルタに銀の握りの杖を持った老ガイドが立っている。
# speaker: narrator
アンワル。この町で一番泣かせるガイド、とホテルの支配人が言っていた。支配人の叔父なのだそうだ。
# speaker: enemy
# cutin: name
そして最後の石が置かれた日。皇帝は命じたのです。二度とこれほどのものを造らせぬよう、二万の職人の手を、切り落とせと
# speaker: narrator
観客から、悲鳴に近い溜め息が漏れた。何人かは本当に目を拭っている。アンワルは満足げに杖を鳴らし、ぐるりと見回して、こちらで目を止めた。
# speaker: enemy
おお、ご覧なさい！　日本から来た新婚のお二人です。愛の記念碑に、愛を誓いに来られた
# speaker: narrator
# se: applause
拍手が起きた。ホテルの花びらの寝台の情報は、町中のガイドに回っていたらしい。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
ち、違います！　わたしたち、新婚じゃ……！
# speaker: enemy
ご覧なさい、この照れよう。タージの前では、誰もが恋に正直になる
# speaker: narrator
笑いと拍手が大きくなる。{heroine_name}の言葉は、そのたびに物語の一部にされていく。
# speaker: narrator
# recall: gt_album_d01
彼女は唇を結んだ。デリーで言われた言葉が、頭の中で聞こえた。言いたいことは、言いなさい。
# speaker: heroine
# emotion: serious
……アンワルさん。その、職人の手を切ったっていう話。本当なんですか
# speaker: narrator
観客が、一斉にこちらを振り向いた。アンワルの笑顔は崩れない。
# speaker: enemy
お嬢さん。この町では、昔からみんながそう語ってきた。それを違うと言うなら、証明できるかね
-> quiz(1) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: heroine
    記録が、ないんです。歴史家の人たちも、根拠のない伝説だって言ってます
- else:
    # speaker: narrator
    観客の中の学生らしい青年が、携帯を見ながら言った。
    # speaker: gt_agra_finale_student
    歴史家は、記録がない伝説だって言ってますよ
}
# speaker: narrator
観客がざわめく。何人かは、がっかりした顔をした。泣いて損をした、という顔だった。
# speaker: enemy
本当のことは、人を泣かせない。泣かない客は、タージを忘れる。わしは四十年、それを見てきた
# speaker: narrator
アンワルは杖を上げた。
# speaker: enemy
日が傾いたら、対岸の庭へ参りましょう。この旅の最後の、とっておきの話は、そこでいたします
# background: gt_bg_agra_mehtab_bagh
# ambience: amb_wind
# speaker: narrator
川を渡ったメヘターブ・バーグの岸辺。夕日に染まるタージが、川向こうに正面から見えた。
# speaker: enemy
皇帝は、この岸に、自分のための黒いタージを建てるつもりだった。白い妃と、黒い皇帝。川を挟んで、永遠に見つめ合うはずだったのです
# speaker: narrator
観客がまた息をのむ。アンワルは横目で、{heroine_name}を見た。今度は何と言う、という目で。
-> quiz(2) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    調べた人たちが見つけたのは、黒い墓の土台じゃなくて、庭でした。タージと、水に映るタージを眺めるための
- else:
    # speaker: narrator
    岸辺の案内板に、調査の結果が書いてあった。見つかったのは墓の土台ではなく、水に映るタージを眺めるための庭だった。
}
# speaker: narrator
アンワルは杖をついたまま、しばらく黙った。それから、観客に向かって両手を広げた。
# speaker: enemy
皆さん、この若いお嬢さんは、わしの話を二つも壊した。では、お願いしよう。あなたの本当の話で、この人たちを泣かせてみなさい
# speaker: narrator
観客が、拍手で彼女を前へ押し出した。逃げ場はない。五十人の目が、こちらを見ている。
# speaker: heroine
# reaction: heroine,worried,sweat
え、わたしが？　む、無理です。人前で話すのは……
# speaker: narrator
声が震えた。けれど、一歩下がりはしなかった。
# speaker: heroine
# emotion: serious
……やってみます。下手でも、本当の話をします
# speaker: enemy
では、聞こう。手を切られなかったというなら、職人たちはそのあと、どこへ行った
-> quiz(3) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    デリーです。皇帝の新しい都。赤いお城と、大きなモスクのある町。……わたしたち、デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
- else:
    # speaker: narrator
    アンワルが代わりに答えた。
    # speaker: enemy
    デリーの新しい都だ。赤い城と、大きなモスク
    # speaker: narrator
    答えてから、彼は自分の口をしまったという顔をした。
    # speaker: heroine
    ……デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
}
# speaker: narrator
観客が静かになった。泣いてはいない。けれど、さっきとは違う顔で、川向こうの白い建物を見ている。
# speaker: enemy
名もない手の話では、人は泣かないよ。人は、名前に泣くんだ
# speaker: heroine
名前、ありますよ。一人だけ、タージに自分の名前を書き残した人がいるんです
# speaker: narrator
アンワルの眉が、わずかに上がった。四十年、聞かれたことのない方向からの話だった。
-> quiz(4) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    書家のアマーナト・ハーン。壁の文字を書いた人です。一六三八年って、日付まで入れて
- else:
    # speaker: enemy
    ……アマーナト・ハーン。書家だ。知っていたとも。わしは、その話をしたことがないだけだ
}
# speaker: narrator
観客の何人かが、川向こうのタージを、目を細めて見つめた。あの白い壁のどこかに、一人の名前がある。
# speaker: heroine
それと、もう一つ、言っておきたいことがあります
# speaker: narrator
{heroine_name}は観客に向き直った。耳が熱い。それでも、声は最初より通っていた。
# speaker: heroine
# reaction: heroine,shy,blush
# photo: gt_album_a66 # photo_caption: 「わたしたちのことは、わたしたちで決めます」
わたしたちは、新婚じゃありません。……でも、二人でここに来たのは、本当です。わたしたちのことは、わたしたちで決めます
# speaker: narrator
# pause: 800
# se: applause
一瞬の静寂。それから、どっと拍手が起きた。さっきの拍手より、ずっと温かい音だった。
# speaker: narrator
アンワルは杖の先で地面を叩き、苦笑いした。
# speaker: enemy
参った。……では、わしの番だ。わしの家がどこか、お嬢さんは知っているかね。タージの南門の外、タージ・ガンジだ。七代、あそこに住んでいる
-> quiz(5) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    タージ・ガンジは、市場と隊商宿の町。最初から、タージの計画の一部だったんですよね
- else:
    # speaker: enemy
    市場と隊商宿だよ。タージの南門の外に、最初から造られた町だ。墓と一緒に生まれた町なんだ
}
# speaker: heroine
# bgm: touching_moments_four
アンワルさん。わたし、今日聞いた中で一番泣けるのは、アンワルさんの話だと思います
# speaker: enemy
わしの？
# speaker: heroine
手を切られた人の話じゃなくて、手を受け継いだ人の話。タージと一緒に生まれた町に、七代、住んでる人の話
# speaker: narrator
アンワルは答えなかった。杖を握る指に、少し力が入った。日が沈み、川向こうのタージが、白から灰色へ変わっていく。
# speaker: enemy
……明日も、わしは手を切る話をするよ。客はあれで泣く。泣いた客は、また来る
# speaker: heroine
# emotion: serious
はい。……そう言うと思ってました
# speaker: enemy
だが、終わりに一つ足そう。壁に名前を残した書家の話と、南門の外の町の話を
{
- battle_score == 5:
    # speaker: enemy
    五つとも、あなたの言うとおりだった。四十年で初めて、話を全部取られた。……悔しいが、いい夕方だった
- battle_score >= 3:
    # speaker: enemy
    いくつかは、わしが守った。だが、大事なところは全部あなたに取られた
- else:
    # speaker: enemy
    答えは半分も合わなかったね。それでも客は、あなたの方を見ていた。話というのは、そういうものだ
}
# speaker: narrator
# item_show: gt_agra_anwar_petha
帰りぎわ、アンワルは甥の支配人に電話をかけ、何か短く言った。それから、二人に紙の箱を差し出した。アーグラ名物の菓子、ペーター。
# speaker: enemy
詫びの印だ。新婚でなくても、甘いものは食べられる
# speaker: heroine
# reaction: heroine,teasing,music
……それは、受け取ります。そこは、譲らないです
-> END
