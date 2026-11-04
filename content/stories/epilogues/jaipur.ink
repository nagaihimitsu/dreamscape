VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_jaipur_jantar_mantar
# speaker: narrator
見学を終えたラヴィの仲間が合流した。人の流れを避けた場所に集まり、一台のスマートフォンを囲む。大きなスクリーンも、司会台もない上映会だ。
# speaker: narrator
「デリーからアーグラ、そしてジャイプール。作品を作ったのは――」ラヴィは二人の名前を呼ぶと、約束どおり口を閉じた。
# speaker: heroine
# emotion: shy
「ええと。初めは、きれいに撮れたものを、順番に並べようと思っていました」
# speaker: narrator
彼女は一度言葉を切る。画面を見る代わりに、集まっている人の顔を見た。
# speaker: heroine
「でも、それだけだと、わたしが面白かったところが抜けちゃって。途中で、少し作り直しました」
# speaker: heroine
# emotion: smile
「短いので、見てください。三分間の、わたしたちの旅です」
# speaker: narrator
再生が始まる。デリーの塔が上へ伸び、カメラが追い越して、画面いっぱいが空になる。映っていないところで、彼女が笑っていた。
# speaker: narrator
誰かが小さく笑う。彼女は口を開きかけて、やめた。説明せず、そのまま続きを見せる。
# speaker: narrator
庭園の道。遠くから見た建物に、近づいて初めて気づいた細部。アーグラの白い建物が映り、そのあとには、足を止めて眺めた景色が続く。
# speaker: narrator
ジャイプールの窓、門、空を測る道具。画面の中の景色が変わるたび、隣から「ああ、そこ」と小さな声が聞こえた。
# speaker: narrator
最後の映像が終わり、再生の印が戻る。ラヴィが時計を見て満足そうにうなずき、それから両手を軽く打ち合わせた。
# speaker: narrator
「あの庭園、どこ？」と、一人が尋ねる。「最初の方の、道がまっすぐ延びていたところ」
# speaker: heroine
# emotion: happy
「デリーのフマユーン廟です。あそこ、建物だけ見ようとしていたら、庭もすごく気になって」
# speaker: narrator
彼女は動画を少し戻す。今度は再生せず、画面を指さしながら、自分が立っていた場所の話をした。
# speaker: narrator
ラヴィが横から「紹介より、上映後の方が長いね」と言う。彼女は一瞬止まり、すぐに笑った。
# speaker: heroine
# emotion: teasing
「こっちは、三分の約束をしていません」
# speaker: narrator
質問した人も笑って、もう一つ先の場面を見たがった。彼女は迷わず、そこまで画面を送った。
# speaker: narrator
人がそれぞれの行き先へ戻ったあと、ニールへ上映の報告を送る。返ってきたのは「空のところ、残した？」という短い返事だった。
# speaker: heroine
「残しました、って。……ふふ、完成より、そこが気になるんだ」
# speaker: narrator
サナにも完成した動画を送る。彼女は添える言葉を少し考え、「見せたかった順番に、できました」と打った。
# speaker: heroine
# emotion: neutral
「最初、どうしてあの順番が嫌だったのか、自分でもうまく言えなかった。でも、変えてみてよかった」
# speaker: narrator
スマートフォンをしまったあとも、彼女の指は鞄の縁に残っていた。ようやく肩から力が抜けたように、小さく息をつく。
# speaker: heroine
「さっき、途中で言葉が出なくなりそうだった。笑ってくれる人がいたから、続きを話せたんだと思う」
{
- ending_reached:
# speaker: heroine
# emotion: shy
「それと、始める前にこっちを見てくれたでしょ。知ってる顔が一つあるの、やっぱり心強かった」
- romance_stage >= 3:
# speaker: heroine
# emotion: smile
「始める前に、目が合ってよかった。話すのはわたしでも、一人で来たわけじゃないって思えたから」
- else:
# speaker: heroine
「見ていてくれて、ありがとう。隣にいてくれる人がいると、少し落ち着けるんだね」
}
# speaker: narrator
彼女は空を見上げた。動画に入りきらなかった街の音が、周りにはまだ続いている。
# speaker: heroine
# emotion: happy
「三分にしたら、見たいものが減るかと思ってた。逆だった。話してたら、また行きたくなっちゃった」
# speaker: narrator
彼女がこちらを向く。次に言うことは、もう決まっている顔だった。
# speaker: heroine
# emotion: smile
「今度は、わたしが最初に行き先を言ってもいい？」
# speaker: narrator
うなずくと、彼女は嬉しそうに歩き出しかける。それから足を止め、照れくさそうに笑った。
# speaker: heroine
# emotion: teasing
「遠い旅の話は、あとで。まずは何か食べたい。そこから、一緒に決めよう」
# speaker: narrator
二人は街の方へ顔を向けた。三分間の動画は終わっても、そのあとに話したいことが、まだたくさんあった。
-> END
