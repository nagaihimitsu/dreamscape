// 【SNS の投稿のファイル】アーグラの投稿（2026-11-27）。書き方は authoring/SNS_PLAN.md の「札（書き方）」と「文の書き方」。
// - knot が1つの投稿、その中の stitch（= 名前）が1件のコメント。コメントの最初の行がコメント、次の行からが返事。
// - アーグラの常連（彼女の投稿にコメントする人）は4人：サミール・ドゥッガル・ヴィムラー（どれもアーグラで誰もが会う）と、
//   デリーのカムラ（フィナーレで「アーグラでも、言いたいことは言いなさい」を思い出す。エピローグの「カムラさんに、報告できる」の相手）。
//   ヴィムラーは、会う前に届くかもしれない投稿では # when: battle gt_agra_main_itimad_tomb_battle を付ける。
// - ヒロインの投稿は5つ：到着（白鳥）・アーグラ城（監視団）・フィナーレ（五十人の前で）は誰でも通る。ラーム・バーグ・アクバル廟はデートの後。
// - 二人がしたことへの反応：ラーム・バーグの「今のところは」（flag gt_agra_said_for_now）、アクバル廟で猿に取られた物
//   （雨の匂いの小瓶が芝生で割れた・取り返した・サングラス）。どれも # one_of: で書き分ける。
// - 関係の変化は、到着の投稿のサミールの後のコメント（# when: couple）。アーグラかジャイプールで交際が始まった夜に届く。
// - 出会った人の投稿は、クイズの相手（ニキル・ドゥッガル・ヴィムラー・ムケーシュ・アンワル）、二つ以上の場面に出る人（タンヴィ・サミール・ヴィノード）、
//   都市をまたぐ人（デリーのハルバンス）に1つずつ。写真は新しく描く絵（gt_sns_*。依頼は scratchpad の sns-agra-photos.md）。
//   同じ夜に重ならないよう、サミールは2日目の夜から、タンヴィはチーニー・カ・ラウザーのデートの後、ヴィノードはツアーから宿に戻った夜にした。
INCLUDE modules.ink
-> DONE

// 到着：ハネムーン・スペシャルの白鳥。アーグラの最初の夜に届く（「見ないで、白鳥」の写真は、恋人でない道だけ）。
// 後のコメントは、交際が始まった夜に届く（サミールの最初のコメントが届いていれば）。
=== gt_post_agra_arrival ===
# post: heroine
# images: gt_album_a001 gt_album_a01 gt_album_a003 gt_album_a004 gt_album_a005
新婚なのは、白鳥だけです

= samir
# speaker: gt_samir
皆さん、最初はそうおっしゃいます
# speaker: heroine
……最後まで、そう言います

= samir_couple
# timing: later
# when: couple
# when: comment gt_post_agra_arrival.samir
# speaker: gt_samir
やはり、ハネムーンでしたか！
# speaker: heroine
新婚じゃないです。そこだけ

// アーグラ城：国際監視団（対決の後の夜に届く）。大佐の白い顔とリヤへの耳打ちの写真は載せない（大佐の秘密を守る）。
=== gt_post_agra_agra_fort ===
# post: heroine
# images: gt_album_a025 gt_album_a026 gt_album_a030 gt_album_a031
# when: battle gt_agra_main_agra_fort_battle
# likes: gt_riya
国際監視団に、任命されました

= duggal
# speaker: gt_agra_fort_old_man
勲章の掲載を、許可する。
# speaker: heroine
勲章、食べちゃいました
# speaker: gt_agra_fort_old_man
……予備は、まだある。

// フィナーレ：五十人の前で、新婚ではないと言えた（対決の後の夜に届く）。カムラへの報告。
=== gt_post_agra_finale ===
# post: heroine
# images: gt_album_a131 gt_album_a134 gt_album_a136 gt_album_a138 gt_album_a140
# when: battle gt_agra_finale_battle
# likes: gt_anwar
新婚じゃないって、五十人に言えた

= kamla
# speaker: gt_kamla
アーグラでも、言えたかい。
# speaker: heroine
言えました。声は震えたけど
# speaker: gt_kamla
震えても、言えたら上等。

= vimla
# speaker: gt_vimla
よろしい。
# speaker: heroine
……採点、されてる

// ラーム・バーグのデート：インドの不満リスト。サミールのコメントは、茶屋で「今のところは」と答えたかで書き分ける（茶屋の主人からの噂）。
=== gt_post_agra_ram_bagh ===
# post: heroine
# images: gt_album_a086 gt_album_a087 gt_album_a088 gt_album_a090 gt_album_a091 gt_album_a092 gt_album_a093
# when: date gt_agra_date_ram_bagh
# likes: gt_agra_ram_bagh_tea_master
インドの不満リスト、作成中

= samir_for_now
# one_of: samir
# when: flag gt_agra_said_for_now
# speaker: gt_samir
「今のところは」、帳面に書きました
# speaker: heroine
書かないでください！

= samir_swans
# one_of: samir
# when: not flag gt_agra_said_for_now
# speaker: gt_samir
不満リストに、白鳥は？
# speaker: heroine
……まだ、入れてません

= vimla
# when: battle gt_agra_main_itimad_tomb_battle
# speaker: gt_vimla
不満も、確かめてから書くこと。
# speaker: heroine
全部、確かめ済みです

// アクバル廟のデート：猿に取られた物。カムラのコメントの返事を、雨の匂いの小瓶が芝生で割れたか・取り返したか・サングラスだったかで書き分ける。
=== gt_post_agra_akbar_tomb ===
# post: heroine
# images: gt_album_a067 gt_album_a069 gt_album_a070 gt_album_a072 gt_album_a073 gt_album_a074 gt_album_a075 gt_album_a076 gt_album_a079
# when: date gt_agra_date_akbar_tomb
# likes: gt_agra_akbar_guard
見習いの猿に、やられました

= kamla_rain
# one_of: kamla
# when: flag gt_agra_rain_on_lawn
# speaker: gt_kamla
何を取られたんだい。
# speaker: heroine
雨です。鹿の芝生に降りました
# speaker: gt_kamla
雨は、また降る。

= kamla_attar
# one_of: kamla
# when: not flag gt_agra_rain_on_lawn
# when: item gt_delhi_rain_attar held
# speaker: gt_kamla
何を取られたんだい。
# speaker: heroine
雨です。ちゃんと取り返しました

= kamla_glasses
# one_of: kamla
# when: not flag gt_agra_rain_on_lawn
# when: not item gt_delhi_rain_attar held
# speaker: gt_kamla
何を取られたんだい。
# speaker: heroine
サングラス。お目が高い猿でした

// ───── 出会った人の投稿

// サミール：その日の部屋に置く、タオルの白鳥。到着の夜に彼女の白鳥の投稿と重ならないよう、2日目の夜から。
=== gt_post_agra_samir_swans ===
# post: gt_samir
# images: gt_sns_samir_swans
# where: 宿の帳場
# when: day >= 2
ハネムーン・スペシャル、本日三組

= heroine
# speaker: heroine
うちの二部屋は、数えないでください
# speaker: gt_samir
数えておきます

// ニキル：タージ・マハルの後、食堂で。スライドをやめて、紙の地図を二人で（対決の後の夜に届く）。
=== gt_post_agra_nikhil_map ===
# post: gt_nikhil
# images: gt_sns_nikhil_map
# where: タージの近くの食堂
# when: battle gt_agra_main_taj_mahal_battle
地図は一枚。スライドは、ゼロ枚

= tanvi
# speaker: gt_tanvi
その赤い丸、何？
# speaker: gt_nikhil
……今、消しました

= heroine
# speaker: heroine
ペン、二色なんですね
# speaker: gt_nikhil
緑は、彼女が選びました

// タンヴィ：指輪。チーニー・カ・ラウザーのデートの後、タージ・マハルの回を終えていれば届く。
// タージの回をデートの後に終えた道では、二人がほかの所で決めたことになる（場所は書かない）。
=== gt_post_agra_tanvi_ring ===
# post: gt_tanvi
# images: gt_sns_tanvi_ring
# when: date gt_agra_date_chini_rauza
# when: episode gt_agra_main_taj_mahal
場所は、二人で決めました

= heroine
# speaker: heroine
おめでとうございます！
# speaker: gt_tanvi
ベンチの二人のおかげ

= nikhil
# speaker: gt_nikhil
返事は、一言でした
# speaker: gt_tanvi
十分でしょ

// ドゥッガル：ジャイプールへ向かうバスの最前列から（アーグラ城の対決の後の夜に届く）。
=== gt_post_agra_duggal_bus ===
# post: gt_agra_fort_old_man
# images: gt_sns_duggal_front_seat
# where: ジャイプールへの道
# when: battle gt_agra_main_agra_fort_battle
最前列より報告。異常なし。

= riya
# speaker: gt_riya
大佐、マイクを返してください
# speaker: gt_agra_fort_old_man
任務中だ。

= heroine
# speaker: heroine
監視団、受理しました

// ヴィムラー：ニームの木の下の請願書。一番上に、彼女の一文の紙（対決の後の夜に届く）。
=== gt_post_agra_vimla_petition ===
# post: gt_vimla
# images: gt_sns_vimla_neem
# where: agra_itimad_tomb
# when: battle gt_agra_main_itimad_tomb_battle
四十三人目は、自分の文で

= heroine
# speaker: heroine
イッ、ティ、マード
# speaker: gt_vimla
まだ、違います

// ムケーシュ：四時のミキサー車の後、自分の家の現場で（対決の後の夜に届く）。ヴィノードのコメントは、会っていれば。
=== gt_post_agra_mukesh_roof ===
# post: gt_agra_fatehpur_man
# images: gt_sns_mukesh_roof
# where: 郊外の現場
# when: battle gt_agra_main_fatehpur_sikri_battle
四時、予定どおり屋根が乗った

= heroine
# speaker: heroine
本を読む部屋は、どこですか？
# speaker: gt_agra_fatehpur_man
二階の奥。まだ柱だけ

= vinod
# when: met gt_vinod
# speaker: gt_vinod
うちの屋上も、鉄の棒だけです
# speaker: gt_agra_fatehpur_man
一階分、建てますよ

// アンワル：タージ・ガンジの家の窓から（フィナーレの後の夜に届く）。
=== gt_post_agra_anwar_window ===
# post: gt_anwar
# images: gt_sns_anwar_window
# where: タージ・ガンジ
# when: battle gt_agra_finale_battle
今日は、話を二つ壊された

= heroine
# speaker: heroine
手の話は、明日もどうぞ
# speaker: gt_anwar
言われなくても、する

= samir
# speaker: gt_samir
叔父、ロビーで思い出し笑いしてました

// ヴィノード：母が替えた、バックミラーの悪い目よけ。シークリーのツアーから宿に戻った夜に届く（どの買い方でも）。
=== gt_post_agra_vinod_lemons ===
# post: gt_vinod
# images: gt_sns_vinod_lemons
# where: シークリーからの帰り道
# when: seen gt_agra_tour_home
母が、新しいのに替えました

= heroine
# speaker: heroine
牛、今日も待ちました？
# speaker: gt_vinod
三頭。鳴らしていません

// ハルバンス（デリーの人）：グル・カ・タールの台所で焼いた、カナダのつもりのローティー（デートの後の夜に届く）。
// 彼女のコメントは、デリーのバングラー・サーヒブのデート（世界地図のローティー）をしていれば。
=== gt_post_agra_harbans_roti ===
# post: gt_harbans
# images: gt_sns_harbans_canada_roti
# where: agra_guru_ka_taal
# when: date gt_agra_date_guru_ka_taal
カナダのつもりで焼いた

= gurmeet
# speaker: gt_gurmeet
親父、それはアイスランドだ
# speaker: gt_harbans
寒い国は、みんな同じだ

= heroine
# when: date gt_delhi_date_bangla_sahib
# speaker: heroine
やっぱり、違う国になりましたね
# speaker: gt_harbans
世界地図の娘の、真似だ
