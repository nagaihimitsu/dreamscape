INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（新しい書き方への形の移し替え。文は今のまま）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
=== gt_agra_arrival ===
# scene: arrival
# background: gt_bg_agra_hotel_hub
# speaker: narrator
アーグラの宿は、タージ・マハルの南門に近い路地の奥にあった。若い支配人のサミールが自ら彼女の部屋まで案内し、扉を開けた瞬間、{heroine_name}が固まった。
# speaker: narrator
# se: door_open
寝台の上に、薔薇の花びらで大きなハート。その真ん中で、タオルで折った白鳥が二羽、くちばしを寄せ合っている。
# speaker: gt_samir
# cutin: name
# photo: gt_album_a01 # photo_caption: ハネムーン・スペシャルの白鳥
ハネムーン・スペシャルです！
# speaker: narrator
サミールは胸を張った。
# speaker: narrator
# pause: 700
隣のこちらの部屋の寝台にも、まったく同じハートと白鳥が待っていた。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
は、ハネムーン！？　ち、違います、わたしたち、新婚じゃ……！
# speaker: narrator
皆さん、最初はそうおっしゃいます。三回説明して、三回とも笑顔で流された。去り際に置いていった名刺には、こう添えてあった。叔父はアーグラ一のガイドです。愛の物語なら、叔父に。
{ ending_reached:
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    ……恋人では、あるけど。新婚では、ない。そこは、大事なところだから
- else:
    # speaker: heroine
    # reaction: heroine,shy,blush
    どうしよう。白鳥、すごく仲良さそう。……見ないで、白鳥
}
# speaker: narrator
彼女は花びらを集め、捨てようとして手を止めた。洗面所のグラスに水を張り、そこへ浮かべる。
# speaker: heroine
用意してくれた人がいるんだもんね
# speaker: heroine
# emotion: worried
# recall: gt_album_d01
カムラさんに言われたのにな。言いたいことは言いなさいって。……今の、全然言えてなかった
# speaker: narrator
窓の外、家々の屋根の向こうに、白いドームの先がほんの少しだけのぞいていた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
あ……見えた。あれ、タージ・マハルの屋根だよね。写真で百回は見たのに、指先がそわそわする。……よし。誤解は、ちゃんと解く。その前に、どこから行こうか
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。
// 【3】足した札：ペーターを食べ切る
=== gt_agra_epilogue ===
# scene: epilogue
# person: gt_anwar
# on_done: use gt_agra_anwar_petha
# background: gt_bg_agra_hotel_hub
# speaker: narrator
宿に戻ると、ロビーの長椅子で、アンワルが甥とチャイを飲んでいた。銀の杖が、壁に立てかけてある。
# speaker: enemy
おお、本当の話のお嬢さん。今日の客の一人がね、明日もう一度タージへ行くそうだ。壁の書家の名前を、自分の目で探しに
# speaker: heroine
# reaction: heroine,surprised,sparkle
えっ……本当ですか
# speaker: enemy
本当の話だよ。わしは、嘘は物語の中でしかつかない
# speaker: narrator
彼はチャイを飲み干し、甥の肩を叩いて立ち上がった。
# speaker: enemy
部屋のことは、片付けさせておいたよ
# speaker: narrator
# recall: gt_album_a01
二つの部屋の扉を開けると、どちらも、ハートも白鳥も消えていた。寝台は、ただの白い寝台に戻っている。
{
- ending_reached:
    # speaker: heroine
    # reaction: heroine,shy,blush
    ……全部、片付いちゃった。ちょっとだけ残してもらえばよかった、かな。今のは、聞かなかったことにして
- romance_stage >= 3:
    # speaker: heroine
    片付けてもらえて、よかった。……よかった、はず。うん
- else:
    # speaker: heroine
    ほっとした。……ほっとしたのに、少しだけ寂しいのは、なんでだろう
}
# speaker: narrator
窓辺のグラスにだけ、着いた日の花びらが浮かんでいた。片付ける人も、それには手を出さなかったらしい。
# speaker: narrator
# local_word: gt_agra_word_petha
二人は宿の屋上に上がり、アンワルにもらった菓子の箱を開けた。半透明の、四角い砂糖漬け。ペーターは冬瓜からできているのだと、箱に書いてある。
# speaker: heroine
# reaction: heroine,happy,music
甘い……。でも、思ったより軽い。冬瓜って、こんなに化けるんだ
# speaker: narrator
暗い屋根の連なりの向こうに、タージの白いドームが、ぼんやり浮かんでいる。
# speaker: heroine
本当の話を、ちゃんと届く言葉で言うのって、難しいね。正しいだけじゃ、アンワルさんの言うとおり、誰も泣かない
# speaker: heroine
# emotion: serious
でも今日、自分の言葉で言えた。カムラさんに、報告できる
# speaker: narrator
彼女は鞄から、デリーでアマンにもらった案内を取り出した。ジャイプールの結婚式の日付を、指でなぞる。
# speaker: heroine
ジャイプールの結婚式、行きたい。誘われたからじゃなくて、わたしが行きたいの。……一緒に、来てくれる？
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    # recall: gt_album_a66
    今日、人前で『わたしたちのことは、わたしたちで決める』って言ったでしょう。あれ、恋人として言ったんだよ。ちゃんと届いてた？
- romance_stage >= 3:
    # speaker: heroine
    # recall: gt_album_a66
    今日、『二人で来たのは本当です』って言ったの、覚えてる？　……あれは、本当だから
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,teasing,blush
    人前で、『わたしたち』って言っちゃった。……勢いだからね。勢い、だから
- else:
    # speaker: heroine
    人前で話すの、すごく怖かった。隣にいてくれて、助かった。……ありがとう
}
# speaker: narrator
ペーターの最後の一切れを半分に割って、彼女は片方をこちらへ差し出した。新婚ではない二人の、アーグラ最後の夜だった。
-> END
