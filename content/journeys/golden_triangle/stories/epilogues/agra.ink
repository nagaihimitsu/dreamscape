VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_agra_hotel_hub
# speaker: narrator
宿に戻ると、ロビーの長椅子で、アンワルが甥とチャイを飲んでいた。銀の杖が、壁に立てかけてある。
# speaker: enemy
「おお、本当の話のお嬢さん。今日の客の一人がね、明日もう一度タージへ行くそうだ。壁の書家の名前を、自分の目で探しに」
# speaker: heroine
# reaction: heroine,surprised,sparkle
「えっ……本当ですか」
# speaker: enemy
「本当の話だよ。わしは、嘘は物語の中でしかつかない」
# speaker: narrator
彼はチャイを飲み干し、甥の肩を叩いて立ち上がった。部屋のことは片付けさせた、と言い残して。
# speaker: narrator
部屋の扉を開けると、ハートも白鳥も消えていた。寝台は、ただの白い寝台に戻っている。
{
- ending_reached:
    # speaker: heroine
    # reaction: heroine,shy,blush
    「……全部、片付いちゃった。ちょっとだけ残してもらえばよかった、かな。今のは、聞かなかったことにして」
- romance_stage >= 3:
    # speaker: heroine
    「片付けてもらえて、よかった。……よかった、はず。うん」
- else:
    # speaker: heroine
    「ほっとした。……ほっとしたのに、少しだけ寂しいのは、なんでだろう」
}
# speaker: narrator
窓辺のグラスにだけ、着いた日の花びらが浮かんでいた。片付ける人も、それには手を出さなかったらしい。
# speaker: narrator
二人は宿の屋上に上がり、アンワルにもらった菓子の箱を開けた。半透明の、四角い砂糖漬け。ペーターは冬瓜からできているのだと、箱に書いてある。
# speaker: heroine
# reaction: heroine,happy,music
「甘い……。でも、思ったより軽い。冬瓜って、こんなに化けるんだ」
# speaker: narrator
暗い屋根の連なりの向こうに、タージの白いドームが、ぼんやり浮かんでいる。
# speaker: heroine
「本当の話を、ちゃんと届く言葉で言うのって、難しいね。正しいだけじゃ、アンワルさんの言うとおり、誰も泣かない」
# speaker: heroine
# emotion: serious
「でも今日、自分の言葉で言えた。カムラさんに、報告できる」
# speaker: narrator
彼女は鞄から、デリーでアマンにもらった案内を取り出した。ジャイプールの結婚式の日付を、指でなぞる。
# speaker: heroine
「ジャイプールの結婚式、行きたい。誘われたからじゃなくて、わたしが行きたいの。……一緒に、来てくれる？」
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    「今日、人前で『わたしたちのことは、わたしたちで決める』って言ったでしょう。あれ、恋人として言ったんだよ。ちゃんと届いてた？」
- romance_stage >= 3:
    # speaker: heroine
    「今日、『二人で来たのは本当です』って言ったの、覚えてる？　……あれは、本当だから」
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,teasing,blush
    「人前で、『わたしたち』って言っちゃった。……勢いだからね。勢い、だから」
- else:
    # speaker: heroine
    「人前で話すの、すごく怖かった。隣にいてくれて、助かった。……ありがとう」
}
# speaker: narrator
ペーターの最後の一切れを半分に割って、彼女は片方をこちらへ差し出した。新婚ではない二人の、アーグラ最後の夜だった。
-> END
