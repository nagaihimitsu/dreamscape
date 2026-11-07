VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_jaipur_hotel_hub
# speaker: narrator
翌朝、宿の中庭。荷物をまとめ終えた二人の前に、オートリキシャが止まった。降りてきたのは、桃色のサリーのカムラだった。
# speaker: narrator
運転手が何か文句を言っている。料金を半分に値切られたらしい。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「カムラさん！　昨日の今日なのに、もう値切ってる……」
# speaker: enemy
「ジャイプールの運転手は、デリーより素直ね。三十秒で折れた」
# speaker: narrator
カムラは中庭の椅子に腰を下ろし、手を差し出した。デリーで渡した、あの段ボールの切れ端を出せ、という仕草だった。
# speaker: narrator
{heroine_name}がガイドブックから取り出すと、カムラは油性ペンで、五行の下にもう一行を書き足した。
# speaker: enemy
「ジャイプール。通りで踊った夜」
# speaker: heroine
# reaction: heroine,shy,blush
「……それ、わたしの、ですか」
# speaker: enemy
「わたしのよ。でも、あんたにもあげる。ナーニーは昨日、この家に来て六十年で初めて、行列と一緒に通りを歩いたわ。来年のガンガウルは、二人で行列を見に行くの。窓じゃなくて、下から」
# speaker: narrator
カムラはペンのふたを閉め、二人を順に見た。それから、デリーの路地で初めて会ったときと同じ言い方をした。
# speaker: enemy
「あんたの連れ、相変わらず黙ってるね。いい男は黙ってるもんだ。……でも、あんたは黙らないこと。わたしみたいに、六十年も待たないこと」
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    「はい。……もう、言いました。これからも、言いたいときに言います」
    # speaker: enemy
    「よろしい。言い過ぎるくらいで、ちょうどいいのよ」
- romance_stage >= 3:
    # speaker: heroine
    # reaction: heroine,shy,blush
    「……まだ、です。でも、六十年は待ちません。約束します」
    # speaker: enemy
    「約束は軽くするもんじゃないわよ。……したなら、守りなさい」
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,shy,sweat
    「そ、そういうのじゃ……。でも、言いたいことは、ちゃんと言うようにします」
    # speaker: enemy
    「『そういうのじゃ』って言う子は、だいたいそういうのよ」
- else:
    # speaker: heroine
    「旅の連れ、です。……でも、この旅で一緒にいられてよかったって、それは、ちゃんと言えます」
    # speaker: enemy
    「それで十分。最初の一言は、それくらいがいい」
}
# speaker: narrator
カムラは立ち上がり、待たせていたオートリキシャに乗り込んだ。運転手がまた何か言い、カムラが言い返す。笑い声と一緒に、桃色の町の角へ消えていった。
# speaker: narrator
{heroine_name}は段ボールの切れ端を見つめた。デリーの五行と、ジャイプールの一行。アーグラの分は、空いている。
# speaker: heroine
「アーグラは、自分で書かなきゃね。……本当の話の方を、短く」
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    「インドで覚えた一番大事なこと、言うね。……好き。言いたいときに言うって、決めたから」
    # speaker: heroine
    # reaction: heroine,teasing,blush
    「ふふ。今のは、六十年待たなかった分」
- romance_stage >= 3:
    # speaker: heroine
    # emotion: smile
    「次の旅の行き先、今度はわたしから言ってもいい？　……一緒に行きたい所が、もうあるんだ」
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,smile,music
    「楽しかった。……あなたと来られて、よかった。これは、勢いじゃないからね」
- else:
    # speaker: heroine
    「ありがとう。一人だったら、きっと窓の内側から、見てるだけだった」
}
# speaker: narrator
彼女は切れ端をガイドブックの一番前に挟み直し、鞄の口を閉めた。旅の荷物の中で、それが一番軽くて、一番大事なものになっていた。
-> END
