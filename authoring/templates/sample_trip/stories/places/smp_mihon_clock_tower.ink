// 【場所のファイル】見本の時計塔（stories/places/<接頭辞>_<都市ID>_<場所>.ink）。見本の街・人物・言い伝えはすべて架空。
// - この1本に、時計塔で起きる場面を全部書く。knot の名前＝場面のID（保存に入る）。knot の行のすぐ下の札（頭の札）で、
//   種類（# scene:）と、差し込みの場面なら時点（# at:）と順番（# priority:）を決める。
// - 1行目は INCLUDE modules.ink（ゲームが用意する呼び口と変数。VAR はここに書かない）、次の行は -> DONE。
//   Inky で1つの場面を見るときは、-> DONE を -> 見たい knot の名前 に一時的に変え、modules.ink の写しを隣に置く。
// - 本筋（案内・バトル・都市フィナーレ・デート）は、カタログ（tourism/catalog.json の guideStoryId、battles・date_catalog の storyId）が
//   「places/smp_mihon_clock_tower.<knot>」の住所で指す。本筋の knot には # at:・# priority:・# repeat: を書かない。
//   フィナーレは会場の地点の場所のファイルに、エピローグは宿の場所のファイル（places/smp_mihon_hotel.ink）に書く。
// - 効果は選択肢のすぐ次の行の札（# give:・# rel:・# set:・# ap: など）と、頭の # on_done: にだけ書く。
//   効果のある選択肢には [ ] の中に # option: <ID> を付ける。ゲームが効果を当ててから、選んだ後の文へ進む。
// - 本筋の順は既定（案内 → 観察 → バトル）。条件の書き方と札の一覧は docs/02 の「場面の時点と順番」。
// - 観光地の訪問のほか、デート・エピローグ・移動・宿の時点の場面も書ける（段階4。# at: date・epilogue・trip・hotel など）。
//   都市の終わり（フィナーレの前後と、エピローグを始める時）は places/smp_mihon_city_end.ink。
// - 差し込みの場面（道中交流・会話）には、本番の旅行編では出典（scenes/catalog.json の sources）か # sources: none（本当の土地の
//   事実を言わない場面の印）を必ず書く。見本の街は架空なので、どれも # sources: none。
INCLUDE modules.ink
-> DONE

// ───── -1：着いてすぐ、本筋の前。しおりの露店（道中交流）。完了すると、三時のしおりを受け取る。
// # at: place は、この場所の観光地・デート・フィナーレのどの時点でも（段階4）。「また今度」を選ぶと、
// 時計塔広場のデートやフィナーレの前に、もう一度出る（完了するまで）。
// 行の札の例：しおりを手のひらにのせる行の # item_show:（その行のあいだ、品物の絵と名前を画面の真ん中に見せる。
// 見せるだけで、品物はこの場面の終わりの # on_done: で手に入る）。
=== smp_mihon_bookmark_stall ===
# scene: encounter
# title: 三時のしおりの露店
# at: place mihon_clock_tower
# priority: -1
# person: smp_mihon_lili
# on_done: item smp_mihon_three_bookmark
# sources: none
# background: smp_bg_mihon_clock_tower
# speaker: narrator
時計塔の下で、小さな女の子が布の上に手描きのしおりを並べている。どれも、針が三時を指していた。
# speaker: smp_mihon_lili
# cutin: name
リリっていうの。トーマの妹。一枚ずつ、おまけでどうぞ
* [Could I have one, please? # option: ask # translation: 一枚もらえますか。]
    # speaker: narrator
    # item_show: smp_mihon_three_bookmark
    リリはいちばん針のまっすぐな一枚を選んで、こちらの手のひらにのせた。
    # speaker: heroine
    # emotion: smile
    いちばんまっすぐなのを選んでくれたね。わたしが描いたら、絶対曲がる
    -> END
* [Did you draw these yourself? # option: drawn # translation: これ、自分で描いたの？]
    # set: smp_mihon_lili_told_why
    # speaker: smp_mihon_lili
    うん。兄ちゃんが直す前に、止まった時計を残しておきたくて
    # speaker: narrator
    リリは一枚を差し出した。
    # speaker: heroine
    残しておきたい、か。……その気持ち、わかる気がする
    -> END
* [Maybe next time. # option: later # translation: また今度にします。]
    # later
    # speaker: narrator
    リリは怒らずに、しおりを一枚だけ取り分けた。
    # speaker: smp_mihon_lili
    来られるときに、ね
    # speaker: heroine
    この街の子だね。言い方が、もう三時
    -> END

// ───── 0：案内（本筋。tourism/catalog.json の guideStoryId がこの住所を指す）。# effect は置かない。
// 行の札 # local_word: smp_mihon_word_trisol は、その行が出たときにその国の言葉を1つ覚える（下の扉の文字の行。learning/local-words.json の語で、英語ノートの「その国の言葉」に並ぶ）。
// 行の札 # em_shake: <語> は、その行の最初の<語>を小さく震わせる（ヒロインの「三時？」）。# em: <語> は、その行の最初の<語>を
// 太字と強調の色で見せる（「止まってる」）。語は、その行の字に書いたとおりに書く（名前は {heroine_name} のまま）。
=== smp_mihon_clock_tower_guide ===
# scene: guide
# background: smp_bg_mihon_clock_tower
# speaker: narrator
広場の真ん中に、見本の街の時計塔が立っている。文字盤の針は三時を指していた。
# speaker: heroine
# reaction: heroine,surprised,question
# em_shake: 三時？
あれ、三時？　宿を出たの、朝だったよね
# speaker: narrator
{heroine_name}は自分の時計と文字盤を見比べた。塔の針は、少しも動かない。
# speaker: heroine
# em: 止まってる
止まってるんだ。でも塔の下はきれいに掃いてある。放っておかれてる感じじゃないね
# speaker: narrator
# local_word: smp_mihon_word_trisol
扉の上の石に「Trisól（トリソル）」と彫ってある。見本の街の古い言葉で「三時に会おう」という意味だと、案内板にあった。
# speaker: narrator
塔の扉の前で、作業着の青年が油差しを手に、文字盤を見上げている。
# speaker: heroine
# emotion: smile
直さないのか、直せないのか。……わたし、ちょっと聞いてみたい
// 案内にも選択肢を書ける（段階3a）。「閉じる」（とばす）は、次の選択肢の前で止まる。読み直しでは効果を当てない。
* [「まず、塔のまわりを見てみよう」 # option: look_around]
    # speaker: heroine
    うん。文字盤の針、近くで見るともっと不思議かも
* [「あの人に、声をかけてみようか」 # option: ask_keeper]
    # speaker: heroine
    いきなりは緊張するね。……でも、聞いてみたい
-
-> END

// ───── after observe：観察で「進む」を押すと始まり、終わると観察に戻る（会話）。トーマが近道を教えてくれる（AP を得る例）。
=== smp_mihon_clock_gears ===
# scene: talk
# at: visit mihon_clock_tower
# priority: after observe
# person: smp_mihon_toma
# on_done: ap +1
# sources: none
# speaker: heroine
見て、あの歯車。止まってるのに、油でぴかぴかだ
# speaker: narrator
油差しを持った青年が、こちらに気づいて会釈した。
# speaker: smp_mihon_clock_keeper
話なら、上より広場のほうが落ち着きますよ。裏の階段が近道です
# speaker: heroine
近道、教えてもらっちゃった。……ちょっと得した気分
-> END

// ───── 0：バトル（本筋。battles/catalog.json の storyId がこの住所を指す）。1本の流れ（段階5）：頭の札の後に台詞を書き、
// -> quiz(1) -> 〜 -> quiz(3) -> でクイズの画面を出す。戻ると quiz_correct（その問いの正誤）と battle_score（そこまでの正解数）が入る。
// 呼び口の後の最初の行は、場面の始まりと同じく話し手と背景を書き直す。-> END の後に結果の画面。
// 行の札 # pause: 600 は、その行の字が出る前に0.6秒の間を置く（タップで飛ばせる。下のヒロインの問いかけの前）。
// 行の札 # voice: <ID> は、その行の字が出始めるときに public/assets/voice/<ID>.mp3 を流す（見本の編には声のファイルがないので、書き方の例だけ）。
// 行の札 # se: <ID> は、その行の字が出始めるときに効果音を鳴らす（例：時計の鐘なら # se: old_bell。共通の音か、その旅行編の presentation/sounds.json の音）。
// 名乗る前の行は呼び名の人物（progression/story.json の smp_mihon_clock_keeper「青年」）で話し、名乗った後の最初の行に # cutin: name を書く
// （相手の名札：battles/catalog.json の enemyTitleJa と enemyNameJa）。
=== smp_mihon_main_clock_tower ===
# scene: battle
# background: smp_bg_mihon_clock_tower
# speaker: smp_mihon_clock_keeper
旅の人？　三時ですよ。……そう言うと、みんな自分の時計を見て笑うんです
# speaker: narrator
青年はトーマと名乗った。塔の時計番で、毎朝、動かない歯車に油を差しているという。
# speaker: enemy
# cutin: name
今年こそ直します。止まった時計の番人なんて、仕事をしていないのと同じですから
# speaker: heroine
# pause: 600
直す前に、止まった理由を聞いてもいいですか
# speaker: enemy
古いから止まった。それだけ……のはずです。じゃあ、街の言い伝えで確かめましょうか
-> quiz(1) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    直さずに、三時のまま残した。……修理代がなかったんだと思ってました
- else:
    # speaker: enemy
    言い伝えでは、街の人は新しい塔も建てず、三時のまま残したそうです
}
# speaker: heroine
お金の話なら、言い伝えにまではならない気がする。三時に何か意味があったのかな
-> quiz(2) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    『来られるときに来て』……祖母の口癖でした。時刻のことじゃなかったのか
- else:
    # speaker: enemy
    この街の『三時に会おう』は、『来られるときに来て』なんです。ぼくも今、つながりました
}
# speaker: heroine
# reaction: heroine,smile,sparkle
いつ来ても三時なら、待ち合わせに遅刻がないね
-> quiz(3) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    戻ってきた人のための鐘。……毎朝の油差しは、そのためだったんですね
- else:
    # speaker: enemy
    鐘は時刻じゃなく、街に戻ってきた人がいるときに手で鳴らすんです。毎朝の油差しは、そのためでした
}
{
- battle_score == 3:
    # speaker: enemy
    全部、街の人の約束の話だった。直すかどうか、ぼく一人で決めることじゃないですね
    # speaker: heroine
    うん。でも、毎朝油を差してたのは、ちゃんと仕事だったと思う
- battle_score == 2:
    # speaker: enemy
    一つ外れても、言い伝えの形は見えました。町長にも話してみます
- else:
    # speaker: enemy
    ぼくも知らないことばかりでした。祖母の話を、もう一度思い出してみます
    # speaker: heroine
    わたしも。来られるときに、また聞かせてください
}
-> END

// ───── 都市フィナーレ（本筋。battles/catalog.json の scope: "city_finale" の storyId がこの住所を指す）：都市の最後の対決。英語3択5問。
// フィナーレの会場（travel/mihon.json の smp_mihon_finale の地点）が時計塔なので、時計塔の場所のファイルに書く。knot の名前はバトルID。
// - 1本の流れ（段階5）：上から流れ、-> quiz(1) -> 〜 -> quiz(5) -> でクイズの画面を出す。戻ると quiz_correct（その問いの正誤）と
//   battle_score（そこまでの正解数、0〜5）が入る。最後の -> END の後に結果の画面。
// - 呼び口の後の最初の行は、場面の始まりと同じく話し手と背景を書き直す（ゲームは呼び口の後を新しい場面として出す）。
// - quiz_correct と battle_score のどの組合せでも日本語の台詞が出るようにする。
// - 勝ち負けで相手を改心させて終える定型にせず、相手にも筋の通った願いを持たせる。
// - 行の札 # cutin: name は、その行の話し手の名札（役どころと名前）を少しのあいだ場面の上に出す。名前が初めて出る行に書く。
=== smp_mihon_finale_battle ===
# scene: battle
# background: smp_bg_mihon_clock_tower
# speaker: narrator
夕方の広場で、町長のハンナが図面を広げていた。新しい歯車の絵に、赤い丸がついている。
# speaker: enemy
# cutin: name
来月、時計を動かします。旅の人に『時間にいいかげんな街』と言われるのは、もう嫌なの
# speaker: heroine
動かしたら、三時の約束はどうなるんですか
# speaker: enemy
約束？　時計番から聞いたのね。いいわ、この街のことをどれだけ知ったか、聞かせて
-> quiz(1) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    止まった時刻が約束になった。祖父の代の話ね。でも、今の旅人には伝わらないわ
- else:
    # speaker: enemy
    昔の人は、止まった三時を約束の言葉にしたの。ただ、今の旅人には伝わらない
}
-> quiz(2) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    そう、壊れていると思われる。わたしが困っているのは、そこなのよ
- else:
    # speaker: enemy
    旅の人はまず、壊れていると思うの。わたしが困っているのは、そこ
}
# speaker: heroine
壊れてると思われるのが嫌なら、止まってる理由を伝える方法もありそうですね
-> quiz(3) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    待つ人が文字盤を見られるように。……ベンチの向きまで、考えたことがなかった
- else:
    # speaker: enemy
    ベンチは、待っている人が文字盤を見られるように塔を向いているの。今朝、わたしも座ってみたわ
}
-> quiz(4) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    戻ってきた人のための鐘。時計を動かしたら、あの子の仕事はどうなるのかしら
- else:
    # speaker: enemy
    鐘は、戻ってきた人がいるときに手で鳴らすの。トーマが毎朝油を差しているのは、そのためね
}
# speaker: heroine
動かすか残すか、街の人にも聞いてみませんか。トーマさんも、話したそうでした
-> quiz(5) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    『三時に会おう』。……子どもの頃、わたしもそう言って友達を呼んでいたわ
- else:
    # speaker: enemy
    この街では『三時に会おう』と誘うの。子どもの頃、わたしもそう言っていたわ
}
{
- battle_score == 5:
    # speaker: enemy
    図面はしまうわ。代わりに塔の下へ、言い伝えの札を立てる。旅の人が読めるように
    # speaker: heroine
    札の最後に、『来られるときに来て』って書いてほしいな
- battle_score >= 3:
    # speaker: enemy
    すぐには決めない。まず札を立てて、街の人の声を聞いてからにする
- else:
    # speaker: enemy
    わたしにも、知らないことが多かったわ。決めるのは、もう少し話を聞いてから
}
# speaker: narrator
ハンナが図面を丸めると、塔の上でトーマが小さく手を振った。
# speaker: smp_mihon_toma
鐘の音、上まで届きましたよ。また鳴らしに来てください
-> END

// ───── +1：本筋の後。しおりを持っているときだけ（道中交流）。対決の結果で「自由時間へ」を押すと始まる。
// 渡す2つの選択肢は # give:（品物を持っていないと隠れる。ここでは頭の # when: が持っていることを保証する）。
=== smp_mihon_bookmark_gift ===
# scene: encounter
# title: しおりを渡す
# at: visit mihon_clock_tower
# priority: +1
# when: item smp_mihon_three_bookmark held
# sources: none
# background: smp_bg_mihon_clock_tower
# speaker: narrator
時計塔を見上げる{heroine_name}の横で、ポケットの中の三時のしおりに指が触れた。
* [This is for you. # option: give # translation: これ、あなたに。]
    # give: smp_mihon_three_bookmark heroine
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    え、いいの？　……ありがとう。旅の日記に挟んでおくね
    -> END
* [Shall we keep it in your guidebook? # option: guidebook # translation: あなたのガイドブックに挟もうか。]
    # give: smp_mihon_three_bookmark heroine
    # speaker: heroine
    # emotion: happy
    いいね。三時のページに挟もう。……あ、この本、三時のページなんてないや
    -> END
* [I'll keep the bookmark a little longer. # option: later # translation: しおりは、もう少し持っておきます。]
    # later
    # speaker: heroine
    うん、持ってて。リリちゃんが選んでくれた一枚だもんね
    -> END

// ───── +2：この場所の後日談（会話）。鐘の銘は英語のまま見せ、訳はヒロインの台詞で言う。
// 「鐘楼に上がらせてもらう」は AP を使い、ときめき（spark）が上がる。もう1つの選択肢は何も要らない（AP が0でも選べる）。
// 行の札の例：鐘が鳴る行の # shake: window（会話の窓が1回揺れる）と # shake: small（場面の絵と人物が1回小さく揺れる）、
// 鐘の銘の行の # size: large（その行の字が大きく出る）。
=== smp_mihon_clock_bell ===
# scene: talk
# at: visit mihon_clock_tower
# priority: +2
# person: smp_mihon_toma
# sources: none
# speaker: narrator
# shake: window
# shake: small
帰りぎわ、塔の鐘がひとつ鳴った。トーマが綱から手を離し、こちらに笑ってみせる。
{ cond("condition smp_mihon_lili_heard"):
    # speaker: heroine
    リリちゃん、止まった時計を残しておきたいって言ってた。この鐘も、きっと同じだね
}
# speaker: narrator
鐘の縁に、外国の文字が彫ってある。昔、この街に残った旅の人が刻んだものだという。
# speaker: narrator
# size: large
Come back at three. Any three will do.
# speaker: heroine
『三時に戻っておいで。どの三時でもいいから』……だって。この街の『三時に会おう』って、ここから来たのかな
* [鐘楼に上がらせてもらう # option: climb]
    # ap: -1
    # rel: spark +1
    # speaker: heroine
    うわ、街じゅうの時計が見える。……どれも三時だね。並んで見ると、ちょっと可笑しい
* [下から見上げておく # option: stay_below]
    # speaker: heroine
    まだ帰ってないのに、おかえりって言われたみたい
-
-> END

// ───── デートの時点の -1（段階4）：デートの前、昼だけ。行き先の小話（ベンチの向き）を先に言わず、デートに渡す。
// 3つ目の選択肢は、お金を得る例（# money: +20）。
=== smp_mihon_date_bench_painter ===
# scene: encounter
# title: ベンチを塗る人
# at: date smp_mihon_date_tower_square
# priority: -1
# when: time day
# sources: none
# background: smp_bg_mihon_clock_tower
# speaker: narrator
広場のベンチの一つに「ぬりたて」の札が下がっている。刷毛を持った男の人が、こちらに気づいて手を止めた。
# speaker: smp_mihon_bench_painter
すみませんね。塔のほうを向いたベンチは、毎年この時期に塗り直すんです
* [Which bench is dry? # option: dry # translation: どのベンチなら乾いていますか。]
    # speaker: smp_mihon_bench_painter
    端の一つだけ。……三時を待つ人の席は、いつも空けておくんですよ
    -> END
* [Why do they all face the tower? # option: why # translation: どうしてみんな塔を向いているんですか。]
    # speaker: smp_mihon_bench_painter
    それは、座ってみれば分かります
    # speaker: heroine
    座ってみれば、か。じゃあ、確かめてみよう
    -> END
* [Can I help you paint? # option: help # translation: 塗るのを手伝いましょうか。]
    # money: +20
    # speaker: smp_mihon_bench_painter
    助かります。端の一本だけ、お願いできますか
    # speaker: narrator
    塗り終えると、男の人は小さな硬貨を二枚くれた。
    # speaker: heroine
    手間賃だって。……三時のお茶代くらいには、なるかな
    -> END

// ───── デート（本筋。romance/date_catalog.json の storyId がこの住所を指す）。地図に出る条件は頭の # when:。
// 頭の # hint: は、# when: がかなうまで自由時間の札の列に鍵のかかった灰色の札として出す一言（書いた言葉だけが出る。任意）。
// デートの3択（噛み合いの選択）は、このデートの knot の中（stitch を含む）に置き、# option: と # profile: で書く。
// 手伝いの knot（頭の札なし）の中の選択は「場面の中の選択」：乱数を使わず、札の効果だけが当たる。
// 行の札 # stand: は、ヒロインの立ち位置（apart 少し離れて・near いつもの位置・close すぐそば）。次の # stand: まで続く。
// ここでは、ベンチの端に座る最初の行が apart、お茶の後の誘いが close、立ち上がる行が near。
// 行の札 # weather: petals は、その行から場面の終わりまで、絵の上に花びらを散らす（場面の頭に書けば最初から。見せ方だけ）。
=== smp_mihon_date_tower_square ===
# scene: date
# when: episodes mihon >= 1
# hint: 時計塔の番人と話したあとで
# background: smp_bg_mihon_clock_tower
# weather: petals
# speaker: narrator
# stand: apart
時計塔の広場では、ベンチがどれも塔の方を向いている。{heroine_name}は一つを選んで、端に座った。
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    ここのベンチ、待つ人が文字盤を見られる向きなんだって。……隣、どうぞ
- else:
    # speaker: heroine
    # emotion: teasing
    ここ、空いてます。三時までの席だけど、いい？
}
{ cond("item smp_mihon_three_bookmark held"): -> smp_mihon_date_bookmark_aside -> }
* [「三時になるまで、ここで待とう」 # option: first_wait]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        あの時計、ずっと三時だよ。……待つなら、何か話して
    - else:
        # speaker: heroine
        # emotion: smile
        うん。急がなくていい待ち合わせって、ちょっといいね
    }
    -> tea
* [「もう三時は過ぎてるって、言ってもいい？」 # option: first_tease]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        それ、トーマさんの前で言ったら落ち込んじゃうよ
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        だめ。この広場では、ずっと三時。言い伝え、聞いたでしょ？
    }
    -> tea
* [「時計より、隣で話す方が気になる」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        そう？　わたしは、あの止まった針もけっこう気に入ってるんだけどな
    - else:
        # speaker: heroine
        # emotion: shy
        ……そういうこと、さらっと言うんだ。じゃあ、ちゃんと隣にいてね
    }
    -> tea
= tea
# speaker: narrator
広場の店からお茶が運ばれてきた。この街では、いつ頼んでも「三時のお茶」と呼ぶらしい。
# speaker: heroine
# stand: close
ねえ、わたしたちも『三時に会おう』って使ってみない？　来られるときに来て、って意味で
* [「じゃあ、次の三時もここで」 # option: second_next]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        もう次の話？　……今日の三時が、まだ終わってないよ
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        ……うん。約束ね。来られるときじゃなくて、ちゃんと来て
    }
    -> ending
* [「時刻を決めない約束は、少し不安かも」 # option: second_uneasy]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        そっか。……わたしだけ、楽しくなってたかな
    - else:
        # speaker: heroine
        # emotion: serious
        言ってくれてよかった。じゃあ、来られないときは、来られないって言おう。それも約束
    }
    -> ending
* [「来られるとき、と言いながら毎日呼びそう」 # option: second_every_day]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        毎日は……わたしにも予定があるよ？
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        ふふ、毎日三時。それ、ちょっと楽しそう
    }
    -> ending
= ending
// 写真の札：この行を読むと、時計塔の絵がアルバムに1枚入る（同じ絵は一度だけ）。絵は public/assets/album/smp_album_clock_tower.webp で、
// ファイル名（拡張子を除く）がID。登録も出典も要らない。説明の札 # photo_caption: は同じ行に書く。
# speaker: narrator
# photo: smp_album_clock_tower # photo_caption: 三時までの席。お茶のあとも、針は三時のまま
# stand: near
お茶を飲み終えても、針は三時のままだった。{heroine_name}は立ち上がり、文字盤を見上げる。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: happy
    次は、わたしから誘うね。三時に、って
- else:
    # speaker: heroine
    # emotion: smile
    止まった時計なのに、今日は時間が早かったな
}
-> END

// 手伝いの knot（頭の札なし。デートからだけ呼ぶ）。しおりをまだ持っているときの「場面の中の選択」。
=== smp_mihon_date_bookmark_aside ===
# speaker: heroine
# reaction: heroine,surprised,exclamation
あれ、そのしおり……リリちゃんの？　まだ持ってたんだ
* [「よかったら、どうぞ」 # option: give_bookmark]
    # give: smp_mihon_three_bookmark heroine
    # rel: affection +1
    # set: smp_mihon_bookmark_to_heroine
    # speaker: heroine
    ありがとう。……旅の日記に挟んでおくね
* [「これは、もう少し持っていたい」 # option: keep_bookmark]
    # rel: trust +1
    # set: smp_mihon_bookmark_kept
    # speaker: heroine
    うん、それがいいよ。リリちゃんが、あなたに選んでくれたんだもん
- ->->

// ───── エピローグの時点の -2（段階4）：デートで「もう少し持っていたい」と答え、まだしおりを持っているときだけ。
// 都市のエピローグの前なので、品物はまだ渡せる（統一イベント設計 3.5 の「街を出る前の砂時計」を、見本のしおりで書いたもの）。
=== smp_mihon_bookmark_before_leaving ===
# scene: talk
# title: 街を出る前のしおり
# at: epilogue mihon
# priority: -2
# when: flag smp_mihon_bookmark_kept
# when: item smp_mihon_three_bookmark held
# sources: none
# background: smp_bg_mihon_hotel
# speaker: narrator
街を出る支度をしていると、鞄の中で、三時のしおりの角が指に触れた。
* [しおりを差し出す # option: give_before_leaving]
    # give: smp_mihon_three_bookmark heroine
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    ……え、今？　あのとき、持っていたいって言ってたのに
    # speaker: heroine
    # emotion: shy
    じゃあ、この街の三時は、わたしが預かっておくね。……ずるいなあ、こういうの
* [そのまま鞄にしまっておく # option: keep_before_leaving]
    # speaker: heroine
    なに、その顔。……いいよ。それ、あなたの旅の荷物なんだね
-
-> END

// ───── エピローグの時点の -1（段階4）：露店でしおりをもらった人に、リリが見送りに来る（あなたの「+2 エピローグ」の、もう1つの読み方）。
=== smp_mihon_lili_seeoff ===
# scene: talk
# title: リリの見送り
# at: epilogue mihon
# priority: -1
# when: done smp_mihon_bookmark_stall
# person: smp_mihon_lili
# sources: none
# background: smp_bg_mihon_hotel
# speaker: narrator
宿の前に出ると、リリが駆けてきた。手に、色を塗っていないしおりを一枚持っている。
// 人物の名札：progression/story.json の titleJa（役どころ）と nameJa。話し手の名前がこの行で初めて札に出る。
# speaker: smp_mihon_lili
# cutin: name
これ、針を描いてないの。次に来るときの時間を、自分で描いてね
// 行の札 # letter: note は、その行を紙のメモに書いて見せる（話し手の札は出ない）。同じ種類の行を続けると1枚に積み重なる。
# speaker: narrator
しおりの裏に、鉛筆の字が三行ならんでいた。
# letter: note
つぎに　くるときは
# letter: note
はりを　じぶんで　かいてね
# letter: note
リリより
# speaker: heroine
# emotion: smile
何時にしようかな。……三時じゃなかったら、怒られちゃう？
# speaker: narrator
リリは少し考えてから、首を横に振った。
# speaker: smp_mihon_lili
来られるときの時間で、いいよ
-> END

// ───── 移動の時点の -1（段階4）：宿から初めて貸し自転車で出るとき、宿で（動く前に流れる。乗った回数は、動いたときに増える）。
// 運賃は出発の操作で払ってあるので、このお金で移動が断られることはない（減らす選択肢は、使えるお金に収まるときだけ選べる）。
// from で宿から出る移動だけにした（「休む」で宿へ帰る道では出ない）。借りた後に歩いてほかの場所へ行き、そこから初めて乗ると、
// 乗った回数が1になるので、この場面はもう出ない（一度だけの例。どこから乗っても最初の1回に出したいときは from を書かない）。
=== smp_mihon_first_bicycle ===
# scene: talk
# title: 貸し自転車のサドル
# at: trip rental_bicycle from mihon_hotel
# priority: -1
# when: not rides rental_bicycle >= 1
# sources: none
# speaker: heroine
サドル、高くない？　この街、坂が少ないから、低めでも大丈夫そう
* [「直してもらおうか」 # option: fix_saddle]
    # money: -50
    # speaker: narrator
    貸し出しの人が、手早くサドルを下げてくれた。
* [「このままで行こう」 # option: as_is]
    # speaker: heroine
    ……ちょっと高いけど、景色はよく見えるね
-
-> END

// ───── 宿の時点の -1（段階4）：眠る前（「休む」は昼でも選べる）。鐘を聞いた後の、最初の宿で（一度だけ）。
// 夜だけにしたいときは # when: time night（21時に休むときも夜。時刻は宿に着いた時刻で読む）。
// 行の札 # quiet: scene を頭に書くと、場面の最初の行から終わりまで静かな場面になる（上の帯が隠れ、字が少しゆっくり、背景が落ち着く）。
// 行の札 # ambience: amb_night_insects は、その行から場面の終わりまで、BGMの下に共通の環境音（夜の虫の声）を小さく流す。
=== smp_mihon_hotel_bell_night ===
# scene: talk
# at: hotel mihon_hotel
# priority: -1
# when: done smp_mihon_clock_bell
# sources: none
# background: smp_bg_mihon_hotel
# quiet: scene
# ambience: amb_night_insects
# speaker: heroine
窓を開けると、まだ鐘の音が残ってる気がする。……今日、来てよかった
-> END

// ───── 宿の時点の +1（段階4）：起きた後。予約したツアーが始まる前。
// 行の札 # phone: は、スマホのメッセージ（received は左に話し手の名前つき、sent は右で主人公）。続けて書いた行は同じ画面に積み重なり、
// # phone: のない行で終わる。
=== smp_mihon_hotel_morning ===
# scene: talk
# at: hotel mihon_hotel
# priority: +1
# when: not visited mihon_clock_tower
# sources: none
# background: smp_bg_mihon_hotel
# speaker: heroine
# phone: received
起きてる？　窓の外、見て。
# speaker: player
# phone: sent
起きてるよ。今、カーテンを開ける。
# speaker: narrator
すぐに、廊下で扉の開く音がした。
# speaker: heroine
おはよう。窓から時計塔が見えるよ。……今日も三時。行ってみない？
-> END
