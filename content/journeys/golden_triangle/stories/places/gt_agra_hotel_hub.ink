INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（新しい書き方への形の移し替え。文は今のまま）と、宿で休む前のヴィノード（ツアーの紹介。2026-11-26）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
=== gt_agra_arrival ===
# scene: arrival
# background: gt_bg_agra_hotel_hub
# speaker: narrator
# photo: gt_album_a001 # photo_caption: 薔薇の花びらの道 # photo_with: gt_samir
アーグラの宿は、タージ・マハルの南門に近い路地の奥にあった。
# speaker: narrator
若い支配人のサミールが自ら彼女の部屋まで案内し、扉を開けた瞬間、{heroine_name}が固まった。
# background: gt_bg_agra_hotel_room_heart
# speaker: narrator
# se: door_open
足もとから寝台まで、薔薇の花びらが点々と道を作っていた。
# speaker: narrator
寝台の上では、タオルで折った白鳥が二羽、くちばしを寄せ合い、首でハートを描いている。
# speaker: gt_samir
# cutin: name
# photo: gt_album_a01 # photo_caption: ハネムーン・スペシャルの白鳥 # photo_with: gt_samir
# voice: gt_agra_arrival_samir_001
ハネムーン・スペシャルです！
# speaker: narrator
サミールは胸を張った。
# speaker: narrator
# pause: 700
隣のこちらの部屋にも、まったく同じ花びらの道と白鳥のハートが待っていた。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_arrival_001
は、ハネムーン！？　ち、違います、わたしたち、新婚じゃ……！
# speaker: gt_samir
# voice: gt_agra_arrival_samir_002
皆さん、最初はそうおっしゃいます。お若いお二人で、お部屋は隣同士。照れていらっしゃるだけです
# speaker: narrator
三回説明して、三回とも笑顔で流された。
# speaker: narrator
# leave: gt_samir
去り際にサミールが置いていった名刺には、こう添えてあった。
# speaker: narrator
「叔父アンワルは、アーグラ一のガイドです。愛の物語なら、叔父に」
{ ending_reached:
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # voice: gt_agra_arrival_002
    ……恋人では、あるけど。新婚では、ない。そこは、大事なところだから
- else:
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_arrival_003
    # photo: gt_album_a003 # photo_caption: 「見ないで、白鳥」 # photo_show: small
    どうしよう。白鳥、すごく仲良さそう。……見ないで、白鳥
}
# speaker: narrator
# photo: gt_album_a004 # photo_caption: グラスに浮かべた花びら
彼女は花びらを集め、捨てようとして手を止めた。洗面所のグラスに水を張って浮かべ、窓辺に置く。
# speaker: heroine
# voice: gt_agra_arrival_004
用意してくれた人がいるんだもんね
# speaker: heroine
# emotion: worried
# recall: gt_album_d001
# voice: gt_agra_arrival_005
カムラさんに言われたのにな。言いたいことは言いなさいって。……今の、全然言えてなかった
# speaker: narrator
窓の外、家々の屋根の向こうに、白いドームの先がほんの少しだけのぞいていた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# photo: gt_album_a005 # photo_caption: 屋根の向こうにのぞく白いドーム
あ……見えた。あれ、タージ・マハルの屋根だよね
# speaker: heroine
写真で百回は見たのに、指先がそわそわする。……よし
# speaker: heroine
誤解は、ちゃんと解く。その前に、どこから行こうか
-> END

// 宿で休む前（-1）：路地の入口の大通りで、駅の客を待つ運転手のヴィノードに会う。
// 夜だけ。ファテープル・シークリーをまだ見ておらず、ツアーを宿のフロントや予約サイトで買っていないとき（一度きり）。
// この場面を見ると、ファテープル・シークリー日帰りツアー（tours/gt_agra_tour_fatehpur_sikri.json）の紹介の販売 vinod_direct が出る（when: encounterSeen）。
// ツアーの朝は、cond("seen gt_agra_hotel_vinod") で顔見知りとして迎える（places/gt_agra_tour_fatehpur_sikri.ink）。ここで母のことは言わない（ツアーの車の中で初めて聞く）。金額と時刻は書かない。
=== gt_agra_hotel_vinod ===
# scene: talk
# at: hotel agra_hotel_hub
# priority: -1
# when: time night
# when: not episode gt_agra_main_fatehpur_sikri
# when: not tour gt_agra_tour_fatehpur_sikri by hotel_desk
# when: not tour gt_agra_tour_fatehpur_sikri by web
# person: gt_vinod
# sources: none
# background: gt_bg_agra_fatehabad_road
# bgm: late_night_radio
# ambience: gt_amb_street_traffic
# speaker: narrator
宿へ戻る路地の入口で、大通りの端に、白い車が一台寄せてあった。
# speaker: narrator
運転席の横に立った男が、紙を一枚、胸の前に掲げている。
# speaker: narrator
紙には、名前らしいものが書いてあった。らしい、としか言えない字だった。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_hotel_vinod_001
ラ……ラ、ジ……？　あっ、ごめんなさい。じっと読んじゃって
# speaker: gt_vinod
# cutin: name
ラジーヴさんです。駅から来るお客さん。列車が遅れています。……ヴィノードです。運転をしています
# speaker: gt_vinod
その字は、わたしが書きました。読めなくて、当然です
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_hotel_vinod_002
読めなかったの、わたしだけじゃなくて、よかった
# speaker: gt_vinod
明日の朝、このお客さんを、シークリーへ乗せていきます。ファテープル・シークリー。……お二人は、もう？
# speaker: heroine
# voice: gt_agra_hotel_vinod_003
まだです。宿の帳場で、ツアーの紙は見ました
# speaker: gt_vinod
宿で買うと、ガイドがつきます。予約のサイトで買うと、ほかのお客さんと乗り合い。運転は、どちらも、わたしです
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_agra_hotel_vinod_004
え、どっちも？
# speaker: gt_vinod
車は、わたしのものです。会社が、あちこちで売ってくれる
# speaker: gt_vinod
……わたしに直接頼めば、間に入る分が要りません。ガイドはいない
# speaker: gt_vinod
乗り合いでもない。わたしと、お二人だけ
# speaker: narrator
彼女が、半歩だけ下がった。
# speaker: heroine
# emotion: worried
# voice: gt_agra_hotel_vinod_005
ごめんなさい。デリーの駅で、道の上で親切な話をされたことがあって
# speaker: gt_vinod
それは、正しい。道の上の話は、疑ってください
# speaker: gt_vinod
宿の帳場で、ヴィノードの白い車か、と聞いてください。サミールさんが、知っています
# speaker: narrator
ちょうどそのとき、路地の奥から、サミールが顔を出した。
# speaker: gt_samir
あっ、ヴィノードさん！　今夜もお迎えですか。……そちらは、うちのハネムーンのお二人です
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_hotel_vinod_006
ち、違います！
# speaker: narrator
# leave: gt_samir
サミールは手を振って、帳場へ戻っていった。確かめるまでもなく、確かめられてしまった。
# speaker: gt_vinod
……ハネムーン
# speaker: heroine
# reaction: heroine,exasperated,sigh
# voice: gt_agra_hotel_vinod_007
違うんです。サミールさんの帳面の中だけ、です
# speaker: gt_vinod
分かりました。帳面の中だけ
# speaker: narrator
ヴィノードは、ダッシュボードから通行料の受け取りを一枚取り、裏に数字を並べた。名前の字よりは、ずっと読めた。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_hotel_vinod_008
数字は、読めます
# speaker: gt_vinod
数字だけは、ちゃんと書けます。運転手なので
# speaker: gt_vinod
どれで行くかは、お二人が決めることです。帳場でも、サイトでも、わたしでも
# speaker: heroine
# emotion: smile
# voice: gt_agra_hotel_vinod_009
ちゃんと、選ばせてくれるんですね
# speaker: narrator
ヴィノードの携帯が鳴った。列車が着いたらしい。彼は読めない名前の紙を助手席に置き、駅の方へ車を出した。
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。
// 【3】足した札：ペーターを食べ切る
=== gt_agra_epilogue ===
# scene: epilogue
# person: gt_anwar
# on_done: use gt_agra_anwar_petha
# background: gt_bg_agra_hotel_hub
# speaker: narrator
宿に戻ると、ロビーの長椅子で、アンワルが甥のサミールとチャイを飲んでいた。銀の杖が、壁に立てかけてある。
# speaker: enemy
# voice: gt_agra_epilogue_anwar_001
おお、本当の話のお嬢さん。今日の客の一人がね、明日もう一度タージへ行くそうだ。壁の書家の名前を、自分の目で探しに
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_agra_epilogue_001
えっ……本当ですか
# speaker: enemy
# voice: gt_agra_epilogue_anwar_002
本当の話だよ。わしは、嘘は物語の中でしかつかない
# speaker: narrator
彼はチャイを飲み干し、甥の肩を叩いて立ち上がった。
# speaker: enemy
# voice: gt_agra_epilogue_anwar_003
部屋のことは、片付けさせておいたよ
# speaker: gt_samir
# voice: gt_agra_epilogue_samir_001
叔父から、電話で聞きました。新婚では、なかったんですね。……失礼いたしました
# speaker: narrator
# photo: gt_album_a141 # photo_caption: ロビーのチャイ、帳面の一本線 # photo_with: gt_anwar gt_samir
サミールは帳面を開き、一行に、ていねいに線を引いた。それから、その横に、また何か書き足した。
# background: gt_bg_agra_hotel_room
# leave: gt_samir
# speaker: narrator
# recall: gt_album_a01
二つの部屋の扉を開けると、白鳥が消え、寝台はただの白い寝台に戻っていた。こちらの部屋の花びらの道も、もうない。
{
- ending_reached:
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_epilogue_002
    ……全部、片付いちゃった。ちょっとだけ残してもらえばよかった、かな。今のは、聞かなかったことにして
- romance_stage >= 3:
    # speaker: heroine
    # voice: gt_agra_epilogue_003
    片付けてもらえて、よかった。……よかった、はず。うん
- else:
    # speaker: heroine
    # voice: gt_agra_epilogue_004
    ほっとした。……ほっとしたのに、少しだけ寂しいのは、なんでだろう
}
# speaker: narrator
# photo: gt_album_a142 # photo_caption: ただの白い寝台
窓辺のグラスにだけ、着いた日の花びらが浮かんでいた。片付ける人も、それには手を出さなかったらしい。
# background: gt_bg_agra_hotel_rooftop_night
# tint: off
# speaker: narrator
# item_out: gt_agra_anwar_petha
# local_word: gt_agra_word_petha
二人は宿の屋上に上がり、アンワルにもらった菓子の箱を開けた。半透明の、四角い砂糖漬け。
# speaker: narrator
ペーターは冬瓜からできているのだと、箱に書いてある。
# speaker: heroine
# reaction: heroine,happy,music
# voice: gt_agra_epilogue_005
# photo: gt_album_a143 # photo_caption: 屋上のペーター
甘い……。でも、思ったより軽い。冬瓜って、こんなに化けるんだ
# speaker: narrator
暗い屋根の連なりの向こうに、タージの白いドームが、ぼんやり浮かんでいる。
# speaker: heroine
# voice: gt_agra_epilogue_006
本当の話を、ちゃんと届く言葉で言うのって、難しいね。正しいだけじゃ、アンワルさんの言うとおり、誰も泣かない
# speaker: heroine
# emotion: serious
# voice: gt_agra_epilogue_007
でも今日、自分の言葉で言えた。カムラさんに、報告できる
# speaker: narrator
# item_out: gt_delhi_aman_wedding_invitation
彼女は鞄から、カムラの孫のアマンがくれた案内を取り出した。
# speaker: narrator
# item_out: gt_delhi_aman_wedding_invitation
# photo: gt_album_a144 # photo_caption: 結婚式の日付を、指でなぞる
行くかどうかは自分で決めたくて、返事はまだ待ってもらっている。ジャイプールの式の日付を、指でなぞる。
# speaker: heroine
# voice: gt_agra_epilogue_008
ジャイプールの結婚式、行きたい。誘われたからじゃなくて、わたしが行きたいの。……一緒に、来てくれる？
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    # recall: gt_album_a138
    今日、人前で『わたしたちのことは、わたしたちで決める』って言ったでしょう
    # speaker: heroine
    あれ、恋人として言ったんだよ。ちゃんと届いてた？
- romance_stage >= 3:
    # speaker: heroine
    # recall: gt_album_a138
    # voice: gt_agra_epilogue_010
    今日、『二人で来たのは本当です』って言ったの、覚えてる？　……あれは、本当だから
- romance_stage == 2:
    # speaker: heroine
    # reaction: heroine,teasing,blush
    # voice: gt_agra_epilogue_011
    人前で、『わたしたち』って言っちゃった。……勢いだからね。勢い、だから
- else:
    # speaker: heroine
    # voice: gt_agra_epilogue_012
    人前で話すの、すごく怖かった。隣にいてくれて、助かった。……ありがとう
}
# speaker: narrator
# photo: gt_album_a145 # photo_caption: 半分に割った最後の一切れ
ペーターの最後の一切れを半分に割って、彼女は片方をこちらへ差し出した。新婚ではない二人の、アーグラ最後の夜だった。
-> END
