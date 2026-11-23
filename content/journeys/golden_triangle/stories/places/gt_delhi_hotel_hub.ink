INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（2026-11-10 に新しい書き方へ形を移した）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
// 【3】足した札：カムラの段ボールのメモを受け取る
// 旅の最初の場面は、この前の空港の場面（gt_delhi_inserts.ink の gt_delhi_arrive_hands。ロゴの前）。
// 落花生の前振り（2026-11-23）：彼女が落花生を目で追う → カムラが一粒くれて「欲しいものは、欲しいと言いなさい」。
// 一粒は、目の前の落花生と、「旅の連れです！」と言ったばかりの連れの両方を指す。
=== gt_delhi_arrival ===
# scene: arrival
# person: gt_kamla
# on_done: item gt_delhi_kamla_memo
# background: gt_bg_delhi_hotel_alley
# speaker: narrator
デリーの宿は、住宅街の路地にあった。隣の古い家から、段ボールが次々に運び出されている。
# speaker: narrator
路地の真ん中で、ショールの小柄な老婦人が椅子に陣取り、落花生を割りながら運び手に指図している。将軍みたいに。
# speaker: enemy
# cutin: name
# voice: gt_delhi_arrival_kamla_001
カムラ、七十九歳。この家に六十年。夫のプラカーシュは先に逝った。数日のうちに、ジャイプールの息子の家へ移る。
# speaker: narrator
# photo: gt_album_d01 # photo_caption: 路地の将軍カムラ
そこまでを三十秒で言い切ると、彼女は{heroine_name}のガイドブックを取り上げ、鼻を鳴らした。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_002
写真がきれいすぎる。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_arrival_001
わたしのガイドブック、初対面で不合格になった……
# speaker: narrator
カムラは段ボールの切れ端に、ヒンディー語で五行書いた。ガイドブックの代わりだという。
# speaker: narrator
# item_show: gt_delhi_kamla_memo
一行ずつ、ぶっきらぼうに訳してくれる。{heroine_name}は慌てて、その訳を余白に書きとめていく。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_003
わたしのデリーの地図だよ。赤い城、暗くなってから。クトゥブ・ミナール、鉄の柱、もう抱けない、腹立たしい。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_004
# term: gt_term_humayun
フマユーン廟、東の門から三本目の木陰。ジャーマー・マスジド、朝のニハーリー、階段の下の店。
# speaker: narrator
五行目だけは、場所の名前がなかった。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_005
月が水に落ちた所で、最後の買い物。
# speaker: narrator
意味を聞いても、返ってくるのは一言だけだ。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_006
説明したら、つまらない。
# speaker: narrator
落花生の殻が、また小気味よく割れた。{heroine_name}の目が、ついその手もとを追う。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_007
出かけるなら、地下鉄にしなさい。わたしは女性車両。オートリキシャの運転手とは、値段で喧嘩になるからね。
# speaker: narrator
それから彼女は、{heroine_name}の後ろに立つこちらを顎で示した。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_008
あんたの連れ、さっきから黙ってるね。いい男は黙ってるもんだ。
{ ending_reached:
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_delhi_arrival_002
    こ、恋人です。……人に言うの、まだ慣れてなくて
- else:
    # speaker: heroine
    # reaction: heroine,surprised_big,blush
    # voice: gt_delhi_arrival_003
    た、旅の連れです！　……今の、通訳しないでくださいね
}
# speaker: narrator
カムラは笑わず、落花生を一粒、{heroine_name}の手のひらに載せた。
# speaker: enemy
# voice: gt_delhi_arrival_kamla_009
デリーは押しの強い町だよ。欲しいものは、欲しいと言いなさい。黙っていたら、誰も気づかない。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_arrival_004
……はい、覚えておきます。それにしても、地図というより暗号だね。せっかくなら全部回って、解いてみたいな。……ね、一緒に解いてくれる？
-> END

// エピローグ。progression/journey.json のフィナーレの epilogueStoryId がこの knot を指す。
// 【3】足した札：アマンの結婚式の案内を受け取る
=== gt_delhi_epilogue ===
# scene: epilogue
# person: gt_aman
# on_done: item gt_delhi_aman_wedding_invitation
# background: gt_bg_delhi_hotel_room
# tint: off
# speaker: narrator
# item_out: gt_delhi_kamla_memo
夜更け、宿の部屋。アーグラ行きの荷造りは半分で止まり、{heroine_name}は段ボールの切れ端を眺めていた。五行のデリー。全部、行った。
# speaker: narrator
# se: door_knock
# term: gt_term_kulhad
戸を叩く音。アマンが、素焼きの小さなカップのチャイを三つ、器用に指に挟んで立っていた。
# speaker: enemy
# voice: gt_delhi_epilogue_aman_001
さっきは、失礼なことを言いました。あなたたちが祖母を連れ出したと決めつけて
# speaker: heroine
# voice: gt_delhi_epilogue_001
いえ。……わたしも、アマンさんの立場だったら、同じことを言ったと思います
# speaker: narrator
アマンはチャイを一つずつ、二人の手に渡した。器が、まだ熱い。
# speaker: enemy
# voice: gt_delhi_epilogue_aman_002
祖母は、零時まで話しました。祖父が六十年前に何を言ったか。自分が何を言わなかったか
# speaker: enemy
# voice: gt_delhi_epilogue_aman_003
あの一覧の注釈は、祖父との思い出だそうです。鉄の柱も、三本目の木陰も、階段の下のニハーリーも
# speaker: narrator
家族の間では、二人は親の決めた縁談で結婚したことになっていた。本当は、城の暗がりで始まった話だった。
# speaker: enemy
# voice: gt_delhi_epilogue_aman_004
僕の結婚は、親が紹介してくれた相手です。不満はない。でも、どう話せばいいか、まだ分からない
# speaker: enemy
# voice: gt_delhi_epilogue_aman_005
祖母に言われました。どう出会ったかより、毎日ちゃんと言葉にしなさい、と。……六十年言わなかった人が、言うんですよ
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_delhi_epilogue_002
説得力、ありますね。経験者の言葉だもん
# speaker: narrator
# item_show: gt_delhi_aman_wedding_invitation
アマンはチャイを置き、折りたたんだ紙を差し出した。結婚式の案内。場所はジャイプールの旧市街。日付は、ちょうど二人がジャイプールにいるころだった。
# speaker: enemy
# voice: gt_delhi_epilogue_aman_006
祖母が、あの生意気な娘を呼べと。……『来なくてもいい』とも言ってましたけど。たぶん、来いという意味です
# speaker: heroine
# emotion: serious
# voice: gt_delhi_epilogue_003
ありがとうございます。……行くかどうか、少しだけ考えさせてください。自分で決めたいので
# speaker: enemy
# voice: gt_delhi_epilogue_aman_007
祖母が喜びそうな返事だ
# speaker: narrator
# quiet: scene
# leave: gt_aman
アマンが帰ったあと、{heroine_name}はチャイの最後の一口を飲み干し、窓の外を見た。路地のトラックは、もう全部積み終わっている。
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_epilogue_004
    ねえ。わたし、言いたいことは、言いたいときに言うね。六十年後じゃなくて
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_delhi_epilogue_005
    ……今も、一つ言いたいけど。それは明日、起きてからにする
- romance_stage >= 3:
    # speaker: heroine
    # voice: gt_delhi_epilogue_006
    六十年って、長いね。……わたしは、そんなに待たせたくないな。誰を、とは言わないけど
- romance_stage == 2:
    # speaker: heroine
    # voice: gt_delhi_epilogue_007
    言いそびれたことって、あとから重くなるんだね。わたしも、今日のうちに一つ言っておく。……付き合ってくれて、ありがとう
- else:
    # speaker: heroine
    # voice: gt_delhi_epilogue_008
    旅の連れに言うことじゃないかもしれないけど。今日、一人じゃなくてよかった
}
# background: gt_bg_delhi_hotel_alley
# speaker: narrator
翌朝六時、路地。宿の主人と、娘のルーヒーも、眠そうな顔で出てきている。
# speaker: narrator
車の窓が下り、カムラが顔を出した。見送りに来た{heroine_name}たちを見ても、表情は変えない。
# speaker: gt_kamla
# voice: gt_delhi_epilogue_kamla_001
アーグラでも、言いたいことは言いなさい
# speaker: narrator
# leave: gt_kamla
それだけ言って、窓は上がった。車が角を曲がるまで、後ろの窓の小さな手は、ずっと揺れていた。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_epilogue_009
……『来なくてもいい』って言った人が、一番長く手を振ってた
-> END
