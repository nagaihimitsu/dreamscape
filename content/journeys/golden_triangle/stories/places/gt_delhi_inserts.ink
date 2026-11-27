INCLUDE modules.ink
-> DONE

// デリーの差し込み（旅の始まり・デートの後・宿・都市の出発）。どれも【4】の時点を使う。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_delhi_arrive_hands・gt_delhi_hotel_homework・gt_delhi_hotel_sick_morning・gt_delhi_depart_scam・gt_delhi_depart_scam_office・gt_delhi_depart_station）。ほかは # sources: none。
// 推理クイズ（# scene: battle）の gt_delhi_depart_scam_quiz は出典の決まりの対象外。事実の出典は、問題と手がかりの出典に書く。

// 【4】到着・ロゴの前（-1）：旅のいちばん最初の場面。オープニングムービーの後、「デリー」のロゴの前に流れる（2026-11-23）。
// 意図：空港の到着の広間の「手の彫刻（ムドラー）」で、インド編の通し線「言わなかった言葉」を、最初の一枚の絵で見せる。
// 手で話す（ムドラー）→ 首で話す（首を揺らすしぐさ）→ 彼女は自分の声で答える、の三段。看板は読めるが、手と首はまだ読めない。
// 彼女の答え「写真でしか知らなかったものを、自分の目で」は、すぐ後のカムラの「写真がきれいすぎる」と、旅の願い（バイブル第II部02）につながる。
// 主人公の答え（英語の3択）に正解はない。どれも彼女が後ろで聞いていて、ひとこと返す。
// 「くじゃく」の手は、後の場面では回収していない（拾うなら、旅のどこで手の形を見せてもよい）。
=== gt_delhi_arrive_hands ===
# scene: talk
# at: arrive delhi
# priority: -1
# background: gt_bg_delhi_airport_mudras
# bgm: gt_mystical_bazaar
# speaker: narrator
動く歩道を乗り継いで、入国審査の広間に出たとたん、{heroine_name}の足が止まった。
# speaker: narrator
銅色の円盤を敷きつめた壁から、白く大きな手が、いくつも突き出している。
# speaker: heroine
# reaction: heroine,surprised_big,sparkle
わ……見て。手だよ。壁から、おっきな手が生えてる
# speaker: heroine
# emotion: smile
指の形が、全部ちがうね。てのひらに、お花まで彫ってある
# speaker: heroine
# reaction: heroine,surprised,question
何か、言ってるみたい。……看板なら読めるのに、これは読めないな
# speaker: narrator
隣の列から、くすっと笑う声がした。仕切りのベルトの向こうで、十歳くらいの女の子がこちらを見上げている。
# speaker: gt_delhi_airport_girl
# term: gt_term_mudra
あれ、ムドラーだよ。踊りの手。わたしの習ってる踊りもね、手でお話しするの
# speaker: narrator
女の子は片手を上げ、親指と薬指の先をくっつけて、ほかの指をまっすぐにそろえた。
# speaker: gt_delhi_airport_girl
これ、なーんだ
# speaker: heroine
# reaction: heroine,surprised,sweat
えっ。えっと……キツネ？
# speaker: gt_delhi_airport_girl
# term: gt_term_peacock
ちがうよ。くじゃく！
# speaker: narrator
女の子が手首をくるりと返すと、そろえた指が、ふわりと揺れた。
# speaker: heroine
# reaction: heroine,happy,sparkle
ほんとだ、くじゃく。くっつけた指がくちばしで、そろえた指が頭の羽なんだ
# speaker: narrator
並んでいた祖母らしい人が女の子の肩をたたき、てのひらで小さく前をあおいだ。列が進んでいる。
# speaker: gt_delhi_airport_girl
今のは、踊りの手じゃないよ。『早く進みなさい』の手
# speaker: narrator
女の子は手を振って、祖母と窓口のほうへ進んでいった。
# speaker: narrator
{heroine_name}は自分の指で、くじゃくを作ってみた。薬指が、なかなか親指に届かない。
# speaker: heroine
# emotion: happy
見て、くじゃく。……インドで最初に覚えた言葉、手だった
# speaker: narrator
やがて、こちらの番が来た。係官がパスポートの写真とこちらの顔を見比べ、短く聞く。
# speaker: gt_delhi_immigration_officer
入国の目的は？
* [Sightseeing. Delhi, Agra, Jaipur. # option: say_the_route # translation: 観光です。デリー、アーグラ、ジャイプール。]
    # speaker: narrator
    係官はうなずき、何も聞き返さずにパスポートを返した。
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    一行で通った……。わたし、答えを三通りも練習してきたのに
* [To see the Taj Mahal. # option: say_the_taj # translation: タージ・マハルを見に。]
    # rel: affection +1
    # speaker: gt_delhi_immigration_officer
    タージだけ？　デリーにも、見るものはたくさんありますよ
    # speaker: heroine
    # reaction: heroine,shy,sweat
    ですよね！　……あ、すみません。今のは、わたしの番じゃなかった
* [I don't know yet. That's why I came. # option: say_not_yet # translation: まだ分かりません。だから来ました。]
    # rel: spark +1
    # speaker: narrator
    係官は顔を上げ、こちらを少し眺めてから、パスポートを返した。
    # speaker: gt_delhi_immigration_officer
    分かったら、帰りに教えてください
    # speaker: heroine
    # reaction: heroine,teasing,music
    ふふ。今の、ちょっと格好つけたでしょ
-
# speaker: narrator
次は、{heroine_name}の番だ。窓口の前に立つと、彼女は一度だけ、先に抜けたこちらを見た。
# speaker: gt_delhi_immigration_officer
入国の目的は？
# speaker: heroine
# emotion: serious
観光です。……それと、写真でしか知らなかったものを、自分の目で見に来ました
# speaker: narrator
# se: stamp
係官はスタンプを押し、パスポートを返した。それから、首を左右に小さく揺らした。
# speaker: heroine
# reaction: heroine,surprised,question
ねえ、今の首。いいってこと？　だめってこと？
# speaker: narrator
# term: gt_term_head_bobble
パスポートには、ちゃんとスタンプが押してある。たぶん、いいという意味だ。
# speaker: heroine
# reaction: heroine,teasing,music
看板は読める。手は、一つ覚えた。首は……まだ、読めないな
-> END

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
# item_show: gt_delhi_family_photo
別れぎわ、モヌが刷り上がった写真を、もう一枚頼んでくれた。一枚は村へ。もう一枚は、こちらへ。
# speaker: heroine
# emotion: smile
# voice: gt_delhi_date_india_gate_print_001
# photo: gt_album_d098 # photo_caption: 十四人の刷り上がり写真 # photo_with: gt_monu
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
# background: gt_bg_delhi_hotel_hub_night
# tint: off
{ cond("seen gt_delhi_hotel_sick_morning"):
    # speaker: narrator
    # term: gt_term_cumin_water
    宿の帳場の机で、ルーヒーが鉛筆をかじっていた。クミンの水を持ってきてくれた、宿の娘だ。
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_001
    英語の作文の宿題なの。題は、デリーでいちばん好きな場所
- else:
    # speaker: narrator
    宿の帳場の机で、制服の女の子が鉛筆をかじっていた。
    # speaker: enemy
    # cutin: name
    # voice: gt_delhi_hotel_homework_roohi_002
    あ、お客さん。わたし、ルーヒー。この宿の娘で、十三歳。英語の作文の宿題なの。題は、デリーでいちばん好きな場所
}
# speaker: enemy
# voice: gt_delhi_hotel_homework_roohi_003
先生は、インド門とか、赤い城とかって書いてほしいの。でも、わたしの好きな場所は、地下鉄の女性車両
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_delhi_hotel_homework_001
女性車両？　地下鉄の？
# speaker: enemy
# voice: gt_delhi_hotel_homework_roohi_004
先頭の車両。女の人しか乗れないの。学校の行き帰りに、おばさんと乗るんだ。みんなしゃべって、笑って、お菓子を分けてくれる人もいて、床に座って宿題する子もいて
# speaker: enemy
# voice: gt_delhi_hotel_homework_roohi_005
隣のカムラおばあちゃんも常連なんだよ。オートの運転手と喧嘩しなくていいからって。……もうすぐ、引っ越しちゃうけど
# speaker: narrator
ルーヒーのノートには、題と、一行目の「女性車両」だけ。その先は、まだ白い。
* [「それを書けばいい」 # option: write_the_metro]
    # rel: trust +1
    # set: gt_delhi_roohi_metro_essay
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_006
    でも、点が低かったら？
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_hotel_homework_002
    低くても、ルーヒーさんの好きな場所は変わらないよ。先生が知らない場所を教えてあげるの、ちょっと気持ちよくない？
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_007
    ……気持ちいいかも
* [「インド門の方が、点はもらえるかも」 # option: write_the_monument]
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_008
    やっぱり？　……うん、そうする。そっちの方が、ママも怒らないし
    # speaker: narrator
    # emotion: worried
    ルーヒーは消しゴムで「女性車両」を消しはじめた。彼女が、その手元を少し寂しそうに見ていた。
    # speaker: heroine
    # voice: gt_delhi_hotel_homework_003
    ねえ。インド門のを出して、女性車両のは、自分用に書いておくのはどう？　誰にも見せない作文も、あっていいと思う
* [「どうして、そこが好きなの？」 # option: ask_why_metro]
    # rel: affection +1
    # set: gt_delhi_roohi_metro_essay
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_009
    家だと、わたし、いちばん下だから。お兄ちゃんにも、ママにも、お客さんにも、ルーヒー、あれ持ってきて、って言われる
    # speaker: enemy
    # voice: gt_delhi_hotel_homework_roohi_010
    女性車両だと、わたしも、ただの乗客の一人。……それが好き。変？
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    # voice: gt_delhi_hotel_homework_004
    変じゃない。全然。そっか、それ、すごくよく分かる
-
# speaker: narrator
かじっていた鉛筆が、やっと紙の上で動きはじめた。
# speaker: heroine
# emotion: smile
# voice: gt_delhi_hotel_homework_005
# photo: gt_album_d099 # photo_caption: 帳場の机のルーヒーと「女性車両」の作文 # photo_with: gt_roohi
わたしもね、小学生のとき、『好きな場所』の作文に、近所のコインランドリーって書いたの。回ってる洗濯物を見てると、落ち着くから
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_hotel_homework_006
先生、すごく困った顔してた。でも、あの作文が、今でもいちばん好き
# speaker: enemy
# voice: gt_delhi_hotel_homework_roohi_011
コインランドリー……。日本の子って、変
# speaker: heroine
# voice: gt_delhi_hotel_homework_007
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
# background: gt_bg_delhi_hotel_corridor
# bgm: meditation_impromptu_01
# speaker: narrator
# quiet: scene
夜中の二時。宿の廊下の長椅子で、こちらは天井の扇風機を見上げていた。洗面所との往復は、もう三回目になる。
# se: door_open
隣の部屋の扉が、そっと開いた。パーカーのフードをかぶった彼女が、顔だけ出す。
# speaker: heroine
# reaction: heroine,exasperated,sigh
# voice: gt_delhi_hotel_sick_night_player_001
やっぱり。扉の音が、三回したから。最後の一個でしょ
# speaker: narrator
# photo: gt_album_d100 # photo_caption: 夜中二時、ポーチを持ったフード姿
彼女は小さなポーチを持って出てきた。中には、薬、絆創膏、使い捨てのカイロ、粉の袋が、きっちり並んでいる。
# speaker: heroine
# voice: gt_delhi_hotel_sick_night_player_002
心配性だから、全部持ってきたの。笑っていいよ。でも、今日は役に立つでしょ
# speaker: narrator
彼女は粉を水のボトルに入れて振った。脱水を防ぐための、塩と砂糖の粉だという。
* [「大丈夫。寝てて」 # option: im_fine]
    # rel: trust -1
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_hotel_sick_night_player_003
    大丈夫な人は、二時に廊下にいないよ
    # speaker: heroine
    # voice: gt_delhi_hotel_sick_night_player_004
    起こしたくなかったのは、分かる。でも、わたしだって、たまには頼られたい。……これ飲むまでは、戻らないから
* [「……ちょっとだけ、いてくれる？」 # option: stay_a_little]
    # rel: affection +1, trust +1
    # speaker: heroine
    # reaction: heroine,surprised,blush
    # voice: gt_delhi_hotel_sick_night_player_005
    えっ。……うん。言ってくれて、うれしい
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_hotel_sick_night_player_006
    いつも、わたしが聞いてもらう方だから。今日は逆だね
* [「次は勝つ」 # option: next_time_i_win]
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_delhi_hotel_sick_night_player_007
    勝負してたの？　もう、ふふっ。夜中なのに、笑わせないでよ
-
# speaker: narrator
ボトルを受け取って飲むと、塩の薄いスポーツドリンクのような味がした。彼女は長椅子の端に座り、壁に頭をもたせかける。
# speaker: heroine
# voice: gt_delhi_hotel_sick_night_player_008
屋台のおじさん、明日もあそこで、誰かのお腹を壊してるのかな
# speaker: narrator
# photo: gt_album_d101 # photo_caption: 夜中二時の廊下、看病の人が先に眠る
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
# background: gt_bg_delhi_hotel_room
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
# background: gt_bg_delhi_hotel_corridor
# speaker: narrator
# emotion: worried
# photo: gt_album_d102 # photo_caption: 膝を抱えた白い顔
廊下に出ると、彼女が長椅子で膝を抱えていた。顔が白い。
# speaker: heroine
# emotion: worried
# voice: gt_delhi_hotel_sick_night_heroine_001
……起こしちゃった。ごめん。大丈夫、大丈夫だから
# speaker: heroine
# voice: gt_delhi_hotel_sick_night_heroine_002
最後の一個、自分で食べたいって言ったんだもん。自業自得。屋台のおじさんが、すごくうれしそうだったから、断れなくて
* [黙って隣に座る # option: sit_beside]
    # rel: affection +1
    # speaker: heroine
    # voice: gt_delhi_hotel_sick_night_heroine_003
    ……いいって言ったのに
    # speaker: narrator
    # stand: close
    彼女はそれ以上何も言わず、こちらの肩に、少しだけ寄りかかった。
* [「大丈夫なら、戻るよ」 # option: take_her_word]
    # rel: trust +1
    # speaker: heroine
    # voice: gt_delhi_hotel_sick_night_heroine_004
    ……うん
    # speaker: narrator
    背を向けかけたところで、袖を引かれた。
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # voice: gt_delhi_hotel_sick_night_heroine_005
    待って。……やっぱり、いて。大丈夫じゃない。ちゃんと言うの、まだ下手だね、わたし
* [「宿の台所で、お湯をもらってくる」 # option: fetch_hot_water]
    # rel: trust +1
    # speaker: heroine
    # voice: gt_delhi_hotel_sick_night_heroine_006
    夜中だよ。起こしたら悪い……って言っても、行くんだよね
    # speaker: heroine
    # voice: gt_delhi_hotel_sick_night_heroine_007
    じゃあ、わたしの青いポーチも持ってきて。粉の袋が入ってる。心配性で持ってきたのが、自分に効くとは思わなかった
-
# speaker: narrator
# photo: gt_album_d103 # photo_caption: 最後の一個を譲った夜
天井の扇風機が、ゆっくり回っている。彼女は膝にあごをのせて、小さく息を吐いた。
# speaker: heroine
# voice: gt_delhi_hotel_sick_night_heroine_008
お腹いっぱいって、言えばよかった。バスって、言えればよかった。……今度は、言う。屋台でも、ほかの所でも
-> END

// 【4】宿・起きた後：宿の家族が来る
=== gt_delhi_hotel_sick_morning ===
# scene: talk
# person: gt_roohi
# at: hotel delhi_hotel_hub
# priority: +1
# when: flag gt_delhi_golgappa_sick
# background: gt_bg_delhi_hotel_corridor
# bgm: morning
{ cond("flag gt_delhi_player_sick"):
    # speaker: narrator
    # se: door_knock
    朝、こちらの部屋の扉を叩く音がした。開けると、宿のおかみが、湯気の立つ鍋を抱えて立っていた。後ろには、制服姿の娘が、コップを両手で持っている。
    { cond("seen gt_delhi_hotel_sick_night_player"):
        # speaker: narrator
        # emotion: neutral
        廊下の長椅子では、彼女が目をこすりながら起き上がるところだった。肩には、こちらの部屋の毛布がかかっている。
    - else:
        # speaker: narrator
        # emotion: worried
        ノックの音で、隣の部屋の扉も開いた。彼女が、心配そうに顔を出す。
    }
- else:
    # speaker: narrator
    # se: door_knock
    朝、隣の部屋の扉を叩く音がした。廊下に出てみると、宿のおかみが、湯気の立つ鍋を抱えて立っていた。後ろには、制服姿の娘が、コップを両手で持っている。
    # speaker: narrator
    # emotion: worried
    彼女の部屋の扉が、細く開いた。
}
# speaker: gt_delhi_hotel_okami
# together: gt_delhi_hotel_okami enemy
# local_word: gt_delhi_word_khichdi
# term: gt_term_khichdi
# voice: gt_delhi_hotel_sick_morning_delhi_hotel_okami_001
キチュリー。うちでは、お腹を壊したら、これ
# speaker: gt_delhi_hotel_okami
# voice: gt_delhi_hotel_sick_morning_delhi_hotel_okami_002
# photo: gt_album_d104 # photo_caption: キチュリーの鍋とクミンの水 # photo_with: gt_delhi_hotel_okami gt_roohi
……外国の人は、みんなゴルガッパでやられるの。チャンドニー・チョークでしょ。分かるのよ、顔で
{ cond("seen gt_delhi_hotel_homework"):
    # speaker: enemy
    # voice: gt_delhi_hotel_sick_morning_roohi_001
    # term: gt_term_cumin_water
    クミンの水。わたしが作った。……宿題を手伝ってくれたお礼、半分ね
- else:
    # speaker: enemy
    # cutin: name
    # voice: gt_delhi_hotel_sick_morning_roohi_002
    # term: gt_term_cumin_water
    わたし、ルーヒー。十三歳。これは、クミンを煮出した水
    # speaker: enemy
    # voice: gt_delhi_hotel_sick_morning_roohi_003
    わたし、ゴルガッパなら百個食べても平気。デリーの子だから
}
# speaker: gt_delhi_hotel_okami
# voice: gt_delhi_hotel_sick_morning_delhi_hotel_okami_003
百個は嘘。この子は四十個で、一晩泣いたの。それと、あんたは学校。もう七時半よ
# speaker: enemy
# voice: gt_delhi_hotel_sick_morning_roohi_004
病人の看病は、学校より大事って、先生も言ってた
# speaker: gt_delhi_hotel_okami
# voice: gt_delhi_hotel_sick_morning_delhi_hotel_okami_004
言ってない
{ cond("flag gt_delhi_player_sick"):
    # speaker: narrator
    彼女が鍋を受け取り、身振りと片言の英語で、おかみと何か話をつけた。昼まで部屋で寝ていること。夕方に、もう一度お粥をもらうこと。
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_hotel_sick_morning_001
    # photo: gt_album_d106 # photo_caption: 「今日は、わたしが決める日」 # photo_with: gt_delhi_hotel_okami
    今日は、わたしが決める日。午前中は休み。異議は受けつけません
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_delhi_hotel_sick_morning_002
    いつも、どこへ行くか決めてもらってるから。たまには、ね
- else:
    # speaker: narrator
    # emotion: smile
    # photo: gt_album_d105 # photo_caption: 毛布にくるまって、弱々しく笑う
    彼女は毛布にくるまったまま扉にもたれて、親子のやりとりを聞きながら、弱々しく笑っていた。
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_hotel_sick_morning_003
    いいなあ。うちの朝も、こんなふうに、うるさかった。キチュリー、やさしい味がする
}
# speaker: narrator
ルーヒーは母親に背中を押されて、ようやく玄関へ向かった。振り返って、ひとこと。
# speaker: enemy
# voice: gt_delhi_hotel_sick_morning_roohi_005
次は、バスって言うんだよ。最初の一個の前に
-> END

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// （この場面で変えたのは、下の3行のコメント、# priority:（-2 から -3 へ）、3つの選択肢の後の行き先（-> across_the_road をやめ、合流して -> END）だけ。across_the_road 以降は gt_delhi_depart_scam_office へ移した）
// 都市の出発の前：ニューデリー駅前の「劇場」（−3。全員が通る導入）
// 旅行者を狙う組織的な詐欺（「列車は運休」「本当の窓口は向かい」と言って近くの路地の私設の旅行会社へ連れて行き、何倍もの値段のツアーを売る）。
// 最初の3択の後は、道1（ドゥベイの話を聞いた人）は推理クイズ gt_delhi_depart_scam_quiz、道2・道3は案内所の場面 gt_delhi_depart_scam_office（どちらも −2）。
// 【4】
=== gt_delhi_depart_scam ===
# scene: talk
# at: depart delhi
# priority: -3
# background: gt_bg_delhi_station_front
# bgm: gt_vadodora
# ambience: gt_amb_street_traffic
# speaker: narrator
# term: gt_term_paharganj
宿の主人の車を降りると、ニューデリー駅の正面は、人と荷物と呼び込みの声で埋まっていた。道の向かいはパハールガンジ。安宿と土産物屋と両替屋の看板が、空が見えないほど重なっている。
アーグラ行きの列車まで、あと五十分。彼女が携帯で乗車券を確かめていると、白いシャツに首から名札を下げた青年が、すっと隣に並んだ。
# speaker: gt_delhi_scam_young_man
# voice: gt_delhi_depart_scam_delhi_scam_young_man_001
# photo: gt_album_d122 # photo_caption: 「Your train is cancelled today.」 # photo_with: gt_delhi_scam_young_man gt_delhi_scam_vest_man
Agra? Your train is cancelled today.
# speaker: narrator
アーグラ行きの列車は、今日は運休だという。今朝、決まったのだと。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_delhi_depart_scam_001
えっ、運休？
# speaker: gt_delhi_scam_young_man
# voice: gt_delhi_depart_scam_delhi_scam_young_man_002
外国の方の振り替えは、観光客の窓口でしかできません。でも、駅の中の窓口は、今日は工事で閉まっています。臨時の窓口が、道の向かいに。歩いて五分です
# speaker: narrator
そこへ、反射材のベストを着て、無線機を持った男が通りかかった。青年が声をかけると、男は面倒くさそうにうなずいた。
# speaker: gt_delhi_scam_vest_man
# voice: gt_delhi_depart_scam_delhi_scam_vest_man_001
アーグラ？　運休、運休。早く向かいの窓口へ。代わりの席が、なくなるよ
# speaker: heroine
# emotion: worried
# voice: gt_delhi_depart_scam_002
二人とも、同じこと言ってる……。わざわざ教えてくれたんだし、話だけでも、聞いてみる？
* [「話を聞くだけなら」と、ついて行く # option: just_listen]
    # speaker: gt_delhi_scam_young_man
    # voice: gt_delhi_depart_scam_delhi_scam_young_man_003
    では、こちらへ。すぐそこです
* [「先に、駅の掲示板を見よう」と言う # option: check_the_board]
    # set: gt_delhi_scam_doubted
    # speaker: gt_delhi_scam_young_man
    # voice: gt_delhi_depart_scam_delhi_scam_young_man_004
    掲示板は、表示が遅れるんです。待っていたら、代わりの席も埋まりますよ。こちらです、早く
    # speaker: narrator
    青年は、もう彼女の荷物に手をかけて歩き出していた。置いていくわけにはいかない。
* [携帯で、鉄道の公式アプリを開く # option: open_the_app]
    # set: gt_delhi_scam_checked
    # speaker: narrator
    電波が弱く、画面がなかなか切り替わらない。ようやく出た表示は、「定刻」だった。
    # speaker: gt_delhi_scam_young_man
    # voice: gt_delhi_depart_scam_delhi_scam_young_man_005
    アプリは古い情報です。今朝決まったことは、まだ載りません
    # speaker: heroine
    # emotion: worried
    # voice: gt_delhi_depart_scam_003
    でも……もし本当だったら。乗り遅れたら、アーグラの宿も、全部ずれちゃう
- -> END

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 【4】都市の出発：道1（ロディ・ガーデンでドゥベイの話を聞いた人）。推理クイズB（矛盾追及）。
// battles/catalog.json の gt_delhi_special_station_battle の storyId がこの knot を指す。主張・追及は手伝いの knot _claim・_press。
// 道を渡る前に見抜くので、案内所の場面 gt_delhi_depart_scam_office（# when: not clue …）は流れない。
// 報酬の AP は頭の # on_done: ap +2（地図のクイズの「初めて完了」「初めて規定数に正解」と同じくらい。2026-11-20のユーザー判断）。
// 頭の # on_done: と会話の選択肢の札（終わりの返事の3択の # rel:）は、このクイズを最初に遊んだときだけ当たる。
=== gt_delhi_depart_scam_quiz ===
# scene: battle
# at: depart delhi
# priority: -2
# when: clue gt_delhi_clue_dubey_announcement
# on_done: ap +2
# background: gt_bg_delhi_station_front
# bgm: gt_vadodora
# ambience: gt_amb_street_traffic
# speaker: narrator
青年に急かされて、駅前のタクシーの列の間を抜ける。
道の向かい、路地の入口に、奥を指す矢印の付いた英語の看板が見えた。政府公認・観光案内所。
# speaker: enemy
# cutin: name
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_001
駅の窓口は、今日は工事中。臨時の窓口は、あの路地の奥の、階段の上です。歩いて五分
-> quiz(1) ->
# background: gt_bg_delhi_station_front
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_002
タクシーの列を抜けますよ。足元、お気をつけて
# speaker: narrator
青年の話では、駅の中の窓口は閉まっていて、臨時の窓口は道の向かいの路地の奥。言われる行き先は、どれも駅の外だ。
駅の外で、駅の話をされている。足が、そこで止まった。
-> gt_delhi_depart_scam_quiz_claim ->
# background: gt_bg_delhi_station_front
# speaker: heroine
# emotion: worried
# voice: gt_delhi_depart_scam_quiz_001
本当なら、急がなきゃ。……でも、何だろう。何か、引っかかる
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> gt_delhi_depart_scam_quiz_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: gt_bg_delhi_station_front
    # speaker: enemy
    # voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_003
    格好や看板が怪しい、というだけでしょう？　似た人がいたって、わたしが駅の者でないことにはなりません
    # speaker: enemy
    # voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_004
    駅がどうやって運休を知らせるか、ご存じないでしょう
    # speaker: narrator
    見た目を疑うだけでは、「駅の者が外で知らせている」という話は崩れない。
    -> stop
}
# background: gt_bg_delhi_station_front
# speaker: narrator
こちらは、ロディ・ガーデンで聞いた話を持ち出した。三十年、駅の案内放送をしていた人の話だ。
駅の外で呼び止めて運休を告げる者は、自分の知るかぎり、駅の者ではない――と。
# speaker: enemy
# reaction: enemy,sweat
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_005
……放送係の方と、お知り合いで
# speaker: narrator
青年の笑顔が、ほんの一瞬、止まった。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# voice: gt_delhi_depart_scam_quiz_002
ドゥベイさん！　わたしも隣で聞いてたのに。焦って、全部飛んでた
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_quiz_003
確かめよう。自分たちで
# speaker: narrator
彼女は、青年に向き直った。
# speaker: heroine
# emotion: smile
# voice: gt_delhi_depart_scam_quiz_004
# photo: gt_album_d123 # photo_caption: 「Thank you. We'll check it ourselves.」 # photo_with: gt_delhi_scam_young_man
Thank you. We'll check it ourselves.
# speaker: narrator
お礼と、自分たちで確かめます、のひとこと。にこやかで、譲る気のない声だった。
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_006
では伺いますが。その方は、運休を誰が知らせるとおっしゃるんです
-> quiz(2) ->
# background: gt_bg_delhi_station_front
{ quiz_correct:
    # speaker: enemy
    # voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_007
    ……放送と、掲示板
- else:
    # speaker: heroine
    # voice: gt_delhi_depart_scam_quiz_005
    ううん。駅の放送と、駅の掲示板、って言ってた
}
# speaker: narrator
青年の目が、ちらりと駅の入口の上へ動いた。
入口の上の電光掲示板を、列車の名前が流れていく。アーグラ行き。定刻。発車番線も出ている。
{ cond("flag gt_delhi_scam_checked"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_scam_quiz_006
    さっきのアプリの『定刻』も、本当だったんだ
}
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_008
掲示板は、表示が遅れるんです。それに、運休の切符は、臨時窓口でないとお金が戻りませんよ
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_quiz_007
本当に運休だったら、切符のお金って、どうなるんだろう
-> quiz(3) ->
# background: gt_bg_delhi_station_front
{ quiz_correct:
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_scam_quiz_008
    だよね。念のため、鉄道の決まりを開いてみる
- else:
    # speaker: heroine
    # voice: gt_delhi_depart_scam_quiz_009
    待って。鉄道の決まりを開いてみる
}
# speaker: heroine
# voice: gt_delhi_depart_scam_quiz_010
運休になったe切符は、運賃が自動で払い戻される。申し込みも、いらないって
# speaker: narrator
ベストの男が、無線機を耳に当てたまま、青年の肩を軽く叩いた。ヒンディー語で、短く何か言う。
青年は一度だけ、道の向かいの路地の方を振り返った。上で待つ誰かへの言い訳を、考えるような顔だった。
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_delhi_scam_young_man_009
……今日は、ついてないな。どうぞ、よい旅を
# speaker: narrator
# leave: enemy
青年とベストの男は、もうこちらを見ていなかった。大きなスーツケースを引いた老夫婦の方へ、並んで歩いていく。
# photo: gt_album_d124 # photo_caption: 掲示板を黙って指さす
彼女は老夫婦と目が合うと、入口の上の掲示板を、黙って指さして見せた。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_depart_scam_quiz_011
助かった。……でも、さっき、ちょっと得意そうな顔してたでしょ
// からかいへの返事の3択（任意。作者が決める：README の「作者に確かめてほしいこと」10）。外すなら、この3択と返事3行と下の「-」を消し、「次は、…」の行だけ残す。
* [「……してない」 # option: not_smug]
    # rel: affection +1
    # speaker: heroine
    # emotion: teasing
    # voice: gt_delhi_depart_scam_quiz_012
    してたよ。今も、ちょっとしてる
* [「ドゥベイさんの放送のおかげ」 # option: thanks_dubey]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_scam_quiz_013
    そうだね。笑う会に行ってなかったら、今ごろ、あの路地の階段の上だった
* [「先に思い出したのは、こっちだから」 # option: remembered_first]
    # rel: spark +1
    # speaker: heroine
    # emotion: teasing
    # voice: gt_delhi_depart_scam_quiz_014
    はいはい。そういうことにしておく
-
# speaker: heroine
# emotion: smile
# voice: gt_delhi_depart_scam_quiz_015
次は、わたしが先に気づく番だからね
-> END

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 推理クイズ gt_delhi_depart_scam_quiz の主張（手伝いの knot。手がかり帳には相手の台詞が出る）。
=== gt_delhi_depart_scam_quiz_claim ===
# background: gt_bg_delhi_station_front
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_claim_delhi_scam_young_man_001
今朝、決まった運休です。掲示板にも、駅の放送にも、まだ出ていません
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_claim_delhi_scam_young_man_002
だから駅の者が、こうして外で、お一人ずつお知らせしているんです
->->

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 推理クイズ gt_delhi_depart_scam_quiz の追及（手伝いの knot）。彼女が問い、青年は名札を見せる（はずれのカードへの誘い）。
=== gt_delhi_depart_scam_quiz_press ===
# background: gt_bg_delhi_station_front
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_quiz_press_001
駅の方なんですよね。どうして、駅の中じゃなくて外でお知らせを？
# speaker: enemy
# voice: gt_delhi_depart_scam_quiz_press_delhi_scam_young_man_001
放送は、決まってから流れるまで時間がかかるんです。その間、お客さまが困らないように
# speaker: narrator
青年は、首から下げた名札を指でつまんで、こちらに見せた。
->->

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// （今の gt_delhi_depart_scam の across_the_road 以降を移した場面。文の変わらない行は、声の ID もそのまま）
// 【4】都市の出発：道2・道3（ドゥベイの話を聞いていない人）。偽の案内所。出典は scenes/catalog.json の gt_delhi_depart_scam_office。
// 道2（rel spark が仮のしきい値以上）：彼女がノートの筆跡を見抜き、手付金は払わない。
// 道3（それ以外）：見抜けない。彼女の「考えたい」を背広の男が売り文句に使う。使えるお金が 500 以上なら、主人公が手付金 ₹500 を払い（額は案）、彼女の「掲示板を自分の目で見たい」で事務所を出て、駅で本当のことを知る。足りなければ払えないまま追い出される（お金は動かない）。
=== gt_delhi_depart_scam_office ===
# scene: talk
# at: depart delhi
# priority: -2
# when: not clue gt_delhi_clue_dubey_announcement
# background: gt_bg_delhi_paharganj
# bgm: gt_vadodora
# ambience: stop
# speaker: narrator
道を渡り、大通りから一本入った路地の、狭い階段を上がる。扉には、大きな英語の看板。政府公認・観光案内所。
# background: gt_bg_delhi_scam_office
# speaker: narrator
中にはインドの旗が飾られ、額に入った「証明書」が壁に並び、天井の扇風機がゆっくり回っていた。
# speaker: narrator
案内してきた青年は、戸口で軽く頭を下げて、階段を下りていった。
# speaker: narrator
背広の男が、にこやかに立ち上がった。
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_delhi_scam_suit_man_001
# term: gt_term_chai
座ってください。まずはチャイを
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_delhi_scam_suit_man_002
切符を拝見。……ああ、本当だ。運休ですね。しかも、婚礼の季節で、アーグラ行きは三日先まで満席です
# speaker: narrator
男はこちらに背を向けた画面を見ながら、首を振った。それから電話をかけ、受話器をこちらに向けた。
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_delhi_scam_suit_man_003
駅長です
# speaker: gt_delhi_scam_phone_voice
# voice: gt_delhi_depart_scam_delhi_scam_phone_voice_001
運休です。運休です
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_delhi_scam_suit_man_004
ご安心を。車と運転手をご用意できます。アーグラとジャイプール、ホテル込み。特別価格です。手付金だけ先にいただければ、今すぐ車を押さえます
# speaker: narrator
示された額は、二人の旅の予算を全部足しても、まるで届かない数字だった。
# speaker: heroine
# reaction: heroine,surprised_big,sweat
# shake: window
# se: impact_thud
# voice: gt_delhi_depart_scam_004
この値段！？
# speaker: narrator
# photo: gt_album_d125 # photo_caption: 偽の案内所と、三年分同じ字のノート # photo_with: gt_delhi_scam_suit_man
男は分厚いノートを机に置いた。ここで旅を決めた人たちの感想だという。開くと、日本語がびっしり並んでいた。
// 道2の条件：rel spark のしきい値 6 は仮（作者があとで計算して決める。README の「作者に確かめてほしいこと」5）。
{ cond("rel spark >= 6"):
    -> sees_through
- else:
    -> taken_in
}

// 道2：彼女が見抜く（今の ask_the_caller・share_the_notebook と、筆跡の 005〜011。pay_deposit は道3へ移した）
= sees_through
* [「その電話の相手と、直接話させてください」 # option: ask_the_caller]
    # rel: trust +1
    # speaker: gt_delhi_scam_suit_man
    # voice: gt_delhi_depart_scam_delhi_scam_suit_man_006
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
# voice: gt_delhi_depart_scam_005
……これ、全部、同じ人の字だよ
# speaker: heroine
# voice: gt_delhi_depart_scam_006
『と』の書き順が、全部同じ癖。インクも、三年分なのに、全部同じ青。……日本人が書いた日本語じゃない、と思う
{
- cond("flag gt_delhi_scam_checked"):
    # speaker: heroine
    # voice: gt_delhi_depart_scam_007
    それに、さっきのアプリ、『定刻』って出てた。古いのは、たぶん、こっちの話の方
- cond("flag gt_delhi_scam_doubted"):
    # speaker: heroine
    # voice: gt_delhi_depart_scam_008
    掲示板を見ようって言われたとき、すごく急がせたよね。見られたら、困るみたいに
}
# speaker: narrator
# se: book_close
彼女は、手をつけていないチャイの横にノートを閉じて置き、立ち上がった。背広の男の目を、まっすぐ見る。
# speaker: heroine
# photo: gt_album_d126 # photo_caption: 偽の案内所で「No, thank you.」 # photo_with: gt_delhi_scam_suit_man
# size: large
# voice: gt_delhi_depart_scam_009
No, thank you.
# speaker: narrator
はっきりした英語だった。それから、こちらにも聞こえるように、日本語で言い直す。
# speaker: heroine
# voice: gt_delhi_depart_scam_010
けっこうです。自分で、確かめます
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_delhi_scam_suit_man_007
列車に乗り遅れますよ。後で泣いても、知りません
# speaker: heroine
# voice: gt_delhi_depart_scam_011
それなら、自分で確かめて、乗り遅れます
-> gt_delhi_depart_scam_back_at_station ->
-> gt_delhi_depart_scam_on_platform ->
{ cond("flag gt_delhi_said_bas"):
    # speaker: heroine
    # reaction: heroine,exasperated,sigh
    # voice: gt_delhi_depart_scam_016
    ノー・サンキューって、ゴルガッパの『バス』より、ずっと言いにくかった
}
* [「よく気づいたね」 # option: well_spotted]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_scam_017
    字を見るの、好きだから。手書きの看板とか、メニューとか。好きなことが、役に立った
* [「もっと早く止めればよかった」 # option: should_have_stopped]
    # rel: affection +1
    -> gt_delhi_depart_scam_reply_stop ->
* [「次からは、知らない人の話と掲示板、半分ずつ信じよう」 # option: half_and_half]
    # rel: spark +1
    -> gt_delhi_depart_scam_reply_half ->
- -> END

// 道3：見抜けない（手付金を払う／払えない）
= taken_in
# speaker: narrator
とても親切でした。この人はしんらいできます。わたしはまんぞくしました。名前は、タナカ、スズキ、サトウ。日付は、三年にわたっていた。
# speaker: heroine
# emotion: worried
# voice: gt_delhi_depart_scam_office_001
……待って。少し、考えたい
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_office_delhi_scam_suit_man_001
では、手付金だけ。考えるお時間は、お約束します
{ cond("money >= 500"):
    -> deposit
- else:
    -> short_of_money
}

= deposit
* [手付金だけ払って、考える時間をもらう # option: pay_deposit]
    # money: -500
    # set: gt_delhi_scam_paid
    # speaker: narrator
    男は札を数え、満足そうに引き出しにしまった。
    # speaker: gt_delhi_scam_suit_man
    # voice: gt_delhi_depart_scam_delhi_scam_suit_man_005
    契約書を用意します
-
# speaker: narrator
男が奥の部屋へ消えると、彼女が小声で言った。
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_office_002
少しだけ、外に出よう。駅の掲示板、自分の目で見たい
# speaker: narrator
すぐ戻ると言い残して、二人は事務所を出た。
-> back_to_station

= short_of_money
# speaker: narrator
# term: gt_term_rupee
手付金は、五百ルピーだという。財布を開いてみたが、二人の手持ちを合わせても届かなかった。
# speaker: gt_delhi_scam_suit_man
# voice: gt_delhi_depart_scam_office_delhi_scam_suit_man_002
……では、お金をご用意してから、またどうぞ
# speaker: narrator
男の笑顔は、財布が閉じるより先に消えていた。二人は追い出されるように、事務所を出た。
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_office_003
……駅の掲示板、自分の目で見に行こう。あの人の話が本当かどうか
-> back_to_station

= back_to_station
-> gt_delhi_depart_scam_back_at_station ->
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_delhi_depart_scam_office_004
定刻……！　じゃあ、運休も、駅長の電話も
{ cond("flag gt_delhi_scam_paid"):
    # speaker: narrator
    手付金だけは取り返したい。二人で道を渡り直し、もう一度あの階段を上がった。
    # background: gt_bg_delhi_scam_office
    # ambience: stop
    # speaker: narrator
    手付金を返してほしいと言うと、男の笑顔が消えた。
    # speaker: gt_delhi_scam_suit_man
    # voice: gt_delhi_depart_scam_delhi_scam_suit_man_008
    返金はできません。契約の決まりです
    # speaker: narrator
    # photo: gt_album_d127 # photo_caption: 鍵のかかった引き出し # photo_with: gt_delhi_scam_suit_man
    机の向こうで、引き出しはもう鍵がかかっていた。
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_depart_scam_012
    ……行こう。取り返すより、電車。ここで揉めて、もっと何かなくすのは嫌
    # background: gt_bg_delhi_station_front
    # ambience: gt_amb_street_traffic
    # speaker: narrator
    階段を下りると、二人は駅へ走った。
- else:
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_delhi_depart_scam_office_005
    払えなかったから、何も取られなかったんだ。お財布が軽くて助かったの、初めてかも
}
-> gt_delhi_depart_scam_on_platform ->
{ cond("flag gt_delhi_scam_paid"):
    # speaker: heroine
    # voice: gt_delhi_depart_scam_015
    手付金は、高い授業料だったね。……ううん、やっぱり悔しい。でも、払ったのは一人のせいじゃないよ。二人で、あの部屋まで行ったんだから
}
* [水のボトルを渡して、黙っている # option: hand_water]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_scam_office_006
    ……ありがと、黙っててくれて。次の駅では、わたしが先に掲示板を見るからね
* [「もっと早く止めればよかった」 # option: blame_myself]
    # rel: affection +1
    -> gt_delhi_depart_scam_reply_stop ->
* [「次からは、知らない人の話と掲示板、半分ずつ信じよう」 # option: half_and_half_next]
    # rel: spark +1
    -> gt_delhi_depart_scam_reply_half ->
- -> END

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 手伝いの knot（頭の札なし）。案内所の場面の道2と道3の両方から呼ぶ（声の ID のある行を1か所に置くため）。駅前に戻り、荷運びの男に会う。
=== gt_delhi_depart_scam_back_at_station ===
# background: gt_bg_delhi_station_front
# ambience: gt_amb_street_traffic
# speaker: narrator
# photo: gt_album_d128 # photo_caption: 赤いシャツの荷運びが首を振る # photo_with: gt_delhi_porter
階段を駆け下り、道を渡る。駅の入口で、赤いシャツの荷運びの男が、こちらの出てきた路地を見て、首を振った。
# speaker: gt_delhi_porter
# voice: gt_delhi_depart_scam_delhi_porter_001
あの路地の上の部屋だろう。毎日だよ。……観光客の窓口なら、駅の二階。今日も開いてる。列車は、あれを見な
# speaker: narrator
男が顎で示した電光掲示板に、アーグラ行きの列車が出ていた。定刻。発車番線も、ちゃんと表示されている。
->->

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 手伝いの knot。ホームの検札係と、ベンチの彼女。地の文を一つ直した（「黒い上着の検札係」→「黒い上着を羽織った検札係」。声なし）。
=== gt_delhi_depart_scam_on_platform ===
# background: gt_bg_delhi_station
# ambience: gt_amb_railway_station
# speaker: narrator
念のため、ホームにいた、黒い上着を羽織った検札係に乗車券を見せると、彼は画面を一瞥して、うなずいただけだった。
# speaker: gt_delhi_ticket_checker
# voice: gt_delhi_depart_scam_delhi_ticket_checker_001
運休だと言われて、ここまで走ってくる人は、毎日いますよ。……間に合った人は、運がいい
# speaker: narrator
# leave: gt_delhi_ticket_checker
# photo: gt_album_d129 # photo_caption: ホームのベンチで、少し震える手
ホームのベンチに座りこむと、彼女は大きく息を吐いた。手が、少し震えていた。
# speaker: heroine
# voice: gt_delhi_depart_scam_013
親切だと思ったのが、全部、お芝居だった。名札も、ベストも、電話の声も。……悔しい。最初に、ついて行こうって言ったの、わたしだから
# speaker: heroine
# emotion: serious
# voice: gt_delhi_depart_scam_014
でも、教えてくれた荷運びの人も、検札の人も、本物だった。宿のご主人も、ルーヒーさんも。……疑うのは疲れるけど、全部を疑うようには、なりたくないな
->->

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 手伝いの knot。案内所の場面の終わりの返事「もっと早く止めればよかった」（道2・道3）。
=== gt_delhi_depart_scam_reply_stop ===
# speaker: heroine
# voice: gt_delhi_depart_scam_018
ううん。一人で全部背負わないで。止められなかったのは、わたしも同じ。次は、二人で、先に掲示板を見よう
->->

// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// 手伝いの knot。案内所の場面の終わりの返事「半分ずつ信じよう」（道2・道3）。
=== gt_delhi_depart_scam_reply_half ===
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_depart_scam_019
半分ずつ、いいね。全部疑うのも、全部信じるのも、嫌だもん
->->

// 【4】都市の出発：ホーム（荷運び・ルーヒーの作文の結果・スレーシュからの知らせ）
=== gt_delhi_depart_station ===
# scene: talk
# at: depart delhi
# priority: -1
# background: gt_bg_delhi_station
# bgm: gt_vadodora_chill_mix
# ambience: gt_amb_railway_station
# speaker: narrator
ホームは、発車を待つ人であふれていた。赤いシャツに真鍮の腕章をつけた荷運びの男たちが、スーツケースを三つ、頭の上に積んで、人の間をすり抜けていく。
# local_word: gt_delhi_word_sahayak
# term: gt_term_sahayak
昔は「クーリー」と呼ばれた彼らは、今は「サハーヤク」――助ける人、という名前に変わっている。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# voice: gt_delhi_depart_station_001
# photo: gt_album_d130 # photo_caption: 頭の上にスーツケース三つ
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
    # voice: gt_delhi_depart_station_002
    # photo: gt_album_d131 # photo_caption: 宿の主人からの伝言
    よかった！　まあまあの点で、大喜び。それ、いちばんいい成績だと思います
- else:
    # speaker: gt_delhi_hotel_owner
    # phone: received
    インド門の作文、満点だったそうです。……それと、家で、もう一つ書いていました。女性車両のを。誰にも見せないそうです。親にも
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_depart_station_003
    # photo: gt_album_d131 # photo_caption: 宿の主人からの伝言
    そっか。書いたんだ。ふふ、よかった
}
# speaker: narrator
伝言には、追伸がついていた。
# speaker: gt_delhi_hotel_owner
# phone: received
追伸。駅前で、運休だと言われても、信じないように。毎年、うちのお客さんの誰かが引っかかるので
// 下書き（2026-11-18）：作者の確認待ち。確かめてほしいこと：authoring/journeys/golden_triangle/research/golden-triangle-station-scam-20261118/README.md
// （案内所の場面を見た道2・道3は今の行。駅前の推理クイズで見抜いた道1は、新しい行）
{ cond("seen gt_delhi_depart_scam_office"):
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_delhi_depart_station_004
    ……一時間、遅かった
- else:
    # speaker: heroine
    # emotion: teasing
    # voice: gt_delhi_depart_station_008
    返事しておくね。今年のお客さんは、引っかかる手前で止まりました、って
}
-> messages

= messages
{
- cond("flag gt_delhi_suresh_encouraged"):
    # speaker: narrator
    # se: phone_vibrate
    携帯が震えた。ロディ・ガーデンの笑う会の連絡に、長い伝言が一つ流れてきた。差出人は、新聞で顔を隠していた、あの人だ。
    # speaker: gt_suresh
    # phone: received
    自主申告をした。夕食の席で。誰も笑わなかった。最初に拍手をしたのは、メヘルだった
    # speaker: gt_suresh
    # phone: received
    それから、メヘルにも申告があるそうだ。今夜、カビールという青年が夕食に来る。……わしは、何も知らなかったことにしておく
    # speaker: heroine
    # reaction: heroine,happy,heart
    # voice: gt_delhi_depart_station_005
    # photo: gt_album_d132 # photo_caption: 自主申告の知らせ
    二人とも、自分の口で言えたんだ。叔父さんが先に言ったから、メヘルさんも言えたのかな
- cond("flag gt_delhi_suresh_kept_secret"):
    # speaker: narrator
    笑う会の連絡に、写真が一枚流れてきた。ロディ・ガーデンの集合写真。端の一人の顔にだけ、大きな薔薇の絵が貼ってある。その人から、一行だけ添えられていた。
    # speaker: gt_suresh
    # phone: received
    この写真には、誰も写っていない
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_delhi_depart_station_006
    # photo: gt_album_d132 # photo_caption: 薔薇の絵を貼った集合写真
    ふふっ。顔は隠れてるのに、誰だかすぐ分かる
}
# background: gt_bg_delhi_train_window
# speaker: narrator
# se: old_bell
# photo: gt_album_d133 # photo_caption: 発車のベル、流れていく赤いシャツ
発車のベルが鳴った。窓の外を、赤いシャツが一つ、また一つと流れていく。
# speaker: heroine
# voice: gt_delhi_depart_station_007
デリーって、最初は押しの強い町だと思ってた。押されてるうちに、こっちも、ちょっとだけ押し返せるようになった気がする
-> END
