INCLUDE modules.ink
-> DONE

// ファテープル・シークリー日帰りツアー（tours/gt_agra_tour_fatehpur_sikri.json）の場面。15場面。
// 札：# scene: tour_leg（区間の語り）・# at: tour <ツアー> <行程>・# priority: after leg（車の中の交流）・-1・+1。書き方は authoring/CONTENT_GUIDE.md の「ツアー」。
// 販売ごとに「誰と行くか」が変わる（2026-11-26のユーザー判断）。販売で中を分ける所は cond("tour gt_agra_tour_fatehpur_sikri by <販売>")、頭の札は # when: に書く。
//   宿のフロント（hotel_desk）：ガイドつき。ガイドのルクサーナ（アンワルの弟子。シークリーに住む）と着いた所で合流する。車の中はヴィノードと二人。
//   予約サイト（web）：乗り合い。同じ車に、チェンナイから来た結婚四十年目の夫婦（スンダルとパドマ）。運転はヴィノード。
//   紹介（vinod_direct）：ヴィノードと二人きり。宿で休む前に大通りでヴィノードに会うと買える（places/gt_agra_hotel_hub.ink の gt_agra_hotel_vinod）。
//   前にヴィノードに会っていれば（cond("seen gt_agra_hotel_vinod")、どの販売でも）、朝は顔見知りとして迎える。
// 流れ：
//   out の前（-1）gt_agra_tour_morning（共通。宿の帳場のサミール：hotel_desk はガイドの話、ほかは叔父を断る。大通りのヴィノード：web は夫婦も乗っている）
//   → out の語り gt_agra_tour_out_leg（共通。web は夫婦の一言）
//   → out の車の中：web は gt_agra_tour_out_shared（四十年前のサンダル）、ほかは gt_agra_tour_out_mother（母への土産話）
//   → out の後（+1）gt_agra_tour_arrive（共通。着いた所）→（+2）gt_agra_tour_guide_gate（hotel_desk。ガイドと合流。最初の眺めは二人だけで）
//   → visit（本筋：観光案内・バトル。インド編の観光地に観察はない）
//   → visit の後（+1）gt_agra_tour_guide_palace（hotel_desk。宮殿で恋の伝説と、記録にあること）／gt_agra_tour_shared_sandals（web。サンダルの決着）
//   →（+2）gt_agra_tour_mathri（共通。ヴィノードの母のマトリー）→（+3）gt_agra_tour_mother_door（vinod_direct。母の家の戸口へ寄る）
//   → back の語り gt_agra_tour_back_leg（共通。web は彼女が眠らず、夫婦が眠る）
//   → back の車の中：web は gt_agra_tour_back_shared（同じ向きの寝顔）、ほかは gt_agra_tour_back_awake（眠ったふり）
//   → back の後（+1）gt_agra_tour_home（共通。宿）。
// 本筋より前の場面では、観光案内とバトルの中身（町が丸ごとあること・尾根の上の眺め・門の碑文・聖者と跡継ぎ・皇帝が町を出たこと）を先に言わない。
// 本筋のバトル（ムケーシュ）にふれる文は cond("battle gt_agra_main_fatehpur_sikri_battle") の中だけに書く。
// 文の中に時刻と金額は書かない。運転手のヴィノードはガイドではない（中の説明をしない）。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_agra_tour_morning・gt_agra_tour_out_leg・gt_agra_tour_out_shared・gt_agra_tour_arrive・gt_agra_tour_guide_gate・
//   gt_agra_tour_guide_palace・gt_agra_tour_shared_sandals・gt_agra_tour_back_leg）。ほかは # sources: none。

// 【ツアー】out の前（-1）：宿の帳場のサミールと、大通りで待つ運転手のヴィノード
=== gt_agra_tour_morning ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: -1
# background: gt_bg_agra_hotel_hub
# bgm: morning
# speaker: narrator
朝の帳場で、サミールが待ちかまえていた。手には、見覚えのある名刺。
{ cond("tour gt_agra_tour_fatehpur_sikri by hotel_desk"):
    # speaker: gt_samir
    おはようございます。今日はファテープル・シークリー。ガイドのつく、いちばんいいツアーです
    # speaker: gt_samir
    ガイドは、叔父が仕込んだルクサーナです。シークリーに住んでいるので、向こうでお待ちしています
    # speaker: heroine
    # emotion: surprised
    # voice: gt_agra_tour_morning_007
    叔父さんの、お弟子さん？
    # speaker: gt_samir
    # term: gt_term_akbar
    はい。叔父の弟子で、女のガイドは、彼女だけです。皇帝アクバルと、お妃の恋の話なら、ルクサーナも、ちゃんと泣かせます
    { cond("date gt_agra_date_mariam_tomb"):
        # speaker: heroine
        # voice: gt_agra_tour_morning_008
        そのお妃、ジョーダーって呼ばれるのかな。マリアムさんのお墓で、あとから付いた名前かもしれないって、聞いたんです
        # speaker: gt_samir
        恋の話は、名前より、涙です
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_tour_morning_009
        泣く前に、名前くらいは、ちゃんと呼んであげたいな
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_agra_tour_morning_010
        泣かせるのは、もう決まってるんだ。……ハンカチ、二枚持っていこうかな
    }
    # speaker: narrator
    サミールの帳面に、また何かが書き足された。新婚のお二人、ガイドつき。逆さまからでも、そう読めた気がした。
- else:
    # speaker: gt_samir
    # voice: gt_agra_tour_morning_samir_001
    おはようございます。今日はファテープル・シークリーですね。……ただ、このツアーには、ガイドがついておりません
    { cond("tour gt_agra_tour_fatehpur_sikri by vinod_direct"):
        # speaker: gt_samir
        ヴィノードさんに、直接お頼みになったと聞きました。帳場を通さずに。……いえ、よろしいんです。いい運転手ですから
    }
    # speaker: gt_samir
    # voice: gt_agra_tour_morning_samir_002
    今からでも、叔父を呼べます。この町で一番泣かせるガイドです
    # speaker: gt_samir
    # voice: gt_agra_tour_morning_samir_003
    # term: gt_term_akbar
    # term: gt_term_mariam_uz_zamani
    皇帝アクバルと、お妃ジョーダーの恋の話なら、叔父の右に出る者はおりません
    # speaker: heroine
    # voice: gt_agra_tour_morning_001
    # photo: gt_album_a042 # photo_caption: 叔父を薦めるサミール、自分で断る彼女 # photo_with: gt_samir
    ありがとうございます。でも、今日は、二人で見て回りたいんです
    # speaker: narrator
    # emotion: surprised
    言い終えてから、彼女は自分で少し驚いた顔をした。断る言葉が、思ったより先に出たらしい。
    { cond("date gt_agra_date_mariam_tomb"):
        # speaker: heroine
        # voice: gt_agra_tour_morning_002
        それに、ジョーダーって名前、あとから広まった呼び名かもしれないって、聞きました
        # speaker: gt_samir
        # voice: gt_agra_tour_morning_samir_004
        恋の話に、本当の名前は要りません
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_tour_morning_003
        名前が大事な人も、いると思うけどな
    }
    # speaker: gt_samir
    # voice: gt_agra_tour_morning_samir_005
    お二人きりで。なるほど、ロマンチックです
    # speaker: narrator
    帳面の上で、サミールのペンが、妙に楽しそうに動いた。
}
# background: gt_bg_agra_fatehabad_road
# speaker: narrator
# leave: gt_samir
路地を抜けた先の大通りに、白い車が停まっていた。
# speaker: narrator
横に、アイロンの効いたシャツの男が立っている。
# speaker: narrator
胸の前に掲げた紙には、こちらの名前が、整ったアルファベットで書いてあった。
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: narrator
    名前の下に、もう一組、知らない名前が並んでいる。車の後ろの席から、白髪の夫婦が、そろってこちらに手を振っていた。
}
{ cond("seen gt_agra_hotel_vinod"):
    # speaker: narrator
    男は紙を胸に掲げたまま、軽く頭を下げた。宿の前で、駅の客を待っていたヴィノードだった。
    # speaker: gt_vinod
    おはようございます。顔は知っているから、紙は要らない、と言ったんですが
- else:
    # speaker: heroine
    # emotion: worried
    # voice: gt_agra_tour_morning_004
    運転手つきの車、って聞くと、まだ少し、デリーの駅を思い出しちゃう
    # speaker: narrator
    男は紙を下ろし、軽く頭を下げた。
    # speaker: gt_vinod
    # cutin: name
    # voice: gt_agra_tour_morning_vinod_001
    ヴィノードです。運転をします。ガイドではありません。中のことは皇帝の仕事、外のことは、わたしの仕事
}
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_agra_tour_morning_005
その字、きれいですね。看板屋さんの字みたい
# speaker: gt_vinod
# voice: gt_agra_tour_morning_vinod_002
娘が書きました。わたしの字は、道に迷った牛みたいだそうです
{ cond("seen gt_agra_hotel_vinod"):
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_morning_011
    知ってます。駅のお客さんの紙、一文字も読めなかったから
    # speaker: narrator
    # emotion: happy
    # photo: gt_album_a043 # photo_caption: 娘さんが書いた、名前の紙 # photo_with: gt_vinod
    ヴィノードは声を出して笑い、紙をていねいに折って、胸のポケットにしまった。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_morning_012
    知ってる人が、名前の紙を持って待っててくれるの、なんだか、うれしいね
- else:
    # speaker: narrator
    # emotion: happy
    # photo: gt_album_a043 # photo_caption: 娘さんが書いた、名前の紙 # photo_with: gt_vinod
    彼女は吹き出し、それから、こちらにだけ聞こえる声で言った。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_morning_006
    名前の紙を、娘さんに書いてもらう人。お芝居なら、そんなところまで作らないと思う
}
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: narrator
    後ろの席の二人は、チェンナイから来たスンダルとパドマだと名乗った。今日は、同じ車でシークリーを回るのだという。
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_agra_tour_morning_013
    ……二人で見て回りたい、って、さっき言ったばかりなのに
    # speaker: gt_padma
    # cutin: name
    あら、見て回るのは、お二人でどうぞ。車の中だけ、四人なの
}
-> END

// 【ツアー】out の区間の語り（車の中）。観光案内の最初の眺め（尾根の上の町）は、ここでは書かない
=== gt_agra_tour_out_leg ===
# scene: tour_leg
# at: tour gt_agra_tour_fatehpur_sikri out
# background: gt_bg_agra_fatehabad_road
# bgm: gt_india_rhythm
# ambience: stop
# speaker: narrator
アーグラの町を抜けるまでが、いちばん長かった。
# speaker: narrator
オートリキシャ、自転車、制服の子どもたちを荷台に乗せた三輪。
# speaker: narrator
交差点の真ん中では、牛が一頭、信号のかわりに立ち止まっている。
# photo: gt_album_a044 # photo_caption: 鳴らさないクラクション、信号のかわりの牛 # photo_with: gt_vinod
ヴィノードは、クラクションを鳴らさなかった。牛の後ろで、ただ待っている。
# speaker: heroine
# voice: gt_agra_tour_out_leg_001
鳴らさないんですね
# speaker: gt_vinod
# voice: gt_agra_tour_out_leg_vinod_001
# term: gt_term_cow
牛は、鳴らしても急ぎません。急ぐのは、こっちの心臓だけ
# background: gt_bg_agra_tour_road
# speaker: narrator
# term: gt_term_horn_ok_please
やがて道は西へまっすぐ伸び、建物の間に畑がのぞきはじめた。
# speaker: narrator
前を走るトラックの荷台の後ろに、色とりどりの文字が描いてある。
# speaker: narrator
HORN OK PLEASE。
# speaker: heroine
# reaction: heroine,surprised,question
# photo: gt_album_a045 # photo_caption: HORN OK PLEASE # photo_with: gt_vinod
ホーン、オーケー、プリーズ……。鳴らして、いいよ、お願い？
# speaker: heroine
どういう意味なんだろう。あ、あっちのトラックにも書いてある
# speaker: gt_vinod
# voice: gt_agra_tour_out_leg_vinod_002
その OK は、運転手の数だけ説があります。父の説と、わたしの説も違います
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: gt_padma
    四十年前のバスにも、書いてあったわ。意味は、あのときも、誰も知らなかった
    # speaker: gt_sundar
    # cutin: name
    わたしは知っていた。君が聞かなかっただけだ
}
# speaker: heroine
# voice: gt_agra_tour_out_leg_003
ヴィノードさんの説は？
# speaker: gt_vinod
# voice: gt_agra_tour_out_leg_vinod_003
書いてあると、なんだか安心する。それだけです
# speaker: narrator
# term: gt_term_nimbu_mirchi
# photo: gt_album_a046 # photo_caption: バックミラーのレモンと青唐辛子 # photo_with: gt_vinod
バックミラーの下で、糸に通した小さなレモンと青唐辛子が揺れていた。彼女の視線に気づいて、ヴィノードが顎で示す。
# speaker: gt_vinod
# voice: gt_agra_tour_out_leg_vinod_004
母が付けます。悪い目よけ。シークリーへ行くたびに、新しいのに替えてくれる
# speaker: heroine
# voice: gt_agra_tour_out_leg_004
お母さん、シークリーに住んでるんですか？
# speaker: gt_vinod
# voice: gt_agra_tour_out_leg_vinod_005
皇帝の所の、すぐ下の町に。お二人が中にいる間、わたしは母の家で昼ごはんです。このツアーは、わたしにも、いいツアー
# speaker: narrator
# term: gt_term_water_buffalo
窓の外を、畑が流れていく。水路の脇で、子どもが一人、水牛の群れを棒で追っていた。
-> END

// 【ツアー】out の車の中の交流（語りの後、着く前）。母に、二人のことを何と伝えるか（予約サイトの乗り合いでは流れない）
=== gt_agra_tour_out_mother ===
# scene: encounter
# title: 母への土産話
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: after leg
# when: not tour gt_agra_tour_fatehpur_sikri by web
# sources: none
# background: gt_bg_car_interior
# bgm: gt_india_rhythm
# ambience: stop
# speaker: narrator
しばらく黙って走ってから、ヴィノードがバックミラー越しにこちらを見た。
# speaker: gt_vinod
一つ、聞いてもいいですか。母は、わたしが乗せたお客さんの話を、必ず聞きたがります
# speaker: gt_vinod
どこから来て、何を見て、どういう二人か
# speaker: gt_vinod
# voice: gt_agra_tour_out_mother_vinod_002
母は、シークリーからほとんど出ません。だから、お客さんの話が、母の旅行です
# speaker: gt_vinod
サミールさんは、新婚さんだと言っていました
# speaker: gt_vinod
でも、お二人は、新婚さんの顔には見えない。……母に、何と言えばいいですか
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_tour_out_mother_001
サミールさん、運転手さんにまで……
{ cond("flag gt_agra_said_for_now"):
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_agra_tour_out_mother_002
    今度は、『今のところは』って言わないでね
}
* [Tell her we're traveling together. That's all. # option: just_traveling # translation: 一緒に旅をしている二人だ、とだけ伝えてください。]
    # set: gt_agra_tour_told_traveling
    # rel: trust +1
    # speaker: gt_vinod
    # voice: gt_agra_tour_out_mother_vinod_004
    一緒に旅をしている二人。分かりました。母は、その先を自分で考えるのが好きです
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_out_mother_003
    うん。それが、いちばん正確
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_agra_tour_out_mother_004
    でも、『とだけ』って言われると、ちょっとだけ引っかかるな。ふふ、冗談
* [Tell her she reads everything. Signs, trucks, walls. # option: she_reads # translation: 何でも読む人だ、と。看板も、トラックも、壁も。]
    # set: gt_agra_tour_told_reader
    # rel: affection +1
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_tour_out_mother_005
    それ、わたしの紹介？　トラックまで読むのは、本当だけど
    # speaker: gt_vinod
    # voice: gt_agra_tour_out_mother_vinod_005
    いい紹介です。母は、よく見る人が好きです。わたしは、前しか見ないので
* [She can answer that herself. # option: ask_her # translation: それは、彼女が自分で答えられます。]
    # set: gt_agra_tour_she_answered
    # rel: trust +1
    # speaker: heroine
    # reaction: heroine,surprised,interrobang
    # voice: gt_agra_tour_out_mother_006
    えっ、わたし？
    # speaker: narrator
    彼女は少し考えてから、前の座席の背に手をかけた。
    # speaker: heroine
    # voice: gt_agra_tour_out_mother_007
    # photo: gt_album_a047 # photo_caption: 母への土産話 # photo_with: gt_vinod
    同じ町を、同じ日に見たかった二人です。……って、伝えてください
    { cond("couple"):
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        # voice: gt_agra_tour_out_mother_008
        新婚では、ないです。……恋人では、ありますけど
    - else:
        # speaker: heroine
        # voice: gt_agra_tour_out_mother_009
        新婚では、ないです。そこは、大事なところなので
    }
    # speaker: gt_vinod
    # voice: gt_agra_tour_out_mother_vinod_006
    同じ町を、同じ日に。いい言葉です。そのまま、母に渡します
-
# speaker: narrator
ヴィノードは小さくうなずき、アクセルを少し踏みこんだ。
-> END

// 【ツアー・予約サイト】out の車の中の交流（語りの後、着く前）。乗り合いの夫婦の、四十年前のサンダル。上で靴を預けることは言うが、町・門・碑文のことは言わない
=== gt_agra_tour_out_shared ===
# scene: encounter
# title: 四十年前のサンダル
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: after leg
# when: tour gt_agra_tour_fatehpur_sikri by web
# person: gt_padma
# person: gt_sundar
# background: gt_bg_car_interior
# bgm: gt_india_rhythm
# ambience: stop
# speaker: narrator
畑が続きはじめたころ、後ろの席のパドマが、前の座席の背に身を乗り出した。
# speaker: gt_padma
わたしたち、結婚して、ちょうど四十年なの。新婚旅行も、この道だった。今日は、あのときと同じ順番で回ってるのよ
# speaker: gt_sundar
順番を決めたのは、彼女だ。わたしは、四十年前も今日も、ついていくだけ
# speaker: gt_padma
ついてきた人がね、シークリーで、わたしのサンダルをなくしたの
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_tour_out_shared_001
サンダル、ですか？
# speaker: gt_padma
結婚式のために買った、赤いの。上のモスクでは、靴を脱いで預けるでしょう。戻ったら、なかった
# speaker: gt_sundar
なくしてはいない。君が、預けた場所を間違えたんだ。わたしは、ちゃんと柱を数えていた
# speaker: gt_padma
この人、四十年、そう言い張ってるの
# speaker: narrator
スンダルも、負けずに身を乗り出した。前の座席の背に、白髪の頭が二つ並ぶ。
# speaker: gt_padma
ねえ、あなたたち。どっちの話を信じる？
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_tour_out_shared_002
えっ、わたしたちが決めるんですか？　四十年分を？
* [I believe both of you. # option: believe_both # translation: お二人とも、信じます。]
    # set: gt_agra_tour_shared_both
    # rel: affection +1
    # speaker: gt_padma
    それが、いちばんずるい答え。……でも、この人は四十年、一度もそう言ってくれなかったわ
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_out_shared_003
    ずるい答え、わたしは好きです。けんかが、どっちも負けないまま続くから
* [Was anyone else there to see it? # option: any_witness # translation: ほかに、見ていた人はいましたか。]
    # set: gt_agra_tour_shared_witness
    # rel: trust +1
    # speaker: gt_sundar
    いない。写真もない。フィルムが、あと二枚しか残っていなかった
    # speaker: gt_padma
    その二枚は、サンダルを預ける前に撮ったの。だから、最後の証拠は、ちゃんと履いてるところ
    # speaker: heroine
    # voice: gt_agra_tour_out_shared_004
    記録が、なくなる直前で終わってるんですね。……それは、決着がつかないかも
* [How did you get back without shoes? # option: back_barefoot # translation: 靴なしで、どうやって戻ったんですか。]
    # set: gt_agra_tour_shared_barefoot
    # rel: spark +1
    # speaker: narrator
    夫婦が、そろって一瞬だまった。
    # speaker: gt_padma
    ……この人のを、履いたの。大きすぎて、一歩ごとに、ぱかぱか鳴るのを
    # speaker: gt_sundar
    わたしは裸足で、焼けた石の上を、バスまで。足の裏の皮が、新婚旅行のあいだに、全部むけた
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_out_shared_005
    なくした話より、そっちの方が、ずっと大事な話に聞こえます
-
# speaker: gt_padma
今日は、決着をつけるの。四十年前と同じように預けて、同じように探す
# speaker: gt_sundar
四十年ぶりの、現場検証だ
# speaker: narrator
二人は、同時に座席に背中を戻した。それから、窓の外を見ながら、まだ小声で言い合っていた。
# speaker: heroine
# emotion: smile
# voice: gt_agra_tour_out_shared_006
二人きりじゃ、なくなっちゃったけど……この車で、よかったかも
-> END

// 【ツアー】out の後（+1）：着いた所。ヴィノードは母の家へ。見学の前（観光案内の最初の眺めの前なので、町の様子は書かない）
=== gt_agra_tour_arrive ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: +1
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_vadodora
# ambience: gt_amb_bazaar
# speaker: narrator
# se: car_door
シークリーの下の町に入ると、ヴィノードは大きな木の陰に車を停めた。
# speaker: narrator
エンジンを切ると、外の音が急に近くなった。呼び込みの声、バイクの音、どこかで鳴る鈴。
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: narrator
    パドマとスンダルは、車を降りるなり、言い合いながら上の方へ歩いていった。
    # speaker: narrator
    四十年ぶりの現場検証に、遅れるわけにはいかないらしい。
}
{ cond("seen gt_agra_hotel_vinod"):
    # speaker: narrator
    ヴィノードは、前に渡した番号の紙を、こちらがまだ持っているか確かめてから、うなずいた。
- else:
    # speaker: narrator
    # photo: gt_album_a048 # photo_caption: 木陰の車、牛の字の電話番号 # photo_with: gt_vinod
    ヴィノードは名前の紙を裏返し、電話番号を書いて、こちらに渡した。
    # speaker: narrator
    娘さんのきれいな字の裏に、道に迷った牛の字が並んだ。
}
{ cond("tour gt_agra_tour_fatehpur_sikri by hotel_desk"):
    # speaker: gt_vinod
    ガイドさんは、もうすぐ来ます。ルクサーナさんなら、心配いりません。この町で、いちばん口の休まない人です
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_arrive_003
    ヴィノードさんと足したら、ちょうどいいくらいですね
- else:
    # speaker: gt_vinod
    # voice: gt_agra_tour_arrive_vinod_001
    入口で、ガイドが要ると言う人がいます。切符だけでは足りない、と言う人も。足ります。お二人の切符で、ちゃんと全部です
    # speaker: heroine
    # emotion: smile
    # recall: gt_album_d126
    # voice: gt_agra_tour_arrive_001
    大丈夫です。ノー・サンキューは、デリーで練習してきました
    # speaker: gt_vinod
    # voice: gt_agra_tour_arrive_vinod_002
    それなら安心です。デリーで練習した人は、どこでも強い
}
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: heroine
    # voice: gt_agra_tour_arrive_004
    お母さんに、よろしく伝えてください。レモン、すてきでしたって
- else:
    # speaker: heroine
    # voice: gt_agra_tour_arrive_002
    お母さんに、よろしく伝えてください。あ、さっきの話も
}
# speaker: narrator
ヴィノードは笑って、木の下の細い道を、下の町の方へ歩いていった。
-> END

// 【ツアー・宿のフロント】out の後（+2）：ガイドのルクサーナと合流する。本筋の前なので、町の様子・門・碑文・聖者のことは言わない
=== gt_agra_tour_guide_gate ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: +2
# when: tour gt_agra_tour_fatehpur_sikri by hotel_desk
# person: gt_rukhsana
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_vadodora
# ambience: gt_amb_bazaar
# speaker: narrator
ヴィノードと入れ違いに、下の町の方から、女の人が一人、早足で上がってきた。
# speaker: narrator
藍色のサリーの肩に、ショールをきっちり留めている。
# speaker: narrator
首から下げた札には、写真と、役所の印。
# speaker: gt_rukhsana
# cutin: name
サミールのお客さまですね。ルクサーナです。今日のガイドをします
# speaker: narrator
彼女は首の札を持ち上げて表を見せ、裏返して裏も見せた。政府の許可を受けたガイドの証だという。
# speaker: gt_rukhsana
入口で、ガイドだと名乗る人が来たら、この札を見せてもらってください
# speaker: gt_rukhsana
見せない人は、ガイドではありません。わたしも含めて
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_tour_guide_gate_001
ルクサーナさんは、表も裏も見せてくれましたね
# speaker: gt_rukhsana
裏まで見るお客さまは、めずらしい。……サミールの紙には、新婚のお二人、とありました
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_tour_guide_gate_002
それは、サミールさんの紙の中だけです
# speaker: gt_rukhsana
では、紙の中だけ、ということにしておきます
# speaker: narrator
ルクサーナは、首の札の後ろから、もう一枚、角の丸くなった厚紙を抜き出した。
# speaker: narrator
手書きの字が三行。こちらに見せるでもなく、一行目だけを確かめるように読む。
# speaker: narrator
# letter: card
一、最初の眺めに、声を混ぜるな。
# speaker: gt_rukhsana
先生の決まりです。サミールの叔父の、アンワル先生。わたしに、この仕事を仕込んだ人
# speaker: gt_rukhsana
だから、最初は、お二人だけで見てきてください。わたしは、ジョーダー・バーイーの宮殿と呼ばれている所で、待っています
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_tour_guide_gate_003
ガイドさんなのに、最初は、ついてこないんですか？
# speaker: gt_rukhsana
最初の眺めは、お客さまのものです。話は、そのあと。……そのかわり、あとで、ちゃんと泣かせます
# speaker: heroine
# emotion: smile
# voice: gt_agra_tour_guide_gate_004
泣かせるのは、もう決まってるんだ
# speaker: narrator
厚紙の二行目には、太い字で何か書いてあった。三行目に指をかけたところで、ルクサーナは厚紙を札の後ろへ戻した。
-> END

// 【ツアー・宿のフロント】visit の後（+1）：ジョーダー・バーイーの宮殿と呼ばれる所で、ルクサーナが恋の伝説を語り、記録にあることと、ないことを分ける
=== gt_agra_tour_guide_palace ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri visit
# priority: +1
# when: tour gt_agra_tour_fatehpur_sikri by hotel_desk
# person: gt_rukhsana
# background: gt_bg_agra_fatehpur_sikri
# bgm: gt_relics_of_past
# speaker: narrator
宮殿の並ぶ方へ戻ると、四角い中庭の入口で、ルクサーナが待っていた。
# speaker: gt_rukhsana
おかえりなさい。最初の眺めは、お二人のものでした。……ここからは、わたしの番
{ cond("battle gt_agra_main_fatehpur_sikri_battle"):
    # speaker: heroine
    # voice: gt_agra_tour_guide_palace_001
    町のことより先に、石段で会った人のことを、話したくなっちゃいます。自分の家を建てている人で
    # speaker: gt_rukhsana
    石段では、よく誰かが、人生の相談をしています。今日は、お二人が相談される側だったんですね
}
# speaker: narrator
中庭を、赤い石の建物がぐるりと囲んでいる。
# speaker: narrator
上の階の窓の下に、象やオウムの模様が彫ってあった。
# speaker: narrator
この町で、いちばん大きな宮殿だという。
# speaker: gt_rukhsana
ジョーダー・バーイーの宮殿、と呼ばれています
# speaker: narrator
壁の一角に、祈りの場所らしい小さな壁龕があった。
# speaker: narrator
ルクサーナはその前で立ち止まり、一歩下がって、声を落とした。
# speaker: narrator
話し方が、さっきまでと違う。先生の口調を、そのまま借りてきたような声だった。
# speaker: gt_rukhsana
アンベールの姫は、皇帝に嫁ぐとき、一つだけ願いました。自分の神さまに、祈り続けたい、と
# speaker: gt_rukhsana
皇帝は、その願いを守った。宮殿の中に、姫の祈る場所を作らせた。そして、姫が心を開くまで、待ったのです。何年でも
# speaker: gt_rukhsana
ある夜、刺客に傷を負わされた皇帝を、姫は一晩じゅう看病しました
# speaker: gt_rukhsana
夜が明けたとき、皇帝は初めて、その名を呼んだ。……ジョーダー、と
# speaker: narrator
# pause: 700
中庭の風が、一瞬止まったような気がした。ルクサーナの目が、少し潤んでいる。話している本人が、いちばん先に。
{ cond("date gt_agra_date_mariam_tomb"):
    # speaker: heroine
    # emotion: serious
    # voice: gt_agra_tour_guide_palace_002
    すごく、いい話。……でも、ルクサーナさん。その人、ジョーダーって名前じゃなかったかもしれないんですよね
    # speaker: heroine
    # voice: gt_agra_tour_guide_palace_003
    マリアムさんのお墓で、お父さんと娘さんが、それでけんかしてました。映画の名前だ、って
- else:
    # speaker: heroine
    # voice: gt_agra_tour_guide_palace_004
    いい話……。わたしまで、泣きそうになりました
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_agra_tour_guide_palace_005
    でも、皇帝が何年も待った、っていうのは、どこに書いてあるんですか？
}
# speaker: narrator
ルクサーナは、目元をショールの端で押さえた。それから、思いがけないほど普通の声で言った。
{ cond("date gt_agra_date_mariam_tomb"):
    # speaker: gt_rukhsana
    知っています。当時の記録に、その名前は出てきません。ガイドの試験にも出ました
- else:
    # speaker: gt_rukhsana
    どこにも。……ついでに言うと、ジョーダーという名前も、当時の記録には出てきません。ガイドの試験にも出ました
    # speaker: gt_rukhsana
    # term: gt_term_mariam_uz_zamani
    記録では、マリアム・ウッザマーニー。時代のマリアム、という称号で呼ばれています
}
# speaker: gt_rukhsana
# term: gt_term_akbar
記録にあるのは、こうです。姫の父の王さまが、皇帝と手を結ぶために、娘を嫁がせた。サーンバルという所の、皇帝の陣で
# speaker: gt_rukhsana
自分の神さまに祈り続けたのは、本当です。宮殿の中で、自分の信仰を続けることを許された
# speaker: gt_rukhsana
でも、皇帝が待ったかどうか。二人が好き合っていたかどうか。それは、どこにも書いてありません。映画が、そう作りました
# speaker: heroine
# voice: gt_agra_tour_guide_palace_006
じゃあ、ここは、ジョーダーさんじゃなくて、マリアムさんの宮殿なんですね
# speaker: gt_rukhsana
たぶん、です。この中で、誰がどの建物に住んだか、はっきり書いた記録は、あまりありません
# speaker: gt_rukhsana
名前の多くは、あとの人が付けました
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_tour_guide_palace_007
あ……。わたしも今、決めつけてました。違う名前を、別の名前に貼りかえただけで
# speaker: narrator
ルクサーナは、首の札の後ろから、あの厚紙を抜いた。今度は、三行目を指で隠さなかった。
# speaker: narrator
# letter: card
三、分からない、と言うな。
# speaker: gt_rukhsana
お客さまは、答えにお金を払います
# speaker: gt_rukhsana
分からない、と言うガイドに、誰が払いますか
# speaker: gt_rukhsana
……今日のお二人は、いちばん高いツアーを買ってくださったのに
# speaker: narrator
彼女は、こちらを見た。言いにくいことを先に言ってしまった人の顔だった。
* [We paid for you, not for an answer. # option: paid_for_you # translation: 払ったのは、答えにじゃなくて、あなたにです。]
    # rel: trust +1
    # speaker: gt_rukhsana
    ……そういうお客さまのことは、先生の決まりに、書いてありません
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_guide_palace_008
    じゃあ、四行目に、書き足しておいてください
* [Then tell us the legend as a legend. # option: legend_as_legend # translation: それなら、伝説は、伝説として聞かせてください。]
    # rel: affection +1
    # speaker: gt_rukhsana
    伝説として。……それなら、さっきの話は、まるごと本当です。映画の中では
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_guide_palace_009
    ふふ。映画の中のお姫さまには、ちゃんと泣かされました
* [What do you think she felt? # option: what_she_felt # translation: あなたは、彼女がどう思っていたと思いますか。]
    # rel: trust +1
    # speaker: gt_rukhsana
    わたしが？　……分かりません
    # speaker: narrator
    # emotion: surprised
    言ってから、ルクサーナは自分で驚いた顔をした。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_guide_palace_010
    今、言いましたね。三行目
-
# speaker: gt_rukhsana
分からないことの代わりに、分かっていることを、一つ。……本当は、わたしは、こっちの方が好きなんです
# speaker: gt_rukhsana
この人は、自分の名前で、命令書を出せました。自分の船を持っていて、巡礼の人をメッカへ運び、絹や香辛料を商った
# speaker: gt_rukhsana
その船が、海でポルトガルに奪われたとき、息子の皇帝は怒って、港を止め、ポルトガルの町を囲ませました
# speaker: gt_rukhsana
記録に、ちゃんと残っています
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_agra_tour_guide_palace_011
船！　お姫さまの話だと思ってたら、船主さんの話だった
{ cond("date gt_agra_date_mariam_tomb"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_guide_palace_012
    名前は、あとから違うのを付けられちゃったけど、船のことは、本人のまま残ってるんだ
}
# speaker: gt_rukhsana
息子が、学校の劇で、皇帝の役をやるんです。好きだなんて台詞、言えるか、と毎晩怒っていて
# speaker: gt_rukhsana
今夜は、船の話をしてやります。恋の台詞より、あの子は、こっちを覚えるかもしれない
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_tour_guide_palace_013
わたしも、船の話の方を覚えて帰ります。泣いた話も、ちょっとだけ
# speaker: narrator
ルクサーナは、厚紙を札の後ろへ戻した。三行目は、書いてあるままだった。
# speaker: narrator
ただ、しまう手つきが、来たときより少しだけ雑だった。
# speaker: gt_rukhsana
車は、下の木の陰ですね。わたしは、ここまで。ヴィノードさんのお母さんに、よろしく
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_tour_guide_palace_014
お知り合いなんですか？
# speaker: gt_rukhsana
シークリーは、狭い町です。皇帝が出ていってから、ずっと
-> END

// 【ツアー・予約サイト】visit の後（+1）：車へ下りる道で、夫婦のサンダルの決着（out の車の中の選択のフラグで、言葉が変わる）
=== gt_agra_tour_shared_sandals ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri visit
# priority: +1
# when: tour gt_agra_tour_fatehpur_sikri by web
# person: gt_padma
# person: gt_sundar
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_vadodora
# ambience: gt_amb_bazaar
# speaker: narrator
木陰へ下りる道の途中、履物の屋台の前で、パドマとスンダルが言い合っていた。
# speaker: narrator
……いや、よく見ると、二人とも笑っていた。
# speaker: narrator
パドマの足もとで、新しい赤いサンダルが光っている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_agra_tour_shared_sandals_001
あ、赤い！
# speaker: gt_padma
この人が、今、買ったの。四十年分の弁償ですって
# speaker: gt_sundar
弁償じゃない。記念だ
# speaker: gt_padma
上で、四十年前と同じように、靴を預けてみたのよ。それで、分かったの
# speaker: gt_padma
柱が、どれも同じに見えるの。わたしは、どの柱か覚えていたつもりだった。この人は、柱を数えていたつもりだった
# speaker: gt_sundar
どこから数えはじめたかを、覚えていなかった
# speaker: gt_padma
二人とも、半分ずつ正しくて、半分ずつ間違ってたの。四十年
{
- cond("flag gt_agra_tour_shared_barefoot"):
    # speaker: gt_sundar
    今日は、靴を二足持ってきた。……結局、要らなかったが
    # speaker: narrator
    スンダルが鞄の口を開けると、古いチャッパルが一足、新聞紙にくるまっていた。四十年前と同じ形だという。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_shared_sandals_002
    要らなかった靴を持ってくる人、すてきだと思います
- cond("flag gt_agra_tour_shared_witness"):
    # speaker: heroine
    # voice: gt_agra_tour_shared_sandals_003
    見ていた人がいなくても、もう一回、二人で行けば、確かめられるんですね
    # speaker: gt_padma
    四十年かかったけどね
- cond("flag gt_agra_tour_shared_both"):
    # speaker: gt_padma
    あなたの言ったとおりだったわ。両方、信じておけばよかったのよ。四十年前から
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_shared_sandals_004
    ずるい答えで、よかった
- else:
    # speaker: gt_padma
    決着がついたら、ちょっと、さみしいわね
}
# speaker: heroine
# emotion: smile
# voice: gt_agra_tour_shared_sandals_005
同じけんかの続きを、四十年たって、一緒に確かめに来るの……なんだか、いいな
# speaker: gt_padma
# reaction: heroine,shy,blush
あなたたちも、来るといいわ。四十年後に。何か一つ、なくしておきなさい
# speaker: heroine
# reaction: heroine,surprised_big,sweat
# voice: gt_agra_tour_shared_sandals_006
な、なくしておくって……！
# speaker: narrator
スンダルが、古い靴の入った箱を、大事そうに小脇に抱え直した。
-> END

// 【ツアー】visit の後（+2）：見学を終えて車に戻る前。ヴィノードの母から、マトリーと、さっきの話への返事
=== gt_agra_tour_mathri ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri visit
# priority: +2
# sources: none
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_relics_of_past
# ambience: gt_amb_bazaar
# speaker: narrator
木陰に戻ると、ヴィノードはもう車の横にいた。ボンネットの上に、新聞紙の包みが一つ。
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: gt_vinod
    母からです。皆さんに、と
- else:
    # speaker: gt_vinod
    # voice: gt_agra_tour_mathri_vinod_001
    母からです。お二人に、と
}
# speaker: narrator
# term: gt_term_mathri
包みの中は、狐色の平たい揚げ菓子だった。マトリーというらしい。
# speaker: narrator
ヴィノードの母のは、アジョワンという種が入っている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_agra_tour_mathri_001
# photo: gt_album_a059 # photo_caption: しょっぱいマトリー # photo_with: gt_vinod
あ、しょっぱい！　甘いクッキーだと思ってた
# speaker: heroine
# emotion: happy
# voice: gt_agra_tour_mathri_002
でも、この香り、好き。ちょっと薬草みたいで、口の中がすっとする
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: gt_padma
    南の揚げ菓子とは、また違う味ね。……この人、もう三枚目よ
    # speaker: gt_sundar
    四十年ぶりの現場検証は、お腹がすくんだ
}
# speaker: gt_vinod
# term: gt_term_ajwain
# voice: gt_agra_tour_mathri_vinod_002
母は、何にでもアジョワンを入れます。お腹にいい、と言って
{
- cond("flag gt_agra_tour_she_answered"):
    # speaker: gt_vinod
    # photo: gt_album_a060 # photo_caption: お母さんの返事 # photo_with: gt_vinod
    母に、伝えました。同じ町を、同じ日に見たかった二人
    # speaker: gt_vinod
    母はしばらく黙って、それから言いました
    # speaker: gt_vinod
    それはもう、旅の話じゃなくて、二人の話だね、と
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_tour_mathri_003
    ……お母さん、鋭い
- cond("flag gt_agra_tour_told_reader"):
    # speaker: gt_vinod
    # voice: gt_agra_tour_mathri_vinod_004
    # photo: gt_album_a060 # photo_caption: お母さんの返事 # photo_with: gt_vinod
    母に、伝えました。何でも読む人。母は笑って、それなら帰りの道も、ずっと何か読んでいるんだろう、運転は静かにね、と
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_mathri_004
    読みます。トラック、全部
- cond("flag gt_agra_tour_told_traveling"):
    # speaker: gt_vinod
    # voice: gt_agra_tour_mathri_vinod_005
    # photo: gt_album_a060 # photo_caption: お母さんの返事 # photo_with: gt_vinod
    母に、伝えました。一緒に旅をしている二人。母は、『一緒に』のところだけ、二回聞き返しました
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    # voice: gt_agra_tour_mathri_005
    に、二回……
- else:
    # speaker: gt_vinod
    # voice: gt_agra_tour_mathri_vinod_006
    母は、お二人のことを聞きたがっていました。どこから来て、何を見たか。帰りに、また話します
}
# speaker: heroine
# voice: gt_agra_tour_mathri_006
お母さんに、おいしかったって伝えてください。ほんとは、自分で言えたら、いちばんいいんだけど
-> END

// 【ツアー・紹介】visit の後（+3）：ヴィノードに直接頼んだ日だけ、会社の時間表がないので、帰る前に母の家の戸口へ寄る（母への土産話のフラグで、母の言葉が変わる）
=== gt_agra_tour_mother_door ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri visit
# priority: +3
# when: tour gt_agra_tour_fatehpur_sikri by vinod_direct
# person: gt_vinod_mother
# sources: none
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_relics_of_past
# ambience: gt_amb_bazaar
# speaker: gt_vinod
言えますよ。今日は、会社の時間表がありません。お二人が、わたしに直接頼んだので
# speaker: gt_vinod
母の家は、この道の先です。ただし、上がったら、夕方まで出てこられません。戸口までにしてください
# speaker: narrator
下の町の細い路地を、二つ曲がった。
# speaker: narrator
突き当たりの青い戸の前に、小柄な女の人が腰かけて、糸に何かを通していた。レモンと、青唐辛子。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_agra_tour_mother_door_001
あ……バックミラーの
# speaker: narrator
ヴィノードが声をかけると、女の人は顔を上げ、こちらを頭から足もとまで眺めた。
# speaker: narrator
それから、糸を膝に置いて、ゆっくり立ち上がった。
{
- cond("flag gt_agra_tour_she_answered"):
    # speaker: gt_vinod_mother
    # cutin: name
    同じ町を、同じ日に見たかった二人。……顔を見たら、話で聞くより、よく分かった
    # speaker: narrator
    ヴィノードが、少し照れくさそうに訳した。
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_tour_mother_door_002
    か、顔に、出てますか
- cond("flag gt_agra_tour_told_reader"):
    # speaker: gt_vinod_mother
    # cutin: name
    何でも読む人だね。じゃあ、わたしの顔も、読んでごらん
    # speaker: narrator
    ヴィノードが、少し照れくさそうに訳した。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_mother_door_003
    ……よく笑う人の、しわです
- cond("flag gt_agra_tour_told_traveling"):
    # speaker: gt_vinod_mother
    # cutin: name
    一緒に旅をしている二人。……一緒に、だね
    # speaker: narrator
    ヴィノードが、少し照れくさそうに訳した。
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    # voice: gt_agra_tour_mother_door_004
    そ、そこを、三回目……
- else:
    # speaker: gt_vinod_mother
    # cutin: name
    よく来たね。息子の車は、静かだったでしょう
    # speaker: narrator
    ヴィノードが、少し照れくさそうに訳した。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_mother_door_005
    はい。牛にも、クラクションを鳴らさなかったです
}
# speaker: heroine
# voice: gt_agra_tour_mother_door_006
マトリー、ありがとうございました。しょっぱくて、すっとして……とても、おいしかったです
# speaker: narrator
ヴィノードが訳し終える前に、母は笑って、彼女の両手を包んだ。言葉の半分は、もう届いていたらしい。
# speaker: gt_vinod_mother
自分で言いに来る人は、めずらしいね
# speaker: heroine
# reaction: heroine,shy,blush
# voice: gt_agra_tour_mother_door_007
伝えてもらうのも、うれしかったんです。でも、これだけは、自分で言いたくて
# speaker: narrator
母は、通し終えたばかりのレモンと青唐辛子を、ヴィノードの手に押しつけた。
# speaker: narrator
帰りの車の分だという。それから、こちらに向き直って、もう一言足した。
# speaker: gt_vinod_mother
次は、上がっていきなさい。食べきれないほど、食べさせるから
# speaker: narrator
ヴィノードが、肩をすくめた。訳さなくても、分かった。
-> END

// 【ツアー】back の区間の語り（車の中）。本筋のバトルにふれる文は cond の中だけ。予約サイトの乗り合いでは、彼女は眠らず、後ろの夫婦が眠る
=== gt_agra_tour_back_leg ===
# scene: tour_leg
# at: tour gt_agra_tour_fatehpur_sikri back
# background: gt_bg_agra_fatehpur_sikri_distant
# bgm: atlantean_twilight
# ambience: stop
# speaker: narrator
帰りの車の中は、行きより静かだった。日差しが真上から照りつけ、エアコンの風が、やっと追いついてくる。
# speaker: heroine
# voice: gt_agra_tour_back_leg_004
ヴィノードさんは、中に入ったこと、ありますか？
# speaker: gt_vinod
# voice: gt_agra_tour_back_leg_vinod_001
一度だけ。学校の遠足で。あとは、ずっと外です。外にも、見るものはあります
# speaker: narrator
# photo: gt_album_a061 # photo_caption: 屋上から突き出た鉄の棒
# term: gt_term_rebar_roof
道沿いの家の屋上から、鉄の棒が何本も突き出していた。どの家も、まだ上に何かを建てるつもりのように見える。
{ cond("battle gt_agra_main_fatehpur_sikri_battle"):
    # speaker: heroine
    # voice: gt_agra_tour_back_leg_001
    ムケーシュさんの家、今日、屋根ができるんだよね。二階の奥に、本を読む部屋のある家
    # speaker: narrator
    彼女は窓に額を寄せて、屋上の鉄の棒を、一軒ずつ目で追っていた。
}
# speaker: gt_vinod
# voice: gt_agra_tour_back_leg_vinod_002
うちの屋上も、ああです。もう一階、建てるつもりで。母の部屋です。母が、来ると言えば
# speaker: heroine
# voice: gt_agra_tour_back_leg_002
来てくれないんですか？
# speaker: gt_vinod
# voice: gt_agra_tour_back_leg_vinod_003
皇帝が出ていった町だから、誰かが残らないといけない、と言います
# speaker: gt_vinod
# term: gt_term_wish_threads
# voice: gt_agra_tour_back_leg_vinod_004
それに母は、聖者のお墓の格子に糸を結んで、子どもを願ったそうです。それで授かったのが、わたし
# speaker: gt_vinod
# voice: gt_agra_tour_back_leg_vinod_005
だから、聖者のそばを離れない。皇帝は王子をもらって、母はわたしをもらった。母は、それで十分だと言います
# speaker: heroine
# emotion: smile
# voice: gt_agra_tour_back_leg_003
十分すぎるくらいだと思います
# speaker: narrator
ヴィノードは返事のかわりに、バックミラーのレモンを指で弾いた。
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: narrator
    それから、しばらく誰も話さなかった。後ろの席から、寝息が二つ、重なって聞こえはじめた。
- else:
    # speaker: narrator
    それから、しばらく誰も話さなかった。{heroine_name}のまぶたが、ゆっくりと下りてくる。
    { cond("couple"):
        # speaker: narrator
        # photo: gt_album_a27 # photo_caption: 帰りの車、こつんと落ちる頭
        # stand: close
        頭が、こちらの肩に、こつんと落ちた。
    - else:
        # speaker: narrator
        # photo: gt_album_a063 # photo_caption: 窓ガラスに、こつん
        頭が、窓ガラスに、こつんと当たった。
    }
}
-> END

// 【ツアー】back の車の中の交流（語りの後、着く前）。眠ったはずの彼女（予約サイトの乗り合いでは流れない）
=== gt_agra_tour_back_awake ===
# scene: encounter
# title: 眠ったふり
# at: tour gt_agra_tour_fatehpur_sikri back
# priority: after leg
# when: not tour gt_agra_tour_fatehpur_sikri by web
# sources: none
# background: gt_bg_car_interior
# bgm: atlantean_twilight
# ambience: stop
# speaker: narrator
寝息のような音が聞こえはじめたころ、ヴィノードが声を落とした。
# speaker: gt_vinod
# voice: gt_agra_tour_back_awake_vinod_001
眠りましたか。……一つ、いいですか。お客さんは、たいてい皇帝のことを聞きます。何年住んだか、妃は何人いたか
# speaker: gt_vinod
でも、この人は、わたしの母のことを聞きました
# speaker: gt_vinod
レモンのことも、娘の字のことも、トラックの OK のことも。いつも、こうですか
* [Always. She notices what I miss. # option: notices_more # translation: いつもです。自分が見落とすものに、気づく人です。]
    # rel: affection +1
    # speaker: narrator
    # photo: gt_album_a064 # photo_caption: 眠ったふり # photo_with: gt_vinod
    目を閉じたまま、彼女の口元だけが、ゆっくり笑った。
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_tour_back_awake_001
    ……聞こえてるよ。本人のいる所で、そういうこと言う？
* [Only when she's having fun. # option: when_happy # translation: 楽しいときだけです。]
    # rel: spark +1
    # speaker: narrator
    # photo: gt_album_a064 # photo_caption: 眠ったふり # photo_with: gt_vinod
    目を閉じたまま、彼女が言った。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_back_awake_002
    楽しいときだけ？　じゃあ、今日は、ずっと楽しかったってことになるね
* [Ask her when she wakes up. # option: ask_when_awake # translation: 起きたら、本人に聞いてください。]
    # rel: trust +1
    # speaker: narrator
    # photo: gt_album_a064 # photo_caption: 眠ったふり # photo_with: gt_vinod
    すると、閉じていたはずの目が、片方だけ開いた。
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_agra_tour_back_awake_003
    起きてます。わたしが答えるね。ヴィノードさんの話のほうが、皇帝の話より、近くにあったからです
-
# speaker: narrator
ヴィノードが、声を出して笑った。
# speaker: gt_vinod
# voice: gt_agra_tour_back_awake_vinod_003
これは、母が喜びます。今日いちばんの土産話です
-> END

// 【ツアー・予約サイト】back の車の中の交流（語りの後、着く前）。後ろの夫婦が同じ向きに眠り、やっと二人で話す
=== gt_agra_tour_back_shared ===
# scene: encounter
# title: 同じ向きの寝顔
# at: tour gt_agra_tour_fatehpur_sikri back
# priority: after leg
# when: tour gt_agra_tour_fatehpur_sikri by web
# sources: none
# background: gt_bg_car_interior
# bgm: atlantean_twilight
# ambience: stop
# speaker: narrator
振り返ると、パドマとスンダルが、同じ向きに首を傾けて眠っていた。古い靴の入った箱が、二人の膝の間に挟まっている。
# speaker: heroine
# quiet: line
# voice: gt_agra_tour_back_shared_001
……寝ちゃった。二人とも、同じ方に傾いてる
# speaker: heroine
# voice: gt_agra_tour_back_shared_002
四十年も一緒にいると、寝る向きまで、そろうのかな
* [Or one of them gave in, a long time ago. # option: one_gave_in # translation: それか、どちらかが、ずっと前に折れたのかも。]
    # rel: trust +1
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_agra_tour_back_shared_003
    ふふ。サンダルのときみたいに？　どっちが折れたのかで、また四十年もめそう
* [I'd like to see that someday. # option: like_to_see # translation: いつか、そういうのを見てみたい。]
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,surprised,blush
    # voice: gt_agra_tour_back_shared_004
    見てみたい、って……四十年後を？　……誰の、とは聞かないでおくね
* [Shh. Let them sleep. # option: let_them_sleep # translation: しっ。寝かせておこう。]
    # rel: affection +1
    # speaker: narrator
    彼女は口を押さえてうなずき、座席に深く座り直した。それから、ほとんど声にならない声で言った。
    # speaker: heroine
    # quiet: line
    # stand: close
    # voice: gt_agra_tour_back_shared_005
    やっと、二人で話せたね。……小声だけど
-
# speaker: narrator
前の席で、ヴィノードが、ラジオの音を一つ下げた。
-> END

// 【ツアー】back の後（+1）：宿に戻った後。ヴィノードと別れ、帳場のサミールに迎えられる
=== gt_agra_tour_home ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri back
# priority: +1
# sources: none
# background: gt_bg_agra_fatehabad_road
# bgm: atlantean_twilight
# speaker: narrator
大通りで車を降りると、ヴィノードが運転席の窓を下ろした。
# speaker: gt_vinod
# voice: gt_agra_tour_home_vinod_001
次にシークリーへ来るときは、母の家に寄ってください。食べきれないほど、食べさせられますが
{ cond("tour gt_agra_tour_fatehpur_sikri by vinod_direct"):
    # speaker: heroine
    # emotion: smile
    # photo: gt_album_a065 # photo_caption: 白い車と、最後まで揺れるレモン # photo_with: gt_vinod
    # voice: gt_agra_tour_home_004
    お母さんと、同じことを言ってる。……はい。次は、戸口の中まで
- else:
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_tour_home_001
    # photo: gt_album_a065 # photo_caption: 白い車と、最後まで揺れるレモン # photo_with: gt_vinod
    次は、って言ってくれるんですね。はい。マトリーのお礼、お母さんに、自分で言いたいです
}
{ cond("tour gt_agra_tour_fatehpur_sikri by web"):
    # speaker: narrator
    後ろの窓の向こうで、パドマとスンダルが、そろって手を振っていた。
}
# speaker: narrator
# leave: gt_vinod
白い車は、大通りの流れに戻っていった。バックミラーの下のレモンと青唐辛子が、最後まで揺れていた。
# background: gt_bg_agra_hotel_hub
# speaker: narrator
宿の帳場では、サミールが帳面を開いて待っていた。
{ cond("tour gt_agra_tour_fatehpur_sikri by hotel_desk"):
    # speaker: gt_samir
    おかえりなさい。いかがでした？　ルクサーナは、ちゃんと泣かせましたか
    # speaker: heroine
    # voice: gt_agra_tour_home_005
    泣きそうには、なりました。でも、いちばん覚えてるのは、船の話です
- else:
    # speaker: gt_samir
    # voice: gt_agra_tour_home_samir_001
    おかえりなさい。いかがでした？　叔父がいなくて、お寂しくはなかったですか
    # speaker: heroine
    # voice: gt_agra_tour_home_002
    ガイドさんがいなくても、話してくれる人は、たくさんいました
}
# speaker: gt_samir
# voice: gt_agra_tour_home_samir_002
なるほど。お二人の思い出が、たくさん
# speaker: narrator
サミールは、また何かを書き足した。
# speaker: heroine
# reaction: heroine,exasperated,sigh
# voice: gt_agra_tour_home_003
# photo: gt_album_a066 # photo_caption: 誤解は、今度、まとめて # photo_with: gt_samir
……誤解は、今度、まとめて、ちゃんと解きます
-> END
