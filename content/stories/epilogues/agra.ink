VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_agra_agra_fort
# speaker: narrator
サナと別れる前に、{heroine_name}は編集し直した映像をもう一度再生した。歩く数秒のあとに、赤い広場が開ける。
# speaker: heroine
# emotion: neutral
「さっき、残したいって言うまで、ちょっと時間がかかったね」
# speaker: narrator
彼女はスマートフォンを鞄にしまい、開きかけた口を一度閉じた。それから、こちらを見た。
# speaker: heroine
「サナさんの方が上手だから、合わせた方がいいって思った。自分で頼んで見てもらったのに、断るみたいで」
# speaker: narrator
少し先にいたサナが振り返る。聞こえていたらしい。彼女は気にした様子もなく、片手を振った。
# speaker: narrator
「次に会うまでに、私の映像も変わるかもしれない。感想は、ちゃんと言ってね」
# speaker: heroine
# emotion: smile
「はい。見たいです。わたしのも、まだ変えるかもしれません」
# speaker: narrator
今度は、言葉がすぐに出た。サナは満足そうにうなずき、カメラの紐を直して歩いていく。
# speaker: heroine
「あの人、自分の案と違っても、最後まで見てくれたね」
{ ending_reached:
# speaker: heroine
# emotion: teasing
「{player_address}にも、あとで見てもらうよ。好きだからって、全部ほめなくていいからね」
- else:
# speaker: heroine
# emotion: teasing
「{player_address}にも、あとで見てもらおうかな。気になるところがあったら、ちゃんと顔に出してね」
}
# speaker: narrator
こちらが両手で小さな画面の形を作ると、彼女はその向こうをのぞき込んで笑った。
# speaker: heroine
# emotion: happy
「上映前なのに、もう観客が厳しそう。わたしも、負けずに直そう」
# speaker: narrator
出発の支度を終え、二人はジャイプールへ向かう。移動の合間、彼女は画面を閉じたまま窓の外を見ていた。
# speaker: heroine
# emotion: smile
「次の街で、何が撮りたくなるんだろう。まだ決めておかなくていいよね」
# speaker: narrator
鞄の中には、三分に収まりきらない映像がある。その続きは、まだ二人とも見ていなかった。
-> END
