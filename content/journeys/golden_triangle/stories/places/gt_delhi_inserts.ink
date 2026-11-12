INCLUDE modules.ink
-> DONE

// デリーの差し込み（デートの後・宿・都市の出発）。どれも【4】の時点を使う。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_delhi_hotel_homework・gt_delhi_hotel_sick_morning・gt_delhi_depart_scam・gt_delhi_depart_station）。ほかは # sources: none。

// 【4】デートの後：写真屋に頼んだときだけ、刷った写真をもらう
=== gt_delhi_date_india_gate_print ===
# scene: talk
# at: date gt_delhi_date_india_gate
# priority: +1
# when: flag gt_delhi_photo_both_in
# on_done: item gt_delhi_family_photo
# sources: none
# background: gt_bg_delhi_india_gate
# speaker: narrator
別れぎわ、モヌが刷り上がった写真を、もう一枚頼んでくれた。一枚は村へ。もう一枚は、こちらへ。
# speaker: heroine
# emotion: smile
十四人。旅のアルバムに、知らない親戚が増えちゃった
-> END

// 【4】宿・眠る前：宿の娘ルーヒーの作文（腹を壊した夜の場面より先に流すため -2）
=== gt_delhi_hotel_homework ===
# scene: talk
# person: gt_roohi
# at: hotel delhi_hotel_hub
# priority: -2
# when: episodes delhi >= 1
# when: time night
# background: gt_bg_delhi_hotel_hub
{ cond("seen gt_delhi_hotel_sick_morning"):
    # speaker: narrator
    宿の帳場の机で、ルーヒーが鉛筆をかじっていた。クミンの水を持ってきてくれた、宿の娘だ。
    # speaker: enemy
    英語の作文の宿題なの。題は、デリーでいちばん好きな場所
- else:
    # speaker: narrator
    宿の帳場の机で、制服の女の子が鉛筆をかじっていた。
    # speaker: enemy
    # cutin: name
    あ、お客さん。わたし、ルーヒー。この宿の娘で、十三歳。英語の作文の宿題なの。題は、デリーでいちばん好きな場所
}
# speaker: enemy
先生は、インド門とか、赤い城とかって書いてほしいの。でも、わたしの好きな場所は、地下鉄の女性車両
# speaker: heroine
# reaction: heroine,surprised,question
女性車両？　地下鉄の？
# speaker: enemy
先頭の車両。女の人しか乗れないの。学校の行き帰りに、おばさんと乗るんだ。みんなしゃべって、笑って、お菓子を分けてくれる人もいて、床に座って宿題する子もいて
# speaker: enemy
隣のカムラおばあちゃんも常連なんだよ。運転手と喧嘩しなくていいからって。……もうすぐ、引っ越しちゃうけど
* [「それを書けばいい」 # option: write_the_metro]
    # rel: trust +1
    # set: gt_delhi_roohi_metro_essay
    # speaker: enemy
    でも、点が低かったら？
    # speaker: heroine
    # emotion: smile
    低くても、ルーヒーさんの好きな場所は変わらないよ。先生が知らない場所を教えてあげるの、ちょっと気持ちよくない？
    # speaker: enemy
    ……気持ちいいかも
* [「インド門の方が、点はもらえるかも」 # option: write_the_monument]
    # speaker: enemy
    やっぱり？　……うん、そうする。そっちの方が、ママも怒らないし
    # speaker: narrator
    ルーヒーは消しゴムで「女性車両」を消しはじめた。彼女が、その手元を少し寂しそうに見ていた。
    # speaker: heroine
    ねえ。インド門のを出して、女性車両のは、自分用に書いておくのはどう？　誰にも見せない作文も、あっていいと思う
* [「どうして、そこが好きなの？」 # option: ask_why_metro]
    # rel: affection +1
    # set: gt_delhi_roohi_metro_essay
    # speaker: enemy
    家だと、わたし、いちばん下だから。お兄ちゃんにも、ママにも、お客さんにも、ルーヒー、あれ持ってきて、って言われる
    # speaker: enemy
    女性車両だと、わたしも、ただの乗客の一人。……それが好き。変？
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    変じゃない。全然。そっか、それ、すごくよく分かる
-
# speaker: heroine
# emotion: smile
わたしもね、小学生のとき、『好きな場所』の作文に、近所のコインランドリーって書いたの。回ってる洗濯物を見てると、落ち着くから
# speaker: heroine
# reaction: heroine,teasing,music
先生、すごく困った顔してた。でも、あの作文が、今でもいちばん好き
# speaker: enemy
コインランドリー……。日本の子って、変
# speaker: heroine
うん。お互いさまだね
-> END

// 【4】宿・眠る前：腹を壊したのが主人公のとき（夜中の場面なので夜だけ）
=== gt_delhi_hotel_sick_night_player ===
# scene: talk
# at: hotel delhi_hotel_hub
# priority: -1
# when: flag gt_delhi_player_sick
# when: time night
# until: seen gt_delhi_hotel_sick_morning
# sources: none
# background: gt_bg_delhi_hotel_hub
# bgm: meditation_impromptu_01
# speaker: narrator
# quiet: scene
夜中の二時。宿の廊下の長椅子で、こちらは天井の扇風機を見上げていた。洗面所との往復は、もう三回目になる。
# se: door_open
隣の部屋の扉が、そっと開いた。パーカーのフードをかぶった彼女が、顔だけ出す。
# speaker: heroine
# reaction: heroine,exasperated,sigh
やっぱり。扉の音が、三回したから。最後の一個でしょ
# speaker: narrator
彼女は小さなポーチを持って出てきた。中には、薬、絆創膏、使い捨てのカイロ、粉の袋が、きっちり並んでいる。
# speaker: heroine
心配性だから、全部持ってきたの。笑っていいよ。でも、今日は役に立つでしょ
# speaker: narrator
彼女は粉を水のボトルに入れて振った。脱水を防ぐための、塩と砂糖の粉だという。
* [「大丈夫。寝てて」 # option: im_fine]
    # rel: trust -1
    # speaker: heroine
    # emotion: serious
    大丈夫な人は、二時に廊下にいないよ
    # speaker: heroine
    起こしたくなかったのは、分かる。でも、わたしだって、たまには頼られたい。……これ飲むまでは、戻らないから
* [「……ちょっとだけ、いてくれる？」 # option: stay_a_little]
    # rel: affection +1, trust +1
    # speaker: heroine
    # reaction: heroine,surprised,blush
    えっ。……うん。言ってくれて、うれしい
    # speaker: heroine
    # emotion: smile
    いつも、わたしが聞いてもらう方だから。今日は逆だね
* [「次は勝つ」 # option: next_time_i_win]
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    勝負してたの？　もう、ふふっ。夜中なのに、笑わせないでよ
-
# speaker: narrator
ボトルを受け取って飲むと、塩の薄いスポーツドリンクのような味がした。彼女は長椅子の端に座り、壁に頭をもたせかける。
# speaker: heroine
屋台のおじさん、明日もあそこで、誰かのお腹を壊してるのかな
# speaker: narrator
# photo: gt_album_d40 # photo_caption: 夜中二時の廊下、看病の人が先に眠る
返事を考えているうちに、隣から静かな寝息が聞こえてきた。看病に来た人が、先に眠っている。扇風機だけが、律儀に回り続けていた。
-> END

// 【4】宿・眠る前：腹を壊したのがヒロインのとき（夜だけ）
=== gt_delhi_hotel_sick_night_heroine ===
# scene: talk
# at: hotel delhi_hotel_hub
# priority: -1
# when: flag gt_delhi_heroine_sick
# when: time night
# until: seen gt_delhi_hotel_sick_morning
# sources: none
# background: gt_bg_delhi_hotel_hub
# bgm: meditation_impromptu_01
# speaker: narrator
# quiet: scene
# se: phone_vibrate
夜中の二時。携帯が一度だけ震えた。彼女からだった。
# speaker: heroine
# phone: received
起きてる？
# speaker: narrator
返事を打つ前に、二通目が来た。
# speaker: heroine
# phone: received
やっぱりいい。寝て
# speaker: narrator
廊下に出ると、彼女が長椅子で膝を抱えていた。顔が白い。
# speaker: heroine
# emotion: worried
……起こしちゃった。ごめん。大丈夫、大丈夫だから
# speaker: heroine
最後の一個、自分で食べたいって言ったんだもん。自業自得。屋台のおじさんが、すごくうれしそうだったから、断れなくて
* [黙って隣に座る # option: sit_beside]
    # rel: affection +1
    # speaker: heroine
    ……いいって言ったのに
    # speaker: narrator
    # stand: close
    彼女はそれ以上何も言わず、こちらの肩に、少しだけ寄りかかった。
* [「大丈夫なら、戻るよ」 # option: take_her_word]
    # rel: trust +1
    # speaker: heroine
    ……うん
    # speaker: narrator
    背を向けかけたところで、袖を引かれた。
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    待って。……やっぱり、いて。大丈夫じゃない。ちゃんと言うの、まだ下手だね、わたし
* [「宿の台所で、お湯をもらってくる」 # option: fetch_hot_water]
    # rel: trust +1
    # speaker: heroine
    夜中だよ。起こしたら悪い……って言っても、行くんだよね
    # speaker: heroine
    じゃあ、わたしの青いポーチも持ってきて。粉の袋が入ってる。心配性で持ってきたのが、自分に効くとは思わなかった
-
# speaker: narrator
# photo: gt_album_d41 # photo_caption: 最後の一個を譲った夜
天井の扇風機が、ゆっくり回っている。彼女は膝にあごをのせて、小さく息を吐いた。
# speaker: heroine
お腹いっぱいって、言えばよかった。バスって、言えればよかった。……今度は、言う。屋台でも、ほかの所でも
-> END

// 【4】宿・起きた後：宿の家族が来る
=== gt_delhi_hotel_sick_morning ===
# scene: talk
# person: gt_roohi
# at: hotel delhi_hotel_hub
# priority: +1
# when: flag gt_delhi_golgappa_sick
# background: gt_bg_delhi_hotel_hub
# bgm: morning
{ cond("flag gt_delhi_player_sick"):
    # speaker: narrator
    # se: door_knock
    朝、こちらの部屋の扉を叩く音がした。開けると、宿のおかみが、湯気の立つ鍋を抱えて立っていた。後ろには、制服姿の娘が、コップを両手で持っている。
    { cond("seen gt_delhi_hotel_sick_night_player"):
        # speaker: narrator
        廊下の長椅子では、彼女が目をこすりながら起き上がるところだった。肩には、こちらの部屋の毛布がかかっている。ゆうべ、先に眠ってしまった彼女を起こせなくて、毛布をかけてから部屋に戻ったのだった。
    - else:
        # speaker: narrator
        ノックの音で、隣の部屋の扉も開いた。彼女が、心配そうに顔を出す。
    }
- else:
    # speaker: narrator
    # se: door_knock
    朝、隣の部屋の扉を叩く音がした。廊下に出てみると、宿のおかみが、湯気の立つ鍋を抱えて立っていた。後ろには、制服姿の娘が、コップを両手で持っている。
    彼女の部屋の扉が、細く開いた。
}
# speaker: gt_delhi_hotel_okami
# local_word: gt_delhi_word_khichdi
キチュリー。米と豆を、やわらかく煮たの。うちでは、お腹を壊したら、これ。……外国の人は、みんなゴルガッパでやられるの。チャンドニー・チョークでしょ。分かるのよ、顔で
{ cond("seen gt_delhi_hotel_homework"):
    # speaker: enemy
    クミンの水。わたしが作った。……宿題を手伝ってくれたお礼、半分ね
- else:
    # speaker: enemy
    # cutin: name
    わたし、ルーヒー。十三歳。これは、クミンを煮出した水
    # speaker: enemy
    わたし、ゴルガッパなら百個食べても平気。デリーの子だから
}
# speaker: gt_delhi_hotel_okami
百個は嘘。この子は四十個で、一晩泣いたの。それと、あんたは学校。もう七時半よ
# speaker: enemy
病人の看病は、学校より大事って、先生も言ってた
# speaker: gt_delhi_hotel_okami
言ってない
{ cond("flag gt_delhi_player_sick"):
    # speaker: narrator
    彼女が鍋を受け取り、身振りと片言の英語で、おかみと何か話をつけた。昼まで部屋で寝ていること。夕方に、もう一度お粥をもらうこと。
    # speaker: heroine
    # emotion: smile
    今日は、わたしが決める日。午前中は休み。異議は受けつけません
    # speaker: heroine
    # reaction: heroine,teasing,music
    いつも、どこへ行くか決めてもらってるから。たまには、ね
- else:
    # speaker: narrator
    彼女は毛布にくるまったまま扉にもたれて、親子のやりとりを聞きながら、弱々しく笑っていた。
    # speaker: heroine
    # emotion: smile
    いいなあ。うちの朝も、こんなふうに、うるさかった。キチュリー、やさしい味がする
}
# speaker: narrator
ルーヒーは母親に背中を押されて、ようやく玄関へ向かった。振り返って、ひとこと。
# speaker: enemy
次は、バスって言うんだよ。最初の一個の前に
-> END

// 都市の出発の前：ニューデリー駅前の「劇場」
// 旅行者を狙う組織的な詐欺（「列車は運休」「本当の窓口は向かい」と言って近くの路地の私設の旅行会社へ連れて行き、何倍もの値段のツアーを売る）を、
// 二人が見抜いて抜け出す話。最初のオートリキシャの場面（別の作業）と重ならないよう、徒歩だけで進める。手付金を払うと戻らない（額は案）。
// 【4】
=== gt_delhi_depart_scam ===
# scene: talk
# at: depart delhi
# priority: -2
# background: gt_bg_delhi_station_front
# bgm: gt_vadodora
# speaker: narrator
宿の主人の車を降りると、ニューデリー駅の正面は、人と荷物と呼び込みの声で埋まっていた。道の向かいはパハールガンジ。安宿と土産物屋と両替屋の看板が、空が見えないほど重なっている。
アーグラ行きの列車まで、あと五十分。彼女が携帯で乗車券を確かめていると、白いシャツに首から名札を下げた青年が、すっと隣に並んだ。
# speaker: gt_delhi_scam_young_man
Agra? Your train is cancelled today.
# speaker: narrator
アーグラ行きの列車は、今日は運休だという。今朝、決まったのだと。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
えっ、運休？
# speaker: gt_delhi_scam_young_man
外国の方の振り替えは、観光客の窓口でしかできません。でも、駅の中の窓口は、今日は工事で閉まっています。臨時の窓口が、道の向かいに。歩いて五分です
# speaker: narrator
そこへ、反射材のベストを着て、無線機を持った男が通りかかった。青年が声をかけると、男は面倒くさそうにうなずいた。
# speaker: gt_delhi_scam_vest_man
アーグラ？　運休、運休。早く向かいの窓口へ。代わりの席が、なくなるよ
# speaker: heroine
# emotion: worried
二人とも、同じこと言ってる……。わざわざ教えてくれたんだし、話だけでも、聞いてみる？
* [「話を聞くだけなら」と、ついて行く # option: just_listen]
    -> across_the_road
* [「先に、駅の掲示板を見よう」と言う # option: check_the_board]
    # set: gt_delhi_scam_doubted
    # speaker: gt_delhi_scam_young_man
    掲示板は、表示が遅れるんです。待っていたら、代わりの席も埋まりますよ。こちらです、早く
    # speaker: narrator
    青年は、もう彼女の荷物に手をかけて歩き出していた。置いていくわけにはいかない。
    -> across_the_road
* [携帯で、鉄道の公式アプリを開く # option: open_the_app]
    # set: gt_delhi_scam_checked
    # speaker: narrator
    電波が弱く、画面がなかなか切り替わらない。ようやく出た表示は、「定刻」だった。
    # speaker: gt_delhi_scam_young_man
    アプリは古い情報です。今朝決まったことは、まだ載りません
    # speaker: heroine
    # emotion: worried
    でも……もし本当だったら。乗り遅れたら、アーグラの宿も、全部ずれちゃう
    -> across_the_road

= across_the_road
# background: gt_bg_delhi_paharganj
# speaker: narrator
道を渡り、大通りから一本入った路地の、狭い階段を上がる。扉には、大きな英語の看板。政府公認・観光案内所。中にはインドの旗が飾られ、額に入った「証明書」が壁に並び、天井の扇風機がゆっくり回っていた。
背広の男が、にこやかに立ち上がった。
# speaker: gt_delhi_scam_suit_man
座ってください。まずはチャイを
# speaker: gt_delhi_scam_suit_man
切符を拝見。……ああ、本当だ。運休ですね。しかも、婚礼の季節で、アーグラ行きは三日先まで満席です
# speaker: narrator
男はこちらに背を向けた画面を見ながら、首を振った。それから電話をかけ、受話器をこちらに向けた。
# speaker: gt_delhi_scam_suit_man
駅長です
# speaker: gt_delhi_scam_phone_voice
運休です。運休です
# speaker: gt_delhi_scam_suit_man
ご安心を。車と運転手をご用意できます。アーグラとジャイプール、ホテル込み。特別価格です。手付金だけ先にいただければ、今すぐ車を押さえます
# speaker: narrator
示された額は、二人の旅の予算を全部足しても、まるで届かない数字だった。
# speaker: heroine
# reaction: heroine,surprised_big,sweat
# shake: window
# se: impact_thud
この値段！？
# speaker: narrator
男は分厚いノートを机に置いた。ここで旅を決めた人たちの感想だという。開くと、日本語がびっしり並んでいた。
* [手付金だけ払って、考える時間をもらう # option: pay_deposit]
    # money: -500
    # set: gt_delhi_scam_paid
    # speaker: narrator
    男は札を数え、満足そうに引き出しにしまった。
    # speaker: gt_delhi_scam_suit_man
    契約書を用意します
    # speaker: narrator
    男が立ち上がる。その間、彼女はノートをめくっていた。
* [「その電話の相手と、直接話させてください」 # option: ask_the_caller]
    # rel: trust +1
    # speaker: gt_delhi_scam_suit_man
    駅長はお忙しい。二度はかけられません。それより、こちらの感想を
    # speaker: narrator
    男は話をそらすように、ノートを彼女の方へ押しやった。
* [ノートを手に取り、彼女にも見せる # option: share_the_notebook]
    # rel: affection +1
    # speaker: narrator
    二人で、ノートをのぞきこんだ。
-
# speaker: narrator
とても親切でした。この人はしんらいできます。わたしはまんぞくしました。名前は、タナカ、スズキ、サトウ。日付は、三年にわたっていた。
彼女の指が、ページの上で止まった。
# speaker: heroine
# emotion: serious
# pause: 600
……これ、全部、同じ人の字だよ
# speaker: heroine
『と』の書き順が、全部同じ癖。インクも、三年分なのに、全部同じ青。……日本人が書いた日本語じゃない、と思う
{
- cond("flag gt_delhi_scam_checked"):
    # speaker: heroine
    それに、さっきのアプリ、『定刻』って出てた。古いのは、たぶん、こっちの話の方
- cond("flag gt_delhi_scam_doubted"):
    # speaker: heroine
    掲示板を見ようって言われたとき、すごく急がせたよね。見られたら、困るみたいに
}
# speaker: narrator
# se: book_close
彼女は、手をつけていないチャイの横にノートを閉じて置き、立ち上がった。背広の男の目を、まっすぐ見る。
# speaker: heroine
# photo: gt_album_d84 # photo_caption: 偽の案内所で「No, thank you.」
# size: large
No, thank you.
# speaker: narrator
はっきりした英語だった。それから、こちらにも聞こえるように、日本語で言い直す。
# speaker: heroine
けっこうです。自分で、確かめます
# speaker: gt_delhi_scam_suit_man
列車に乗り遅れますよ。後で泣いても、知りません
# speaker: heroine
それなら、自分で確かめて、乗り遅れます
{ cond("flag gt_delhi_scam_paid"):
    # speaker: narrator
    手付金を返してほしいと言うと、男の笑顔が消えた。
    # speaker: gt_delhi_scam_suit_man
    返金はできません。契約の決まりです
    # speaker: narrator
    机の向こうで、引き出しはもう鍵がかかっていた。
    # speaker: heroine
    # emotion: serious
    ……行こう。取り返すより、電車。ここで揉めて、もっと何かなくすのは嫌
}
# background: gt_bg_delhi_station_front
# speaker: narrator
階段を駆け下り、道を渡る。駅の入口で、赤いシャツの荷運びの男が、こちらの出てきた路地を見て、首を振った。
# speaker: gt_delhi_porter
あの路地の上の部屋だろう。毎日だよ。……観光客の窓口なら、駅の二階。今日も開いてる。列車は、あれを見な
# speaker: narrator
男が顎で示した電光掲示板に、アーグラ行きの列車が出ていた。定刻。発車番線も、ちゃんと表示されている。
# background: gt_bg_delhi_station
# speaker: narrator
念のため、ホームにいた黒い上着の検札係に乗車券を見せると、彼は画面を一瞥して、うなずいただけだった。
# speaker: gt_delhi_ticket_checker
運休だと言われて、ここまで走ってくる人は、毎日いますよ。……間に合った人は、運がいい
# speaker: narrator
ホームのベンチに座りこむと、彼女は大きく息を吐いた。手が、少し震えていた。
# speaker: heroine
親切だと思ったのが、全部、お芝居だった。名札も、ベストも、電話の声も。……悔しい。最初に、ついて行こうって言ったの、わたしだから
# speaker: heroine
# emotion: serious
でも、教えてくれた荷運びの人も、検札の人も、本物だった。宿のご主人も、ルーヒーさんも。……疑うのは疲れるけど、全部を疑うようには、なりたくないな
{ cond("flag gt_delhi_scam_paid"):
    # speaker: heroine
    手付金は、高い授業料だったね。……ううん、やっぱり悔しい。でも、払ったのは一人のせいじゃないよ。二人で、あの部屋まで行ったんだから
}
{ cond("flag gt_delhi_said_bas"):
    # speaker: heroine
    # reaction: heroine,exasperated,sigh
    ノー・サンキューって、ゴルガッパの『バス』より、ずっと言いにくかった
}
* [「よく気づいたね」 # option: well_spotted]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    字を見るの、好きだから。手書きの看板とか、メニューとか。好きなことが、役に立った
* [「もっと早く止めればよかった」 # option: should_have_stopped]
    # rel: affection +1
    # speaker: heroine
    ううん。一人で全部背負わないで。止められなかったのは、わたしも同じ。次は、二人で、先に掲示板を見よう
* [「次からは、知らない人の話と掲示板、半分ずつ信じよう」 # option: half_and_half]
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,teasing,music
    半分ずつ、いいね。全部疑うのも、全部信じるのも、嫌だもん
- -> END

// 【4】都市の出発：ホーム（荷運び・ルーヒーの作文の結果・スレーシュからの知らせ）
=== gt_delhi_depart_station ===
# scene: talk
# at: depart delhi
# priority: -1
# background: gt_bg_delhi_station
# bgm: gt_vadodora_chill_mix
# speaker: narrator
ホームは、発車を待つ人であふれていた。赤いシャツに真鍮の腕章をつけた荷運びの男たちが、スーツケースを三つ、頭の上に積んで、人の間をすり抜けていく。
# local_word: gt_delhi_word_sahayak
昔は「クーリー」と呼ばれた彼らは、今は「サハーヤク」――助ける人、という名前に変わっている。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
見て、頭の上に三つ！　しかも走ってる。あれ、首、どうなってるんだろう
{ cond("seen gt_delhi_hotel_homework"):
    -> roohi_news
- else:
    -> messages
}

= roohi_news
# speaker: narrator
駅まで送ってくれた宿の主人から、携帯に伝言が届いた。娘から頼まれたのだという。
{ cond("flag gt_delhi_roohi_metro_essay"):
    # speaker: gt_delhi_hotel_owner
    # phone: received
    作文、先生がクラスで読み上げたそうです。点は、まあまあ。でも本人は大喜びで。女性車両の子たちが、拍手してくれたとか
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    よかった！　まあまあの点で、大喜び。それ、いちばんいい成績だと思います
- else:
    # speaker: gt_delhi_hotel_owner
    # phone: received
    インド門の作文、満点だったそうです。……それと、家で、もう一つ書いていました。女性車両のを。誰にも見せないそうです。親にも
    # speaker: heroine
    # emotion: smile
    そっか。書いたんだ。ふふ、よかった
}
# speaker: narrator
伝言には、追伸がついていた。
# speaker: gt_delhi_hotel_owner
# phone: received
追伸。駅前で、運休だと言われても、信じないように。毎年、うちのお客さんの誰かが引っかかるので
# speaker: heroine
# reaction: heroine,exasperated,sweat
……一時間、遅かった
-> messages

= messages
{
- cond("flag gt_delhi_suresh_encouraged"):
    # speaker: narrator
    # se: phone_vibrate
    携帯が震えた。ローディー・ガーデンの笑う会の連絡に、長い伝言が一つ流れてきた。差出人は、新聞で顔を隠していた、あの人だ。
    # speaker: gt_suresh
    # phone: received
    自主申告をした。夕食の席で。誰も笑わなかった。最初に拍手をしたのは、メヘルだった
    # speaker: gt_suresh
    # phone: received
    それから、メヘルにも申告があるそうだ。今夜、カビールという青年が夕食に来る。……わしは、何も知らなかったことにしておく
    # speaker: heroine
    # reaction: heroine,happy,heart
    二人とも、自分の口で言えたんだ。叔父さんが先に言ったから、メヘルさんも言えたのかな
- cond("flag gt_delhi_suresh_kept_secret"):
    # speaker: narrator
    笑う会の連絡に、写真が一枚流れてきた。ローディー・ガーデンの集合写真。端の一人の顔にだけ、大きな薔薇の絵が貼ってある。その人から、一行だけ添えられていた。
    # speaker: gt_suresh
    # phone: received
    この写真には、誰も写っていない
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    ふふっ。顔は隠れてるのに、誰だかすぐ分かる
}
# speaker: narrator
# se: old_bell
発車のベルが鳴った。窓の外を、赤いシャツが一つ、また一つと流れていく。
# speaker: heroine
デリーって、最初は押しの強い町だと思ってた。押されてるうちに、こっちも、ちょっとだけ押し返せるようになった気がする
-> END
