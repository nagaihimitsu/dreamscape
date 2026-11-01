// 公式館の解説に基づく。答えは各問題の後にだけ示す。
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
# background: milano_refectory
# speaker: narrator
旧食堂で、隣の女性が手帳を開いては、閉じていた。何かを書くより先に、絵へ目が戻ってしまうらしい。
# speaker: enemy
「困ったわ。孫に絵の話をすると約束したのに、顔を見ているうちに順番を忘れちゃった」
# speaker: heroine
# emotion: smile
「だったら、順番は決めずに、気になった人から話しませんか？」
# speaker: enemy
「いいわね。私はジェンマ。あなたはどの人が気になる？」
# speaker: heroine
# emotion: worried
「あ、ええと……さっきまで、端ばかり見てました」
# speaker: narrator
ジェンマは笑って、手帳の白いページを見せた。三つ、孫から預かった質問が並んでいる。
# speaker: enemy
「答えを知った顔で帰ったら、あの子はすぐ見抜くの。よかったら一緒に確かめて」
# speaker: heroine
# emotion: serious
「見抜かれたくない人が、もう一人います。ね、{player_address}？」
-> END

=== after_first ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「真ん中の人は静かな三角形。周りの手は、あんなに忙しいのにね」
    # speaker: heroine
    # emotion: surprised
    「同じ食卓なのに、そこだけ時間がゆっくりに見える」
- else:
    # speaker: enemy
    「中央のキリストは、両腕を含めて三角形のように見えるのね。周りの人とは動きが違う」
    # speaker: heroine
    # emotion: worried
    「私、隣の身ぶりにつられてました。もう一度、真ん中から見ます」
}
# speaker: narrator
ジェンマは手帳の人物を丸で囲み、その横に小さく手を描いた。
# speaker: enemy
「次は部屋そのもの。壁の線をたどると、どこへ行くと思う？」
# speaker: heroine
# emotion: teasing
「今度は端からでも、たどれそう」
-> END

=== after_second ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「キリストの右のこめかみの近く。窓の真ん中だと思ってたわ」
    # speaker: heroine
    # emotion: surprised
    「部屋の線まで、あそこに集まってるんですね」
- else:
    # speaker: enemy
    「窓や机ではなく、キリストの右のこめかみの近くに集まるのね」
    # speaker: heroine
    # emotion: smile
    「窓を選びかけました。まっすぐ見ていたつもりだったのに」
}
# speaker: narrator
ジェンマは鉛筆で線を引こうとし、途中で止めた。
# speaker: enemy
「孫は絵を描くのが好きなの。どうやって描いたのかも、きっと聞いてくるわ」
-> END

=== conclusion ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「乾いた下地ならゆっくり直せる。でも、色は傷みやすいのね」
- else:
    # speaker: enemy
    「乾いた下地だと描き直しに時間をかけられる一方で、色は定着しにくいのね。部屋の環境も傷みに関わったそうよ」
}
{
- battle_score == 3:
    # speaker: enemy
    「全部わかった顔で帰れそう。……いえ、孫に聞かれたら、まだ困るかしら」
    # speaker: heroine
    # emotion: teasing
    「じゃあ、困ったところも手紙に書いちゃいましょう」
- battle_score == 2:
    # speaker: enemy
    「一つは間違えたけど、そのおかげで手帳に余白ができたわ。孫にも考えてもらおうかしら」
    # speaker: heroine
    # emotion: smile
    「私たちの宿題も、一緒に送ってください」
- else:
    # speaker: enemy
    「あら、私のほうが書き直しだらけ。孫に見せたら、先生みたいな顔をされそう」
    # speaker: heroine
    # emotion: smile
    「その顔、ちょっと見てみたいです。私も間違えたところ、書いて帰ろう」
}
# speaker: narrator
ジェンマは手帳を閉じる。出口へ向かいかけて、振り返った。
# speaker: enemy
「ありがとう。次に会ったら、あの子の答えも聞かせたいわ」
# speaker: heroine
# emotion: happy
「約束ですよ。私も質問を用意しておきます」
-> END
