// 都市エピローグ（stories/epilogues/<都市ID>.ink）：都市フィナーレのあとに読む短い締めくくり。
// - 日本語の選択肢と、選択肢のすぐ次の行の効果の札（# rel: など）を書ける（段階3a）。# effect は置かない。
//   効果のある選択肢には # option: を付ける。お金や AP を減らす札（ゲームが自分で始めるエピローグの # on_done:）は書かない。
// - romance_stage（1〜4）と ending_reached で少しだけ分岐してよい。全組合せで台詞が出るようにする。
// - # speaker: enemy はフィナーレの対戦相手の名前で表示される。ほかの人物の言葉は地の文に入れる。
// - 見本の街と人物は架空。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: smp_bg_mihon_hotel
# speaker: narrator
出発の朝、宿の窓から時計塔が見えた。針は、やっぱり三時を指している。
# speaker: heroine
「短い滞在だったね。でも、あの針を見るたびに思い出しそう」
# speaker: narrator
塔の下で、ハンナが街の人たちに囲まれていた。止まった三時をどうするか、みんなで話しているらしい。
# speaker: narrator
宿を出ると、塔の上からトーマが手を振った。鐘が二度、少し不揃いに鳴る。
# speaker: heroine
# reaction: heroine,surprised,question
「あれ？　戻ってきた人のための鐘だよね。わたしたち、今から出るところなのに」
# speaker: narrator
トーマが大きく口を動かした。たぶん、「また三時に」。
* [手を振り返す # option: wave_back]
    # rel: affection +1
    # speaker: narrator
    {heroine_name}と二人で、塔に向かって大きく手を振った。
* [鐘の音が消えるまで、黙って聞いている # option: listen]
    # speaker: narrator
    二人は立ち止まって、鐘の余韻が石畳に消えていくのを聞いていた。
-
{ romance_stage >= 3:
    # speaker: heroine
    # emotion: shy
    「……ね、{player_address}。次の三時も、一緒に来られたらいいな」
- else:
    # speaker: heroine
    # emotion: smile
    「来られるときに、また来よう。今度は、わたしが鐘を鳴らしてもらう番かも」
}
-> END
