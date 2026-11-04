VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_hawa_mahal
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
ハワー・マハルを望む場所で、若い女性が大きなスケッチブックを抱えている。建物の輪郭はあるのに、窓の列だけが空いていた。
# speaker: heroine
「あ、すみません。じっと見ちゃって。窓は、最後に描くんですか？」
# speaker: enemy
「気になった？　よかった。先生以外の人にも、途中に見えるらしい」
# speaker: narrator
女性は笑って、鉛筆の先についた小さな削りくずを払う。イーシャ、と名乗った。
# speaker: enemy
「美術の課題なの。窓を全部埋める前に、何のための窓なのか考えてる。数を間違える方は、もう諦めた」
# speaker: heroine
# emotion: teasing
「わたしなら、数える前に諦めそう。こんなにあると、途中で違う列に行っちゃう」
# speaker: enemy
「一度、窓を一段多く描いた。誰も気づかなかったけど、私が気づいたから描き直した」
# speaker: narrator
彼女は笑うのをやめ、余白の部分を見る。イーシャの鉛筆は、そこへまだ触れない。
# speaker: heroine
「何を考えているか、聞いてもいいですか。外から見てきれいだな、で止まってたので」
# speaker: enemy
「三つ、気になることがある。最初は、ここから誰が街を見ていたのか。見えることと、見られることは同じじゃないから」
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「そう。宮廷の女性が、街から姿を見られずに外の様子を眺められる格子だった」
- else:
「宮廷の女性が、街から姿を見られずに外を眺めるための格子なんだ。こちら側に立つと忘れそうになるね」
}
# speaker: heroine
# emotion: serious
「街の方を見たくて、この窓に近づいた人がいたんですね。どんな気持ちだったかは、一人ずつ違うんだろうな」
# speaker: enemy
「うん。楽しんだ人も、別の気持ちの人もいたと思う。私は、知らない顔まで描き足さないことにした」
# speaker: narrator
イーシャが、空いていた箇所に格子を描く。紙の白さが、細い線の間へ分かれていく。
# speaker: heroine
「窓が増えた。全部じゃなくても、向こう側があるって感じがします」
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「風も通すんですね。見た目だけでなく、ここで過ごすための工夫でもある」
- else:
「小窓には風を通す役目もあるんだ。飾りだと思っていた部分が、ちゃんと働いてるんですね」
}
# speaker: enemy
「風そのものは描けないから、どうしようかと思ってる。窓からびゅうびゅう線を出したら、漫画みたいになった」
# speaker: heroine
# emotion: happy
「それはそれで、見てみたいです」
# speaker: narrator
イーシャが一枚前をめくる。本当に窓から何本も線が出ていて、三人は顔を近づけて笑った。
# speaker: enemy
「こっちは提出しない。でも、消さないでおく。最後にもう一つ。建物に入る時の話を確かめたい」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「そう、有名な正面からではなく背後側から入る。最初、絵のどこかに入口を足そうとしてしまった」
- else:
「入口は背後側。正面の見栄えに合わせて、勝手に扉を描いてはいけないところだった」
}
# speaker: heroine
「一番よく見る姿が、入口のある姿とは限らないんですね。初めて来たら、探しちゃう」
# speaker: narrator
イーシャは窓の列を少し描き足し、鉛筆を置いた。まだ描かれていない場所も、そのまま残っている。
# speaker: enemy
{ battle_score == 3:
「三つとも頼もしかった。描く前に聞けてよかったな」
- else:
「一緒に迷ってくれてありがとう。私も、確かめながら描いた方が落ち着く」
}
# speaker: heroine
# emotion: smile
「完成したら、最初に誰に見せるんですか？」
# speaker: enemy
「母。たぶん『窓、数えた？』って聞く」
# speaker: narrator
彼女は口元を押さえた。イーシャも、もう答えを知っている顔で笑っている。
# speaker: heroine
「その時は、風の絵も見せてあげてください。わたしは、あっちも好きです」
-> END
