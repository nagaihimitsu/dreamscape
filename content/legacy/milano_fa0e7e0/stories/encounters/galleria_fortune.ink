VAR player_name = ""
VAR heroine_name = ""

# background: milano_galleria
# speaker: narrator
ガッレリアの床を見ていた女性が、足を止めた。
女性「ねえ、占いは信じる？」
# speaker: heroine
「急に難しい質問ですね。わたしは……結果がいい日だけ、少し」

* [Yes, I do.]
    # speaker: narrator
    女性「素直でいいわ。私は都合の悪い結果を忘れるのが得意よ」
    # speaker: heroine
    「それ、占いより記憶力の話かも」
    -> discovery
* [Not really.]
    # speaker: narrator
    女性「それもいいわ。信じなくても、景色は見られるもの」
    # speaker: heroine
    「私の都合のいい答えより、潔いかも」
    -> discovery
* [Walk away without answering.]
    # speaker: narrator
    二人は会釈して、女性を残したまま通路の先へ歩く。
    # speaker: heroine
    「あの床、さっきから足を止める人が多いね」
    -> discovery

=== discovery ===
# speaker: narrator
床の雄牛のそばに、地域の小さな展示を知らせる案内があった。
案内には、雄牛がトリノ市の紋章を表し、幸運を願ってかかとで回る人もいると書いてある。
# speaker: heroine
「ミラノなのに、トリノの牛なんだ。知らなかった」
「運がよくなるかは分からないけど、私なら目が回りそう」
-> END
