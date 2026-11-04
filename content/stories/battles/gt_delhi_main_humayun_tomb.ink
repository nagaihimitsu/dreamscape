VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_delhi_humayun_tomb
# speaker: enemy
「撮らなくていいよ」
# speaker: narrator
フマユーン廟の庭で、ベンチの端にいた女性が言った。{heroine_name}は、持ち上げかけたスマートフォンを胸元へ戻す。
# speaker: heroine
# reaction: heroine,surprised,sweat
「あ、ごめんなさい。建物を……お一人で、待ってらっしゃるのかと思って」
# speaker: enemy
「一人で座ると、待ってることになるの？　今、座りたくて座ってる」
# speaker: narrator
言葉をなくした彼女を見て、女性は少しだけ声を緩めた。サイラと名乗り、昔は学校の給食を作っていたと話す。
# speaker: enemy
「今日は息子と来た。あの子は全部見たい。私は、あと十分、ゆっくり座りたい。両方、観光だろ」
# speaker: heroine
# emotion: worried
「寂しいのかなって、勝手に思いました。すみません」
# speaker: enemy
「謝るのは一回でいい。二回目から、こっちが慰める仕事になる」
# speaker: narrator
彼女は口を閉じ、サイラの見ていた方へ顔を向けた。庭の水路が、道とは違う線を描いている。
# speaker: heroine
「ここは……何を見ていらしたんですか？」
# speaker: enemy
「この区切り。人を並ばせるみたいだと思って。給食の癖だね。説明だと、もっと違うものを表してるらしい」
-> END

=== after_first ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: heroine
    「楽園の川を表す庭。列を作るための線ではないんですね」
- else:
    # speaker: heroine
    「楽園の川のイメージと結び付く水路だそうです。きれいに分けた理由も、見た目だけじゃなかった」
}
# speaker: enemy
「それなら、慌てて建物へ一直線に行かなくてもいいね。ゆっくり座る方に、根拠がついた」
# speaker: heroine
# reaction: heroine,teasing,question
「もしかして、説明より先に結論がありました？」
# speaker: enemy
# reaction: enemy,music
「六十年以上生きてると、先に座りたい時がある」
# speaker: narrator
スマートフォンが震えた。サイラは息子からの短い連絡を読み、顔を上げる。
# speaker: enemy
「『お墓を見終わった』だって。皇帝一人の墓ならすぐ済むんだろうね」
# speaker: narrator
こちらが示した説明には、フマユーン以外の名も並んでいる。サイラは老眼鏡を掛け直した。
-> END

=== after_second ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: heroine
    「皇帝一人だけじゃなくて、多くのムガル皇族の墓もあるんですね」
- else:
    # speaker: heroine
    「この墓群には、多くのムガル皇族も眠っているんだって。名前一つで全部見た気になるところでした」
}
# speaker: enemy
「……『まだあるよ』と送ったら、あの子、全部探し始めるね」
# speaker: narrator
サイラは書きかけた返事を消した。代わりに、座っている場所だけ伝える。
# speaker: heroine
# reaction: heroine,surprised,question
「教えないんですか？」
# speaker: enemy
「聞かれたら話す。知ったことを全部、相手の予定に入れなくてもいい」
# speaker: narrator
彼女は返事に少し迷う。自分ならすぐ知らせたくなる、と言いかけて、やめずに口にした。
# speaker: heroine
# emotion: serious
「わたしは、言いたくなります。面白いところ、見逃したらもったいないから」
# speaker: enemy
「うん。あなたはそうすればいい。どこまで行く旅なの？」
# speaker: narrator
彼女がアーグラへ行く予定を伝えると、サイラは説明の先を指した。まだ訪ねていない建物へ、庭園墓の話がつながっている。
-> END

=== conclusion ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: heroine
    「後のタージ・マハルにも影響したんだ。これは言います。アーグラで、庭も比べたいです」
- else:
    # speaker: heroine
    「フマユーン廟の庭園墓が、後のタージ・マハルにも影響したんですね。次に見た時、今度は見落としたくないな」
}
{
- battle_score == 3:
    # speaker: enemy
    「よく読んだね。でも、全部覚えても私の息子の足は止まらない。あれは別の難問」
- battle_score == 2:
    # speaker: enemy
    「二つ分かって、一つ読み直した。座ってる間にも、案外進むもんだね」
- else:
    # speaker: enemy
    「読み違えもあったね。私なんて最初、給食の列にしてた。紙は逃げないから、後でまた読めばいい」
}
# speaker: narrator
遠くで、こちらを探す青年が足を止めた。サイラは片手を上げ、座ったまま隣を示した。
# speaker: enemy
「ほら。急がせる人にも、座る場所はある」
# speaker: heroine
# emotion: smile
「撮らせてくださいとは、言いません。今日はお話だけ、覚えていきます」
# speaker: enemy
「それならいいよ。気の毒なおばあさんにしないでね」
# speaker: heroine
# reaction: heroine,teasing,music
「しません。けっこう、手ごわかったので」
# speaker: narrator
サイラは笑わず、片方の眉を上げた。彼女は少しだけ慌てたが、言い直さなかった。別れた後も、ベンチは二人の静かな場所になっていた。
-> END
