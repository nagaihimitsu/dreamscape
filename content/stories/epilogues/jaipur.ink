VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_jaipur_jantar_mantar
# speaker: narrator
人の流れから離れ、ラヴィの仲間たちがスマートフォンの周りへ集まる。誰かが眼鏡をかけ、誰かが見やすい位置を譲った。上映会の準備は、それだけだった。
# speaker: enemy
「作者は、この二人。それでは――」
# speaker: narrator
ラヴィが口を閉じる。彼女は待っていた紹介の言葉が本当に終わったことに、一瞬だけ慌てた。
# speaker: heroine
# reaction: heroine,shy,sweat
「三分間の旅です。途中で、わたしが道を間違えます。それも、入れました」
# speaker: narrator
再生を押す。デリーの塔が伸びて、追い越されて、空になる。画面の外で二人が笑う。見ていた一人が、塔を戻すように首を下へ曲げた。
# speaker: heroine
# reaction: heroine,surprised,exclamation
「あっ、それ。わたしも、そうした！」
# speaker: narrator
その声に、今度は周りで笑いが起きた。画面の中の笑いと、外の笑いが少し重なる。
# speaker: narrator
アーグラ。広場へ向かう彼女が一度戻り、道を確かめてから進む。画面の中では、まだ見えない先へ行こうとしている。
# speaker: narrator
「ここ、間違えたところ？」と、若い男性が尋ねた。彼女はうなずきかけ、あらためて再生を止める。
# speaker: heroine
# emotion: serious
「はい。宮殿の空間を、歩いて……」
# speaker: narrator
ラヴィが何も言わずに待っている。彼女は息を吐き、少しだけ笑った。
# speaker: heroine
# emotion: smile
「格好よく言おうとしました。違います。わたしが道を間違えたんです。でも、戻ったあとも、先が見たくて」
# speaker: heroine
「建物が出るところだけにしたら、わたしが行きたかった時間までなくなっちゃう。それが、嫌でした」
# speaker: narrator
男性はもう一度そこを見たがった。別の人は「私は建物からの方が好き」と言った。彼女はそちらも見て、画面を指す。
# speaker: heroine
# reaction: heroine,teasing,music
「きっとサナさんと気が合います。あの人の案も、そっちでした」
# speaker: narrator
再生が進む。ハワー・マハルの通りの音。顔の写っていない人の一文。宮殿の作り手を記した字幕。そして、空を測る大きな道具。
# speaker: narrator
最後の空に、さっき録った声が重なる。『ちょっと待って。わたし、ここをもう一度見たい』。再生の印が戻っても、少しの間、誰も話さなかった。
# speaker: enemy
「困った。私も、もう一度見たくなった」
# speaker: heroine
# reaction: heroine,surprised,question
「どこですか？」
# speaker: enemy
「映像じゃなくて、あれ。今日、待ち合わせ場所にしかしていなかったから」
# speaker: narrator
ラヴィが目の前の観測器を指す。一人が案内へ近づき、別の人がついていく。拍手を待つ形のままでは、会が終わらなかった。
# speaker: heroine
# reaction: heroine,happy,sparkle
「え、そっち？　……うん。わたしも行きたい！」
# speaker: narrator
二歩進んで、彼女は振り返る。ラヴィが指で三を作り、時計へ目を落とした。
# speaker: enemy
「店に戻る前に、三分だけ。今度は私の寄り道だ」
# speaker: heroine
# emotion: teasing
「時間を計るのは、わたしがやります。長い挨拶は、なしで」
# speaker: narrator
仲間たちと別れたあと、ニールへ報告を送る。返事は『空、残した？』。彼女は『残しました。最初に』と打ち、上映中に首を下げた人の話も添えた。
# speaker: narrator
サナには『歩く版』を送った。しばらくして、『まだ短くできる。歩くところを好きだったのは、どんな人？』と届く。
# speaker: heroine
# reaction: heroine,teasing,music
「まだ切るつもりだ。でも、そこを見てくれたんだね」
# speaker: narrator
彼女はすぐに説明を打ち始めた。途中で画面をこちらへ向け、あの人が言ったことを思い出しながら文章を直す。
# speaker: heroine
「全員に好きになってもらうの、無理だった。……でも、もう一度見たいって言ってもらえた」
{
- ending_reached:
    # speaker: heroine
    # emotion: shy
    「隣にいてくれて、ありがとう。今日のわたし、ちょっと好きになった。{player_address}にも、そうだといいな」
- romance_stage >= 3:
    # speaker: heroine
    # emotion: smile
    「隣で見てくれて、心強かった。話すところまで代わってもらわなくて、よかったな」
- else:
    # speaker: heroine
    # emotion: smile
    「見ていてくれて、ありがとう。わたしの話、途中で止まっても待ってくれて」
}
# speaker: narrator
送信して、彼女はスマートフォンをしまった。今度は撮影のために取り出さず、街の方を見た。
# speaker: heroine
# reaction: heroine,happy,music
「先に言っておくね。わたし、おなかがすいてます。次の行き先、それがいい」
# speaker: narrator
こちらがうなずくと、彼女の足が動く。その先に何があるかは、三分間の動画には入っていなかった。
-> END
