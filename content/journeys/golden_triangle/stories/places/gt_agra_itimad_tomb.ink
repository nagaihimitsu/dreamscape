INCLUDE modules.ink
-> DONE

// イティマード・ウッダウラ廟の場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_agra_itimad_tomb_guide ===
# scene: guide
# background: gt_bg_agra_itimad_tomb
# speaker: narrator
# term: gt_term_e_rickshaw
# term: gt_term_cow
電動リキシャでヤムナー川の橋を渡ると、町の音が一段遠くなった。対岸の道は細く、牛がのんびり横切っていく。
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_agra_itimad_tomb_guide_001
# photo: gt_album_a032 # photo_caption: 川を一本越えただけで
川を一本越えただけで、急に静か。タージの近くの賑やかさが、うそみたい
# speaker: narrator
# term: gt_term_bhutta
門の前の露店で、水と、焼いたとうもろこしを売っている。客は、ほとんどいない。
# speaker: narrator
門をくぐると、庭の奥に白い墓廟が座っていた。タージよりずっと小さい。けれど、壁一面に、色のついた石で模様が描かれている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# term: gt_term_parchin_kari
# voice: gt_agra_itimad_tomb_guide_002
# photo: gt_album_a033 # photo_caption: 絵の具じゃない、石の花
あ……模様が、絵の具じゃない。石がはめ込んであるんだ。花も、瓶も、ぜんぶ石
# speaker: narrator
# term: gt_term_jali
近づくほど細かくなる模様に、{heroine_name}の歩幅が小さくなる。窓には、石の格子がはまっていた。
# speaker: heroine
# voice: gt_agra_itimad_tomb_guide_003
# photo: gt_album_a034 # photo_caption: 石なのに、レースみたい
格子を通った光が、床に模様を作ってる。石なのに、レースみたい
# speaker: narrator
彼女はガイドブックを開き、この墓の説明を探した。見出しの横に、小さく通称が書いてある。
# speaker: heroine
# reaction: heroine,happy,music
# voice: gt_agra_itimad_tomb_guide_004
# photo: gt_album_a035 # photo_caption: 通称、ベビー・タージ
通称、ベビー・タージ、だって。かわいい名前。……確かに、タージを小さくしたみたいだもんね
# speaker: narrator
# term: gt_term_neem
# photo: gt_album_a036 # photo_caption: ニームの木の下の白髪の女性
庭の隅のニームの木の下で、白髪の女性が一人、布の手提げを膝に置いて座っていた。その目が、こちらを向いた気がした。
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_agra_main_itimad_tomb_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_agra_main_itimad_tomb_battle ===
# scene: battle
# background: gt_bg_agra_itimad_tomb
# speaker: narrator
# leave: enemy
庭の奥の白い墓廟は、大きくはない。けれど近づくほど、壁一面に色の石の模様が浮かび上がってくる。
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_agra_main_itimad_tomb_001
わあ……これが『ベビー・タージ』だね。名前どおり、かわいい
# speaker: gt_vimla
# unnamed
# leave: gt_vimla
# voice: gt_agra_main_itimad_tomb_battle_vimla_001
# photo: gt_album_a037 # photo_caption: 「ベビーではありません！」
ベビーではありません！
# speaker: narrator
ニームの木陰から、サリー姿の女性が立ち上がった。白髪をきっちり結い、布の手提げを肩にかけている。手提げから、紙の束がのぞいていた。
# speaker: enemy
# cutin: name
# voice: gt_agra_main_itimad_tomb_battle_vimla_002
ヴィムラーです。ヒンディー語の教師を三十八年。今は、この墓の名誉回復をしています
# speaker: heroine
# reaction: heroine,surprised,sweat
# voice: gt_agra_main_itimad_tomb_002
め、名誉回復……？
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_003
この墓は、誰の赤ちゃんでもない。娘が、亡くなった両親のために建てたものです。それを『タージの赤ちゃん』だなんて
# speaker: narrator
ヴィムラーは紙の束から一枚を抜き、クリップボードごと差し出した。観光局宛ての請願書。案内板の「ベビー・タージ」を外してほしい、という内容だった。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_004
署名を。名前と国名だけで結構です
# speaker: heroine
# emotion: serious
# voice: gt_agra_main_itimad_tomb_003
あの……読んでからでも、いいですか？
# speaker: narrator
# photo: gt_album_a038 # photo_caption: 署名の前に読む人
ヴィムラーの手が止まった。教師の目で、{heroine_name}を上から下まで見る。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_005
署名の前に読む人は、珍しいわね。……どうぞ。三つ、主張を書いてあります
# speaker: narrator
一つ目の主張。この墓は、タージ・マハルの赤ちゃんではない。先に建てられたのは、こちらである。
-> quiz(1) ->
# background: gt_bg_agra_itimad_tomb
{ quiz_correct:
    # speaker: enemy
    # em: 先輩
    # voice: gt_agra_main_itimad_tomb_battle_vimla_006
    よろしい。先輩を赤ちゃん呼ばわりしていたのは、世間の方なの
- else:
    # speaker: enemy
    # em: こちらが先
    # voice: gt_agra_main_itimad_tomb_battle_vimla_007
    いいえ、こちらが先。タージの工事が始まる四年前に、もう完成していたの。世間が順番を逆にしているのよ
}
# speaker: narrator
二つ目の主張は、ここに眠る人についてだった。{heroine_name}が読み上げかけると、ヴィムラーが先に言った。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_008
# term: gt_term_itimad_ud_daula
イティマード・ウッダウラは名前じゃなくて称号。『国家の柱』という意味。どんな人だったか、分かる？
# speaker: heroine
# voice: gt_agra_main_itimad_tomb_004
えっと……偉い人、ですよね
# speaker: enemy
# reaction: enemy,sigh
# voice: gt_agra_main_itimad_tomb_battle_vimla_009
偉くなった人、よ。最初から偉かったわけじゃない。そこが大事なの
# speaker: narrator
ヴィムラーは墓廟を見上げた。授業中、一番聞いてほしいところで声を落とす先生のように。
-> quiz(2) ->
# background: gt_bg_agra_itimad_tomb
{ quiz_correct:
    # speaker: enemy
    # voice: gt_agra_main_itimad_tomb_battle_vimla_010
    そう。遠い国から来て、自分の力で上った人。その娘が皇妃になって、両親のためにこれを建てた。いい話でしょう
- else:
    # speaker: enemy
    # voice: gt_agra_main_itimad_tomb_battle_vimla_011
    # term: gt_term_nur_jahan
    ペルシアから来た貴族よ。宮廷に来て、自分の力で一番上まで上った。その娘が、皇妃ヌール・ジャハーン
}
# speaker: heroine
# emotion: smile
# voice: gt_agra_main_itimad_tomb_005
建てたのも、建ててもらったのも、自分の足で来た人たちなんですね
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_012
分かってきたじゃない。白い大理石で覆った最初の墓も、石をはめ込む模様も、全部こっちが先。タージは、それを大きくしただけ
# speaker: narrator
三つ目の主張は、一番下に、一番大きな字で書いてあった。
# speaker: narrator
# letter: note
# term: gt_term_nur_jahan
この墓を建てた皇妃ヌール・ジャハーンは、タージ・マハルの設計にも関わった
# speaker: narrator
{heroine_name}のペンが、紙の上で止まった。ヴィムラーがその手元をのぞき込む。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_013
どうしたの。三つとも事実よ。署名して
-> quiz(3) ->
# background: gt_bg_agra_itimad_tomb
{ quiz_correct:
    # speaker: heroine
    # emotion: serious
    # voice: gt_agra_main_itimad_tomb_006
    # term: gt_term_shah_jahan
    三つ目だけ、資料で確かめられないと思います。タージは、シャー・ジャハーンの建物ですよね
- else:
    # speaker: narrator
    {heroine_name}が迷っていると、ヴィムラーは自分から目をそらした。三つ目の行を、指で隠すように。
}
# speaker: enemy
# reaction: enemy,sweat
# voice: gt_agra_main_itimad_tomb_battle_vimla_014
# photo: gt_album_a039 # photo_caption: 止まったペン、「盛ったの」
……知ってるわよ。盛ったの
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_015
本当のことだけ書いても、誰も読まない。三年集めて、署名は四十二人。大きく書いたら、少しは足を止めてくれるかと思って
# speaker: heroine
# voice: gt_agra_main_itimad_tomb_007
でも、一つ盛ったら、ほかの二つまで疑われちゃいます。せっかく、本当なのに
# speaker: narrator
ヴィムラーは長いこと黙っていた。先生に赤ペンを入れられた生徒みたいな顔だった。
# speaker: heroine
# voice: gt_agra_main_itimad_tomb_008
この紙には署名できません。……でも、白い紙を一枚もらえますか
# speaker: narrator
# photo: gt_album_a040 # photo_caption: 白い紙の、短くて強い一文
{heroine_name}は新しい紙に短く書き、下に自分の名前と国名を添えた。
# speaker: narrator
# letter: card
この墓は、娘が両親のために建てた。タージ・マハルより先に。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_016
……あなたの文の方が、短くて強いわね。元ヒンディー語教師として、悔しい
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_agra_main_itimad_tomb_battle_vimla_017
    満点。うちのクラスにいたら、学級委員にしてたわ。……反論ばかりしてくる学級委員にね
- battle_score == 2:
    # speaker: enemy
    # voice: gt_agra_main_itimad_tomb_battle_vimla_018
    三問中二問。悪くない。間違えたところは、署名する前に読んだから気づけたのよ
- else:
    # speaker: enemy
    # voice: gt_agra_main_itimad_tomb_battle_vimla_019
    点数は低いけれど、署名の前に読んだ。それだけで、この三年で一番の人よ
}
# speaker: narrator
# photo: gt_album_a041 # photo_caption: 線を引かれた三つ目の行、そして発音の授業
ヴィムラーは新しい紙を、請願書の一番上にクリップで留めた。一番大きな字の三つ目の行は、ボールペンで一本、線を引かれていた。
# speaker: enemy
# voice: gt_agra_main_itimad_tomb_battle_vimla_020
それから、あなた。さっきの『イティマード』、発音が違います。イッ、ティ、マード。はい、繰り返して
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_main_itimad_tomb_009
……授業、始まっちゃった
-> END
