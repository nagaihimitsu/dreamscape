INCLUDE modules.ink
# background: gt_bg_agra_taj_mahal
# speaker: narrator
タージ・マハルへ続く長い水路の途中に、白い大理石のベンチがある。記念写真の列が、今日も二十人ほど伸びていた。
# speaker: narrator
列を眺めていた{heroine_name}の前に、青年が飛び出してきた。額に汗。胸ポケットを、何度も手で押さえている。
# speaker: enemy
お願いがあります！　あのベンチを、十分だけ確保してください！
# speaker: heroine
# reaction: heroine,surprised,interrobang
か、確保？
# speaker: enemy
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
