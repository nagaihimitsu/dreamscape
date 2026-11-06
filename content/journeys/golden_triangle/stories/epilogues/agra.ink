VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_agra_agra_fort
# speaker: narrator
サナと別れる前に、{heroine_name}は『歩く版』を送った。送信を見届けると、サナが眉を上げる。
# speaker: enemy
「私に長い方を送ったね」
# speaker: heroine
# reaction: heroine,teasing,music
「はい。消さない方を、ちゃんと見てほしくて」
# speaker: enemy
「了解。気に入ったふりは、しないよ」
# speaker: narrator
彼女は一瞬返事を探し、それから、はっきりうなずいた。サナも画面をしまう。
# speaker: enemy
「ラヴィにも、あなたが紹介するって伝えておく？　あの人、空白があると全部しゃべって埋めるから」
# speaker: heroine
# reaction: heroine,surprised,interrobang
「今度は、話す方の三分もあるんですか？」
# speaker: enemy
「決まりはない。ただ、何も言わないでいると、ラヴィの説明になる」
# speaker: heroine
# emotion: serious
「じゃあ、少しだけ、わたしが話したいです。何を言うかは、まだ決まっていません」
# speaker: enemy
「そのまま伝える。ニールにも、短くする係から降りたって言っておいて。降りたのは、あなたの映像だけね」
# speaker: narrator
サナは片手を上げて歩いていった。{heroine_name}は見送ってから、ようやく大きく息を吐く。
# speaker: heroine
# reaction: heroine,worried,sigh
「上手な案に、好きじゃないところもあるって言うの、難しかった」
# speaker: narrator
ニールに近況を送る。サナに会い、短い版と歩く版ができたこと。まだ三分に収めきれていないことも隠さず書いた。
# speaker: heroine
「『楽しみにしてる』、だって。……一番簡単な返事で、一番大変な宿題が来た」
{ ending_reached:
# speaker: heroine
# emotion: teasing
「{player_address}も、好きだからって全部褒めなくていいよ。でも、黙ってると気になるから、一つは教えてね」
- else:
# speaker: heroine
# emotion: smile
「{player_address}にも、見てほしい。全部いいって言わなくていいから、気になったところを一つ教えて」
}
# speaker: narrator
こちらが二つの版を指で示すと、彼女はスマートフォンを渡した。短い方も、消したわけではない。
# speaker: heroine
「比べてみよう。歩く方が、ぜんぶ勝つとは思ってないんだ」
# speaker: narrator
出発の支度を終え、二人はジャイプールへ向かう。移動の合間、彼女は見出しを一つ外してから、画面を閉じた。
# speaker: heroine
# reaction: heroine,happy,sparkle
「次で最後の街なのに、まだ撮りたいものが増えそう。……困るの、ちょっと楽しみになってきた」
-> END
