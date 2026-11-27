// 【SNS の投稿のファイル】デリーの投稿（2026-11-27）。書き方は authoring/SNS_PLAN.md の「札（書き方）」と「文の書き方」。
// - knot が1つの投稿、その中の stitch（= 名前）が1件のコメント。コメントの最初の行がコメント、次の行からが返事。
// - デリーの常連（コメントする人）は4人：カムラ・ルーヒー・モヌ・クナール（自己紹介は progression/story.json の people の sns）。
// - ヒロインの投稿は5つ：到着・クトゥブ・ミナール・インド門・チャンドニー・チョーク・アグラセン・キ・バオリ。
//   出会った人の投稿は、モヌ（インド門。1回目の3択で写真が3通り）とクナール（階段井戸の動画）。
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
