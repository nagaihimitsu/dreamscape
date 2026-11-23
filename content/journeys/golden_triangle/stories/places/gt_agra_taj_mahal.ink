INCLUDE modules.ink
-> DONE

// タージ・マハルの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）と都市フィナーレは、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_agra_taj_mahal_guide ===
# scene: guide
# background: gt_bg_agra_taj_mahal
# speaker: narrator
タージ・マハルの手前で、車は入れない。二人は電動の小さなバスに乗り換え、手荷物検査の列に並んだ。前の家族が、持ち込めないお菓子を慌てて食べている。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_taj_mahal_guide_001
ここで全部食べちゃうんだ。わたしも見習って、心の準備を全部しておこう
# speaker: narrator
# photo: gt_album_a008 # photo_caption: 暗いアーチの向こうの、四角い白
赤い砂岩の大きな門をくぐる。暗いアーチの向こうに、白いものが四角く切り取られて見えた。
# speaker: narrator
# photo: gt_album_a05 # photo_caption: 門のアーチからはみ出していく白 # photo_show: large
一歩進むごとに、白がアーチからはみ出していく。最後の一歩で、全体が現れた。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# pause: 700
# voice: gt_agra_taj_mahal_guide_002
……あ
# speaker: narrator
# emotion: surprised
# photo: gt_album_a009 # photo_caption: 「……あ」と立ち尽くす
{heroine_name}は足を止めたまま、しばらく何も言わなかった。
# speaker: heroine
# emotion: neutral
# voice: gt_agra_taj_mahal_guide_003
写真と、同じ形なのに。全然、同じじゃない。……大きいのに、浮いてるみたい
# speaker: narrator
# photo: gt_album_a010 # photo_caption: 水路に揺れる逆さのタージ
まっすぐな水路が、建物まで続いている。水面に、もう一つのタージが逆さに揺れていた。
# speaker: narrator
水路の途中に、白い大理石のベンチ。その前に、記念写真の列が長く伸びている。
# speaker: heroine
# reaction: heroine,smile,question
# voice: gt_agra_taj_mahal_guide_004
# photo: gt_album_a011 # photo_caption: 二人組ばかりのベンチの列
あのベンチ、写真でよく見るやつだ。みんな、あそこで撮るんだね。……並んでる人、ほとんど二人組
# speaker: narrator
列の脇で、胸ポケットを何度も押さえている青年が、きょろきょろと誰かを探していた。
# speaker: heroine
# voice: gt_agra_taj_mahal_guide_005
なんだか、あの人の方が、建物より緊張してるみたい
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_agra_main_taj_mahal_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_agra_main_taj_mahal_battle ===
# scene: battle
# background: gt_bg_agra_taj_mahal
# speaker: narrator
# leave: enemy
タージ・マハルへ続く長い水路の途中に、白い大理石のベンチがある。記念写真の列が、今日も二十人ほど伸びていた。
# speaker: narrator
列に並んでいた{heroine_name}の前に、青年が飛び出してきた。額に汗。胸ポケットを、何度も手で押さえている。
# speaker: gt_agra_taj_young_man
# voice: gt_agra_main_taj_mahal_battle_nikhil_001
お願いがあります！　あのベンチを、十分だけ確保してください！
# speaker: heroine
# reaction: heroine,surprised,interrobang
# voice: gt_agra_main_taj_mahal_001
か、確保？
# speaker: enemy
# cutin: name
# voice: gt_agra_main_taj_mahal_battle_nikhil_002
ニキルです。ラクナウで銀行員をしています。恋人のタンヴィが、今トイレの列に並んでいて。戻ってきたら、あのベンチで指輪を出すんです。三か月前から決めてたんです
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_003
写真を撮るはずだった友達が、来られなくなって。僕が並び直したら、その間に彼女が戻ってきてしまう
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_004
お二人で、恋人同士みたいに、ベンチでゆっくり写真を撮っていてくれませんか。彼女が戻ったら、代わってください
# speaker: heroine
# reaction: heroine,shy,blush
# voice: gt_agra_main_taj_mahal_002
わたしたちが、あそこに？　二人で？　……ゆっくり？
# speaker: narrator
ニキルは携帯を見せた。プロポーズの手順が三十枚のスライドになっている。七枚目に、ベンチの写真と赤い丸。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_main_taj_mahal_003
スライドまで……。わ、分かりました。ゆっくり、ですね
# speaker: narrator
列の順番が来て、二人はベンチに並んで座った。後ろの視線が痛い。{heroine_name}は、意味もなく三回、髪を直した。
# speaker: narrator
# together: enemy gt_tanvi
予定より早く、緑のクルタの女性が戻ってきた。タンヴィだ。ベンチの二人と、汗だくの恋人と、彼の胸ポケットを順に見て、彼女はすべてを理解した顔になった。
# speaker: narrator
ニキルが、練習どおりの台詞を始める。皇帝が亡き妃のために建てた、この白い墓の話からだ。
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_005
# term: gt_term_shah_jahan
シャー・ジャハーンは、ムムターズをそれほど愛して……
# speaker: narrator
タンヴィが静かに遮った。
# speaker: gt_tanvi
# cutin: name
# voice: gt_agra_main_taj_mahal_battle_tanvi_001
# term: gt_term_mumtaz_mahal
ねえ、ニキル。ムムターズがどこで、どうやって亡くなったか、知ってる？
-> quiz(1) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: narrator
    タンヴィはうなずいた。
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_002
    そう。戦の旅の途中で、出産で。何人目の子かは、資料でも十三とか十四とか揺れるの。それくらい、何度も
- else:
    # speaker: narrator
    タンヴィは首を振った。
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_003
    ブルハーンプル。夫の遠征についていって、出産の途中で。何人目の子かは、資料でも十三とか十四とか揺れるの
}
# speaker: enemy
# reaction: enemy,sweat
# voice: gt_agra_main_taj_mahal_battle_nikhil_006
で、でも、それだけ愛してたから、こんな建物を、すぐに……
# speaker: narrator
タンヴィは、白いドームを見上げた。声を荒らげはしなかった。ずっと前から、言う順番を決めていたように。
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_004
すぐ、じゃないよ。最初のお墓、どこだったと思う？
# speaker: narrator
ベンチの上で、{heroine_name}は身動きできなかった。立てば、ニキルの計画が終わる。座っていれば、二人の喧嘩の特等席。
-> quiz(2) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_005
    そう。遠くの庭に仮に埋めて、何か月もたってから、ここへ運ばれたの
- else:
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_006
    ブルハーンプルの庭に、仮に埋められたの。ここへ運ばれたのは、何か月もあと
}
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_007
タンヴィ……君は、タージが嫌いなの？
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_007
好きよ。建物としては、世界で一番。でも、ここで求婚されるのは、また別の話
# speaker: heroine
# emotion: serious
# voice: gt_agra_main_taj_mahal_004
……わたしも、ちょっと分かります。きれいだからこそ、自分の話と重ねたくないこともあるのかなって
# speaker: narrator
# emotion: surprised
# reaction: enemy,gloom
言ってから、{heroine_name}ははっとした。ニキルの顔が、さらに一段沈んだ。
# speaker: heroine
# reaction: heroine,worried,sweat
# voice: gt_agra_main_taj_mahal_005
ご、ごめんなさい。ニキルさんの三か月を、否定したいわけじゃなくて……
# speaker: narrator
タンヴィは、廟の左右に一つずつ建つ、そっくりな赤い建物を指さした。
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_008
あっちはモスク。じゃあ、反対側のそっくりな方は、何のために建てたと思う？
-> quiz(3) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_009
    そう。釣り合いのため。片方があるから、もう片方が要る。きれいだけど、それだけの役目
- else:
    # speaker: gt_tanvi
    # voice: gt_agra_main_taj_mahal_battle_tanvi_010
    釣り合いのためよ。モスクの写し。きれいだけど、片方のためだけにある
}
# speaker: narrator
タンヴィはニキルに向き直った。
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_011
わたし、誰かの設計図の釣り合いのために置かれる方には、なりたくないの
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_008
設計図なんて、僕は……
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_012
スライド三十枚。わたしは一枚も見てない。あなたのお母さんは見たのに
# speaker: narrator
# pause: 800
沈黙。{heroine_name}は、ずっと引っかかっていたことを、やっと言葉にした。
# speaker: heroine
# voice: gt_agra_main_taj_mahal_006
タンヴィさんが嫌なのは、タージじゃなくて……一度も、聞かれなかったこと、ですよね
# speaker: narrator
タンヴィは少し驚いた顔をして、それから、ゆっくりうなずいた。
# speaker: enemy
# voice: gt_agra_main_taj_mahal_battle_nikhil_009
……聞けばよかった。どこで、どうしたいか
# speaker: narrator
ニキルは胸ポケットから手を離した。指輪の箱は、出てこなかった。
# speaker: gt_tanvi
# voice: gt_agra_main_taj_mahal_battle_tanvi_013
次は、場所から一緒に決めて。そうしたら、答えはたぶん同じだから
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_agra_main_taj_mahal_battle_nikhil_010
    あなた、三問とも彼女の側の答えでしたね。……僕の味方は、いないのか
- battle_score == 2:
    # speaker: enemy
    # voice: gt_agra_main_taj_mahal_battle_nikhil_011
    二問は彼女の言うとおりでした。残りの一問で、僕を励ましてください
- else:
    # speaker: enemy
    # voice: gt_agra_main_taj_mahal_battle_nikhil_012
    あなたも知らなかったんですね。……よかった。僕だけじゃなかった
}
# speaker: narrator
後ろの列から、拍手とも抗議ともつかない声が上がった。ベンチの番は、とっくに時間切れだった。
# speaker: narrator
# leave: enemy
# leave: gt_tanvi
二人が立ち上がると、ニキルとタンヴィは並んで、ベンチではなく出口の方へ歩いていった。さっきより、少しだけ近い距離で。
# speaker: heroine
# reaction: heroine,shy,blush
# voice: gt_agra_main_taj_mahal_007
# photo: gt_album_a019 # photo_caption: 「ふりで、だけど」
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
アンワルだ、とツアーの客らしい男が連れにささやいた。この町で一番泣かせるガイドだよ、と。
# speaker: narrator
名刺にあった名前だ。宿の支配人のサミールが薦めていた、あの叔父。
# speaker: enemy
# cutin: name
# voice: gt_agra_finale_battle_anwar_001
そして最後の石が置かれた日。皇帝は命じたのです。二度とこれほどのものを造らせぬよう、二万の職人の手を、切り落とせと
# speaker: narrator
観客から、悲鳴に近い溜め息が漏れた。何人かは本当に目を拭っている。アンワルは満足げに杖を鳴らし、ぐるりと見回して、こちらで目を止めた。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_002
おお、ご覧なさい！　甥の宿にお泊まりの、日本から来た新婚のお二人です。愛の記念碑に、愛を誓いに来られた
# speaker: narrator
# se: applause
拍手が起きた。サミールが帳面に書き留めていた新婚の話は、叔父の口から、町中のガイドに回っていたらしい。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_finale_001
ち、違います！　わたしたち、新婚じゃ……！
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_003
ご覧なさい、この照れよう。タージの前では、誰もが恋に正直になる
# speaker: narrator
笑いと拍手が大きくなる。{heroine_name}の言葉は、そのたびに物語の一部にされていく。
# speaker: narrator
# recall: gt_album_d01
# emotion: serious
彼女は唇を結んだ。デリーの最後の朝、車の窓からカムラが言った言葉が、頭の中で聞こえた。
# speaker: gt_kamla
# remembered
# recall: gt_album_d01
# reaction: heroine,serious
# voice: gt_agra_finale_battle_kamla_001
アーグラでも、言いたいことは言いなさい。
# speaker: heroine
# emotion: serious
# voice: gt_agra_finale_002
# photo: gt_album_a133 # photo_caption: 結んだ唇、カムラの言葉
……アンワルさん。その、職人の手を切ったっていう話。本当なんですか
# speaker: narrator
観客が、一斉にこちらを振り向いた。アンワルの笑顔は崩れない。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_004
お嬢さん。この町では、昔からみんながそう語ってきた。それを違うと言うなら、証明できるかね
-> quiz(1) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: heroine
    # voice: gt_agra_finale_003
    記録が、ないんです。歴史家の人たちも、根拠のない伝説だって言ってます
- else:
    # speaker: narrator
    観客の中の学生らしい青年が、携帯を見ながら言った。
    # speaker: gt_agra_finale_student
    # voice: gt_agra_finale_battle_agra_finale_student_001
    歴史家は、記録がない伝説だって言ってますよ
}
# speaker: narrator
観客がざわめく。さっき目を拭っていた何人かが、そそくさとハンカチをしまった。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_005
本当のことは、人を泣かせない。泣かない客は、タージを忘れる。わしは四十年、それを見てきた
# speaker: narrator
アンワルは杖を上げた。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_006
日が傾いたら、対岸の庭へ参りましょう。今日のツアーの最後の、とっておきの話は、そこでいたします
# speaker: narrator
杖の先が、二人を指した。新婚のお二人も、ぜひ、と。客たちの笑い声に押されて、断りそびれた。
# background: gt_bg_agra_mehtab_bagh_sunset
# tint: off
# ambience: amb_wind
# speaker: narrator
夕方、一行は川を渡った。メヘターブ・バーグの岸辺。夕日に染まるタージが、川向こうに正面から見えた。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_007
皇帝は、この岸に、自分のための黒いタージを建てるつもりだった。白い妃と、黒い皇帝。川を挟んで、永遠に見つめ合うはずだったのです
# speaker: narrator
観客がまた息をのむ。アンワルは横目で、{heroine_name}を見た。今度は何と言う、という目で。
# speaker: heroine
# voice: gt_agra_finale_battle_003
その黒いタージの話、最初に書いたのは誰なんですか
# speaker: enemy
# term: gt_term_tavernier
フランスの宝石商、タヴェルニエだよ。三百六十年前、タージが建っていくのをその目で見た男だ。手を切る話の二万という数も、あの男の旅行記にある
# speaker: narrator
アンワルは杖の先で、足もとの土を軽く突いた。
-> gt_agra_finale_battle_claim ->
# speaker: heroine
# emotion: serious
# voice: gt_agra_finale_battle_004
昔の人が書いたことと、この岸から出てきたもの。手帳で、並べてみます
- (stop)
-> reasoning ->
{ evidence_result == "failure":
    # speaker: enemy
    それは黒い墓の話ではないね。昔の人が向こう岸について何と書いたか。この岸の土から何が出たか。わしが聞きたいのは、その二つだ
    -> stop
}
# speaker: heroine
# voice: gt_agra_finale_battle_005
タヴェルニエさんの記録は、川の向こうに自分の墓を建て始めた、とだけ書いてるんです。黒いとは、一言も書いてない
# speaker: heroine
# voice: gt_agra_finale_battle_006
それに、この岸を何年もかけて掘った人たちがいます
# speaker: narrator
アンワルの杖が、土の上で止まった。
-> quiz(2) ->
# background: gt_bg_agra_mehtab_bagh_sunset
{ quiz_correct:
    # speaker: heroine
    # voice: gt_agra_finale_004
    調べた人たちが見つけたのは、黒い墓の土台じゃなくて、庭でした。タージと、水に映るタージを眺めるための
    # speaker: enemy
    ……黒、は誰が足したのだろうね。わしの前の、誰かのガイドか。わしの前の前か
- else:
    # speaker: narrator
    岸辺の案内板に、調査の結果が書いてあった。見つかったのは墓の土台ではなく、水に映るタージを眺めるための庭だった。
    # speaker: enemy
    黒いとは書いていない、か。……古い本は、わしの話を半分しか手伝ってくれなかったらしい
}
# speaker: narrator
アンワルは杖をついたまま、しばらく黙った。それから、観客に向かって両手を広げた。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_008
皆さん、この若いお嬢さんは、わしの話を二つも壊した。では、お願いしよう。あなたの本当の話で、この人たちを泣かせてみなさい
# speaker: narrator
# photo: gt_album_a136 # photo_caption: 五十人の目の前へ
観客が、拍手で彼女を前へ押し出した。逃げ場はない。五十人の目が、こちらを見ている。
# speaker: heroine
# reaction: heroine,worried,sweat
# voice: gt_agra_finale_005
え、わたしが？　む、無理です。人前で話すのは……
# speaker: narrator
声が震えた。けれど、一歩下がりはしなかった。
# speaker: heroine
# emotion: serious
# voice: gt_agra_finale_006
……やってみます。下手でも、本当の話をします
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_009
では、聞こう。手を切られなかったというなら、職人たちはそのあと、どこへ行った
-> quiz(3) ->
# background: gt_bg_agra_mehtab_bagh_sunset
{ quiz_correct:
    # speaker: heroine
    # voice: gt_agra_finale_battle_001
    デリーです。皇帝の新しい都。赤いお城と、大きなモスクのある町
    # speaker: heroine
    # voice: gt_agra_finale_battle_002
    ……わたしたち、デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
- else:
    # speaker: narrator
    アンワルが代わりに答えた。
    # speaker: enemy
    # voice: gt_agra_finale_battle_anwar_010
    デリーの新しい都だ。赤い城と、大きなモスク
    # speaker: narrator
    答えてから、アンワルは慌てて口をつぐんだ。もう遅い。
    # speaker: heroine
    # voice: gt_agra_finale_008
    ……デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
}
# speaker: narrator
観客が静かになった。泣いてはいない。けれど、さっきとは違う顔で、川向こうの白い建物を見ている。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_011
名もない手の話では、人は泣かないよ。人は、名前に泣くんだ
# speaker: heroine
# voice: gt_agra_finale_009
名前、ありますよ。一人だけ、タージに自分の名前を書き残した人がいるんです
# speaker: narrator
アンワルの眉が、わずかに上がった。四十年、聞かれたことのない方向からの話だった。
-> quiz(4) ->
# background: gt_bg_agra_mehtab_bagh_sunset
{ quiz_correct:
    # speaker: heroine
    # voice: gt_agra_finale_010
    # term: gt_term_amanat_khan
    書家のアマーナト・ハーン。壁の文字を書いた人です。一六三八年って、日付まで入れて
- else:
    # speaker: enemy
    # voice: gt_agra_finale_battle_anwar_012
    # term: gt_term_amanat_khan
    ……アマーナト・ハーン。書家だ。知っていたとも。わしは、その話をしたことがないだけだ
}
# speaker: narrator
# em: 名前
観客の何人かが、川向こうのタージを、目を細めて見つめた。あの白い壁のどこかに、一人の名前がある。
# speaker: heroine
# voice: gt_agra_finale_011
それと、もう一つ、言っておきたいことがあります
# speaker: narrator
{heroine_name}は観客に向き直った。耳が熱い。それでも、声は最初より通っていた。
# speaker: heroine
# reaction: heroine,shy,blush
# photo: gt_album_a66 # photo_caption: 「わたしたちのことは、わたしたちで決めます」
# voice: gt_agra_finale_012
わたしたちは、新婚じゃありません。……でも、二人でここに来たのは、本当です。わたしたちのことは、わたしたちで決めます
# speaker: narrator
# pause: 800
一瞬の静寂。
# speaker: narrator
# se: applause
# photo: gt_album_a138 # photo_caption: さっきより、ずっと温かい拍手
それから、どっと拍手が起きた。さっきの拍手より、ずっと温かい音だった。
# speaker: narrator
アンワルは杖の先で地面を叩き、苦笑いした。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_013
参った。……では、わしの番だ。わしの家がどこか、お嬢さんは知っているかね。タージの南門の外、タージ・ガンジだ。七代、あそこに住んでいる
-> quiz(5) ->
# background: gt_bg_agra_mehtab_bagh_sunset
{ quiz_correct:
    # speaker: heroine
    # term: gt_term_caravanserai
    # voice: gt_agra_finale_013
    タージ・ガンジは、市場と隊商宿の町。最初から、タージの計画の一部だったんですよね
- else:
    # speaker: enemy
    # term: gt_term_caravanserai
    # voice: gt_agra_finale_battle_anwar_014
    市場と隊商宿だよ。タージの南門の外に、最初から造られた町だ。墓と一緒に生まれた町なんだ
}
# speaker: narrator
{heroine_name}は、川向こうの白い墓から、杖を握るアンワルの手に目を移した。
# speaker: narrator
切られたと語られてきた手は、切られずに、次の都を建てに行ったと伝わる。
# speaker: heroine
# bgm: touching_moments_four
# voice: gt_agra_finale_014
アンワルさん。わたし、今日聞いた中で一番泣けるのは、アンワルさんの話だと思います
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_015
わしの？
# speaker: heroine
# voice: gt_agra_finale_015
手を切られた人の話じゃなくて、手を受け継いだ人の話。タージと一緒に生まれた町に、七代、住んでる人の話
# speaker: narrator
アンワルは答えなかった。杖を握る指に、少し力が入った。日が沈み、川向こうのタージが、白から灰色へ変わっていく。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_016
……明日も、わしは手を切る話をするよ。客はあれで泣く。泣いた客は、また来る
# speaker: heroine
# emotion: serious
# voice: gt_agra_finale_016
はい。……そう言うと思ってました
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_017
だが、終わりに一つ足そう。壁に名前を残した書家の話と、南門の外の町の話を
{
- battle_score == 5:
    # speaker: enemy
    # voice: gt_agra_finale_battle_anwar_018
    五つとも、あなたの言うとおりだった。四十年で初めて、話を全部取られた。……悔しいが、いい夕方だった
- battle_score >= 3:
    # speaker: enemy
    # voice: gt_agra_finale_battle_anwar_019
    いくつかは、わしが守った。だが、大事なところは全部あなたに取られた
- else:
    # speaker: enemy
    # voice: gt_agra_finale_battle_anwar_020
    答えは半分も合わなかったね。それでも客は、あなたの方を見ていた。話というのは、そういうものだ
}
# speaker: narrator
帰りぎわ、アンワルは甥のサミールに電話をかけ、何か短く言った。
# speaker: narrator
# item_show: gt_agra_anwar_petha
# term: gt_term_petha
それから、二人に紙の箱を差し出した。
# speaker: enemy
# voice: gt_agra_finale_battle_anwar_021
詫びの印だ。新婚でなくても、甘いものは食べられる
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_finale_017
……それは、受け取ります。そこは、譲らないです
-> END

// 推理クイズC（証拠連結）の主張。battles/catalog.json の gt_agra_finale_battle の reasoning（roundIndex 1）が、quiz(1) の後にここを読む。
// 証拠は tourism/catalog.json のタージ・マハルの手がかり4つ。正しい組は、タヴェルニエの記録（「黒い」と書いていない）と、メヘターブ・バーグの調査（池のある庭）。
=== gt_agra_finale_battle_claim ===
# background: gt_bg_agra_mehtab_bagh_sunset
# speaker: enemy
黒い墓は、この岸に建つはずだった。違うと言うなら、昔の記録から一つ、この岸の土から一つ。二つ並べて、わしの話のどこが嘘か見せてみなさい
->->
