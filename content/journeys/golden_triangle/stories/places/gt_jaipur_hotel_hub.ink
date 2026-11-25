INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（2026-11-10 に新しい書き方へ形を移した）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
=== gt_jaipur_arrival ===
# scene: arrival
# background: gt_bg_jaipur_hotel_window
# speaker: narrator
ジャイプールの宿は、旧市街の城壁の近くにあった。窓の外の壁も、向かいの家も、通りの門も、くすんだ桃色に塗られている。
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_jaipur_arrival_001
# photo: gt_album_j001 # photo_caption: 町じゅうがピンク
本当に、町じゅうがピンク……。写真より、ちょっと赤っぽいね。夕方の空みたいな色
# background: gt_bg_jaipur_hotel_room
# speaker: narrator
荷物を置くなり、{heroine_name}は携帯を開いた。カムラの孫、アマンからの連絡だ。
# speaker: narrator
デリーで招かれた結婚式の、花婿その人だ。
# speaker: gt_aman
# phone: received
# term: gt_term_baraat
花婿の行列は、旅の最後の夜、旧市街のハワー・マハルの近くを通ります
# speaker: gt_aman
# phone: received
祖母も、もうジャイプールの叔父の家に移っています。あなたに踊らせると言っています。逃げ道はありません
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_jaipur_arrival_002
# photo: gt_album_j002 # photo_caption: 「お、踊らせる……！？」
お、踊らせる……！？　行くとは言ったけど、踊るとは言ってない……！
# background: gt_bg_jaipur_hotel_hub
# speaker: narrator
何を着ていくのか、お祝いには何を持っていくのか。帳場で尋ねると、フロントの女性が笑った。
# speaker: gt_jaipur_hotel_front
# term: gt_term_shagun
# voice: gt_jaipur_arrival_jaipur_hotel_front_001
# photo: gt_album_j003 # photo_caption: 割り切れない数は、縁起がいい
お祝いはね、封筒に入れた現金。金額の最後に、一ルピー足すの。割り切れない数は、縁起がいいから
# speaker: heroine
# reaction: heroine,smile,question
# voice: gt_jaipur_arrival_003
割り切れない方が、縁起がいいんだ。……いい考え方だね。終わりにしないで、続いていく感じ
# speaker: narrator
# leave: gt_jaipur_hotel_front
帳場を離れて、彼女はノートに書き留めた。封筒、一ルピー、踊りは要相談。最後の項目に、二本線が引かれた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_arrival_004
# photo: gt_album_j004 # photo_caption: 「踊りは要相談」に二本線
相談の余地、なさそうだもんね。カムラさんだし
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_arrival_006
結婚式は最後の夜。それまでに、この町をちゃんと見ておきたいな。お城も、窓だらけの宮殿も、空を測る道具も
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_arrival_007
# photo: gt_album_j005 # photo_caption: 今度は、わたしからも
……今度は、行きたい所、わたしからも言うね
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
デリーでは、二人がカムラを見送った。今朝は、カムラの方から来た。
# speaker: narrator
運転手が何か文句を言っている。料金を半分に値切られたらしい。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# photo: gt_album_j133 # photo_caption: オートリキシャで、カムラが来た
# voice: gt_jaipur_epilogue_001
カムラさん！　昨日の今日なのに、もう値切ってる……
# speaker: enemy
# voice: gt_jaipur_epilogue_kamla_001
ジャイプールの運転手は、デリーより素直ね。三十秒で折れた
# speaker: narrator
カムラは中庭の椅子に腰を下ろし、手を差し出した。デリーで渡した、あの段ボールの切れ端を出せ、という仕草だった。
# speaker: narrator
# photo: gt_album_j57 # photo_caption: 段ボールの六行目「通りで踊った夜」
{heroine_name}がガイドブックから取り出すと、カムラは油性ペンで、五行の下にもう一行を書き足した。
# speaker: narrator
# item_out: gt_delhi_kamla_memo 6
返ってきた切れ端の、いちばん下。インクがまだ乾いていない。
# speaker: enemy
# recall: gt_album_j129
# voice: gt_jaipur_epilogue_kamla_002
ジャイプール。通りで踊った夜
# speaker: heroine
# reaction: heroine,shy,blush
# voice: gt_jaipur_epilogue_002
……それ、わたしの、ですか
# speaker: enemy
# voice: gt_jaipur_epilogue_kamla_003
わたしのよ。でも、あんたにもあげる
# speaker: enemy
# voice: gt_jaipur_epilogue_kamla_004
花嫁のおばあさんはね、ゆうべ、嫁いで六十年で初めて、行列と一緒に通りを歩いたの
# speaker: enemy
# voice: gt_jaipur_epilogue_kamla_005
来年のガンガウルは、あの人と二人で見に行く。窓じゃなくて、下から
# speaker: narrator
# recall: gt_album_d001
# se: pen_click
カムラはペンのふたを閉め、二人を順に見た。それから、デリーの路地で初めて会ったときと同じ言い方をした。
# speaker: enemy
# voice: gt_jaipur_epilogue_kamla_006
# photo: gt_album_j135 # photo_caption: 「あんたは黙らないこと」
あんたの連れ、相変わらず黙ってるね。いい男は黙ってるもんだ。……でも、あんたは黙らないこと。わたしみたいに、六十年も待たないこと
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_epilogue_003
    # photo: gt_album_j136 # photo_caption: 「もう、言いました」
    はい。……もう、言いました。これからも、言いたいときに言います
    # speaker: enemy
    # voice: gt_jaipur_epilogue_kamla_007
    よろしい。言い過ぎるくらいで、ちょうどいいのよ
- romance_stage >= 3:
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_jaipur_epilogue_004
    ……まだ、です。でも、六十年は待ちません。約束します
    # speaker: enemy
    # voice: gt_jaipur_epilogue_kamla_008
    約束は軽くするもんじゃないわよ。……したなら、守りなさい
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,shy,sweat
    # voice: gt_jaipur_epilogue_005
    そ、そういうのじゃ……。でも、言いたいことは、ちゃんと言うようにします
    # speaker: enemy
    # voice: gt_jaipur_epilogue_kamla_009
    『そういうのじゃ』って言う子は、だいたいそういうのよ
- else:
    # speaker: heroine
    # voice: gt_jaipur_epilogue_006
    旅の連れ、です。……でも、この旅で一緒にいられてよかったって、それは、ちゃんと言えます
    # speaker: enemy
    # voice: gt_jaipur_epilogue_kamla_010
    それで十分。最初の一言は、それくらいがいい
}
# speaker: narrator
# leave: enemy
カムラは立ち上がり、待たせていたオートリキシャに乗り込んだ。運転手がまた何か言い、カムラが言い返す。笑い声と一緒に、桃色の町の角へ消えていった。
# speaker: narrator
# quiet: scene
# item_out: gt_delhi_kamla_memo
{heroine_name}は段ボールの切れ端を見つめた。デリーの五行と、ジャイプールの一行。
# speaker: narrator
# photo: gt_album_j137 # photo_caption: アーグラの分は、空いている
アーグラの分は、空いている。
# speaker: narrator
アーグラでは、名物ガイドの伝説の代わりに、人前で本当の話をした。
# speaker: heroine
# voice: gt_jaipur_epilogue_007
アーグラは、自分で書かなきゃね。……本当の話の方を、短く
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_epilogue_008
    インドで覚えた一番大事なこと、言うね。……好き。言いたいときに言うって、決めたから
    # speaker: heroine
    # reaction: heroine,teasing,blush
    # voice: gt_jaipur_epilogue_009
    # photo: gt_album_j138 # photo_caption: 六十年待たなかった分
    ふふ。今のは、六十年待たなかった分
- romance_stage >= 3:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_epilogue_010
    次の旅の行き先、今度はわたしから言ってもいい？　……一緒に行きたい所が、もうあるんだ
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,smile,music
    # voice: gt_jaipur_epilogue_011
    楽しかった。……あなたと来られて、よかった。これは、勢いじゃないからね
- else:
    # speaker: heroine
    # voice: gt_jaipur_epilogue_012
    ありがとう。一人だったら、きっと窓の内側から、見てるだけだった
}
# speaker: narrator
# photo: gt_album_j139 # photo_caption: 一番軽くて、一番大事なもの
彼女は切れ端をガイドブックの一番前に挟み直し、鞄の口を閉めた。旅の荷物の中で、それが一番軽くて、一番大事なものになっていた。
-> END
