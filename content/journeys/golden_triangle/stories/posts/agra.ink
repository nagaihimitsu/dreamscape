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
// - 過去の投稿（# past:。ファイルの最後）：二人に会う前の暮らし。会うと人物ページで読める（夜には届かない）。クイズの相手と常連は3つ、
//   ほかの名前のある人は2つ、名前のない人は3人（茶屋の主人・番人・ピクニックの父親）に1つ。コメントはその人を知っている人だけ
//   （サミールとアンワル、ニキルとタンヴィ、大佐とリヤ、グルミートと父のハルバンス、ヴィノード・茶屋の主人とサミール、父親と娘）。
//   場面の種明かし（タンヴィが嫌だったこと・大佐の車酔い・ムケーシュの息子のこと・ヴィノードの母）は書かない。
INCLUDE modules.ink
-> DONE

// 到着：ハネムーン・スペシャルの白鳥。アーグラの最初の夜に届く（「見ないで、白鳥」の写真は、恋人でない道だけ）。
// 後のコメントは、交際が始まった夜に届く（サミールの最初のコメントが届いていれば）。
=== gt_post_agra_arrival ===
# post: heroine
# images: gt_album_a001 gt_album_a002 gt_album_a003 gt_album_a004 gt_album_a005
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

// ───── 後の都市で届く、出会った人のその後（2026-11-27 に足した）

// グルミート：カナダに戻り、父ゆずりの丸くないローティーを焼いた。グル・カ・タールのデートの後、ジャイプールの観光を一つ終えた夜に届く。
=== gt_post_agra_gurmeet_brampton ===
# post: gt_gurmeet
# images: gt_sns_gurmeet_brampton
# where: ブランプトンの家
# when: date gt_agra_date_guru_ka_taal
# when: episodes jaipur >= 1
ブランプトンで、親父の形を再現

= harbans
# speaker: gt_harbans
形が、甘い。
# speaker: gt_gurmeet
親父ほど、下手になれない

= heroine
# speaker: heroine
それ、何の国ですか？
# speaker: gt_gurmeet
親父に聞いてくれ

// ───── 過去の投稿（会うと人物ページで読める。夜には届かない）
// 1人分は新しいものから。写真は1人3枚以上（クイズの相手は3〜4枚）。

// サミール：白鳥と帳面と、叔父
=== gt_past_samir_swan_video ===
# post: gt_samir
# past: 先月
# images: gt_sns_samir_swan_video
# where: 宿の部屋
白鳥の動画、再生が三桁になりました！

= anwar
# speaker: gt_anwar
わしの話なら、もっと泣ける
# speaker: gt_samir
白鳥は、泣かせない方針です

=== gt_past_samir_first_swans ===
# post: gt_samir
# past: 去年の冬
# images: gt_sns_samir_first_swans
# where: 宿の部屋
ハネムーン・スペシャル、始めました

= anwar
# speaker: gt_anwar
その鳥は、鴨だ
# speaker: gt_samir
……春までに、白鳥にします

=== gt_past_samir_ledger ===
# post: gt_samir
# past: 三年前
# images: gt_sns_samir_new_ledger
# where: 宿の帳場
支配人になりました。帳面も新調です

= anwar
# speaker: gt_anwar
帳面は、物語の始まりだ
# speaker: gt_samir
はい。何でも書きます

// アンワル：詫びの菓子屋、最初の客、杖
=== gt_past_anwar_petha_shop ===
# post: gt_anwar
# past: 先週
# images: gt_sns_anwar_petha_shop
# where: ペーターの店
詫びの品は、いつもこの店で

= samir
# speaker: gt_samir
叔父さん、今月三箱目です
# speaker: gt_anwar
客が、正直すぎるのだ

=== gt_past_anwar_first_guests ===
# post: gt_anwar
# past: 去年
# images: gt_sns_anwar_first_guests
四十年前の、最初の客たち

= samir
# speaker: gt_samir
叔父さん、髪が黒い！
# speaker: gt_anwar
話は、今より下手だった

=== gt_past_anwar_cane ===
# post: gt_anwar
# past: 三年前
# images: gt_sns_anwar_silver_cane
杖を新調した。指し棒として

// ニキル：裏返した三十枚、送別会の段取り、三軒の予約
=== gt_past_nikhil_slides ===
# post: gt_nikhil
# past: 先週
# images: gt_sns_nikhil_slides
# where: ラクナウ
大事な資料、三十枚目が完成

= tanvi
# speaker: gt_tanvi
何の三十枚？
# speaker: gt_nikhil
し、仕事です

=== gt_past_nikhil_farewell ===
# post: gt_nikhil
# past: 先月
# images: gt_sns_nikhil_farewell_table
# where: ラクナウの支店
# likes: gt_tanvi
支店長の送別会。段取りは僕

=== gt_past_nikhil_first_date ===
# post: gt_nikhil
# past: 去年の秋
# images: gt_sns_nikhil_first_date
# where: ラクナウ
初めての食事。店は三軒予約

= tanvi
# speaker: gt_tanvi
一軒で、よかったのに
# speaker: gt_nikhil
……次は一軒にします

// タンヴィ：伝記と、緑の服
=== gt_past_tanvi_biographies ===
# post: gt_tanvi
# past: 先週
# images: gt_sns_tanvi_biographies
今月の伝記、四冊目

= nikhil
# speaker: gt_nikhil
僕の話も、いつか伝記に？
# speaker: gt_tanvi
まず、本人が話して

=== gt_past_tanvi_green_kurtas ===
# post: gt_tanvi
# past: 去年
# images: gt_sns_tanvi_green_kurtas gt_sns_tanvi_mirror
緑のクルタ、三着目。迷わない

= nikhil
# speaker: gt_nikhil
また緑？
# speaker: gt_tanvi
緑は、決めてあるの

// ドゥッガル：旅行会社の指揮下、孫とチェス、八十歳
=== gt_past_duggal_tour_flag ===
# post: gt_agra_fort_old_man
# past: 三日前
# images: gt_sns_duggal_tour_flag
本日より、旅行会社の指揮下に入る。

= riya
# speaker: gt_riya
大佐、集合は九時です
# speaker: gt_agra_fort_old_man
八時四十分に、いた。

=== gt_past_duggal_chess ===
# post: gt_agra_fort_old_man
# past: 先月
# images: gt_sns_duggal_chess
孫に負けた。再戦を要求する。

=== gt_past_duggal_birthday ===
# post: gt_agra_fort_old_man
# past: 去年
# images: gt_sns_duggal_pushup gt_sns_duggal_cake
八十歳。腕立ては、八回。

// リヤ：旗と、二台の電話
=== gt_past_riya_no_strays ===
# post: gt_riya
# past: 先週
# images: gt_sns_riya_flag gt_sns_riya_headcount
# where: agra_taj_mahal
本日の迷子、ゼロ人！

=== gt_past_riya_two_phones ===
# post: gt_riya
# past: 去年
# images: gt_sns_riya_two_phones
電話が鳴りやまないので、二台目

// ツアーの客：寝ている夫と、屋上の菜園
=== gt_past_fort_tourist_husband ===
# post: gt_agra_fort_tourist
# past: 先週
# images: gt_sns_fort_tourist_husband
聞いた話を、夫に全部話す。夫は寝てる

=== gt_past_fort_tourist_chillies ===
# post: gt_agra_fort_tourist
# past: 去年の秋
# images: gt_sns_fort_tourist_pots gt_sns_fort_tourist_harvest
屋上の唐辛子、今年は豊作

// ヴィムラー：満員の木陰、書き直しの請願書、返さない赤ペン
=== gt_past_vimla_full_shade ===
# post: gt_vimla
# past: 先月
# images: gt_sns_vimla_full_shade
# where: agra_itimad_tomb
署名はゼロ。木陰は満員。

=== gt_past_vimla_drafts ===
# post: gt_vimla
# past: 三年前
# images: gt_sns_vimla_drafts
請願書、書き直し七回目。

=== gt_past_vimla_red_pen ===
# post: gt_vimla
# past: 五年前
# images: gt_sns_vimla_red_pen
退職。赤ペンは、返しません。

// ムケーシュ：自分の家の三年（型枠・基礎・土地）
=== gt_past_mukesh_formwork ===
# post: gt_agra_fatehpur_man
# past: 先月
# images: gt_sns_mukesh_formwork
# where: 郊外の現場
型枠、完成。来月は屋根だ

=== gt_past_mukesh_foundation ===
# post: gt_agra_fatehpur_man
# past: 二年前
# images: gt_sns_mukesh_foundation
# where: 郊外の現場
自分の家の基礎。施主がうるさい

=== gt_past_mukesh_land ===
# post: gt_agra_fatehpur_man
# past: 三年前
# images: gt_sns_mukesh_land
# where: 郊外の現場
土地を買った。二階は息子の分

// 青年（観客の中の学生）：締め切りと、寮の屋上
=== gt_past_student_deadline ===
# post: gt_agra_finale_student
# past: 先週
# images: gt_sns_student_desk
歴史の課題、締め切り三時間前

=== gt_past_student_rooftop ===
# post: gt_agra_finale_student
# past: 先月
# images: gt_sns_student_rooftop gt_sns_student_thumb
寮の屋上から。タージは親指くらい

// ジャグディープ：帰った光と、三代目の反射板
=== gt_past_jagdeep_empty_arch ===
# post: gt_jagdeep
# past: 先週
# images: gt_sns_jagdeep_empty_arch
# where: agra_chini_rauza
二時間待った。光は帰った

=== gt_past_jagdeep_reflectors ===
# post: gt_jagdeep
# past: 去年
# images: gt_sns_jagdeep_reflectors gt_sns_jagdeep_river
反射板、三代目。二代目は川へ

// 花嫁になる人：決まらない色と、二本の傘
=== gt_past_bride_colours ===
# post: gt_agra_chini_bride
# past: 先月
# images: gt_sns_bride_swatches gt_sns_bride_fiance_swatches
# where: プネー
式の色、まだ決まらない

= jagdeep
# speaker: gt_jagdeep
色は、光を見てから決めろ
# speaker: gt_agra_chini_bride
光を見に行く日を、決めます

=== gt_past_bride_umbrellas ===
# post: gt_agra_chini_bride
# past: 半年前
# images: gt_sns_bride_umbrellas
# where: プネー
婚約しました。傘は二本のまま

// グルミート：三台目のトラックと、ブランプトンのチャイ（父のハルバンスがコメントする）
=== gt_past_gurmeet_third_truck ===
# post: gt_gurmeet
# past: 先月
# images: gt_sns_gurmeet_third_truck gt_sns_gurmeet_white_road
# where: ブランプトン
三台目が来ました。道は、まだ白い

= harbans
# speaker: gt_harbans
白い道は、走らん。
# speaker: gt_gurmeet
親父は、乗らなくていい

=== gt_past_gurmeet_chai ===
# post: gt_gurmeet
# past: 去年の夏
# images: gt_sns_gurmeet_brampton_chai
# where: ブランプトン
この店のチャイは、濃い

= harbans
# speaker: gt_harbans
薄い。写真で分かる。
# speaker: gt_gurmeet
飲んでから言ってくれ

// ピクニックの父親：映画と、母の弁当（娘がコメントする）
=== gt_past_picnic_father_movie ===
# post: gt_agra_mariam_father
# past: 先月
# images: gt_sns_picnic_father_movie
この映画、三回目。また泣いた

= daughter
# speaker: gt_agra_mariam_daughter
パパ、毎回同じ所で泣く
# speaker: gt_agra_mariam_father
名場面だからだ

=== gt_past_picnic_father_tiffin ===
# post: gt_agra_mariam_father
# past: 去年の冬
# images: gt_sns_picnic_father_tiffin gt_sns_picnic_father_mat
# where: 公園の芝生
母の弁当、五段重ね。完食

= daughter
# speaker: gt_agra_mariam_daughter
三段目、パパひとりで食べた
# speaker: gt_agra_mariam_father
あれは、パパの段だ

// ピクニックの娘：父の解説の訂正と、ゲーム
=== gt_past_picnic_daughter_corrections ===
# post: gt_agra_mariam_daughter
# past: 先週
# images: gt_sns_picnic_daughter_lecture gt_sns_picnic_daughter_grandma
パパの歴史講座、本日の訂正は三つ

= father
# speaker: gt_agra_mariam_father
訂正は、家に帰ってから
# speaker: gt_agra_mariam_daughter
その場で直すのが、早い

=== gt_past_picnic_daughter_game ===
# post: gt_agra_mariam_daughter
# past: 先月
# images: gt_sns_picnic_daughter_game
ゲーム、学年で一位

= father
# speaker: gt_agra_mariam_father
勉強は？
# speaker: gt_agra_mariam_daughter
した。そのあと一位

// ソニア：煉瓦と、テープのバット
=== gt_past_sonia_bricks ===
# post: gt_sonia
# past: 先週
# images: gt_sns_sonia_bricks
# where: 塀の外の空き地
新しい煉瓦、三つ確保

=== gt_past_sonia_taped_bat ===
# post: gt_sonia
# past: 先月
# images: gt_sns_sonia_cracked_bat gt_sns_sonia_taped_bat
バット、また割れた。テープ三周

// 茶屋の主人：マギーの日と、雨の日（サミールがコメントする）
=== gt_past_teashop_maggi ===
# post: gt_agra_ram_bagh_tea_master
# past: 先月
# images: gt_sns_teashop_maggi
# where: ラーム・バーグの向かいの茶屋
マギー、本日四十皿

= samir
# speaker: gt_samir
今度、新婚のお客さまを送ります
# speaker: gt_agra_ram_bagh_tea_master
ゆで卵、用意しとく

=== gt_past_teashop_rain ===
# post: gt_agra_ram_bagh_tea_master
# past: 去年の雨季
# images: gt_sns_teashop_rain_chairs gt_sns_teashop_two_cups
# where: ラーム・バーグの向かいの茶屋
雨。客はゼロ。チャイは自分で二杯

// ヴィノード：洗車と、牛一頭の渋滞（サミールがコメントする）
=== gt_past_vinod_car_wash ===
# post: gt_vinod
# past: 先週
# images: gt_sns_vinod_car_wash gt_sns_vinod_cow_mirror
洗車した。牛が見に来た

=== gt_past_vinod_cow_jam ===
# post: gt_vinod
# past: 去年
# images: gt_sns_vinod_cow_jam
本日の渋滞、牛一頭

= samir
# speaker: gt_samir
鳴らせば、いいのでは
# speaker: gt_vinod
鳴らすと、こっちが疲れます

// 番人（アクバル廟）：見習いの猿と、ずれる鹿の数
=== gt_past_guard_trainee_monkey ===
# post: gt_agra_akbar_guard
# past: 先週
# images: gt_sns_guard_trainee_monkey
# where: agra_akbar_tomb
見習い、初めてジュースを獲得

=== gt_past_guard_blackbuck ===
# post: gt_agra_akbar_guard
# past: 先月
# images: gt_sns_guard_blackbuck_herd gt_sns_guard_blackbuck_stare
# where: agra_akbar_tomb
鹿を数えた。毎回一頭ずれる
