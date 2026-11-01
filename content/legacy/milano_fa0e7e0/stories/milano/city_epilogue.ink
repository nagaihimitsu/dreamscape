// 都市の達成と恋愛の結末を分ける、短い余韻。効果・選択肢なし。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_finale
# speaker: narrator
ミラノの夜。四つの場所を巡った地図には、折り目がいくつも増えていた。
{heroine_name}は地図を畳みかけて、ガッレリアのところだけ、もう一度開いた。
# speaker: heroine
「帰り道まで、あの指揮者に揃えられなくてよかった」
{
- ending_reached:
    # speaker: narrator
    彼女は地図を片手に持ち直し、空いた手をこちらへ差し出した。
    # speaker: heroine
    「恋人になっても、同じものばかり見てるわけじゃないんだね。今日、何が気になったか、あとで聞かせて」
- romance_stage >= 4:
    # speaker: heroine
    「{player_address}。帰る前に、もう少し話したい。街の話だけじゃなくて」
    # speaker: narrator
    彼女は畳んだ地図の端を指で揃えた。歩き出すまで、少し時間があった。
- romance_stage >= 3:
    # speaker: heroine
    「同じ道を歩いたのに、覚えてるところは違いそう。あとで、交換しない？」
    # speaker: narrator
    視線が合うと、彼女は地図を口元まで上げた。隠れきらない笑いが残った。
- romance_stage >= 2:
    # speaker: heroine
    「今日の人たちのこと、帰ったら一緒に説明してね。一人で話すと、作り話だと思われそう」
    # speaker: narrator
    彼女は指揮棒を振るまねを、指一本だけでしてみせた。
- else:
    # speaker: heroine
    「{player_address}、一緒に歩いてくれて、ありがとうございました。一人だと、通り過ぎたところがありそうです」
    # speaker: narrator
    丁寧な声のまま、彼女は次の角で足を緩めた。こちらが並ぶのを待っていた。
}
# speaker: narrator
地図は鞄へ収まった。街で聞いた声も、まだ交わしていない言葉も、そこには全部入りきらなかった。
二人は歩き出した。今度の歩幅を決める指揮者は、いなかった。
-> END
