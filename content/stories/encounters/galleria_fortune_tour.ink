VAR player_name = ""
VAR heroine_name = ""

# background: milano_galleria
# speaker: narrator
ガッレリアの床を囲む人だかりから、年配の女性が顔を上げた。
女性「ねえ、お二人。幸運のおまじないって信じる？」
# speaker: heroine
「えっ、今ここで占いですか？　私はいい結果だけ覚えてます」
# speaker: narrator
女性「素晴らしい才能ね。私も見習うわ」

* [Yes, I do.]
    # speaker: narrator
    女性「じゃあ私が今日いい靴を選んだのも、運のおかげかしら」
    # speaker: heroine
    「でも歩きやすいか確かめたのは、ご自分ですよね？」
    # speaker: narrator
    女性「そこは努力ってことにしておいて」
    -> discovery
* [Not really.]
    # speaker: narrator
    女性「慎重ね。おかげで私は今日、宣伝文句を一つ覚えたわ」
    # speaker: heroine
    「どんな文句ですか？」
    # speaker: narrator
    女性「信じなくても床は逃げません、って」
    -> discovery
* [Walk away without answering.]
    # speaker: narrator
    二人は軽く会釈し、女性を残して通路を進んだ。
    # speaker: heroine
    「急だったね。でも、あそこだけ人がくるっと回ってる。何を見てたんだろう？」
    -> discovery

=== discovery ===
# speaker: narrator
ガッレリア中央の床に、雄牛のモザイクがある。その上で、通りがかった人がくるりと回った。
# speaker: heroine
「みんな、あの牛のところで回ってるんだね」
# speaker: narrator
雄牛の上でかかとを回すと幸運を招く、という風習がある。由来ははっきりしない。
# speaker: heroine
「幸運のほどは分からないけど……目が回る自信はあるよ」
-> END
