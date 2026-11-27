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
