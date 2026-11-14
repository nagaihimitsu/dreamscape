INCLUDE modules.ink
-> DONE

// 宿の場所のファイル：到着とエピローグ（新しい書き方への形の移し替え。文は今のまま）

// 到着。cities/<都市>.json の arrivalStoryId がこの knot を指す。
// 【3】足した札：カムラの段ボールのメモを受け取る
=== gt_delhi_arrival ===
# scene: arrival
# person: gt_kamla
# on_done: item gt_delhi_kamla_memo
# background: gt_bg_delhi_hotel_alley
# speaker: narrator
宿は住宅街の路地にあった。隣の古い家から段ボールが次々に運び出され、路地の真ん中では、プラスチックの椅子に座った小柄な老婦人が、落花生を割りながら運び手たちに指図している。将軍みたいに。
# speaker: enemy
# cutin: name
カムラ、七十九歳。この家に六十年住んで、数日のうちに、ジャイプールの息子の家へ移る。
# speaker: narrator
# photo: gt_album_d01 # photo_caption: 路地の将軍カムラ
そこまでを三十秒で言い切ると、彼女は{heroine_name}のガイドブックを取り上げ、鼻を鳴らした。
# speaker: enemy
写真がきれいすぎる。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_arrival_001
わたしのガイドブック、初対面で不合格になった……
# speaker: narrator
# item_show: gt_delhi_kamla_memo
カムラは段ボールの切れ端に、ヒンディー語で五行書いた。一行ずつ、ぶっきらぼうに訳してくれる。
# speaker: enemy
# term: gt_term_nihari
わたしのデリー。赤い城、暗くなってから。クトゥブ・ミナール、鉄の柱、もう抱けない、腹立たしい。フマユーン廟、東の門から三本目の木陰。ジャーマー・マスジド、朝のニハーリー、階段の下の店。
# speaker: narrator
五行目だけは、場所の名前がなかった。
# speaker: enemy
月が水に落ちた所で、最後の買い物。
# speaker: narrator
意味を聞いても、返ってくるのは一言だけだ。
# speaker: enemy
説明したら、つまらない。
# speaker: enemy
出かけるときは、地下鉄の女性車両に乗る。運転手とは喧嘩になるからね。
# speaker: narrator
それから彼女は、{heroine_name}の後ろに立つこちらを顎で示した。
# speaker: enemy
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
夜更け、宿の部屋。アーグラ行きの荷造りは半分で止まり、{heroine_name}は段ボールの切れ端を眺めていた。五行のデリー。全部、行った。
# speaker: narrator
# se: door_knock
# shake: small
# term: gt_term_kulhad
戸を叩く音。アマンが、素焼きの小さなカップのチャイを三つ、器用に指に挟んで立っていた。
# speaker: enemy
さっきは、失礼なことを言いました。あなたたちが祖母を連れ出したと決めつけて
# speaker: heroine
# voice: gt_delhi_epilogue_001
いえ。……わたしも、アマンさんの立場だったら、同じことを言ったと思います
# speaker: enemy
祖母は、零時まで話しました。祖父が六十年前に何を言ったか。自分が何を言わなかったか
# speaker: narrator
家族の間では、二人は親の決めた縁談で結婚したことになっていた。本当は、城の暗がりで始まった話だった。
# speaker: enemy
僕の結婚は、親が紹介してくれた相手です。不満はない。でも、どう話せばいいか、まだ分からない
# speaker: enemy
祖母に言われました。どう出会ったかより、毎日ちゃんと言葉にしなさい、と。……六十年言わなかった人が、言うんですよ
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_delhi_epilogue_002
説得力、ありますね。経験者の言葉だもん
# speaker: narrator
# item_show: gt_delhi_aman_wedding_invitation
アマンはチャイを置き、折りたたんだ紙を差し出した。結婚式の案内。場所はジャイプールの旧市街。日付は、ちょうど二人がジャイプールにいるころだった。
# speaker: enemy
祖母が、あの生意気な娘を呼べと。……『来なくてもいい』とも言ってましたけど。たぶん、来いという意味です
# speaker: heroine
# emotion: serious
# voice: gt_delhi_epilogue_003
ありがとうございます。……行くかどうか、少しだけ考えさせてください。自分で決めたいので
# speaker: enemy
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
翌朝六時。車の窓が下り、カムラが顔を出した。見送りに来た二人を見ても、表情は変えない。
# speaker: narrator
アーグラでも、言いたいことは言いなさい。それだけ言って、窓は上がった。車が角を曲がるまで、後ろの窓の小さな手は、ずっと揺れていた。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_epilogue_009
……『来なくてもいい』って言った人が、一番長く手を振ってた
-> END
