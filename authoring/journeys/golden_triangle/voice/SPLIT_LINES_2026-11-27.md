# 長い台詞を分けて外した声（2026-11-27）

会話の窓を名札と3行分の大きさに固定した（2026-11-27のユーザー判断）のに合わせて、スマートフォンの縦の画面で4段以上になる台詞294行を、文の切れ目で2段ほどずつの行に分けた（ユーザー判断：「2行と2行に分割でいい。長文を読ませるゲームじゃない」。声のある行も分ける）。

分けた行のうち、声を録音済みだった74行（ヒロイン24行・ほかの人物50行）は、録音した声が分けた後の1行と合わないので、`# voice:` を外した（分けた行は、新しい声が届くまで声なしで出る）。言葉は変えていない（切れ目で分け、台詞の書き方に合わせて切れ目の「。」を取っただけ）。ヒロインの52行の依頼書は [2026-11-27_split/india_voice_batch.txt](2026-11-27_split/india_voice_batch.txt)（2026-11-28に52本とも届き、`voice:tag` で付けた。[声の記録](README.md#2026-11-27_split)）。ほかの人物の50行は、まだ頼んでいない（`voice:script` の依頼書に出る）。届いたら `voice:tag` で付ける。外した声は `voice:changes` の「使われなくなった声」に出る。

| 話し手 | 外した声のID | ファイル:行（分ける前） | 分けた後 |
|---|---|---|---|
| heroine | `gt_agra_main_agra_fort_005` | `gt_agra_agra_fort.ink:185` | はい。城の一部は、今も陸軍の区域ですよね ／ ……だったら大佐、城の守りは万全です。大佐が座っている必要はないと思います |
| heroine | `gt_agra_date_guru_ka_taal_008` | `gt_agra_guru_ka_taal.ink:128` | わたしが伝えたら、お二人の言葉じゃなくなっちゃうから ／ ……そのかわり、一つずつ聞いてもいいですか。何が、怖いんですか |
| heroine | `gt_agra_arrival_006` | `gt_agra_hotel_hub.ink:68` | あ……見えた。あれ、タージ・マハルの屋根だよね ／ 写真で百回は見たのに、指先がそわそわする。……よし ／ 誤解は、ちゃんと解く。その前に、どこから行こうか |
| heroine | `gt_agra_epilogue_009` | `gt_agra_hotel_hub.ink:254` | 今日、人前で『わたしたちのことは、わたしたちで決める』って言ったでしょう ／ あれ、恋人として言ったんだよ。ちゃんと届いてた？ |
| heroine | `gt_agra_date_confession_004` | `gt_agra_hotel_hub_dates.ink:69` | 迷ったけど、ちゃんと、わたしの言葉で言いたかった ／ 言われたから、うなずくんじゃなくて ／ ……わたしも、一緒にいたい。旅が終わっても |
| heroine | `gt_agra_date_confession_022` | `gt_agra_hotel_hub_dates.ink:132` | 話したいことは、あるの。あるんだけど ／ ……いざ順番が回ってきたら、言葉が全部、洗濯物の向こうに飛んでいっちゃった |
| heroine | `gt_agra_finale_012` | `gt_agra_taj_mahal.ink:462` | わたしたちは、新婚じゃありません。……でも、二人でここに来たのは、本当です ／ わたしたちのことは、わたしたちで決めます |
| heroine | `gt_agra_tour_out_leg_002` | `gt_agra_tour_fatehpur_sikri.ink:202` | ホーン、オーケー、プリーズ……。鳴らして、いいよ、お願い？ ／ どういう意味なんだろう。あ、あっちのトラックにも書いてある |
| heroine | `gt_delhi_date_bangla_sahib_021` | `gt_delhi_bangla_sahib.ink:294` | 誰が食べたか分からないけど、わたしのローティー、もう誰かのお腹に入ってるんだよね ／ なんだか不思議。知らない人に、ちょっとだけ届いた感じ |
| heroine | `gt_delhi_arrival_004` | `gt_delhi_hotel_hub.ink:92` | ……はい、覚えておきます。それにしても、地図というより暗号だね ／ せっかくなら全部回って、解いてみたいな。……ね、一緒に解いてくれる？ |
| heroine | `gt_delhi_epilogue_007` | `gt_delhi_hotel_hub.ink:177` | 言いそびれたことって、あとから重くなるんだね ／ わたしも、今日のうちに一つ言っておく。……付き合ってくれて、ありがとう |
| heroine | `gt_delhi_main_humayun_tomb_005` | `gt_delhi_humayun_tomb.ink:241` | わたしは、誰にも言いません。言う相手もいないですし ／ ……でも、いつかお母さんに、自分の口で言えたらいいなって思います。二人とも |
| heroine | `gt_delhi_hotel_homework_005` | `gt_delhi_inserts.ink:226` | わたしもね、小学生のとき、『好きな場所』の作文に、近所のコインランドリーって書いたの ／ 回ってる洗濯物を見てると、落ち着くから |
| heroine | `gt_delhi_depart_scam_015` | `gt_delhi_inserts.ink:947` | 手付金は、高い授業料だったね。……ううん、やっぱり悔しい ／ でも、払ったのは一人のせいじゃないよ。二人で、あの部屋まで行ったんだから |
| heroine | `gt_delhi_depart_scam_013` | `gt_delhi_inserts.ink:994` | 親切だと思ったのが、全部、お芝居だった。名札も、ベストも、電話の声も ／ ……悔しい。最初に、ついて行こうって言ったの、わたしだから |
| heroine | `gt_delhi_depart_scam_014` | `gt_delhi_inserts.ink:998` | でも、教えてくれた荷運びの人も、検札の人も、本物だった ／ 宿のご主人も、ルーヒーさんも ／ ……疑うのは疲れるけど、全部を疑うようには、なりたくないな |
| heroine | `gt_delhi_date_lodhi_garden_026` | `gt_delhi_lodhi_garden.ink:452` | 理由がなくても笑っていいって言われると、ちょっと楽になるね ／ わたし、いつも、笑っていい理由を探してから笑ってた気がする |
| heroine | `gt_delhi_finale_003` | `gt_delhi_red_fort.ink:343` | 待ってください。あの日のカムラさん、すごくはっきりしてました ／ オートの運転手とはすぐ喧嘩になるから、出かけるときは地下鉄の女性車両に乗るんだって |
| heroine | `gt_delhi_finale_014` | `gt_delhi_red_fort.ink:576` | はい。黙っていなくなるのは、自由とは違うと思ったから ／ カムラさんが何を言いに来たのか、アマンさんは知らないままになるところでした |
| heroine | `gt_jaipur_main_city_palace_007` | `gt_jaipur_city_palace.ink:185` | 五キロは無理でも、二キロなら入りますよね ／ ……それで、漬物がなくなったら、電話してください ／ お母さんに、次の分を頼むって |
| heroine | `gt_jaipur_main_hawa_mahal_009` | `gt_jaipur_hawa_mahal.ink:193` | ガウラさんは、お客さんと値段で喧嘩してました ／ それから、子どもにトマトを一つあげてました。誰にも見られてないと思って |
| heroine | `gt_jaipur_date_her_confession_004` | `gt_jaipur_hotel_hub_dates.ink:583` | 六十年、言わなかった人の言葉だから、重かった ／ アーグラで、新婚じゃないって言えなかったときも、ずっと耳の中で鳴ってた |
| heroine | `gt_jaipur_date_nahargarh_fort_020` | `gt_jaipur_nahargarh_fort.ink:219` | あ、見て。あの辺が、たぶん、わたしたちの宿 ／ この高さから見ると、迷ってばっかりだった道が、ちゃんと碁盤の目になってる |
| heroine | `gt_jaipur_date_panna_meena_kund_030` | `gt_jaipur_panna_meena_kund.ink:87` | アマンさん。毎晩、花嫁さんに言う言葉を、鏡の前で三十回は練習してる ／ カムラさんに『毎日言葉にしなさい』って言われたから |
| gt_agra_fort_old_man | `gt_agra_main_agra_fort_battle_duggal_002` | `gt_agra_agra_fort.ink:84` | タージを建てたシャー・ジャハーンは、この塔に八年座っていた ／ わしは八十分でいい。これは座り込みだ。平和的な抗議である |
| enemy | `gt_agra_main_agra_fort_battle_duggal_015` | `gt_agra_agra_fort.ink:174` | ……後ろの席だと、十分でだめなんだ。今日の座席表では、わしは最後列だ ／ 言えるか、そんなこと。若い娘さんの前で、元大佐が |
| gt_riya | `gt_agra_main_agra_fort_battle_riya_002` | `gt_agra_agra_fort.ink:198` | 大佐。ジャイプールまでの道中、一番前の席で、窓の外の解説をお願いできませんか ／ 皆さん、大佐のお話を聞きたがっています |
| gt_jagdeep | `gt_agra_date_chini_rauza_jagdeep_001` | `gt_agra_chini_rauza.ink:32` | お願いがある。カップルが橋の渋滞で遅れてる ／ 光を決めたいのに、立つ人がいない ／ ……二人とも、身長がちょうどいい。代役をやってくれないか |
| enemy | `gt_agra_main_fatehpur_sikri_battle_mukesh_003` | `gt_agra_fatehpur_sikri.ink:75` | この町の聖者の墓に、しるしをくださいと頼みに来たんです ／ そしたら門に、これだ。世界は橋だ、家を建てるな ／ ……しるし、来ちゃったでしょう |
| enemy | `gt_agra_main_fatehpur_sikri_battle_mukesh_009` | `gt_agra_fatehpur_sikri.ink:119` | 皇帝ってのは、度量が大きいんだな ／ よその宗教の言葉を、自分の勝ちを祝う門に刻むなんて ／ ……うちの施主なら、絶対に許さない |
| enemy | `gt_agra_main_fatehpur_sikri_battle_mukesh_015` | `gt_agra_fatehpur_sikri.ink:154` | 先週、息子が言いました。ベンガルールで仕事が決まった。向こうで暮らすって ／ ……誰も住まない二階に、今日、屋根を流すんです |
| enemy | `gt_agra_main_fatehpur_sikri_battle_mukesh_020` | `gt_agra_fatehpur_sikri.ink:203` | わたしだ。四時、予定どおり屋根を流せ。……それと、図面の変更だ ／ 二階の奥に一部屋、わたしの部屋を作る。本を読む部屋だ ／ 息子が帰ってきたら、そこで一緒に茶を飲む |
| gt_harbans | `gt_agra_date_guru_ka_taal_harbans_006` | `gt_agra_guru_ka_taal.ink:139` | ……向こうへ行ったら、わしは、何も運ばない人になる ／ 四十年、何かを運んできた。運ばないわしを、息子に見せるのが嫌なんだ |
| gt_harbans | `gt_agra_date_guru_ka_taal_harbans_007` | `gt_agra_guru_ka_taal.ink:145` | ……向こうへ行ったら、わしは、何も運ばない人になる ／ 四十年、何かを運んできた。運ばないわしを、息子に見せるのが嫌なんだ |
| enemy | `gt_agra_main_itimad_tomb_battle_vimla_012` | `gt_agra_itimad_tomb.ink:144` | 分かってきたじゃない。白い大理石で覆った最初の墓も、石をはめ込む模様も、全部こっちが先 ／ タージは、それを大きくしただけ |
| gt_vimla | `gt_agra_date_mariam_tomb_vimla_001` | `gt_agra_mariam_tomb.ink:113` | あら。署名の前に読む人ね。……今度の請願書は、これ ／ 案内やガイドの説明で、この方を正しい名前で呼んでほしい、という内容 |
| gt_agra_mariam_daughter | `gt_agra_date_mariam_tomb_agra_mariam_daughter_004` | `gt_agra_mariam_tomb.ink:157` | おばあちゃんが言ってる ／ 名前なんてどうでもいい、って男の人は言うけど、それは、ずっと自分の名前で呼ばれてきた人の言い方だって |
| gt_sonia | `gt_agra_date_mehtab_bagh_sonia_002` | `gt_agra_mehtab_bagh.ink:43` | ソニア、十二歳。この空き地のキャプテン。ルールは三つ ／ 川まで飛ばしたら六点。ただし、自分で拾いに行くこと。庭の塀を越えたら、アウト |
| enemy | `gt_agra_main_taj_mahal_battle_nikhil_002` | `gt_agra_taj_mahal.ink:79` | ニキルです。ラクナウで銀行員をしています ／ 恋人のタンヴィが、今トイレの列に並んでいて ／ 戻ってきたら、あのベンチで指輪を出すんです。三か月前から決めてたんです |
| enemy | `gt_agra_finale_battle_anwar_007` | `gt_agra_taj_mahal.ink:335` | 皇帝は、この岸に、自分のための黒いタージを建てるつもりだった ／ 白い妃と、黒い皇帝。川を挟んで、永遠に見つめ合うはずだったのです |
| enemy | `gt_agra_finale_battle_anwar_008` | `gt_agra_taj_mahal.ink:387` | 皆さん、この若いお嬢さんは、わしの話を二つも壊した。では、お願いしよう ／ あなたの本当の話で、この人たちを泣かせてみなさい |
| enemy | `gt_agra_finale_battle_anwar_013` | `gt_agra_taj_mahal.ink:473` | 参った。……では、わしの番だ。わしの家がどこか、お嬢さんは知っているかね ／ タージの南門の外、タージ・ガンジだ。七代、あそこに住んでいる |
| gt_vinod | `gt_agra_tour_out_mother_vinod_001` | `gt_agra_tour_fatehpur_sikri.ink:252` | 一つ、聞いてもいいですか。母は、わたしが乗せたお客さんの話を、必ず聞きたがります ／ どこから来て、何を見て、どういう二人か |
| gt_vinod | `gt_agra_tour_out_mother_vinod_003` | `gt_agra_tour_fatehpur_sikri.ink:258` | サミールさんは、新婚さんだと言っていました ／ でも、お二人は、新婚さんの顔には見えない。……母に、何と言えばいいですか |
| gt_vinod | `gt_agra_tour_mathri_vinod_003` | `gt_agra_tour_fatehpur_sikri.ink:791` | 母に、伝えました。同じ町を、同じ日に見たかった二人 ／ 母はしばらく黙って、それから言いました ／ それはもう、旅の話じゃなくて、二人の話だね、と |
| gt_vinod | `gt_agra_tour_back_awake_vinod_002` | `gt_agra_tour_fatehpur_sikri.ink:993` | でも、この人は、わたしの母のことを聞きました ／ レモンのことも、娘の字のことも、トラックの OK のことも。いつも、こうですか |
| gt_jasmeet | `gt_delhi_date_agrasen_baoli_jasmeet_002` | `gt_delhi_agrasen_baoli.ink:117` | ここ、出るって言われてるんですよ ／ 昔は底に黒い水が溜まっていて、その水に呼ばれて、飛び込んだ人がいたって。……言い伝えですけど |
| gt_harbans | `gt_delhi_date_bangla_sahib_harbans_016` | `gt_delhi_bangla_sahib.ink:206` | 向こうへ行ったら、わしは、何も運ばない人になる ／ 四十年、何かを運んできた。運ばないわしを、息子に見せるのが、嫌なんだ |
| enemy | `gt_delhi_epilogue_aman_005` | `gt_delhi_hotel_hub.ink:136` | 祖母に言われました。どう出会ったかより、毎日ちゃんと言葉にしなさい、と ／ ……六十年言わなかった人が、言うんですよ |
| enemy | `gt_delhi_main_humayun_tomb_battle_suresh_019` | `gt_delhi_humayun_tomb.ink:252` | 税務署に三十五年いて分かったことがある ／ いちばん申告が合わないのは、家族の帳簿だ ／ わしの頃も、若いのはみんなここで会っていたよ |
| gt_monu | `gt_delhi_date_india_gate_monu_003` | `gt_delhi_india_gate.ink:112` | ダーディーのおじいさんの名前が、あの門に彫ってあるんだって ／ 最初の世界大戦で、遠い国で死んだ兵士。毎年探して、毎年見つからない |
| enemy | `gt_delhi_hotel_homework_roohi_004` | `gt_delhi_inserts.ink:177` | 先頭の車両。女の人しか乗れないの。学校の行き帰りに、おばさんと乗るんだ ／ みんなしゃべって、笑って、お菓子を分けてくれる人もいて、床に座って宿題する子もいて |
| gt_delhi_scam_young_man | `gt_delhi_depart_scam_delhi_scam_young_man_002` | `gt_delhi_inserts.ink:496` | 外国の方の振り替えは、観光客の窓口でしかできません ／ でも、駅の中の窓口は、今日は工事で閉まっています ／ 臨時の窓口が、道の向かいに。歩いて五分です |
| gt_delhi_scam_suit_man | `gt_delhi_depart_scam_delhi_scam_suit_man_004` | `gt_delhi_inserts.ink:763` | ご安心を。車と運転手をご用意できます。アーグラとジャイプール、ホテル込み ／ 特別価格です。手付金だけ先にいただければ、今すぐ車を押さえます |
| gt_zoheb | `gt_delhi_main_jama_masjid_battle_zoheb_002` | `gt_delhi_jama_masjid.ink:105` | 一時間以内に、外国の観光客がアタルを買えば、俺は一年手を引く ／ 買わなきゃ、爺さんは店を売る。観光客が買うのは携帯のケースだけさ |
| gt_zoheb | `gt_delhi_main_jama_masjid_battle_zoheb_009` | `gt_delhi_jama_masjid.ink:202` | 爺さんの息子だよ。ドバイにいる ／ 親父を引き取りたいけど、店がある限り動かないって ／ だから俺が買う役。賭けも、負けても納得できるようにって、俺が考えた |
| gt_dubey | `gt_delhi_date_lodhi_garden_dubey_006` | `gt_delhi_lodhi_garden.ink:312` | わたしの決まり文句を、大きな声で。『乗客の皆さま、ご注意ください』 ／ ヒンディー語でね。ヤートリーガン、クリプヤー、ディヤーン、デーン |
| gt_dubey | `gt_delhi_date_lodhi_garden_dubey_011` | `gt_delhi_lodhi_garden.ink:424` | 合格。退職してから、毎日、誰にも話しかけることがなくなりましてね ／ それで、この会を始めたんです。声には、行き先が要る |
| enemy | `gt_delhi_main_qutb_minar_battle_ramkishan_012` | `gt_delhi_qutb_minar.ink:152` | 娘には、魔法じゃないと教えました。九歳のときに ／ そしたら先月、あの子が泣きながら電話してきたんです。『パパ、抱いてきて』って |
| enemy | `gt_delhi_main_red_fort_battle_nidhi_002` | `gt_delhi_red_fort.ink:74` | 英語の宿題なんです。『外国人観光客に遺産について質問する』 ／ 一時間後にバスが出ます。さっき韓国の団体に逃げられました |
| gt_delhi_sweet_shopkeeper | `gt_delhi_finale_battle_delhi_sweet_shopkeeper_001` | `gt_delhi_red_fort.ink:431` | ああ、あのばあさんか。ジャレビー百グラムで三回値切った。それから聞かれたよ ／ 一年分の香辛料を、一番安く買えるのはどこかって |
| enemy | `gt_delhi_finale_battle_aman_015` | `gt_delhi_red_fort.ink:463` | 祖母は、誰にも何も頼まない人なんです ／ 僕の結婚式の準備で、家族はみんな僕に頼みごとをする ／ 祖母だけは何も言わない。だから、何を考えてるのか分からない |
| enemy | `gt_jaipur_main_amber_fort_battle_saleem_011` | `gt_jaipur_amber_fort.ink:174` | 城を建てさせたのはマーン・シング一世だ。ジャイプールより百年以上前 ／ 向こうは王を取り違えている。……描いた奴は、ここに来たこともない |
| enemy | `gt_jaipur_main_city_palace_battle_sushma_010` | `gt_jaipur_city_palace.ink:138` | 四つの季節。春も、夏も、秋も、冬も ／ ……うちの台所には、季節ごとの漬物があったの。あんたが忘れても、瓶は覚えてる |
| enemy | `gt_jaipur_main_hawa_mahal_battle_gaura_003` | `gt_jaipur_hawa_mahal.ink:70` | ガウラよ。この歩道で野菜を売って四十年 ／ 朝四時に卸の市場で仕入れて、昼過ぎまでここに座ってる ／ 膝が痛いのは、三十年前から |
| enemy | `gt_jaipur_epilogue_kamla_006` | `gt_jaipur_hotel_hub.ink:118` | あんたの連れ、相変わらず黙ってるね。いい男は黙ってるもんだ ／ ……でも、あんたは黙らないこと。わたしみたいに、六十年も待たないこと |
| gt_jaipur_hotel_front | `gt_jaipur_hotel_mehndi_morning_jaipur_hotel_front_001` | `gt_jaipur_inserts.ink:166` | まあ、濃い。いい色。……濃く染まるほど、愛されるって言うのよ ／ 旦那さまに、ってね。お姑さんに、って言う人もいるけど |
| gt_jaipur_jaigarh_old_man | `gt_jaipur_date_jaigarh_fort_jaipur_jaigarh_old_man_002` | `gt_jaipur_jaigarh_fort.ink:136` | 何か月も掘って、出てきたのは、コウモリと、古い靴が片方だけ ／ ……でも、あの年だけは、この砦が、国でいちばん有名だった |
| gt_farhana | `gt_jaipur_date_jal_mahal_farhana_003` | `gt_jaipur_jal_mahal.ink:45` | わたしはファルハーナ。この遊歩道で、毎日、旅行者や地元の娘さんたちの手に描いてるの ／ いつか、扇風機と鏡のある自分のお店を持つのが夢 |
| gt_farhana | `gt_jaipur_date_jal_mahal_farhana_004` | `gt_jaipur_jal_mahal.ink:53` | 結婚式なら、手の甲と手のひら、両方ね ／ ……花嫁さんの手には、模様の中に花婿の名前を隠すの ／ 初夜に、花婿がそれを探すのよ。見つけられないと、からかわれる |
| enemy | `gt_jaipur_main_jantar_mantar_battle_divya_002` | `gt_jaipur_jantar_mantar.ink:65` | ディヴィヤです。ベンガルールの研究所で、星の研究をしています ／ 母が、わたしに黙って、この人に時刻を決めさせたんです |
| enemy | `gt_jaipur_main_jantar_mantar_battle_divya_005` | `gt_jaipur_jantar_mantar.ink:81` | ちょうどいい。あなた、外国の人ですよね。証人になってください ／ 十二時になったら、この日時計が、わたしの正しさを証明しますから |
| gt_nasreen | `gt_jaipur_date_johari_bazaar_nasreen_001` | `gt_jaipur_johari_bazaar.ink:34` | いらっしゃい。ナスリーンよ ／ 腕輪は、夫と義理の弟が、近くの職人の路地で、小さな炉に向かって作ってるの。売るのは、女の仕事 |
| gt_nasreen | `gt_jaipur_date_johari_bazaar_nasreen_004` | `gt_jaipur_johari_bazaar.ink:75` | 昔ね、女神パールヴァティーがシヴァと結婚するとき、腕輪職人たちがラックの腕輪を作ったの ／ それからずっと、花嫁や結婚した女の人は、ラックの腕輪で手首を飾るのよ |
