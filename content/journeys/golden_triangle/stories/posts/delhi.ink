// 【SNS の投稿のファイル】デリーの投稿（2026-11-27）。書き方は authoring/SNS_PLAN.md の「札（書き方）」と「文の書き方」。
// - knot が1つの投稿、その中の stitch（= 名前）が1件のコメント。コメントの最初の行がコメント、次の行からが返事。
// - デリーの常連（ヒロインの投稿にコメントする人）は4人：カムラ・ルーヒー・モヌ・クナール（自己紹介は progression/story.json の people の sns）。
// - ヒロインの投稿は5つ：到着・クトゥブ・ミナール・インド門・チャンドニー・チョーク・アグラセン・キ・バオリ。
// - 出会った人の投稿（「出会った人の投稿」の所）。1人1つ（常連は2つまで）、写真は1枚で、たいてい会った場面の夜に届く：
//   常連：モヌ（インド門の写真。1回目の3択で3通りのうち1つだけ届く／村の上映会）、クナール（階段井戸の動画／次の撮影の下見）、
//         カムラ（段ボール、あと三つ）、ルーヒー（地下鉄の女性車両）。
//   クイズの相手：ニディ（帰りのバス）、ラームキシャン（柱の小さな土産）、スレーシュ（特記事項なし）、ハミード（雨が一本）、アマン（招待状）。
//   2つの場面に出る人・都市をまたぐ人：ミーナ（押し花）、ハルバンス（まん丸のローティー）。
//   新しい写真（gt_sns_*）は public/assets/sns/<ID>.webp。ほかの人（駅の3人も）は自己紹介だけ。
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
// ゾヘブへの返事で、ハミードが息子と電話で話したことが分かる。
=== gt_post_delhi_hamid_shelf ===
# post: gt_delhi_jama_old_man
# images: gt_sns_hamid_shelf
# where: delhi_jama_masjid
# when: battle gt_delhi_main_jama_masjid_battle
雨が一本、売れた

= zoheb
# speaker: gt_zoheb
爺さん、SNS始めたのかよ
# speaker: gt_delhi_jama_old_man
息子に教わった

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
