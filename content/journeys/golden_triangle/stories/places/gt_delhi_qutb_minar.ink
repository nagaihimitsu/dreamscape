INCLUDE modules.ink
-> DONE

// クトゥブ・ミナールの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_delhi_qutb_minar_guide ===
# scene: guide
# background: gt_bg_delhi_qutb_minar
# speaker: narrator
# photo: gt_album_d015 # photo_caption: 見上げたら帽子がずり落ちた
クトゥブ・ミナールを見上げた{heroine_name}の帽子が、後ろへずり落ちた。押さえ直しても、顔はまだ空を向いている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_delhi_qutb_minar_guide_001
高い……！　近くで見ると、塔の表面に、文字がびっしり彫ってある
# speaker: narrator
# term: gt_term_red_sandstone
# term: gt_term_qutb_calligraphy
赤い砂岩の帯の間を、文字の帯が巻き上がっていく。
# speaker: narrator
家族連れが塔を背に並び、誰かが毎回「もうちょっと下がって」と叫んでいた。
# speaker: heroine
# reaction: heroine,exasperated,dizzy
# voice: gt_delhi_qutb_minar_guide_002
# photo: gt_album_d016 # photo_caption: 「背の高いものって、ずるいね」
首が痛い。背の高いものって、ずるいね。目を全部持っていく
# speaker: narrator
# item_out: gt_delhi_kamla_memo 2
彼女はガイドブックから段ボールの切れ端を出した。二行目。
# speaker: heroine
# voice: gt_delhi_qutb_minar_guide_003
鉄の柱……あ、あれかな。塔の近くの、黒い柱
# speaker: narrator
# term: gt_term_iron_pillar
塔の足元の中庭に、黒っぽい鉄の柱が立っていた。人の背丈の何倍か。根元は、低い柵にぐるりと囲まれている。
# speaker: heroine
# emotion: neutral
# voice: gt_delhi_qutb_minar_guide_004
# term: gt_term_pillar_hug
『もう抱けない』ってことは、昔は抱けたんだ。……カムラさん、抱いたことあるのかな。誰かと一緒に
# speaker: narrator
# emotion: smile
# photo: gt_album_d017 # photo_caption: 鉄の柱と、メモの二行目
想像したらしく、彼女は一人で小さく笑った。
# speaker: narrator
それから、柵の前で何かを測るように手を動かしている男の人に気づいて、首をかしげた。
# speaker: heroine
# reaction: heroine,worried,question
# voice: gt_delhi_qutb_minar_guide_005
……あの人、柵の高さ、測ってない？
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_delhi_main_qutb_minar_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_delhi_main_qutb_minar_battle ===
# scene: battle
# background: gt_bg_delhi_qutb_minar
# speaker: narrator
塔の足元、低い柵に囲まれた黒い鉄の柱の前で、男が一人、柵の高さを手のひらで測っていた。
# speaker: narrator
アイロンのきいた半袖シャツ。くたびれたリュック。視線は柱と、遠くの警備員を行ったり来たり。
# speaker: narrator
次の瞬間、男の片足が柵をまたいだ。
# speaker: narrator
# shake: window
# se: cloth_grab
# photo: gt_album_d018 # photo_caption: とっさにリュックの肩紐をつかむ # photo_with: gt_delhi_qutb_man
考えるより先に、{heroine_name}の手がリュックの肩紐をつかんでいた。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# voice: gt_delhi_main_qutb_minar_001
だ、だめです！
# speaker: gt_delhi_qutb_man
# unnamed
# reaction: enemy,sweat
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_001
放してください。三十秒で済みます。背中をつけて、腕を回すだけです
# speaker: narrator
男は柵の上で片足立ちのまま、名乗った。
# speaker: enemy
# cutin: name
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_002
ラームキシャンです。ウッタル・プラデーシュ州の町から、夜行バスで来ました
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_003
# term: gt_term_pillar_hug
祖父は結婚の前に、この柱を抱きました。父は就職の面接の前に。来月、娘が高校の卒業試験を受けるんです
# speaker: heroine
# voice: gt_delhi_main_qutb_minar_002
娘さんに、頼まれたんですか？
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_004
電話で。『パパ、デリーに行くなら鉄の柱を抱いてきて』と。……約束したんです
# speaker: narrator
肩紐を握る手に、男の体重がかかる。離せば、彼は柵の内側だ。
# speaker: heroine
# emotion: serious
# voice: gt_delhi_main_qutb_minar_003
柵があるのには、理由があると思うんです。追い出されたら、約束どころじゃなくなっちゃう
# speaker: enemy
# reaction: enemy,anger
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_005
理由？　知ってますよ。貧乏人の願いがかなうと困る人がいるんでしょう
# speaker: narrator
冗談の形をしていたが、目は笑っていなかった。
-> quiz(1) ->
# background: gt_bg_delhi_qutb_minar
{ quiz_correct:
    # speaker: narrator
    {heroine_name}の答えを聞くと、ラームキシャンは、ふっと肩の力を抜いた。柵をまたいでいた足が、ゆっくり外側へ戻る。
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_006
    ……知ってます。分かってて、言ってみただけです。触る人が多すぎて、傷むんですよね
- else:
    # speaker: narrator
    ラームキシャンは首を振り、柵をまたいでいた足を外側へ戻した。
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_007
    いいえ。触る人が多すぎて、傷むからです。……知ってるんです。分かってて、八つ当たりしました
}
# speaker: narrator
彼は胸ポケットからボールペンを抜き、くるりと回した。癖になった手つきだった。
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_008
わたし、理科の教師なんです。毎年この柱の話を授業でします。生徒は必ず『魔法？』と聞く
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_delhi_main_qutb_minar_004
先生、だったんですか
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_009
なので、あなたにも聞きます。千六百年、雨ざらしで、なぜ錆びないのか
# speaker: narrator
# photo: gt_album_d019 # photo_caption: ボールペンの先がこちらを向く # photo_with: gt_delhi_qutb_man
ボールペンの先が、こちらに向いた。教室で何百回も繰り返した角度だった。
-> quiz(2) ->
# background: gt_bg_delhi_qutb_minar
{ quiz_correct:
    # speaker: enemy
    # reaction: enemy,music
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_010
    合格。うちの生徒より速い。……魔法じゃない、材料と作り方の話です
- else:
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_011
    惜しい。答えは鉄の中のリンです。表面に薄い膜ができて、錆を食い止める。魔法じゃないんです
}
# speaker: heroine
# voice: gt_delhi_main_qutb_minar_005
じゃあ、どうして抱きたいんですか。願いがかなうって、信じてないのに
# speaker: narrator
ラームキシャンはしばらく黙り、ボールペンを胸ポケットに戻した。
# speaker: enemy
娘には、魔法じゃないと教えました。九歳のときに
# speaker: enemy
そしたら先月、あの子が泣きながら電話してきたんです。『パパ、抱いてきて』って
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_013
科学で答えられないことを、頼まれたんですよ。父親は、科学の先生より弱い
# speaker: narrator
# se: whistle
遠くで笛が鳴った。警備員がこちらを見ている。ラームキシャンは柵から一歩下がり、両手を上げてみせた。
# speaker: heroine
# emotion: worried
# voice: gt_delhi_main_qutb_minar_006
抱く代わりになるもの、何か……
# speaker: narrator
# photo: gt_album_d020 # photo_caption: 案内板の小さな文字を指でたどる
{heroine_name}は案内板の前へ回り込んだ。小さな文字を、指でたどる。この柱が、どこから来たのか。
-> quiz(3) ->
# background: gt_bg_delhi_qutb_minar
{ quiz_correct:
    # speaker: heroine
    # reaction: heroine,smile,sparkle
    # voice: gt_delhi_main_qutb_minar_007
    この柱、ここで生まれたんじゃないんですね。ずっと遠くの丘から運ばれてきて、知らない町で、何百年も立ってる
- else:
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_014
    いいえ。もとは中部インドの丘です。何百キロも運ばれて、知らない町に立てられた
}
# speaker: narrator
ラームキシャンは柱を見上げた。抱こうとしていたときとは、違う顔だった。
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_015
……娘は、来年デリーの大学を受けたいと言っています。わたしは、反対しているんです。遠すぎるって
# speaker: heroine
# voice: gt_delhi_main_qutb_minar_008
試験が怖いのは、娘さんだけじゃなかったんですね
# speaker: enemy
# reaction: enemy,sweat
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_016
ひどいことを言いますね。……当たってるのが、なおひどい
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_017
    三問とも答えられた旅行者は初めてです。来年の授業で、あなたの話をしてもいいですか。名前は伏せます
- battle_score == 2:
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_018
    二問正解。うちの生徒の平均よりは上です。平均は低いですけど
- else:
    # speaker: enemy
    # voice: gt_delhi_main_qutb_minar_battle_ramkishan_019
    点数は気にしなくていい。わたしも最初は、この柱を魔法だと思っていました
}
# speaker: narrator
# se: camera_shutter
# photo: gt_album_d021 # photo_caption: 柵の外から、正面を向けて一枚 # photo_with: gt_delhi_qutb_man
彼はスマートフォンで柱の碑文を一枚だけ撮った。柵の外から、背中ではなく正面を向けて。
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_020
抱くのはやめます。代わりに、この柱の旅の話を持って帰る。遠くへ運ばれても、ちゃんと立っていられた鉄の話です
# speaker: narrator
歩き出しかけて、彼は振り返った。教師の顔で、まっすぐ{heroine_name}を指さす。
# speaker: enemy
# voice: gt_delhi_main_qutb_minar_battle_ramkishan_021
それと。知らない男のリュックをいきなりつかむのは、危ないです。次はやめなさい
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_main_qutb_minar_009
止めたのに、叱られた……
# speaker: narrator
# leave: enemy
# photo: gt_album_d022 # photo_caption: 止めたのに、叱られた
男の背中が人混みに消える。{heroine_name}は自分の手のひらを見た。肩紐の重さが、まだ残っている。
# speaker: heroine
# voice: gt_delhi_main_qutb_minar_010
……わたし、人の鞄をつかんだの、初めてかも
-> END
