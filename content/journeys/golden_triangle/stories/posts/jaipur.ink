// 【SNS の投稿のファイル】ジャイプールの投稿（2026-11-27）。書き方は authoring/SNS_PLAN.md の「札（書き方）」と「文の書き方」。
// - knot が1つの投稿、その中の stitch（= 名前）が1件のコメント。コメントの最初の行がコメント、次の行からが返事。
// - ジャイプールの常連（ヒロインの投稿にコメントする人）は4人：カムラ・フロントの女性・ファルハーナ・プージャー。
//   カムラは旅の芯なので、ジャイプールでも句点で終わる短い命令・問いの口調。フロントの女性は着いた日に誰でも会い、宿の場面に何度も出る。
//   ファルハーナは、会った場面（ジャル・マハル）の投稿にだけ書く。プージャーはフィナーレで会うので、フィナーレの投稿と、前の投稿への後のコメントだけ。
// - ヒロインの投稿は5つ：到着・ハワー・マハル（本筋のクイズ）・フィナーレ（ここまでは誰でも通る）と、ジャル・マハル・ジョーハリー・バザールのデート。
//   告白・返事のデートの投稿は書かない（人前では言わない）。関係の変化は、到着の投稿のカムラの後のコメント（# when: couple）。
// - 二人がしたことへの反応：メヘンディに何を隠したか（ジャル・マハル）、祝儀袋に手紙を入れたか（フィナーレ）、デリーの動画がばれたか（プージャーの投稿）。
// - 出会った人の投稿は、クイズの相手（サリーム・ガウラ・スシュマ・ディヴィヤ・フィナーレのカムラ）と、二つの場面に出るプージャー、
//   都市をまたぐアマン。1人1つ、新しく描く日常の写真（gt_sns_*）を1枚。アマンは着いた夜、ほかは会った場面の夜に届く（同じ夜に届く人は多くて2〜3人）。
// - 過去の投稿（# past:。ファイルの最後）：立ち絵のあるジャイプールの15人に、会う前の暮らしを写真3〜4枚ずつ（カムラ・アマンはデリーのファイル）。夜には届かない。
INCLUDE modules.ink
-> DONE

// 到着：町じゅうピンクと、「踊りは要相談」。旅のジャイプールの最初の夜に届く（デリーの到着と同じく、条件は写真だけ）。
// 後のコメントは、交際が始まった後の夜に届く（アーグラで始まっていれば、この夜に一緒に届く。どちらでも読める言葉にした）。
=== gt_post_jaipur_arrival ===
# post: heroine
# images: gt_album_j001 gt_album_j002 gt_album_j003 gt_album_j004 gt_album_j005
# likes: gt_aman
踊るとは、言ってません

= kamla
# speaker: gt_kamla
踊りなさい。
# speaker: heroine
……相談の余地は？
# speaker: gt_kamla
ない。

= kamla_couple
# timing: later
# when: couple
# when: comment gt_post_jaipur_arrival.kamla
# speaker: gt_kamla
言いたいことは、言ったかい。
# speaker: heroine
言いました。中身は、内緒です

// ハワー・マハル（本筋のクイズの後の夜）：ガウラの大根。フロントの女性は、宿の台所に預ける場面（その夜の宿）より先に気づいている。
// プージャーの後のコメントは、フィナーレの後に届く（花嫁の家は、ハワー・マハルの向かい）。
=== gt_post_jaipur_hawa_mahal ===
# post: heroine
# images: gt_album_j025 gt_album_j026 gt_album_j027 gt_album_j028 gt_album_j029 gt_album_j030
# when: battle gt_jaipur_main_hawa_mahal_battle
# likes: gt_jaipur_hawa_woman
宮殿の帰りに、大根をもらいました

= front
# speaker: gt_jaipur_hotel_front
大根なら、帳場で預かるわよ
# speaker: heroine
……まだ、何も言ってません
# speaker: gt_jaipur_hotel_front
葉っぱが、写ってるもの

= pooja
# timing: later
# when: battle gt_jaipur_finale_battle
# speaker: gt_pooja
これ、うちの向かい！
# speaker: heroine
窓に、手を振ればよかった

// ジャル・マハルのデート。手が乾くまでのことは書くが、食べさせてもらったことは書かない（耳まで赤い写真 j059 も載せない）。
// ファルハーナのコメントは、模様に何を隠したかで書き分ける（名前・彼女に任せた秘密・模様だけ。3つのうち1つだけが届く）。
// 模様だけの道の「真ん中」は、その夜の宿で見つかる FARHANA と電話番号の前振り。
=== gt_post_jaipur_jal_mahal ===
# post: heroine
# images: gt_album_j056 gt_album_j057 gt_album_j060 gt_album_j061 gt_album_j062 gt_album_j063 gt_album_j064
# when: date gt_jaipur_date_jal_mahal
乾くまで、両手が使えません

= farhana_name
# one_of: farhana
# when: flag gt_jaipur_mehndi_his_name
# speaker: gt_farhana
探す人に、ヒントはなしよ
# speaker: heroine
最初から、あげてません

= farhana_secret
# one_of: farhana
# when: flag gt_jaipur_mehndi_her_secret
# speaker: gt_farhana
あの秘密、ちゃんと守ってるわ
# speaker: heroine
ずっと、お願いします

= farhana_plain
# one_of: farhana
# when: not flag gt_jaipur_mehndi_his_name
# when: not flag gt_jaipur_mehndi_her_secret
# speaker: gt_farhana
手のひらの真ん中、よく見てね
# speaker: heroine
……真ん中に、何か？

// ジョーハリー・バザールのデート：初めての値切り。カムラの「欲しいものは、欲しいと言いなさい」（デリーの到着）の続き。
// 「花嫁さん？」「違います！」の写真 j067 は載せる（人前で打ち消している写真なので）。「旦那さんの分」の j071 は載せない。
=== gt_post_jaipur_johari_bazaar ===
# post: heroine
# images: gt_album_j065 gt_album_j066 gt_album_j067 gt_album_j068 gt_album_j069 gt_album_j070 gt_album_j072
# when: date gt_jaipur_date_johari_bazaar
# likes: gt_nasreen
生まれて初めて、値切りました

= kamla
# speaker: gt_kamla
欲しいと、言えたかい。
# speaker: heroine
はい。値切る前に、言っちゃいました
# speaker: gt_kamla
それでいい。

// フィナーレ（旅の最後の夜）：一言は、到着の投稿の「踊るとは、言ってません」を受ける。手を取る写真 j126 は載せない。
// カムラのコメントは、祝儀袋を一ルピーと手紙にしたか（gt_jaipur_envelope_letter。フィナーレの前の朝に決まる）で書き分ける。
=== gt_post_jaipur_finale ===
# post: heroine
# images: gt_album_j116 gt_album_j118 gt_album_j123 gt_album_j124 gt_album_j125 gt_album_j129
# when: battle gt_jaipur_finale_battle
# likes: gt_jaipur_bride_grandmother gt_aman
踊るとは、言ってませんでした

= kamla_letter
# one_of: kamla
# when: flag gt_jaipur_envelope_letter
# speaker: gt_kamla
手紙は、花嫁の前で読んだ。
# speaker: heroine
……アマンさん、どんな顔でした？
# speaker: gt_kamla
花の房で、隠れてた。

= kamla_rupee
# one_of: kamla
# when: not flag gt_jaipur_envelope_letter
# speaker: gt_kamla
一ルピー、確かに。
# speaker: heroine
割り切れないまま、続きますように

= pooja
# speaker: gt_pooja
答えの声、通りの端まで届いた！
# speaker: heroine
……一問目は、届いてないはず

// ───── 出会った人の投稿

// アマン：叔父の家に移ったカムラが、家具を動かして門の見える所に椅子を置いた（デリーの路地の椅子の続き）。ジャイプールに着いた夜に届く。
=== gt_post_jaipur_aman_chair ===
# post: gt_aman
# images: gt_sns_aman_grandma_chair
# where: 叔父の家
# when: epilogue delhi
祖母が来て、家の地図が変わりました

= kamla
# speaker: gt_kamla
門が見える所が、いい。
# speaker: gt_aman
叔父の車が、入れません

= heroine
# speaker: heroine
落花生、ジャイプールにも？
# speaker: gt_aman
初日に、店を見つけてました

// サリーム：彼女が土産物屋の前で大きな声を出した後、中庭の露店の絵が早く売れた（場面の後のこと）。
=== gt_post_jaipur_saleem_board ===
# post: gt_saleem
# images: gt_sns_saleem_empty_board
# where: jaipur_amber_fort
# when: battle gt_jaipur_main_amber_fort_battle
今日は、板が早く空いた。

= heroine
# speaker: heroine
大きい声、少しは届きました？
# speaker: gt_saleem
声の分は、売れた。

= shopkeeper
# speaker: gt_jaipur_amber_shopkeeper
……うちは、今日は暇だった

// ガウラ：「行くなら、自分のお金で、自分の足で行く」の続き。入場券の分を、売り上げから缶に貯め始めた。
=== gt_post_jaipur_gaura_tin ===
# post: gt_jaipur_hawa_woman
# images: gt_sns_gaura_ticket_tin
# where: jaipur_hawa_mahal
# when: battle gt_jaipur_main_hawa_mahal_battle
入場券の分、トマトで貯金中

= heroine
# speaker: heroine
膝の調子は、どうですか？
# speaker: gt_jaipur_hawa_woman
今日は、言うことを聞かない

// スシュマ：審判の答え（二キロと、毎週日曜の電話）のとおりに詰めた漬物。息子のヴィシャールが量り直した。
=== gt_post_jaipur_sushma_pickles ===
# post: gt_jaipur_city_palace_woman
# images: gt_sns_sushma_two_kilos
# where: 家の台所
# when: battle gt_jaipur_main_city_palace_battle
二キロ、きっちり詰めたわよ

= vishal
# speaker: gt_vishal
母さん、二キロ百グラムあった
# speaker: gt_jaipur_city_palace_woman
百グラムは、愛よ

= heroine
# speaker: heroine
日曜の朝、楽しみですね
# speaker: gt_jaipur_city_palace_woman
時差は、もう調べたわ

// ディヴィヤ：場面の最後にシャーストリーの隣に座り直し、影の読み方を習い始めた。
=== gt_post_jaipur_divya_shadow ===
# post: gt_jaipur_jantar_woman
# images: gt_sns_divya_shadow_notes
# where: jaipur_jantar_mantar
# when: battle gt_jaipur_main_jantar_mantar_battle
影を読む練習。誤差は、まだ五分

= shastri
# speaker: gt_shastri
三日もすれば、一分になるよ
# speaker: gt_jaipur_jantar_woman
二日でやります

= heroine
# speaker: heroine
十一時四十三分、応援してます
# speaker: gt_jaipur_jantar_woman
秒まで、合わせます

// カムラ：行列の夜の終わり、花嫁の家の階段で、二人の祖母が履き物を脱いだ。フィナーレの夜に届く。
=== gt_post_jaipur_kamla_sandals ===
# post: gt_kamla
# images: gt_sns_kamla_two_sandals
# where: 花嫁の家
# when: battle gt_jaipur_finale_battle
二人とも、足が痛い。

= grandmother
# speaker: gt_jaipur_bride_grandmother
六十年分、歩いたわね
# speaker: gt_kamla
まだ、足りない。

= heroine
# speaker: heroine
カムラさん、もう寝てください
# speaker: gt_kamla
まだ踊れる。

// プージャー：門のリボンの通行料を、いとこたちで山分けする。点数で額が違うので、額は書かない。
// 彼女のコメントは、デリーの階段井戸の動画がばれた場面（gt_jaipur_finale_after_reel）を見たかで書き分ける。
=== gt_post_jaipur_pooja_toll ===
# post: gt_pooja
# images: gt_sns_pooja_toll_split
# where: 花嫁の家
# when: battle gt_jaipur_finale_battle
通行料、いとこで山分け会議中

= heroine_reel
# one_of: heroine
# when: seen gt_jaipur_finale_after_reel
# speaker: heroine
『きゃー？』は、もう出ませんから
# speaker: gt_pooja
鳩、用意しとくね

= heroine_plain
# one_of: heroine
# when: not seen gt_jaipur_finale_after_reel
# speaker: heroine
通してくれて、ありがとう
# speaker: gt_pooja
次の門でも、答えてね
# speaker: heroine
……次の門って、どこの？

// ───── 旅の終わりに届く、出会った人のその後（2026-11-27 に足した）

// ヴィシャール：ドイツへ発つ日の空港。母の漬物の入った預け荷物が、二十三キロちょうど。シティ・パレスのクイズをして、旅を終えたときに届く。
// スシュマの「百グラムは、愛よ」（旅の間の投稿 gt_post_jaipur_sushma_pickles）の続き。
=== gt_post_jaipur_vishal_scale ===
# post: gt_vishal
# images: gt_sns_vishal_scale
# where: 空港のカウンター
# when: battle gt_jaipur_main_city_palace_battle
# when: epilogue jaipur
預け荷物、二十三キロちょうど

= sushma
# speaker: gt_jaipur_city_palace_woman
百グラムは、手荷物に入れたわ
# speaker: gt_vishal
……道理で、重いと思った

= heroine
# speaker: heroine
漬物、無事に飛びますように

// アマン：式の夜明け、片付いた会場の隅で、椅子で眠る祖母。旅を終えたときに届く。
=== gt_post_jaipur_aman_dawn ===
# post: gt_aman
# images: gt_sns_aman_dawn
# where: 花嫁の家
# when: epilogue jaipur
最後まで踊ってたのは、祖母でした

= kamla
# speaker: gt_kamla
寝てない。目を閉じて、聞いてた。

= heroine
# speaker: heroine
カムラさん、お疲れさまでした
# speaker: gt_aman
祖母が、あなたたちもと

// ───── 過去の投稿（会うと人物ページで読める。夜には届かない）
// 二人に会う前の、その人の暮らし。場面の種明かし（窓の本当の数、宝の最後の印、印刷の絵の出どころなど）は書かない。
// 1人分は新しいものから。写真は立ち絵のある人ごとに3枚以上（クイズの相手と常連は4枚）。コメントは、その人を知っている立ち絵のある人だけ。

// サリーム（4枚）：場面の絵を描く前に鏡の間に座った日々、猿、八年前の最初の日。隣の土産物屋の店主は、昔から見ている。
=== gt_past_saleem_mirror ===
# post: gt_saleem
# past: 先月
# images: gt_sns_saleem_mirror_sketch
# where: jaipur_amber_fort
鏡の間、三日目。警備員が会釈した。

= shopkeeper
# speaker: gt_jaipur_amber_shopkeeper
そんなに座って、売れるのか
# speaker: gt_saleem
売るために、座ってない。

=== gt_past_saleem_monkey ===
# post: gt_saleem
# past: 去年の夏
# images: gt_sns_saleem_monkey_gold
# where: jaipur_amber_fort
猿に、金の皿を持っていかれた。

= shopkeeper
# speaker: gt_jaipur_amber_shopkeeper
うちの前で、落としてったぞ

=== gt_past_saleem_first_day ===
# post: gt_saleem
# past: 八年前
# images: gt_sns_saleem_first_corner gt_sns_saleem_first_board
# where: jaipur_amber_fort
今日から、ここで描く。

// ガウラ（4枚）：窓を数える、朝四時の市場、孫にもらった携帯。花嫁の祖母は、向かいの窓から毎朝見ている（ガウラは知らない）。
=== gt_past_gaura_windows ===
# post: gt_jaipur_hawa_woman
# past: 先月
# images: gt_sns_gaura_window_tally
# where: jaipur_hawa_mahal
窓を数えた。また九百五十一

= pooja
# speaker: gt_pooja
ガイドさんの数と、違うの？
# speaker: gt_jaipur_hawa_woman
どっちかが、間違ってる

=== gt_past_gaura_market ===
# post: gt_jaipur_hawa_woman
# past: 去年の冬
# images: gt_sns_gaura_dawn_radish gt_sns_gaura_dawn_bundle
# where: 卸の市場
朝四時。今日の大根は、いい顔してる

= grandmother
# speaker: gt_jaipur_bride_grandmother
今朝も、日傘が一番乗りね
# speaker: gt_jaipur_hawa_woman
……どちらさま？

=== gt_past_gaura_phone ===
# post: gt_jaipur_hawa_woman
# past: 五年前
# images: gt_sns_gaura_new_phone
孫に携帯をもらった。何をするの、これ

// スシュマ（4枚）：息子の旅支度、季節の漬物、古いアルバム。コメントは息子のヴィシャール。
=== gt_past_sushma_suitcase ===
# post: gt_jaipur_city_palace_woman
# past: 先週
# images: gt_sns_sushma_big_suitcase
# where: 家の居間
ドイツ行きの鞄、いちばん大きいのにした

= vishal
# speaker: gt_vishal
母さん、鞄だけで五キロある
# speaker: gt_jaipur_city_palace_woman
軽いほうよ

=== gt_past_sushma_mango ===
# post: gt_jaipur_city_palace_woman
# past: 今年の夏
# images: gt_sns_sushma_mango_jars gt_sns_sushma_mango_basin
# where: 家の屋上
マンゴーの漬物、屋上で日光浴中

=== gt_past_sushma_album ===
# post: gt_jaipur_city_palace_woman
# past: 三年前
# images: gt_sns_sushma_old_album
古いアルバムから。瓶より小さかった頃

= vishal
# speaker: gt_vishal
母さん、これ消して
# speaker: gt_jaipur_city_palace_woman
消し方を知らないの

// ディヴィヤ（4枚）：論文の最後の章、山の観測所、母の口ぐせ。ジャイプールに知り合いの立ち絵の人はいないので、コメントなし。
=== gt_past_divya_thesis ===
# post: gt_jaipur_jantar_woman
# past: 先月
# images: gt_sns_divya_last_chapter
# where: 研究所
最後の章。コーヒーは四杯目

=== gt_past_divya_observatory ===
# post: gt_jaipur_jantar_woman
# past: 去年の冬
# images: gt_sns_divya_dome_night gt_sns_divya_cold_console
# where: 山の観測所
観測所の夜番。指がかじかむ

=== gt_past_divya_mother ===
# post: gt_jaipur_jantar_woman
# past: 三年前
# images: gt_sns_divya_mother_almanac
# where: ジャイプールの実家
母に研究の話をしたら『で、何時に？』

// プージャー（4枚）：門の問題づくり、いとこの縁談、大学の討論大会。コメントはナーニー（花嫁の祖母）。
=== gt_past_pooja_questions ===
# post: gt_pooja
# past: 先週
# images: gt_sns_pooja_question_meeting
# where: 花嫁の家
門の問題、いとこ会議で作成中！

= grandmother
# speaker: gt_jaipur_bride_grandmother
わたしにも、出させて
# speaker: gt_pooja
ナーニーは、窓から見ててね

=== gt_past_pooja_engagement ===
# post: gt_pooja
# past: 半年前
# images: gt_sns_pooja_engagement_box gt_sns_pooja_engagement_sweet
# where: 花嫁の家
いとこの縁談、決まった！相手はデリーの人

= grandmother
# speaker: gt_jaipur_bride_grandmother
デリーでも、いい人よ
# speaker: gt_pooja
デリーなのに？

=== gt_past_pooja_debate ===
# post: gt_pooja
# past: 二年前
# images: gt_sns_pooja_debate_stage
# where: 大学の講堂
討論大会、優勝。マイクは要らないって

// ファルハーナ（4枚）：店の夢の貯金、結婚式の季節、遊歩道の最初の日。ナスリーンとは花嫁の客を紹介し合う仲。
=== gt_past_farhana_fan ===
# post: gt_farhana
# past: 先週
# images: gt_sns_farhana_fan_box
# where: jaipur_jal_mahal
# likes: gt_nasreen
扇風機の分は、貯まった。あとは店

=== gt_past_farhana_brides ===
# post: gt_farhana
# past: 去年の冬
# images: gt_sns_farhana_bride_hands gt_sns_farhana_tired_wrist
花嫁さん、一日で三人。手首が限界

= nasreen
# speaker: gt_nasreen
うちの腕輪も、三組出たわ
# speaker: gt_farhana
紹介料、半分こね

=== gt_past_farhana_first_day ===
# post: gt_farhana
# past: 三年前
# images: gt_sns_farhana_own_hand
# where: jaipur_jal_mahal
遊歩道、初日。描いたのは自分の手だけ

// ヴィシャール（3枚）：内定と秤、去年の夏の屋上。
=== gt_past_vishal_scale ===
# post: gt_vishal
# past: 三か月前
# images: gt_sns_vishal_scale_box
ドイツの内定。最初に買ったのは、秤

= sushma
# speaker: gt_jaipur_city_palace_woman
母より、秤が先なの？
# speaker: gt_vishal
……母さんにも言ったよ

=== gt_past_vishal_roof ===
# post: gt_vishal
# past: 去年の夏
# images: gt_sns_vishal_roof_cot gt_sns_vishal_roof_stars
# where: 家の屋上
暑すぎて、屋上で寝た

= sushma
# speaker: gt_jaipur_city_palace_woman
漬物の瓶、蹴らないでね
# speaker: gt_vishal
もう二つ蹴った

// シャーストリー（3枚）：毎朝の影と、孫に習う携帯。ジャイガルの茶屋の老人は、町の年寄り仲間。
=== gt_past_shastri_shadow ===
# post: gt_shastri
# past: 先週
# images: gt_sns_shastri_morning_shadow
# where: jaipur_jantar_mantar
# likes: gt_jaipur_jaigarh_old_man
今朝の影も、ちゃんと時刻どおりだよ

=== gt_past_shastri_phone ===
# post: gt_shastri
# past: 去年
# images: gt_sns_shastri_two_phones gt_sns_shastri_phone_lesson
孫に携帯を習った。影より難しいね

= old_man
# speaker: gt_jaipur_jaigarh_old_man
わしの分は、孫が打っとる
# speaker: gt_shastri
それは、ずるいね

// ラージュー（3枚）：新しい地図（最後の印は見せない）と、初めて売れた日。
=== gt_past_raju_maps ===
# post: gt_raju
# past: 先週
# images: gt_sns_raju_new_maps gt_sns_raju_red_cross
# where: jaipur_jaigarh_fort
新しい地図、三枚。バツ印は秘密

=== gt_past_raju_first_sale ===
# post: gt_raju
# past: 去年
# images: gt_sns_raju_first_sale
# where: jaipur_jaigarh_fort
大砲の前で、初めて地図が売れた！

= old_man
# speaker: gt_jaipur_jaigarh_old_man
売れた金で、何を買った
# speaker: gt_raju
赤いペン

// ナスリーン（3枚）：職人の路地の新しい炉と、割れやすい腕輪。
=== gt_past_nasreen_furnace ===
# post: gt_nasreen
# past: 先月
# images: gt_sns_nasreen_new_furnace gt_sns_nasreen_lac_hands
# where: 職人の路地
夫の炉が新しくなった。暑さも新品

=== gt_past_nasreen_broken ===
# post: gt_nasreen
# past: 去年
# images: gt_sns_nasreen_broken_bangles
# where: jaipur_johari_bazaar
義弟が、運ぶ途中で十本割った

// カヴィヤ（3枚。ママの携帯で書いている）：遠足の前の晩と、去年の自転車。
=== gt_past_kavya_trip ===
# post: gt_kavya
# past: 先週
# images: gt_sns_kavya_trip_bag
あしたは、えんそく。ミイラ、へいき

=== gt_past_kavya_bicycle ===
# post: gt_kavya
# past: 去年
# images: gt_sns_kavya_bicycle gt_sns_kavya_bike_knee
じてんしゃ、のれた。ころんだのは三かい

// フロントの女性（3枚）：結婚式に行くお客さんのための一ルピー玉と、宿の屋上の山羊。
=== gt_past_front_rupees ===
# post: gt_jaipur_hotel_front
# past: 先週
# images: gt_sns_jaipur_front_rupee_bowl
# where: jaipur_hotel_hub
帳場の一ルピー玉、補充しました

=== gt_past_front_goat ===
# post: gt_jaipur_hotel_front
# past: 去年
# images: gt_sns_jaipur_front_roof_goat gt_sns_jaipur_front_goat_stare
# where: 宿の屋上
屋上に、また山羊。どこから来るの

// 店主（3枚）：観光バスの日と、象の置物。
=== gt_past_shopkeeper_buses ===
# post: gt_jaipur_amber_shopkeeper
# past: 先週
# images: gt_sns_amber_shop_buses
# where: jaipur_amber_fort
観光バス、三台。今日はいい日

=== gt_past_shopkeeper_elephants ===
# post: gt_jaipur_amber_shopkeeper
# past: 去年
# images: gt_sns_amber_shop_elephants gt_sns_amber_shop_broken_trunk
# where: jaipur_amber_fort
象の置物、並べ直した。一頭だけ鼻が折れた

// 花嫁の祖母（3枚）：窓から見るガンガウルと、向かいの歩道の日傘（ガウラの日傘。名前は知らない）。
=== gt_past_bride_grandmother_gangaur ===
# post: gt_jaipur_bride_grandmother
# past: 今年の春
# images: gt_sns_bride_nani_gangaur gt_sns_bride_nani_lattice
# where: 花嫁の家
今年のガンガウルも、ここから

=== gt_past_bride_grandmother_parasol ===
# post: gt_jaipur_bride_grandmother
# past: 去年
# images: gt_sns_bride_nani_parasol
# where: 花嫁の家
向かいの日傘、今日も開いたわ

= pooja
# speaker: gt_pooja
ナーニー、また窓に張り付いてる
# speaker: gt_jaipur_bride_grandmother
見るだけは、自由よ

// ジャイガルの茶屋の老人（3枚。投稿は孫のラージューが打っている）：今日の杯数と、昔の話。
=== gt_past_jaigarh_old_man_chai ===
# post: gt_jaipur_jaigarh_old_man
# past: 先週
# images: gt_sns_jaigarh_chai_pot gt_sns_jaigarh_chai_cups
# where: jaipur_jaigarh_fort
今日のチャイ、九十八杯。孫が数えた

= raju
# speaker: gt_raju
打ったのも、ぼく

=== gt_past_jaigarh_old_man_story ===
# post: gt_jaipur_jaigarh_old_man
# past: 去年
# images: gt_sns_jaigarh_raju_runs
# where: jaipur_jaigarh_fort
昔の話をしたら、孫が逃げた
