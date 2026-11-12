INCLUDE modules.ink
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
旅の最後の日。昼のうちに、二人はハワー・マハルの前で、行列が通る道を確かめておいた。そして、日が暮れた。
# speaker: narrator
# bgm: gt_naraina
夜の旧市街。照明に浮かぶハワー・マハルの前を、花婿の行列がゆっくり進んでいた。
# speaker: narrator
赤い制服の楽隊。頭に灯りを載せて歩く男たち。白い馬の上には、花の房で顔を隠したアマン。その前で、親戚たちが道いっぱいに踊っている。
# speaker: narrator
招待客の二人は、行列の端を歩いていた。踊る人たちの輪から、半歩だけ離れて。
# speaker: narrator
# recall: gt_album_d79
輪の真ん中で、鮮やかな桃色のサリーが跳ねた。デリーで見た、ショールの小さな老婦人と同じ人だとは思えない。
# speaker: enemy
そこの二人！　窓際の客みたいに立ってないで！
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
カ、カムラさん！？　踊ってる……！
# speaker: enemy
踊るわよ。孫の行列だもの。あんたも来なさい
# speaker: heroine
# reaction: heroine,worried,sweat
む、無理です、踊ったことないです！
# speaker: narrator
押し問答をしているうちに、行列が止まった。ハワー・マハルの向かいの、古い屋敷の門の前。花嫁の家だ。
# speaker: narrator
門には赤いリボンが張られ、その前に、花嫁のいとこたちが腕を組んで立ちはだかっていた。先頭の娘が、高らかに宣言する。
# speaker: gt_jaipur_bride_cousin
花婿さんを通すには、五万一千ルピー！　払えないなら、ジャイプールの問題に答えてもらいます！
# speaker: narrator
デリーから来た花婿側の親戚たちが、顔を見合わせる。ジャイプールのことなど、誰も知らない。カムラが、{heroine_name}の背中を押した。
# speaker: enemy
この子が答える。デリーで、わたしの地図を全部読んだ子よ
# speaker: heroine
# reaction: heroine,surprised,interrobang
え、ええっ！？　こんな大勢の前で……
# speaker: enemy
答えを言うだけ。言いたいことを言う練習よ。……できるでしょう
# speaker: narrator
何十人もの目が、こちらを向いた。{heroine_name}は一度だけ深く息を吸い、門の前に進み出た。
# speaker: heroine
# emotion: serious
……やります。わたしが、答えます
# speaker: narrator
いとこたちの先頭の娘が、にやりと笑った。
# speaker: gt_pooja
# cutin: name
わたしはプージャー。花嫁のいとこよ。一問目。この町は、どうしてピンク色なのか。わかる？
-> quiz(1) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: narrator
    プージャーが悔しそうに舌打ちした。
    # speaker: gt_pooja
    ……正解。値下げしてあげる
    # speaker: narrator
    花婿側から歓声が上がる。
- else:
    # speaker: gt_pooja
    はずれ！　お客さんを迎えるために塗ったのよ。値上げね
    # speaker: narrator
    プージャーの宣言に、花嫁側から歓声が上がった。
}
# speaker: enemy
声が小さい。もっと大きく言いなさい。ここは通りよ
# speaker: heroine
# reaction: heroine,exasperated,sweat
こ、これでも精いっぱいです……
# speaker: narrator
白い馬の上で、アマンが花の房の隙間から片手を上げた。ありがとう、という合図らしい。馬は退屈そうに、前脚で地面をかいている。
# speaker: narrator
プージャーが、指を二本立てた。二問目。花婿側を、横目で見ながら。
# speaker: gt_pooja
この町の王様の称号、サワーイー。その意味、デリーの人は知らないでしょう？
-> quiz(2) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    # local_word: gt_jaipur_word_sawai
    一と、四分の一。……です！
    # speaker: narrator
    今度は、さっきより大きな声が出た。プージャーが目を丸くする。
- else:
    # speaker: gt_pooja
    # local_word: gt_jaipur_word_sawai
    一と四分の一！
    # speaker: narrator
    プージャーが得意げに笑った。
    # speaker: gt_pooja
    つまりジャイプールの人間は、デリーの人の一と四分の一倍ってこと
}
# speaker: enemy
何が一と四分の一よ。わたしはデリーに六十年、ジャイプールにはまだ数日。それでも、あんたたちの誰より長生きしてるわ
# speaker: narrator
カムラの切り返しに、両家から笑いが起きた。いとこたちの腕組みが、少しだけゆるむ。
# speaker: heroine
# reaction: heroine,smile,music
カムラさん、来たばかりなのに、もうこっちの人の言い方になってる……
# speaker: narrator
プージャーは負けじと胸を張った。ジャイプールの自慢といえば、これだという顔で。
# speaker: gt_pooja
三問目。この町はね、きちんと設計して造られたの。誰が、どうやって設計したと思う？
-> quiz(3) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    ヴィディヤーダルという人が、古い建築の手引きに沿って、線を引いた町、です
    # speaker: narrator
    いとこたちが、そろって唸った。花婿側の親戚が、なぜか拍手している。
- else:
    # speaker: gt_pooja
    ヴィディヤーダル！　建築の手引きに沿って、一本ずつ線を引いたの
    # speaker: gt_pooja
    デリーみたいに、勝手に増えた町とは違うのよ
}
# speaker: narrator
# se: wooden_window
そのとき、屋敷の二階の格子窓が、かたりと鳴った。窓の奥に、白い髪の老婦人の影がある。
# speaker: narrator
花嫁の祖母だった。プージャーが小声で言う。
# speaker: gt_pooja
おばあちゃん、足が悪いの。行列は、窓から見ることになってる
# speaker: narrator
窓の老婦人が、プージャーに何か伝えた。プージャーがうなずき、声を張る。
# speaker: gt_pooja
# local_word: gt_jaipur_word_nani
最後の二問は、ナーニーが出すって！　一問目。春になると、女の人たちの行列がこの通りを通る。何のお祭り？
-> quiz(4) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    ガンガウル。女神さまを敬う、春のお祭り
- else:
    # speaker: narrator
    窓の上から、しわがれた声が答えた。
    # speaker: gt_jaipur_bride_grandmother
    ガンガウルよ。女神さまの、春のお祭り
}
# speaker: narrator
窓の老婦人は、しばらく黙っていた。それから、窓越しに、ゆっくり話し始めた。プージャーが一言ずつ、こちらへ伝える。
# speaker: gt_jaipur_bride_grandmother
十六でこの家に来て、六十年。ガンガウルの行列は、毎年この窓から見てきた。一度も、下を歩いたことはない
# speaker: narrator
カムラが、窓を見上げた。デリーの暗い城で、香辛料の袋を抱えていたときと同じ目だった。
# speaker: enemy
六十年見てたなら、もう十分でしょう。……わたしも、六十年黙ってたのよ
# speaker: narrator
# quiet: line
二人の祖母が、窓の内と外で見つめ合う。通りの喧騒が、一瞬遠のいた。
# speaker: narrator
窓の奥の声が、最後の問題を告げた。
# speaker: gt_jaipur_bride_grandmother
この窓はね、向かいの宮殿の窓と同じ作り。こんな細かな格子は、何のためにあったと思う？
-> quiz(5) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    中の人が、見られずに、外を見るため。……通りも、お祭りも、市場も
- else:
    # speaker: narrator
    窓の奥の声が、自分で答えた。
    # speaker: gt_jaipur_bride_grandmother
    見られずに、見るためよ。通りも、お祭りも、市場も
}
# speaker: narrator
格子の向こうで、老婦人が小さく笑った気配がした。
# speaker: gt_jaipur_bride_grandmother
見るためには、見られないことが必要だった。……でも、今夜は、見られてもいいわね
# speaker: narrator
# se: wooden_window
窓が閉まった。しばらくして、屋敷の門の奥から、杖をついた老婦人が姿を現した。花嫁側から、驚きの声が上がる。
{
- battle_score == 5:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    全問正解！　花婿代は、百一ルピーに負けてあげる！
- battle_score >= 3:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    よく頑張りました！　花婿代は、一万一千一ルピーで手を打つ！
- else:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    花婿代は満額！　でも答えた勇気に免じて、リボンは切ってあげる！
}
# speaker: narrator
# shake: window
# se: scissors_snip
リボンが切られた。楽隊が一斉に鳴り出し、通りが揺れる。カムラが、{heroine_name}の手首をつかんだ。
# speaker: enemy
デリーで、あんたはわたしに言ったね。黙っていなくなるのは、自由とは違うって
# speaker: enemy
今夜はわたしが言う。黙って見ているだけなのも、自由とは違うのよ
# speaker: heroine
# emotion: serious
# pause: 700
……はい。……怖いけど、踊りたいです
# speaker: narrator
# stand: apart
通りの真ん中へ、一歩。手拍子に合わせて、ぎこちなく腕を上げる。誰かが笑い、誰かが真似をし、それがすぐに踊りの輪になった。
# speaker: narrator
# stand: close
{heroine_name}は振り返り、行列の端に残っていたこちらの手を取った。迷いのない手だった。
# speaker: heroine
# reaction: heroine,happy,sparkle
# photo: gt_album_j54 # photo_caption: 「一緒に！　下手なのは、二人とも同じだから！」
# size: large
一緒に！　下手なのは、二人とも同じだから！
# speaker: narrator
杖の老婦人とカムラが、肩を組んで揺れている。馬の上でアマンが笑っている。頭上では、ハワー・マハルの九百を超える窓が、灯りに照らされて、ただ通りを見下ろしていた。
-> END
