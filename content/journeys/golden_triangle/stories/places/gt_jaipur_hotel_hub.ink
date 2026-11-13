INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（新しい書き方への形の移し替え。文は今のまま）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
=== gt_jaipur_arrival ===
# scene: arrival
# background: gt_bg_jaipur_hotel_window
# speaker: narrator
ジャイプールの宿は、旧市街の城壁の近くにあった。窓の外の壁も、向かいの家も、通りの門も、くすんだ桃色に塗られている。
# speaker: heroine
# reaction: heroine,happy,sparkle
本当に、町じゅうがピンク……。写真より、ちょっと赤っぽいね。夕方の空みたいな色
# background: gt_bg_jaipur_hotel_room
# speaker: narrator
荷物を置くなり、{heroine_name}は携帯を開いた。アマンからの連絡だ。
# speaker: gt_aman
# phone: received
花婿の行列は、旅の最後の夜、旧市街のハワー・マハルの近くを通ります
# speaker: gt_aman
# phone: received
祖母が、あなたに踊らせると言っています。逃げ道はありません
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
お、踊らせる……！？　行くとは言ったけど、踊るとは言ってない……！
# background: gt_bg_jaipur_hotel_hub
# speaker: narrator
何を着ていくのか、お祝いには何を持っていくのか。宿のフロントの女性に尋ねると、笑って教えてくれた。封筒に入れた現金がふつうで、金額の最後に一ルピーを足す。割り切れない数は、縁起がいいから。
# speaker: heroine
# reaction: heroine,smile,question
割り切れない方が、縁起がいいんだ。……いい考え方だね。終わりにしないで、続いていく感じ
# speaker: narrator
彼女はノートに書き留めた。封筒、一ルピー、踊りは要相談。最後の項目に、二本線が引かれた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
相談の余地、なさそうだもんね。カムラさんだし
# speaker: heroine
# emotion: smile
結婚式は最後の夜。それまでに、この町をちゃんと見ておきたいな。お城も、窓だらけの宮殿も、空を測る道具も。……今度は、行きたい所、わたしからも言うね
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。
=== gt_jaipur_epilogue ===
# scene: epilogue
# person: gt_kamla
# background: gt_bg_jaipur_hotel_courtyard
# tint: off
# speaker: narrator
# se: gt_auto_rickshaw_horn
翌朝、宿の中庭。荷物をまとめ終えた二人の前に、オートリキシャが止まった。降りてきたのは、桃色のサリーのカムラだった。
# speaker: narrator
運転手が何か文句を言っている。料金を半分に値切られたらしい。
# speaker: heroine
# reaction: heroine,surprised,sparkle
カムラさん！　昨日の今日なのに、もう値切ってる……
# speaker: enemy
ジャイプールの運転手は、デリーより素直ね。三十秒で折れた
# speaker: narrator
カムラは中庭の椅子に腰を下ろし、手を差し出した。デリーで渡した、あの段ボールの切れ端を出せ、という仕草だった。
# speaker: narrator
# photo: gt_album_j57 # photo_caption: 段ボールの六行目「通りで踊った夜」
{heroine_name}がガイドブックから取り出すと、カムラは油性ペンで、五行の下にもう一行を書き足した。
# speaker: enemy
# recall: gt_album_j54
ジャイプール。通りで踊った夜
# speaker: heroine
# reaction: heroine,shy,blush
……それ、わたしの、ですか
# speaker: enemy
わたしのよ。でも、あんたにもあげる。ナーニーは昨日、この家に来て六十年で初めて、行列と一緒に通りを歩いたわ。来年のガンガウルは、二人で行列を見に行くの。窓じゃなくて、下から
# speaker: narrator
# recall: gt_album_d01
# se: pen_click
カムラはペンのふたを閉め、二人を順に見た。それから、デリーの路地で初めて会ったときと同じ言い方をした。
# speaker: enemy
あんたの連れ、相変わらず黙ってるね。いい男は黙ってるもんだ。……でも、あんたは黙らないこと。わたしみたいに、六十年も待たないこと
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    はい。……もう、言いました。これからも、言いたいときに言います
    # speaker: enemy
    よろしい。言い過ぎるくらいで、ちょうどいいのよ
- romance_stage >= 3:
    # speaker: heroine
    # reaction: heroine,shy,blush
    ……まだ、です。でも、六十年は待ちません。約束します
    # speaker: enemy
    約束は軽くするもんじゃないわよ。……したなら、守りなさい
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,shy,sweat
    そ、そういうのじゃ……。でも、言いたいことは、ちゃんと言うようにします
    # speaker: enemy
    『そういうのじゃ』って言う子は、だいたいそういうのよ
- else:
    # speaker: heroine
    旅の連れ、です。……でも、この旅で一緒にいられてよかったって、それは、ちゃんと言えます
    # speaker: enemy
    それで十分。最初の一言は、それくらいがいい
}
# speaker: narrator
カムラは立ち上がり、待たせていたオートリキシャに乗り込んだ。運転手がまた何か言い、カムラが言い返す。笑い声と一緒に、桃色の町の角へ消えていった。
# speaker: narrator
# quiet: scene
{heroine_name}は段ボールの切れ端を見つめた。デリーの五行と、ジャイプールの一行。アーグラの分は、空いている。
# speaker: heroine
アーグラは、自分で書かなきゃね。……本当の話の方を、短く
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    インドで覚えた一番大事なこと、言うね。……好き。言いたいときに言うって、決めたから
    # speaker: heroine
    # reaction: heroine,teasing,blush
    ふふ。今のは、六十年待たなかった分
- romance_stage >= 3:
    # speaker: heroine
    # emotion: smile
    次の旅の行き先、今度はわたしから言ってもいい？　……一緒に行きたい所が、もうあるんだ
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,smile,music
    楽しかった。……あなたと来られて、よかった。これは、勢いじゃないからね
- else:
    # speaker: heroine
    ありがとう。一人だったら、きっと窓の内側から、見てるだけだった
}
# speaker: narrator
彼女は切れ端をガイドブックの一番前に挟み直し、鞄の口を閉めた。旅の荷物の中で、それが一番軽くて、一番大事なものになっていた。
-> END
