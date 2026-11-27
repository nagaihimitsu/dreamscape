// 【SNS の投稿のファイル】デリーの投稿（2026-11-27）。書き方は authoring/SNS_PLAN.md の「札（書き方）」と「文の書き方」。
// - knot が1つの投稿、その中の stitch（= 名前）が1件のコメント。コメントの最初の行がコメント、次の行からが返事。
// - デリーの常連（ヒロインの投稿にコメントする人）は4人：カムラ・ルーヒー・モヌ・クナール（自己紹介は progression/story.json の people の sns）。
// - ヒロインの投稿は5つ：到着・クトゥブ・ミナール・インド門・チャンドニー・チョーク・アグラセン・キ・バオリ。
// - 出会った人の投稿（「出会った人の投稿」の所）。1人1つ（常連は2つまで）、写真は1枚で、たいてい会った場面の夜に届く：
//   常連：モヌ（インド門の写真。1回目の3択で3通りのうち1つだけ届く／村の上映会）、クナール（階段井戸の動画／次の撮影の下見）、
//         カムラ（段ボール、あと三つ）、ルーヒー（地下鉄の女性車両）。
//   クイズの相手：ニディ（帰りのバス）、ラームキシャン（柱の小さな土産）、スレーシュ（特記事項なし）、ハミード（雨が一本）、アマン（招待状）。
//   2つの場面に出る人・都市をまたぐ人：ミーナ（押し花）、ハルバンス（まん丸のローティー）。
//   新しい写真（gt_sns_*）は public/assets/sns/<ID>.webp。ほかの人（駅の3人も）には、旅の間に届く投稿はない。
// - 過去の投稿（# past:。二人に会う前の暮らし。会うと人物ページで読め、夜には届かず、増えない）：立ち絵のあるデリーの全員（役だけの人・駅の3人も）に
//   写真3枚ずつ（常連とクイズの相手は1枚の投稿を3つ、ほかは1枚と2枚の投稿を2つ）。1人分は新しいものから。ファイルの最後の「過去の投稿」の所。
// - 関係の変化は、インド門の投稿のモヌの後のコメント（# when: couple）。アーグラ・ジャイプールで交際が始まった夜にも届く。
INCLUDE modules.ink
-> DONE

// 到着：カムラの段ボールの地図。旅の最初の夜に届く。
// 後のコメントは、エピローグ（五行のデリー、全部行った）を見た後、都市を出るときに届く。
=== gt_post_delhi_arrival ===
# post: heroine
# images: gt_album_d002 gt_album_d003 gt_album_d005
ガイドブック、初日で不合格

= kamla
# speaker: gt_kamla
写真がきれいすぎる。
# speaker: heroine
……二回目の不合格です

= kamla_after
# timing: later
# when: epilogue delhi
# speaker: gt_kamla
五行、全部回ったかい。
# speaker: heroine
全部。三本目の木陰も

// クトゥブ・ミナール：鉄の柱と、理科の先生（対決の後の夜に届く）。
=== gt_post_delhi_qutb_minar ===
# post: heroine
# images: gt_album_d016 gt_album_d017 gt_album_d022
# when: battle gt_delhi_main_qutb_minar_battle
止めたのに、先生に叱られました

= kamla
# speaker: gt_kamla
柵が、まだあるのかい。
# speaker: heroine
抱いたこと、あるんですか？
# speaker: gt_kamla
説明したら、つまらない。

// インド門のデート。写真は、選んだ道で撮れたものだけが載る（十三人目・十四人・アイス、探した・探さなかった）。
=== gt_post_delhi_india_gate ===
# post: heroine
# images: gt_album_d054 gt_album_d25 gt_album_d057 gt_album_d058 gt_album_d061 gt_album_d062
# when: date gt_delhi_date_india_gate
# likes: gt_kamla
# likes: gt_roohi if met gt_roohi
親戚が十二人、増えました

= monu
# speaker: gt_monu
ダーディー、帰りのバスで爆睡
# speaker: heroine
起きたら、揚げパンのお礼を

= monu_couple
# timing: later
# when: couple
# when: comment gt_post_delhi_india_gate.monu
# speaker: gt_monu
ダーディーが「ほらね」って
# speaker: heroine
……それ、通訳しなくていいから

// チャンドニー・チョークのデート。カムラのコメントは、誰が「バス」と言ったかで書き分ける（どちらのフラグもない道では来ない）。
// ルーヒーの後のコメントは、腹を壊した翌朝の宿の場面（キチュリーとクミンの水）を見た後の夜に届く。
=== gt_post_delhi_chandni_chowk ===
# post: heroine
# images: gt_album_d044 gt_album_d047 gt_album_d048 gt_album_d049 gt_album_d051 gt_album_d052
# when: date gt_delhi_date_chandni_chowk
「もう十分」は、「バス」です

= kamla_said
# one_of: kamla
# when: flag gt_delhi_said_bas
# speaker: gt_kamla
バスは、言えたかい。
# speaker: heroine
はい。乗り物じゃない方を

= kamla_for_her
# one_of: kamla
# when: flag gt_delhi_bas_for_her
# speaker: gt_kamla
バスは、言えたかい。
# speaker: heroine
……連れに言われました
# speaker: gt_kamla
次は、自分で言いなさい。

= roohi
# timing: later
# when: seen gt_delhi_hotel_sick_morning
# speaker: gt_roohi
わたしは四十個まで平気
# speaker: heroine
一晩泣いたって聞いたよ

// アグラセン・キ・バオリのデート。クナールの後のコメントは、アーグラの宿で動画に気づかれた夜（gt_agra_arrive_reel）に届く。
=== gt_post_delhi_agrasen_baoli ===
# post: heroine
# images: gt_album_d073 gt_album_d077 gt_album_d081
# when: date gt_delhi_date_agrasen_baoli
# likes: gt_roohi if met gt_roohi
人生初の悲鳴は、疑問形でした

= kunal
# speaker: gt_kunal
おまけ、ちゃんと入れました
# speaker: heroine
顔は、隠してくれました？
# speaker: gt_kunal
鳩が隠してます

= kunal_views
# timing: later
# when: seen gt_agra_arrive_reel
# speaker: gt_kunal
本編より、おまけが伸びてます
# speaker: heroine
……おまけって言ったのに

// ───── 出会った人の投稿

// モヌ：インド門の写真を自分の投稿に。1回目の3択で、モヌの携帯に残った写真が違う（3つのうち1つだけが届く）。
// 主人公が撮った十三人目（彼女が祖母の隣に入った）。
=== gt_post_delhi_monu_thirteen ===
# post: gt_monu
# images: gt_album_d25
# where: delhi_india_gate
# when: date gt_delhi_date_india_gate
# when: not flag gt_delhi_photo_both_in
# when: not flag gt_delhi_india_gate_ice
十三人目は、外国の人

= heroine
# speaker: heroine
わたし、真ん中すぎない？
# speaker: gt_monu
ダーディーが離さなかったから

// 写真屋を呼んで、二人とも入った十四人。
=== gt_post_delhi_monu_fourteen ===
# post: gt_monu
# images: gt_album_d057
# where: delhi_india_gate
# when: flag gt_delhi_photo_both_in
外国の人が、二人も入った

= heroine
# speaker: heroine
村で、何て紹介されるの？
# speaker: gt_monu
ダーディーの友だち

// アイスを買いに走った道：彼女が撮った、十二人と、走ってくる一人。
=== gt_post_delhi_monu_ice ===
# post: gt_monu
# images: gt_album_d058
# where: delhi_india_gate
# when: flag gt_delhi_india_gate_ice
十三人目、アイス係

= heroine
# speaker: heroine
アイス、溶ける前に届いた？
# speaker: gt_monu
半分は、ひ孫が落とした

// クナール：階段井戸の新しい動画（ジャスミートの本物の悲鳴と、おまけの鳩）。
=== gt_post_delhi_kunal_baoli ===
# post: gt_kunal
# images: gt_album_d080 gt_album_d078
# where: delhi_agrasen_baoli
# when: date gt_delhi_date_agrasen_baoli
新作。本物の悲鳴が二本

= heroine
# speaker: heroine
ジャスミートさんの、すごかった
# speaker: gt_kunal
本人も、そう言ってます

= roohi
# when: met gt_roohi
# speaker: gt_roohi
うちの宿のお客さんだ！
# speaker: heroine
夜に見ちゃだめだよ

// モヌ：村に帰った夕方、ダーディーが近所の人に携帯の写真を見せる（インド門のデートの夜に届く。帰りのバスの後の夕方）。
// 携帯の画面の中身は写さないので、十三人目・十四人・アイスのどの道でも同じ投稿。
=== gt_post_delhi_monu_village ===
# post: gt_monu
# images: gt_sns_monu_village
# where: ハリヤーナーの村
# when: date gt_delhi_date_india_gate
ダーディー、村で上映会

= heroine
# speaker: heroine
おばあさん、得意そう！
# speaker: gt_monu
本日、三回目の上映です

// クナール：次の撮影の下見（夜の屋敷の階段に、ジャスミートの白い布）。デリーを終えた後の夜に届く（アーグラにいるときのこともある）。
// 下見の場所は明かさない（# where: なし）。
=== gt_post_delhi_kunal_location ===
# post: gt_kunal
# images: gt_sns_kunal_location
# when: date gt_delhi_date_agrasen_baoli
# when: city delhi
# likes: gt_roohi if met gt_roohi
次の現場、下見中

= jasmeet
# speaker: gt_jasmeet
わたしの布、返して
# speaker: gt_kunal
撮影が終わったら

= heroine
# speaker: heroine
わたしは、行かないからね
# speaker: gt_kunal
まだ、誘ってません

// カムラ：引っ越しの朝の戸口（段ボールが三つ）。デリーの2日目の夜から、エピローグの前まで（エピローグの翌朝に車で出るため）。
=== gt_post_delhi_kamla_boxes ===
# post: gt_kamla
# images: gt_sns_kamla_last_boxes
# where: 路地の家
# when: day >= 2
# until: epilogue delhi
# likes: gt_roohi if met gt_roohi
段ボール、あと三つ。

= heroine
# speaker: heroine
手伝いましょうか？
# speaker: gt_kamla
指図なら、足りてる。

// ルーヒー：地下鉄の女性車両（作文の場面の後、その夜に届く）。作文の題がメトロになったかで、返事を書き分ける。
// メトロにならなかった道の返事は、駅の場面の伝言（誰にも見せない作文）を先に言わない。
=== gt_post_delhi_roohi_metro ===
# post: gt_roohi
# images: gt_sns_roohi_metro
# where: 地下鉄の女性車両
# when: seen gt_delhi_hotel_homework
# likes: gt_kamla
今日も、先頭の車両

= heroine_essay
# one_of: heroine
# when: flag gt_delhi_roohi_metro_essay
# speaker: heroine
床で宿題の子、ほんとにいた！
# speaker: gt_roohi
作文も、ここで書いてる

= heroine_monument
# one_of: heroine
# when: not flag gt_delhi_roohi_metro_essay
# speaker: heroine
床で宿題の子、ほんとにいた！
# speaker: gt_roohi
作文には、書かないけどね

// ニディ：遠足の帰りのバス（レッド・フォートのクイズの夜に届く）。約束を破った子はバスで歌う決まりだった。
=== gt_post_delhi_nidhi_bus ===
# post: gt_nidhi
# images: gt_sns_nidhi_bus
# where: 帰りのバス
# when: battle gt_delhi_main_red_fort_battle
# likes: gt_anjali gt_faiz
帰りのバス、歌った子はゼロ

= heroine
# speaker: heroine
三十九人、そろってますか？
# speaker: gt_nidhi
数えました。三回

= sonu
# speaker: gt_sonu
先生、ぼく今から歌えます
# speaker: gt_nidhi
寝なさい。

// ラームキシャン：帰りの夜行バスで、鉄の柱の小さな土産を手のひらに（クトゥブ・ミナールのクイズの夜に届く）。
=== gt_post_delhi_ramkishan_souvenir ===
# post: gt_delhi_qutb_man
# images: gt_sns_ramkishan_pillar
# where: 帰りの夜行バス
# when: battle gt_delhi_main_qutb_minar_battle
抱けないので、小さいのを買った

= heroine
# speaker: heroine
それ、錆びないやつですか？
# speaker: gt_delhi_qutb_man
安物です。錆びたら教材に

// スレーシュ：誰も誰にも会わなかった日の、家の机（フマユーン廟のクイズの夜に届く）。椅子の背のクルタの胸ポケットは空。
// メヘルの「異議なし」は、廟での口裏合わせへの返事。スレーシュは返事をしない。
=== gt_post_delhi_suresh_desk ===
# post: gt_suresh
# images: gt_sns_suresh_desk
# when: battle gt_delhi_main_humayun_tomb_battle
# likes: gt_meena if date gt_delhi_date_lodhi_garden
本日、特記事項なし

= mehr
# speaker: gt_mehr
異議なし

// ミーナ：古い本に挟んだ薔薇の押し花（フマユーン廟のクイズとロディ・ガーデンのデートの両方の後の夜に届く。順はどちらでも二本目）。
// スレーシュのコメントは、ロディ・ガーデンで、写真をメヘルに送ってみたらと勧めた道だけ（隠すのをやめかけている）。
=== gt_post_delhi_meena_book ===
# post: gt_meena
# images: gt_sns_meena_book
# when: battle gt_delhi_main_humayun_tomb_battle
# when: date gt_delhi_date_lodhi_garden
押し花、二本目になりました

= heroine
# speaker: heroine
まだ、いい匂いしますか？
# speaker: gt_meena
本と同じ匂いになったわ

= suresh
# when: flag gt_delhi_suresh_encouraged
# speaker: gt_suresh
その本は、閉じておくように
# speaker: gt_meena
閉じてるわよ

// ハミード：店の棚、ミッティ（雨の匂い）の瓶が一本ぶん空いた（ジャーマー・マスジドのクイズの夜に届く）。
// ゾヘブへの返事で、ハミードが息子と電話で話したことが分かる（ハミードの過去の投稿は九〜十年前のものだけ。下の「過去の投稿」）。
=== gt_post_delhi_hamid_shelf ===
# post: gt_delhi_jama_old_man
# images: gt_sns_hamid_shelf
# where: delhi_jama_masjid
# when: battle gt_delhi_main_jama_masjid_battle
雨が一本、売れた

= zoheb
# speaker: gt_zoheb
爺さん、九年ぶりの投稿かよ
# speaker: gt_delhi_jama_old_man
息子に、教わり直した

// ハルバンス：ランガルの台所、夕方のローティーは全部まん丸（バングラー・サーヒブのデートの夜に届く）。
// アーグラのグル・カ・タールの再会（息子）は先に言わない。
=== gt_post_delhi_harbans_roti ===
# post: gt_harbans
# images: gt_sns_harbans_roti
# where: delhi_bangla_sahib
# when: date gt_delhi_date_bangla_sahib
夕方の分は、全部まん丸。つまらん

= heroine
# speaker: heroine
また、地図を作りに行きます
# speaker: gt_harbans
国は、まだたくさんある

// アマン：空になった祖母の家で、結婚式の招待状を書く（エピローグの後、都市を出るときに届く）。横で祖母が落花生を割っている。
=== gt_post_delhi_aman_invitations ===
# post: gt_aman
# images: gt_sns_aman_invitations
# where: 祖母の家
# when: epilogue delhi
招待状、残り二百枚

= kamla
# speaker: gt_kamla
字が、曲がってる。
# speaker: gt_aman
……零時過ぎなので

= heroine
# speaker: heroine
一通、受け取りました
# speaker: gt_aman
祖母が、返事はまだかと
# speaker: heroine
……まだ、一晩です

// ───── 後の都市で届く、出会った人のその後（2026-11-27 に足した。二人のしたことや、前の都市の出来事が返ってくる）

// クナール：階段井戸の動画の「おまけ」が、勝手に切り抜かれて出回る。アーグラの宿で動画に気づかれた夜に届く（3つ目の投稿）。
=== gt_post_delhi_kunal_clip ===
# post: gt_kunal
# images: gt_sns_kunal_clip
# where: 大学の近くのカフェ
# when: seen gt_agra_arrive_reel
切り抜き、勝手に出回ってる

= heroine
# speaker: heroine
……消せませんか？
# speaker: gt_kunal
ネットは、消えません

= jasmeet
# speaker: gt_jasmeet
本編も、見てね

// スレーシュ：ロディ・ガーデンで、写真を送ってみたらと勧めた道だけ。駅の伝言（今夜、カビールが夕食に来る）の後に届く。
// 「本日、特記事項なし」（フマユーン廟の夜）の続き。
=== gt_post_delhi_suresh_dinner ===
# post: gt_suresh
# images: gt_sns_suresh_dinner
# where: 家の食卓
# when: flag gt_delhi_suresh_encouraged
# when: seen gt_delhi_depart_station
本日、特記事項あり。夕食、一人多い

= mehr
# speaker: gt_mehr
叔父さん、その写真は消して
# speaker: gt_suresh
記録は、残す。

= heroine
# speaker: heroine
特記事項、聞きたいです
# speaker: gt_suresh
申告は、本人から

// ラームキシャン：反対していたデリーの大学の願書を、娘と二人で書いた。アーグラの観光を一つ終えた夜に届く。
// 机の上に、クトゥブ・ミナールの土産の柱の置き物（旅の間の投稿 gt_post_delhi_ramkishan_souvenir）。
=== gt_post_delhi_ramkishan_application ===
# post: gt_delhi_qutb_man
# images: gt_sns_ramkishan_application
# where: 家の机
# when: battle gt_delhi_main_qutb_minar_battle
# when: episodes agra >= 1
願書、二人で書いた

= heroine
# speaker: heroine
先生、反対は？
# speaker: gt_delhi_qutb_man
撤回しました。柱のせいです

// モヌ：インド門のデートをして、交際が始まった夜だけ届く。村の布屋で、ダーディーが婚礼の布を広げている。
// 「二人はいつ結婚するのか」と、コメントの「ダーディーが「ほらね」って」の、さらに先。
=== gt_post_delhi_monu_bridal_cloth ===
# post: gt_monu
# images: gt_sns_monu_bridal_cloth
# where: 村の布屋
# when: date gt_delhi_date_india_gate
# when: couple
ダーディーが、布を選び始めた

= heroine
# speaker: heroine
まだ、早いです！
# speaker: gt_monu
もう、通訳しておいた

// ルーヒー：作文が返ってきた。駅の伝言の後に届く。作文の題で2つに分かれ、1つだけが届く。
// 女性車両の作文：クラスで読まれて、点はまあまあ。車両の子たちに見せた。
=== gt_post_delhi_roohi_essay_metro ===
# post: gt_roohi
# images: gt_sns_roohi_essay_metro
# where: 地下鉄の女性車両
# when: flag gt_delhi_roohi_metro_essay
# when: seen gt_delhi_depart_station
作文、まあまあでした！

= heroine
# speaker: heroine
車両のみんなにも、見せた？
# speaker: gt_roohi
朗読会、三駅ぶん

// インド門の作文：満点。引き出しには、誰にも見せない女性車両の作文（駅の伝言のとおり。中身は写さない）。
=== gt_post_delhi_roohi_essay_monument ===
# post: gt_roohi
# images: gt_sns_roohi_essay_monument
# where: 宿の帳場
# when: seen gt_delhi_hotel_homework
# when: not flag gt_delhi_roohi_metro_essay
# when: seen gt_delhi_depart_station
インド門の作文、満点

= heroine
# speaker: heroine
引き出しの方も、読みたいな
# speaker: gt_roohi
……ひみつ

// ───── 過去の投稿（会うと人物ページで読める。夜には届かない）
// 二人に会う前の暮らし。場面の種明かし・ヒロインが守った秘密・フィナーレの手がかり（女性車両・月の池・香辛料・城の灯り）は書かない。
// コメントは、その人を知っている立ち絵のある人だけ。1人分は新しいものから。

// カムラ（落花生・引っ越しを決めた日・路地の椅子）。椅子の片方は、亡き夫の席（フィナーレの前に、そうとは言わない）。
=== gt_past_kamla_peanut_cart ===
# post: gt_kamla
# past: 先週
# images: gt_sns_kamla_peanut_cart
# where: 路地
落花生屋が、また値上げ。

= okami
# speaker: gt_delhi_hotel_okami
うちの分も、お願い
# speaker: gt_kamla
自分で値切りなさい。

=== gt_past_kamla_flat_boxes ===
# post: gt_kamla
# past: 先月
# images: gt_sns_kamla_flat_boxes
# where: 路地の家
ジャイプール行き、決めた。

= aman
# speaker: gt_aman
荷造りは、僕がやるから
# speaker: gt_kamla
指図は、わたし。

=== gt_past_kamla_two_chairs ===
# post: gt_kamla
# past: 去年の冬
# images: gt_sns_kamla_two_chairs
# where: 路地
椅子は二つ。片方は、荷物置き。

= roohi
# speaker: gt_roohi
その椅子、座っていい？
# speaker: gt_kamla
だめ。

// ルーヒー（忘れ物の箱・兄のクリケット・カムラに習った値切り）。
=== gt_past_roohi_lost_box ===
# post: gt_roohi
# past: 先週
# images: gt_sns_roohi_lost_box
# where: 宿の帳場
お客さんの忘れ物、わたしの係

= okami
# speaker: gt_delhi_hotel_okami
ルーヒー、あれ持ってきて
# speaker: gt_roohi
どれ？

=== gt_past_roohi_cricket ===
# post: gt_roohi
# past: 先月
# images: gt_sns_roohi_cricket
# where: 路地
お兄ちゃんのクリケット。わたしは球拾い

=== gt_past_roohi_vegetables ===
# post: gt_roohi
# past: 去年の夏
# images: gt_sns_roohi_vegetables
# likes: gt_delhi_hotel_okami
カムラおばあちゃんに、値切り方を習った

= kamla
# speaker: gt_kamla
まだ、甘い。

// モヌ（割れた画面・去年の望遠・村の水牛）。去年の名前探しは、デートの前の話として。
=== gt_past_monu_cracked_phone ===
# post: gt_monu
# past: 先週
# images: gt_sns_monu_cracked_phone
画面のひび、三本目

=== gt_past_monu_zoom_names ===
# post: gt_monu
# past: 去年
# images: gt_sns_monu_zoom_names
# where: delhi_india_gate
望遠で撮った。やっぱり読めない

=== gt_past_monu_buffalo ===
# post: gt_monu
# past: 二年前
# images: gt_sns_monu_buffalo
# where: ハリヤーナーの村
うちの水牛、写真ぎらい

// クナール（ジャスミートのあくび・再生数・初めての撮影）。
=== gt_past_kunal_yawn ===
# post: gt_kunal
# past: 先週
# images: gt_sns_kunal_yawn
本番中、ジャスミートがあくび

= jasmeet
# speaker: gt_jasmeet
夜中に撮るからでしょ
# speaker: gt_kunal
夜しか出ないんだよ

=== gt_past_kunal_editing ===
# post: gt_kunal
# past: 先月
# images: gt_sns_kunal_editing
新作の再生、十七回。母が三回

= jasmeet
# speaker: gt_jasmeet
残りの十四回は、わたし
# speaker: gt_kunal
……ありがとう

=== gt_past_kunal_tripod ===
# post: gt_kunal
# past: 一年前
# images: gt_sns_kunal_tripod
# likes: gt_jasmeet
初めての撮影。三脚が先に倒れた

// ニディ（遠足の下見・運動会・笛）。ファイズが話さなくなった話は書かない。
=== gt_past_nidhi_scouting ===
# post: gt_nidhi
# past: 先週
# images: gt_sns_nidhi_scouting
# where: delhi_red_fort
遠足の下見。トイレは三か所

= anjali
# speaker: gt_anjali
先生、しおりの番号がずれてます
# speaker: gt_nidhi
直しました。

=== gt_past_nidhi_sports_day ===
# post: gt_nidhi
# past: 去年の秋
# images: gt_sns_nidhi_sports_day
# where: 学校の校庭
運動会。ソーヌーの敬礼が、校長より立派

= sonu
# speaker: gt_sonu
練習しましたから！
# speaker: gt_nidhi
走る練習もしなさい。

=== gt_past_nidhi_whistles ===
# post: gt_nidhi
# past: 三年前
# images: gt_sns_nidhi_whistles
笛、三代目。先の二つは鳴らない

// ラームキシャン（錆の実験・娘の点数・父の古い写真）。娘のデリーの大学の話は書かない。
=== gt_past_ramkishan_nails ===
# post: gt_delhi_qutb_man
# past: 先週
# images: gt_sns_ramkishan_nails
# where: 理科室
釘の錆の実験。魔法は、今週も起きず

=== gt_past_ramkishan_laddoo ===
# post: gt_delhi_qutb_man
# past: 二年前
# images: gt_sns_ramkishan_laddoo
娘の理科、九十八点。父より上

=== gt_past_ramkishan_father ===
# post: gt_delhi_qutb_man
# past: 三年前
# images: gt_sns_ramkishan_father
父の古い写真。柵のなかった頃の柱

// スレーシュ（釣り銭・三紙の見出し・退職の日）。薔薇・ミーナ・笑う会は書かない。
=== gt_past_suresh_coins ===
# post: gt_suresh
# past: 先週
# images: gt_sns_suresh_coins
八百屋の釣り銭、二ルピー合わん

= mehr
# speaker: gt_mehr
叔父さん、二ルピーだよ
# speaker: gt_suresh
二ルピーも、ルピーだ

=== gt_past_suresh_three_papers ===
# post: gt_suresh
# past: 先月
# images: gt_sns_suresh_three_papers
三紙の見出しが、合わない

=== gt_past_suresh_retirement ===
# post: gt_suresh
# past: 三年前
# images: gt_sns_suresh_retirement
三十五年。本日、調査終了

= mehr
# speaker: gt_mehr
おつかれさま、叔父さん！
# speaker: gt_suresh
……うむ

// ハミード（九〜十年前、息子がドバイへ行くときに置いていった電話で。それきり九年、投稿していない）。店を売る話は書かない。
=== gt_past_hamid_clock ===
# post: gt_delhi_jama_old_man
# past: 九年前の冬
# images: gt_sns_hamid_clock
# where: delhi_jama_masjid
柱時計が止まった。叩いたら動いた

= zoheb
# speaker: gt_zoheb
爺さん、叩くなって
# speaker: gt_delhi_jama_old_man
叩けば、動く。

=== gt_past_hamid_thumb ===
# post: gt_delhi_jama_old_man
# past: 九年前の春
# images: gt_sns_hamid_thumb
# where: delhi_jama_masjid
店を撮った。指も写った

=== gt_past_hamid_son_bottle ===
# post: gt_delhi_jama_old_man
# past: 十年前
# images: gt_sns_hamid_son_bottle
ドバイは雨が少ないそうだ。一瓶持たせた

// アマン（ターバンの試着・初めて二人で会った日・いとこの結婚式の馬の係）。祖母の地下鉄のことは知らない。
=== gt_past_aman_turban ===
# post: gt_aman
# past: 先週
# images: gt_sns_aman_turban
ターバンの試着、三回目

= kamla
# speaker: gt_kamla
曲がってる。
# speaker: gt_aman
店の人にも、言われました

=== gt_past_aman_cafe ===
# post: gt_aman
# past: 先月
# images: gt_sns_aman_cafe
初めて二人で。話題は、天気だけ

=== gt_past_aman_horse ===
# post: gt_aman
# past: 三年前
# images: gt_sns_aman_horse
いとこの結婚式。僕は、馬の係

// ハルバンス（日曜の朝の電話・トラックを降りた日・街道の茶屋）。カナダへ行かない本当の訳と、アーグラの息子は書かない。
=== gt_past_harbans_sunday_chai ===
# post: gt_harbans
# past: 先週
# images: gt_sns_harbans_sunday_chai
日曜の朝。電話の前に、チャイ

=== gt_past_harbans_truck ===
# post: gt_harbans
# past: 去年
# images: gt_sns_harbans_truck
地球五十周ぶん走って、今日で降りた

=== gt_past_harbans_dhaba ===
# post: gt_harbans
# past: 十年前
# images: gt_sns_harbans_dhaba
# where: 街道の茶屋
この茶屋のチャイは、匙が立つ

// メヘル（叔父の新聞・試験前夜）。カビールとのことは書かない（同級生のまま）。
=== gt_past_mehr_uncle_paper ===
# post: gt_mehr
# past: 先週
# images: gt_sns_mehr_uncle_paper
叔父さん、朝から新聞の壁

= suresh
# speaker: gt_suresh
撮るな。
# speaker: gt_mehr
もう載せた

=== gt_past_mehr_exam ===
# post: gt_mehr
# past: 先月
# images: gt_sns_mehr_notes gt_sns_mehr_chai
試験前夜。歴史は、借りたノート頼み

= kabir
# speaker: gt_kabir
……試験の後で、返してね
# speaker: gt_mehr
覚えてたらね

// カビール（閉館まで図書室・レポートの下見）。
=== gt_past_kabir_library ===
# post: gt_kabir
# past: 先週
# images: gt_sns_kabir_library
閉館の放送まで、図書室

= mehr
# speaker: gt_mehr
また最後の一人？
# speaker: gt_kabir
……うん

=== gt_past_kabir_report ===
# post: gt_kabir
# past: 去年
# images: gt_sns_kabir_tomb gt_sns_kabir_stairs
レポートの下見。皇帝の図書室の階段、急

// ゾヘブ（新作のケース・開店の日）。店を買いたがる訳は書かない。
=== gt_past_zoheb_cases ===
# post: gt_zoheb
# past: 先週
# images: gt_sns_zoheb_cases
# where: delhi_jama_masjid
新作のケース入荷。隣は見もしない

=== gt_past_zoheb_opening ===
# post: gt_zoheb
# past: 五年前
# images: gt_sns_zoheb_opening gt_sns_zoheb_garland
# where: delhi_jama_masjid
開店の日。花輪は、隣の爺さんから

// アンジャリ（遠足の質問・学級委員）。
=== gt_past_anjali_questions ===
# post: gt_anjali
# past: 先週
# images: gt_sns_anjali_tabs gt_sns_anjali_pencils
遠足の質問、番号つきで二十問

= nidhi
# speaker: gt_nidhi
三問で足ります
# speaker: gt_anjali
念のためです

=== gt_past_anjali_badge ===
# post: gt_anjali
# past: 去年
# images: gt_sns_anjali_badge
学級委員、二年連続

= sonu
# speaker: gt_sonu
ぼくは副委員！
# speaker: gt_anjali
立候補してないでしょ

// ソーヌー（鏡の前の敬礼・独立記念日のテレビ）。
=== gt_past_sonu_mirror ===
# post: gt_sonu
# past: 先週
# images: gt_sns_sonu_mirror
鏡の前で、敬礼百回

= anjali
# speaker: gt_anjali
角度、ずれてる
# speaker: gt_sonu
直しました！

=== gt_past_sonu_august ===
# post: gt_sonu
# past: 去年の八月
# images: gt_sns_sonu_tv gt_sns_sonu_paper_flag
テレビの首相と、同時に敬礼

// ファイズ（窓の鳩・古い詩の本）。話さなくなった訳と、話す場面は書かない。
=== gt_past_faiz_pigeons ===
# post: gt_faiz
# past: 先週
# images: gt_sns_faiz_pigeons
窓の外、鳩が三羽

= classmate
# speaker: gt_delhi_red_fort_classmate
ファイズ、先生が呼んでたよ！

=== gt_past_faiz_poems ===
# post: gt_faiz
# past: 去年の冬
# images: gt_sns_faiz_poetry_book gt_sns_faiz_flashlight
古い詩の本。返すの、一週間遅れた

// 隣の子（ファイズの隣の席の、声の大きい子）。
=== gt_past_classmate_tiffins ===
# post: gt_delhi_red_fort_classmate
# past: 先週
# images: gt_sns_classmate_tiffins
# likes: gt_faiz
弁当、ファイズと半分こ！

=== gt_past_classmate_recital ===
# post: gt_delhi_red_fort_classmate
# past: 去年
# images: gt_sns_classmate_medal gt_sns_classmate_stage
朗読大会、声の大きさで二位！

= anjali
# speaker: gt_anjali
一位は、わたし
# speaker: gt_delhi_red_fort_classmate
知ってる！

// ジャスミート（台所のヤモリ・怖い映画）。鳩の悲鳴は書かない。
=== gt_past_jasmeet_gecko ===
# post: gt_jasmeet
# past: 先週
# images: gt_sns_jasmeet_gecko
台所で本物の悲鳴。犯人はヤモリ

= kunal
# speaker: gt_kunal
なんで撮ってないの
# speaker: gt_jasmeet
撮れるわけないでしょ

=== gt_past_jasmeet_movie ===
# post: gt_jasmeet
# past: 先月
# images: gt_sns_jasmeet_cinema gt_sns_jasmeet_popcorn
怖い映画、半分で寝た

= kunal
# speaker: gt_kunal
参考にならない
# speaker: gt_jasmeet
ポップコーンは、おいしかった

// ドゥベイ（笑う会の朝・最後の放送）。会に来る人の名前は書かない。
=== gt_past_dubey_lawn ===
# post: gt_dubey
# past: 先週
# images: gt_sns_dubey_lawn
# where: delhi_lodhi_garden
まもなく、笑う会が到着いたします

=== gt_past_dubey_last_call ===
# post: gt_dubey
# past: 三年前
# images: gt_sns_dubey_microphone gt_sns_dubey_platform
三十年の放送、本日終了いたします

// ミーナ（同窓会の名簿・淡い色のサリー）。古い集合写真の中の、笑っていない青年は誰とも言わない。
=== gt_past_meena_reunion ===
# post: gt_meena
# past: 先月
# images: gt_sns_meena_class_photo gt_sns_meena_address_book
同窓会の名簿、作っています

=== gt_past_meena_sarees ===
# post: gt_meena
# past: 去年
# images: gt_sns_meena_sarees
淡い色、また一枚増えました

// 揚げ菓子屋の店主（朝の一鍋・祭りの前）。
=== gt_past_sweetshop_first_pot ===
# post: gt_delhi_sweet_shopkeeper
# past: 先週
# images: gt_sns_sweetshop_first_pot gt_sns_sweetshop_tray
# where: delhi_chandni_chowk
朝五時、最初の一鍋

=== gt_past_sweetshop_diwali ===
# post: gt_delhi_sweet_shopkeeper
# past: 去年の秋
# images: gt_sns_sweetshop_diwali_boxes
# where: delhi_chandni_chowk
ディーワーリーの前。三日、寝てない

// 香辛料の問屋（くしゃみの客・父の代の店）。
=== gt_past_spice_sneezes ===
# post: gt_delhi_spice_trader
# past: 先週
# images: gt_sns_spice_chillies
本日のくしゃみ、客二十七人

=== gt_past_spice_same_corner ===
# post: gt_delhi_spice_trader
# past: 去年
# images: gt_sns_spice_old_print gt_sns_spice_same_corner
父の代と同じ角。変わったのは、わしの髪

// 宿のおかみ（朝の台所・屋上の洗濯物）。
=== gt_past_okami_tiffins ===
# post: gt_delhi_hotel_okami
# past: 先週
# images: gt_sns_okami_tiffins
# where: 宿の台所
弁当二つと、朝食十二人分

= roohi
# speaker: gt_roohi
わたしのは、辛くしないで
# speaker: gt_delhi_hotel_okami
自分で作りなさい

=== gt_past_okami_sheets ===
# post: gt_delhi_hotel_okami
# past: 先月
# images: gt_sns_okami_rooftop_sheets gt_sns_okami_clothespins
# where: 宿の屋上
シーツ二十枚。屋上が、白い海

= owner
# speaker: gt_delhi_hotel_owner
今日は、風が強いぞ
# speaker: gt_delhi_hotel_okami
だから干すの

// 宿の主人（車の芳香剤・屋上の机）。駅前の「運休」の話は、駅の場面の前に言わない。
=== gt_past_owner_air_freshener ===
# post: gt_delhi_hotel_owner
# past: 先週
# images: gt_sns_owner_air_freshener
車の芳香剤、娘が選んだ。強い

= roohi
# speaker: gt_roohi
いい匂いでしょ
# speaker: gt_delhi_hotel_owner
目にしみる

=== gt_past_owner_tables ===
# post: gt_delhi_hotel_owner
# past: 去年
# images: gt_sns_owner_rooftop_before gt_sns_owner_rooftop_after
# where: 宿の屋上
屋上の机、青く塗った。乾くまで三日

= okami
# speaker: gt_delhi_hotel_okami
色、相談されてない
# speaker: gt_delhi_hotel_owner
……青も、いい色だ

// オートリキシャの運転手（メーター・塗り直し）。
=== gt_past_auto_meter ===
# post: gt_delhi_auto_driver
# past: 先週
# images: gt_sns_auto_meter
メーター、今日も調子が悪い

=== gt_past_auto_fresh_paint ===
# post: gt_delhi_auto_driver
# past: 去年
# images: gt_sns_auto_fresh_paint gt_sns_auto_back_art
相棒を塗り直した。メーターは、そのまま

// レッド・フォートの係員（日没の門・昼休み）。夜の催しのことは書かない（フィナーレの手がかり）。
=== gt_past_fortguide_sunset ===
# post: gt_delhi_red_fort_guide
# past: 先週
# images: gt_sns_fortguide_sunset_gate
# where: delhi_red_fort
日没です。「もう少しだけ」が、今日も多い

=== gt_past_fortguide_lunch ===
# post: gt_delhi_red_fort_guide
# past: 去年の夏
# images: gt_sns_fortguide_lunch gt_sns_fortguide_squirrel
# where: delhi_red_fort
昼休み。リスも、日陰を知っている

// 荷運びの男（仲間の記録・ホームの昼休み）。
=== gt_past_porter_four_cases ===
# post: gt_delhi_porter
# past: 先週
# images: gt_sns_porter_four_cases
# where: ニューデリー駅
仲間が、頭に四つ。負けた

=== gt_past_porter_break ===
# post: gt_delhi_porter
# past: 先月
# images: gt_sns_porter_platform_chai gt_sns_porter_head_pad
# where: ニューデリー駅
昼休み。頭の上が、軽い

// 検札係（靴底・夜勤明け）。
=== gt_past_checker_loafers ===
# post: gt_delhi_ticket_checker
# past: 先週
# images: gt_sns_checker_loafers
ホームを歩いて、靴底が今年三足目

=== gt_past_checker_night_shift ===
# post: gt_delhi_ticket_checker
# past: 先月
# images: gt_sns_checker_dawn_tracks gt_sns_checker_breakfast
夜勤明け。線路の向こうが、もう明るい

// ゴルガッパの屋台の男（一日の皮・雨の日）。
=== gt_past_vendor_shells ===
# post: gt_delhi_chandni_vendor
# past: 先週
# images: gt_sns_vendor_shells
# where: delhi_chandni_chowk
今日の皮、二千個。手は二本

=== gt_past_vendor_rain ===
# post: gt_delhi_chandni_vendor
# past: 去年の雨季
# images: gt_sns_vendor_tarp_rain gt_sns_vendor_green_water
# where: delhi_chandni_chowk
雨の日も、緑の水は売れる

// 屋台の隣の客（昼休みの六個・休みの日）。
=== gt_past_customer_lunch ===
# post: gt_delhi_chandni_customer
# past: 先週
# images: gt_sns_customer_lunch
昼休み十五分。六個で、バス

=== gt_past_customer_holiday ===
# post: gt_delhi_chandni_customer
# past: 先月
# images: gt_sns_customer_bhature gt_sns_customer_kulfi
休みの日は、バスと言わない

// 駅前の「案内係」の青年（だましていたときの名乗りのまま。手口は書かない）。
=== gt_past_scam_youth_desk ===
# post: gt_delhi_scam_young_man
# past: 先週
# images: gt_sns_scam_youth_desk
本日も、運休のお知らせに立ちます

=== gt_past_scam_youth_rain ===
# post: gt_delhi_scam_young_man
# past: 先月
# images: gt_sns_scam_youth_umbrella gt_sns_scam_youth_wet_shoes
# where: ニューデリー駅前
雨の日も、同じ角でご案内

// ベストの男（駅の「係」の名乗りのまま）。
=== gt_past_scam_vest_radio ===
# post: gt_delhi_scam_vest_man
# past: 先週
# images: gt_sns_scam_vest_radio
無線、電池交換。感度良好

=== gt_past_scam_vest_laundry ===
# post: gt_delhi_scam_vest_man
# past: 先月
# images: gt_sns_scam_vest_laundry gt_sns_scam_vest_glow
ベストを洗った。夜でも、よく光る

// 背広の男（「政府公認・観光案内所」の名乗りのまま）。
=== gt_past_scam_suit_chai ===
# post: gt_delhi_scam_suit_man
# past: 先週
# images: gt_sns_scam_suit_chai
本日のチャイ、十二杯お出ししました

=== gt_past_scam_suit_frames ===
# post: gt_delhi_scam_suit_man
# past: 先月
# images: gt_sns_scam_suit_frames gt_sns_scam_suit_hammer
壁の額が、また三枚増えました
