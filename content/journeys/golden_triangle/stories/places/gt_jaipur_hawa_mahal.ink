INCLUDE modules.ink
-> DONE

// ハワー・マハルの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）と都市フィナーレは、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_jaipur_hawa_mahal_guide ===
# scene: guide
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
旧市街の大通りは、車とリキシャと牛と人で、隙間なく埋まっていた。その上に、桃色の壁が、小さな窓をびっしりと並べて立ち上がっている。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# voice: gt_jaipur_hawa_mahal_guide_001
# photo: gt_album_j022 # photo_caption: 窓でできた壁
窓、窓、窓……！　建物というより、窓でできた壁みたい
# speaker: narrator
# term: gt_term_jharokha
小窓の一つひとつに、細かな格子がはまっている。張り出した出窓が、上へ行くほど少しずつ細くなり、とがった屋根へ集まっていく。
# speaker: heroine
# voice: gt_jaipur_hawa_mahal_guide_002
全部の窓から、誰かがこっちを見てたらって考えると……ちょっと、どきっとするね
# speaker: narrator
# se: car_horn
正面から写真を撮ろうと、{heroine_name}は道の反対側へ渡った。クラクションが三回鳴り、牛が一頭、悠然と前を横切る。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_hawa_mahal_guide_003
# photo: gt_album_j023 # photo_caption: 横断歩道より、牛
渡れた……。横断歩道より、牛の方が信号っぽかった
# speaker: narrator
歩道には、野菜や果物を並べた露店が続いている。古い日傘の下で、女性が大根の土を払っていた。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_hawa_mahal_guide_004
この通りの人たちは、毎日この窓の下で暮らしてるんだね。見上げもしないで
# speaker: narrator
# photo: gt_album_j024 # photo_caption: 画面の端に、日傘と大根
彼女はカメラを構えた。画面の端に、日傘と大根が入り込む。
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_jaipur_main_hawa_mahal_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 頭の札（結果を初めて記録したとき1回当たる）：報告のお礼のガウラの大根を受け取る。宿で休むと、眠る前に宿の台所へ渡り（持ち物から消える）、
// 起きた後の朝食に戻ってくる（gt_jaipur_inserts.ink の gt_jaipur_hotel_radish_night・gt_jaipur_hotel_radish_morning）。
=== gt_jaipur_main_hawa_mahal_battle ===
# scene: battle
# on_done: item gt_jaipur_gaura_radish
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
ハワー・マハルの正面は、通りに向かって無数の小窓を広げていた。{heroine_name}が見上げて立ち止まると、足もとから声が飛んだ。
# speaker: gt_jaipur_hawa_woman
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_001
そこ、うちの大根に影が落ちてるよ
# speaker: narrator
歩道の端に布を敷き、野菜を並べている女性がいた。大根、人参、オクラ、小ぶりのトマト。古い日傘を、竿にくくりつけている。
# speaker: heroine
# reaction: heroine,surprised,sweat
# voice: gt_jaipur_main_hawa_mahal_001
# photo: gt_album_j025 # photo_caption: 「うちの大根に影が落ちてるよ」
す、すみません！　……写真を撮ろうとしてて
# speaker: gt_jaipur_hawa_woman
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_002
撮るなら、大根も一緒に入れなさい。四十年、あの窓の下にいるのは、こっちなんだから
# speaker: enemy
# cutin: name
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_003
ガウラよ。この歩道で野菜を売って四十年。朝四時に卸の市場で仕入れて、昼過ぎまでここに座ってる。膝が痛いのは、三十年前から
# speaker: heroine
# voice: gt_jaipur_main_hawa_mahal_002
四十年……じゃあ、中にも何度も？
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_004
一度も。入場券の値段で、トマトが何キロ買えると思う。それに、あれは王様の女の人たちの建物。私らのじゃない
# speaker: narrator
ガウラはトマトを一つ磨きながら、窓を見上げた。四十年見上げてきた人の、慣れた角度だった。
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_005
ねえ、外国の娘さん。上に行くなら、頼みがあるの
# speaker: heroine
# voice: gt_jaipur_main_hawa_mahal_003
頼み、ですか？
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_006
窓から、私を見て。上からだと、私がどう見えるか。帰りに教えてちょうだい
# speaker: narrator
冗談のような口ぶりだった。けれど、トマトを磨く手は止まっていた。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_main_hawa_mahal_004
……はい。ちゃんと見てきます
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_007
ついでに、あの屋根の形。ガイドが毎日、何かにたとえてるのよ。四十年聞いてるのに、いつも途中で客が来て聞きそびれる
-> quiz(1) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_008
    # term: gt_term_krishna
    クリシュナ様の冠！　それそれ。四十年かかって、やっと最後まで聞けた
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_009
    # term: gt_term_krishna
    ……今、隣のガイドが言ったわ。クリシュナ様の冠だって。あんたのおかげで、四十年ぶりに最後まで聞けた
}
# speaker: narrator
ガウラは満足そうに、オクラの山を整え直した。そして、思い出したように付け加える。
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_010
それとね。窓の数も数えたのよ。暇な日に、少しずつ。何度数えても九百五十一。ガイドの言う数と、合わないの
# speaker: narrator
入口は正面ではなく、裏手の路地にあった。券を買って中へ入ると、{heroine_name}は首をかしげた。上の階が見えるのに、どこにも階段がない。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_main_hawa_mahal_005
あれ……どうやって上がるの？
-> quiz(2) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_hawa_mahal_006
    # photo: gt_album_j026 # photo_caption: 階段のない宮殿
    坂道だ。階段じゃなくて、ゆるい坂でぐるぐる上がっていくんだ
- else:
    # speaker: narrator
    # photo: gt_album_j026 # photo_caption: 階段のない宮殿
    係員が指さした先に、ゆるい坂道があった。階段ではなく、傾斜路で上の階へ上がるのだ。
}
# speaker: narrator
# term: gt_term_hawa_ramps
上の階へ行くほど、通路は細くなっていった。小窓の格子に顔を寄せると、通りが真下に広がっていた。
# speaker: narrator
車、リキシャ、牛、人。そのすべてが、こちらに気づかずに流れていく。
# speaker: narrator
# minigame: parasol_search at middle auto found art.street gt_img_jaipur_view_from_hawa_mahal
通りのあちこちに、傘が開いていた。あの中のどれかが、ガウラの日傘だ。
// 日傘探し：選択肢の代わりにミニゲーム「日傘を探す」（格子の窓から通りを見下ろし、古い日傘・値段で揉める客・トマトを
// もらう子どもを順に押す）。古い日傘は手前の歩道の真ん中（at middle）。見間違いは3つを合わせて数え、pointed は3つの
// どれかを彼女が指さしたとき（どれかは物語に渡らないので、台詞はどれにも合う形にする）。
// どの結果も同じ見下ろしの場面へ合流する。手間取ったときだけフラグを立て、クイズ3の後の報告の前に一往復が増える（関係値なし）。
* [日傘：すぐに見つけた # option: found]
    # speaker: narrator
    古い日傘はすぐに見つかった。
* [日傘：何度か見間違えてから見つけた # option: found_slow]
    # set: gt_jaipur_parasol_hard_to_find
    # speaker: narrator
    上から見ると、傘も人も、どれも同じ丸に見えた。いくつか見間違えてから、やっと全部見つけた。
* [日傘：彼女と一緒に見つけた # option: pointed]
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_jaipur_main_hawa_mahal_battle_001
    ほら、あそこ。……ね、見えた？
-
# speaker: narrator
# photo: gt_album_j027 # photo_caption: 格子の小窓から見下ろす、古い日傘
ガウラは客と値段で揉めていた。それから、通りがかった子どもに、トマトを一つ黙って渡した。日傘の陰で髪を直し、膝をさすった。
# speaker: heroine
# emotion: neutral
# voice: gt_jaipur_main_hawa_mahal_007
……ここにいた人たちも、毎日こうやって見てたんだ。下の人は、上に誰がいるか知らないまま
# speaker: narrator
窓の数を数えようとして、{heroine_name}はすぐに諦めた。中からでは、とても数えきれない。ガウラは四十年、外から数え続けてきたのだ。
-> quiz(3) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_hawa_mahal_008
    九百五十三、なんだって。ガウラさんの九百五十一、ほとんど合ってます
- else:
    # speaker: narrator
    出口の案内板に、窓の数が書いてあった。九百五十三。ガウラの数とは、二つしか違わない。
}
# speaker: narrator
通りに戻ると、ガウラが待ちかねた顔で手招きした。
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_011
で？　私は、どう見えた
// 日傘探しで手間取ったときだけの一往復（フラグは上の日傘探しの found_slow）。報告そのものは、この後の彼女の言葉のまま。
{ cond("flag gt_jaipur_parasol_hard_to_find"):
    # speaker: heroine
    # voice: gt_jaipur_main_hawa_mahal_battle_002
    上から見ると、傘って、みんな同じ丸なんですね
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_012
    下から見たって同じよ。窓なんか、どれも同じ顔して並んでる。それを四十年、一つずつ数えてきたんだから
}
# speaker: heroine
# voice: gt_jaipur_main_hawa_mahal_009
ガウラさんは、お客さんと値段で喧嘩してました。それから、子どもにトマトを一つあげてました。誰にも見られてないと思って
# speaker: heroine
# voice: gt_jaipur_main_hawa_mahal_010
# photo: gt_album_j028 # photo_caption: 通りで一番、生きてる
……上から見たガウラさんが、通りで一番、生きてるって感じがしました
# speaker: narrator
ガウラは何も言わず、日傘の竿を握り直した。目が、少し赤かった。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_main_hawa_mahal_011
あの、今度、一緒に上に行きませんか。入場券は、わたしが……
# speaker: enemy
# reaction: enemy,anger
# shake: window
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_013
施しはいらないよ
# speaker: narrator
# photo: gt_album_j029 # photo_caption: 「施しはいらないよ」
ぴしゃりとした声だった。{heroine_name}は、自分の言葉が何をしたのかに気づいた。
# speaker: heroine
# emotion: worried
# voice: gt_jaipur_main_hawa_mahal_012
……ごめんなさい。聞きもしないで、決めちゃいました
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_014
行くなら、自分のお金で、自分の足で行く。……今の話を聞いたら、行きたくなったわ。膝が言うことを聞く日にね
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_015
    あんた、全部ちゃんと見てきたね。屋根も、坂も、窓の数も。それに、私も
- battle_score == 2:
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_016
    一つ取りこぼしたって、いいのよ。私なんか四十年、窓の数を二つ取りこぼしてた
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_hawa_mahal_battle_gaura_017
    答えは、まあ、外れが多かったわね。でも、一番大事な頼みごとは、ちゃんとやってきた
}
# speaker: narrator
# item_show: gt_jaipur_gaura_radish
ガウラは大根を一本、新聞紙でくるんで差し出した。報告のお礼だという。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_main_hawa_mahal_013
# photo: gt_album_j030 # photo_caption: 新聞紙にくるんだ大根
だ、大根……。ホテルで、どうしよう……
# speaker: enemy
# voice: gt_jaipur_main_hawa_mahal_battle_gaura_018
宿の台所に渡しなさい。明日の朝、あんたの皿に戻ってくるから
-> END

// ───── 都市フィナーレ。battles/catalog.json の gt_jaipur_finale_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 最後の踊りはミニゲーム「花婿の行列で踊る」（# minigame: baraat_dance）。結果で変わるのは結びの前の数行だけ。
=== gt_jaipur_finale_battle ===
# scene: battle
# background: gt_bg_jaipur_hawa_mahal
# ambience: gt_amb_street_traffic
# speaker: narrator
# leave: enemy
旅の最後の日。昼のうちに、二人はハワー・マハルに上り、窓から行列が通る道を確かめておいた。そして、日が暮れた。
# background: gt_bg_jaipur_hawa_mahal_night
# tint: off
# speaker: narrator
# bgm: gt_naraina
# ambience: amb_crowd_outdoor
夜の旧市街。照明に浮かぶハワー・マハルの前を、花婿の行列がゆっくり進んでいた。
# speaker: narrator
# term: gt_term_sehra
# term: gt_term_light_bearers
赤い制服の楽隊。頭に灯りを載せて歩く男たち。白い馬の上には、花の房で顔を隠した花婿、アマン。その前で、親戚たちが道いっぱいに踊っている。
# speaker: narrator
# photo: gt_album_j116 # photo_caption: 照明に浮かぶハワー・マハルと、花婿の行列
招待客の二人は、行列の端を歩いていた。踊る人たちの輪から、半歩だけ離れて。
# speaker: narrator
# recall: gt_album_d113
輪の真ん中で、鮮やかな桃色のサリーが跳ねた。デリーで見た、ショールの小さな老婦人と同じ人だとは思えない。
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_001
そこの二人！　窓際の客みたいに立ってないで！
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_jaipur_finale_001
# photo: gt_album_j117 # photo_caption: 桃色のサリーが跳ねた
カ、カムラさん！？　踊ってる……！
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_002
踊るわよ。孫の行列だもの。あんたも来なさい
# speaker: heroine
# reaction: heroine,worried,sweat
# voice: gt_jaipur_finale_002
む、無理です、踊ったことないです！
# speaker: narrator
押し問答をしているうちに、行列が止まった。ハワー・マハルの向かいの、古い屋敷の門の前。花嫁の家だ。
# speaker: narrator
# together: enemy gt_pooja
# term: gt_term_ribbon_ceremony
門には赤いリボンが張られ、その前に、花嫁のいとこたちが腕を組んで立ちはだかっていた。先頭の娘が、高らかに宣言する。
# speaker: gt_pooja
# unnamed
# voice: gt_jaipur_finale_battle_pooja_001
# photo: gt_album_j118 # photo_caption: 門の赤いリボン
花婿さんを通すには、五万一千ルピー！　まけてほしかったら、ジャイプールの問題に答えてもらいます！
# speaker: narrator
あちこちから、ブーイングと笑い声が一緒に上がった。本気で怒っている顔は、一つもない。
# speaker: narrator
デリーから来た花婿側の親戚たちが、顔を見合わせる。ジャイプールのことなど、誰も知らない。カムラが、{heroine_name}の背中を押した。
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_003
この子が答える。デリーで、わたしの地図を全部読んだ子よ
# speaker: heroine
# reaction: heroine,surprised,interrobang
# voice: gt_jaipur_finale_003
え、ええっ！？　こんな大勢の前で……
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_004
答えを言うだけ。言いたいことを言う練習よ。……できるでしょう
# speaker: narrator
# photo: gt_album_j119 # photo_caption: 「わたしが、答えます」
何十人もの目が、こちらを向いた。{heroine_name}は一度だけ深く息を吸い、門の前に進み出た。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_finale_004
……やります。わたしが、答えます
# speaker: narrator
いとこたちの先頭の娘が、にやりと笑った。
# speaker: gt_pooja
# cutin: name
# voice: gt_jaipur_finale_battle_pooja_002
わたしはプージャー。花嫁のいとこよ。一問目。この町は、どうしてピンク色なのか。わかる？
-> quiz(1) ->
# background: gt_bg_jaipur_hawa_mahal_night
{ quiz_correct:
    # speaker: narrator
    プージャーが悔しそうに舌打ちした。
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_003
    ……正解。値下げしてあげる
    # speaker: narrator
    花婿側から歓声が上がる。
- else:
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_004
    はずれ！　お客さんを迎えるために塗ったのよ。値上げね
    # speaker: narrator
    プージャーの宣言に、花嫁側から歓声が上がった。
}
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_005
# term: gt_term_pink_city
声が小さい。もっと大きく言いなさい。ここは通りよ
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_finale_005
こ、これでも精いっぱいです……
# speaker: narrator
白い馬の上で、アマンが花の房の隙間から片手を上げた。ありがとう、という合図らしい。馬は退屈そうに、前脚で地面をかいている。
# speaker: narrator
プージャーが、指を二本立てた。二問目。花婿側を、横目で見ながら。
# speaker: gt_pooja
# voice: gt_jaipur_finale_battle_pooja_005
この町の王様の称号、サワーイー。その意味、デリーの人は知らないでしょう？
-> quiz(2) ->
# background: gt_bg_jaipur_hawa_mahal_night
{ quiz_correct:
    # speaker: heroine
    # local_word: gt_jaipur_word_sawai
    # voice: gt_jaipur_finale_006
    一と、四分の一。……です！
    # speaker: narrator
    # photo: gt_album_j120 # photo_caption: 一と、四分の一
    今度は、さっきより大きな声が出た。プージャーが目を丸くする。
- else:
    # speaker: gt_pooja
    # local_word: gt_jaipur_word_sawai
    # voice: gt_jaipur_finale_battle_pooja_006
    # photo: gt_album_j120 # photo_caption: 一と、四分の一
    一と四分の一！
    # speaker: narrator
    プージャーが得意げに笑った。
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_007
    つまりジャイプールの人間は、デリーの人の一と四分の一倍ってこと
}
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_006
何が一と四分の一よ。わたしはデリーに六十年、ジャイプールにはまだ数日。それでも、あんたたちの誰より長生きしてるわ
# speaker: narrator
カムラの切り返しに、両家から笑いが起きた。いとこたちの腕組みが、少しだけゆるむ。
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_jaipur_finale_007
カムラさん、来たばかりなのに、もうこっちの人の言い方になってる……
# speaker: narrator
プージャーはひるまずに胸を張り、指を三本立てた。
# speaker: gt_pooja
# voice: gt_jaipur_finale_battle_pooja_008
三問目。この町はね、きちんと設計して造られたの。誰が、どうやって設計したと思う？
-> quiz(3) ->
# background: gt_bg_jaipur_hawa_mahal_night
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_finale_008
    # term: gt_term_vidyadhar
    ヴィディヤーダルという人が、古い建築の手引きに沿って、線を引いた町、です
    # speaker: narrator
    いとこたちが、そろって唸った。花婿側の親戚が、なぜか拍手している。
- else:
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_009
    # term: gt_term_vidyadhar
    ヴィディヤーダル！　建築の手引きに沿って、一本ずつ線を引いたの
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_010
    デリーみたいに、勝手に増えた町とは違うのよ
}
# speaker: narrator
# se: wooden_window
# together: enemy gt_pooja gt_jaipur_bride_grandmother
# term: gt_term_grid_city
そのとき、屋敷の二階の格子窓が、かたりと鳴った。窓の奥に、白い髪の老婦人の影がある。
# speaker: narrator
花嫁の祖母だった。プージャーが小声で言う。
# speaker: gt_pooja
# voice: gt_jaipur_finale_battle_pooja_011
# photo: gt_album_j121 # photo_caption: 格子窓の奥の、白い髪
おばあちゃん、足が悪いの。行列は、窓から見ることになってる
# speaker: narrator
窓の老婦人が、プージャーに何か伝えた。プージャーがうなずき、声を張る。
# speaker: gt_pooja
# local_word: gt_jaipur_word_nani
# voice: gt_jaipur_finale_battle_pooja_012
最後の二問は、ナーニーが出すって！　一問目。春になると、女の人たちの行列がこの通りを通る。何のお祭り？
-> quiz(4) ->
# background: gt_bg_jaipur_hawa_mahal_night
{ quiz_correct:
    # speaker: heroine
    # term: gt_term_gangaur
    # voice: gt_jaipur_finale_009
    ガンガウル。女神さまを敬う、春のお祭り
- else:
    # speaker: narrator
    窓の上から、しわがれた声が答えた。
    # speaker: gt_jaipur_bride_grandmother
    # term: gt_term_gangaur
    # voice: gt_jaipur_finale_battle_jaipur_bride_grandmother_001
    ガンガウルよ。女神さまの、春のお祭り
}
# speaker: narrator
窓の老婦人は、しばらく黙っていた。それから、窓越しに、ゆっくり話し始めた。プージャーが一言ずつ、こちらへ伝える。
# speaker: gt_jaipur_bride_grandmother
# voice: gt_jaipur_finale_battle_jaipur_bride_grandmother_002
十六でこの家に来て、六十年。ガンガウルの行列は、毎年この窓から見てきた。一度も、下を歩いたことはない
# speaker: narrator
足のせいだけでは、ないのだろう。十六の年から、一度も、なのだから。
# speaker: narrator
カムラが、窓を見上げた。デリーの暗い城で、亡き夫に話しかけていたときと同じ目だった。
# speaker: narrator
六十年前の「好きだ」に、デリーを発つ前の晩、やっと返事をした人だ。
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_007
六十年見てたなら、もう十分でしょう。……わたしも、六十年黙ってたのよ
# speaker: narrator
# quiet: line
# photo: gt_album_j122 # photo_caption: 窓の内と外の、二人の祖母
二人の祖母が、窓の内と外で見つめ合う。通りの喧騒が、一瞬遠のいた。
# speaker: narrator
窓の奥の声が、最後の問題を告げた。
# speaker: gt_jaipur_bride_grandmother
# voice: gt_jaipur_finale_battle_jaipur_bride_grandmother_003
この窓はね、向かいの宮殿の窓と同じ作り。こんな細かな格子は、何のためにあったと思う？
-> quiz(5) ->
# background: gt_bg_jaipur_hawa_mahal_night
{ quiz_correct:
    # speaker: heroine
    # em: 見られずに
    # voice: gt_jaipur_finale_010
    中の人が、見られずに、外を見るため。……通りも、お祭りも、市場も
- else:
    # speaker: narrator
    窓の奥の声が、自分で答えた。
    # speaker: gt_jaipur_bride_grandmother
    # em: 見られずに
    # voice: gt_jaipur_finale_battle_jaipur_bride_grandmother_004
    見られずに、見るためよ。通りも、お祭りも、市場も
}
# speaker: narrator
# leave: gt_jaipur_bride_grandmother
# term: gt_term_purdah
格子の向こうで、老婦人が小さく笑った気配がした。
# speaker: narrator
# se: wooden_window
# together: enemy gt_pooja gt_jaipur_bride_grandmother
# photo: gt_album_j123 # photo_caption: 杖をついて、門の奥から
窓が閉まった。しばらくして、屋敷の門の奥から、杖をついた老婦人が姿を現した。花嫁側から、驚きの声が上がる。
# speaker: gt_jaipur_bride_grandmother
# voice: gt_jaipur_finale_battle_jaipur_bride_grandmother_005
見るためには、見られないことが必要だった。……でも、今夜は、見られてもいいわね
{
- battle_score == 5:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_013
    全問正解！　通行料は、百一ルピーにまけてあげる！
- battle_score >= 3:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_014
    よく頑張りました！　通行料は、一万一千一ルピーで手を打つ！
- else:
    # speaker: narrator
    プージャーがリボンを掲げて叫んだ。
    # speaker: gt_pooja
    # voice: gt_jaipur_finale_battle_pooja_015
    通行料は満額！　でも答えた勇気に免じて、リボンは切ってあげる！
}
# speaker: narrator
# shake: window
# se: scissors_snip
# shake
# weather: petals
# term: gt_term_dhol
リボンが切られた。楽隊が一斉に鳴り出し、通りが揺れる。カムラが、{heroine_name}の手首をつかんだ。
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_008
# photo: gt_album_j124 # photo_caption: リボンが切られた
デリーで、あんたはわたしに言ったね。黙っていなくなるのは、自由とは違うって
# speaker: enemy
# voice: gt_jaipur_finale_battle_kamla_009
今夜はわたしが言う。黙って見ているだけなのも、自由とは違うのよ
# speaker: heroine
# emotion: serious
# pause: 700
# voice: gt_jaipur_finale_011
……はい。……怖いけど、踊りたいです
# speaker: narrator
# stand: apart
# photo: gt_album_j125 # photo_caption: 怖いけど、踊りたいです
通りの真ん中へ、一歩。手拍子に合わせて、ぎこちなく腕を上げる。誰かが笑い、誰かが真似をし、それがすぐに踊りの輪になった。
# speaker: narrator
# stand: close
# photo: gt_album_j126 # photo_caption: 迷いのない手
{heroine_name}は振り返り、行列の端に残っていたこちらの手を取った。迷いのない手だった。
# speaker: heroine
# reaction: heroine,happy,sparkle
# size: large
# minigame: baraat_dance auto off_beat_together bg gt_bg_jaipur_baraat_night
# voice: gt_jaipur_finale_012
一緒に！　下手なのは、二人とも同じだから！
// 踊り：選択肢の代わりにミニゲーム「花婿の行列で踊る」。どの結果も同じ結びへ合流し、変わるのは結びの前の数行の色だけ（関係値なし）。
* [踊り：太鼓の拍に乗れた # option: in_step]
    # speaker: narrator
    太鼓の音に、足が勝手に乗った。カムラが、踊りながら目を丸くする。
    # speaker: enemy
    # voice: gt_jaipur_finale_battle_kamla_010
    なによ。やればできるじゃない
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    # voice: gt_jaipur_finale_battle_001
    # photo: gt_album_j127 # photo_caption: 下手なの、わたしだけだった # photo_show: small
    下手なの、わたしだけだった……！
* [踊り：ずれたまま、二人で踊った # option: off_beat_together]
    # speaker: narrator
    太鼓とは、どうしても合わない。それでも、腕を上げるのも下ろすのも、{heroine_name}と同じだった。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_jaipur_finale_battle_002
    # photo: gt_album_j128 # photo_caption: 輪の真ん中へ、引っぱり込まれる # photo_show: small
    ずれてる。でも、二人で同じだけずれてる
* [踊り：足がもつれた # option: stumble]
    # speaker: narrator
    三歩目で、足がもつれた。肩が{heroine_name}にぶつかり、二人で一緒によろける。
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_jaipur_finale_battle_003
    # photo: gt_album_j128 # photo_caption: 輪の真ん中へ、引っぱり込まれる # photo_show: small
    ふふっ。今のも、踊りってことにしよう
* [踊り：立ったままだった # option: stood_still]
    # speaker: narrator
    足が、地面に貼りついたように動かなかった。太鼓だけが、どんどん先へ行く。
    # speaker: heroine
    # emotion: serious
    # voice: gt_jaipur_finale_battle_004
    見てるだけは、自由とは違うんでしょ。……ほら
    # speaker: narrator
    # photo: gt_album_j128 # photo_caption: 輪の真ん中へ、引っぱり込まれる # photo_show: small
    つかまれた手ごと、輪の真ん中へ引っぱり込まれた。
-
// 踊りの写真は、どの結果の後も、合流したこの行で1回（踊りの前の行に付けると、遊ぶ場の上に写真の札が重なるため）。
# speaker: narrator
# photo: gt_album_j129 # photo_caption: 「一緒に！　下手なのは、二人とも同じだから！」
杖の老婦人とカムラが、肩を組んで揺れている。馬の上でアマンが笑っている。頭上では、ハワー・マハルの九百を超える窓が、灯りに照らされて、ただ通りを見下ろしていた。
-> END
