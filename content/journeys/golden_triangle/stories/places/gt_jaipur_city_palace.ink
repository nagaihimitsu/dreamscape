INCLUDE modules.ink
-> DONE

// シティ・パレスの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_jaipur_city_palace_guide ===
# scene: guide
# background: gt_bg_jaipur_city_palace
# speaker: narrator
# term: gt_term_pagri
# term: gt_term_moustache
シティ・パレスの門の前に、赤いターバンと白い制服の門番が立っていた。立派な口ひげが、左右にくるりと巻き上がっている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_jaipur_city_palace_guide_001
ひげ、すごい……。あの形、毎朝どうやって作ってるんだろう
# speaker: narrator
観光客が次々と門番と並んで写真を撮っていく。門番は表情を変えず、ひげの角度だけを完璧に保っていた。
# speaker: narrator
門をくぐると、中庭がいくつも連なっていた。白と桃色の建物、細かな彫刻の柱。奥の方の建物には、見学者の入れない階もある。
# speaker: heroine
# voice: gt_jaipur_city_palace_guide_002
お城っていうより、町の中に、もう一つ町があるみたい
# speaker: narrator
ある中庭の真ん中で、{heroine_name}の足が止まった。人の背丈ほどもある銀の壺が、二つ並んでいる。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_jaipur_city_palace_guide_003
# photo: gt_album_j033 # photo_caption: 銀の壺は、お風呂？
なに、これ……！　お風呂？　……じゃないよね。何を入れるための壺なんだろう
# speaker: narrator
壺の陰で、サリー姿の女性と青年が、何やら言い合いをしていた。青年の手には、小さな秤。女性の手提げからは、ガラス瓶がのぞいている。
# speaker: heroine
# voice: gt_jaipur_city_palace_guide_004
……あの二人、何か揉めてる。秤と、瓶……？
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_jaipur_main_city_palace_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 【3】頭の札（結果を初めて記録したとき1回当たる）。足した札：審判の報酬のライムの漬物を受け取る
=== gt_jaipur_main_city_palace_battle ===
# scene: battle
# on_done: item gt_jaipur_sushma_lime_pickle
# background: gt_bg_jaipur_city_palace
# speaker: narrator
人の背丈ほどもある銀の壺の陰で、言い合いは近づくほど大きくなった。{heroine_name}がそばまで来たところで、女性の声が跳ね上がった。
# speaker: gt_jaipur_city_palace_woman
# voice: gt_jaipur_main_city_palace_battle_sushma_001
五キロ！　五キロのどこが多いの！
# speaker: narrator
# together: enemy gt_vishal
サリー姿の女性と、二十代半ばの青年。青年が女性の手提げを荷物用の秤に吊るすと、中の瓶が鳴り、針が大きく振れた。
# speaker: gt_jaipur_city_palace_young_man
# term: gt_term_achar
# voice: gt_jaipur_main_city_palace_battle_vishal_001
母さん、預け荷物は二十三キロまでなんだ。漬物だけで五キロは無理だって
# speaker: gt_vishal
# cutin: name
# voice: gt_jaipur_main_city_palace_battle_vishal_002
すみません、騒がしくて。ヴィシャールです。来週、仕事でドイツに発つんです
# speaker: gt_vishal
# voice: gt_jaipur_main_city_palace_battle_vishal_003
最後の週末だから、家族で宮殿を見に来たんですけど
# speaker: enemy
# cutin: name
# voice: gt_jaipur_main_city_palace_battle_sushma_002
ちょっと、そこの旅行者さん。あなた、外国から来たのよね
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_main_city_palace_001
は、はい。日本から……
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_003
この子ったら、向こうで漬物の匂いがしたら恥ずかしいって言うの。あなた、審判をしてちょうだい
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_004
教えて。外国に家の味を持っていくのは、恥ずかしいこと？
# speaker: narrator
二組の目が、同時に{heroine_name}を見た。母親の目と、息子の目。どちらに答えても、片方が傷つく。
# speaker: heroine
# reaction: heroine,worried,sweat
# voice: gt_jaipur_main_city_palace_002
え、ええと……それは……
# speaker: narrator
スシュマは返事を待たず、銀の壺を指さした。最後の証拠を出す弁護士のような手つきだった。
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_005
この壺はね、昔の王様が外国へ持っていったのよ。中に何を入れていったと思う？
-> quiz(1) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_006
    そう！　ガンジスの水！　王様だって、自分の家の水を持っていったのよ。漬物五キロくらい、何よ
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_007
    ガンジスの水よ！　王様だって、自分の家の水を壺に詰めて持っていったの。漬物五キロくらい、何よ
}
# speaker: gt_vishal
# term: gt_term_gangajali
# voice: gt_jaipur_main_city_palace_battle_vishal_004
王様には、荷物の重量制限がなかったんだよ、母さん
# speaker: narrator
# emotion: happy
ヴィシャールの切り返しに、{heroine_name}は思わず吹き出した。慌てて口を押さえたが、もう遅い。
# speaker: enemy
# reaction: enemy,anger
# voice: gt_jaipur_main_city_palace_battle_sushma_008
笑ったわね。審判が笑うなんて
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_main_city_palace_003
す、すみません！　……でも、どっちの言い分も、ちょっと分かるんです
# speaker: narrator
ヴィシャールが小声で言った。
# speaker: gt_vishal
# voice: gt_jaipur_main_city_palace_battle_vishal_005
向こうの新しい同僚に、漬物の匂いのする部屋だと思われたくないんです。最初くらい、身軽に始めたくて
# speaker: narrator
スシュマは聞こえないふりをして、二人を隣の中庭へ引っぱっていった。四方に、色の違う四つの門が並んでいる。
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_009
ほら、この門。何を表してるか、あんたは知ってる？　小さい頃に連れてきたのに、どうせ覚えてないでしょう
-> quiz(2) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_010
    四つの季節。春も、夏も、秋も、冬も。……うちの台所には、季節ごとの漬物があったの。あんたが忘れても、瓶は覚えてる
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_011
    四季よ。孔雀が秋で、蓮が夏。……うちの台所にも、季節ごとの漬物があったの。あんたが忘れても、瓶は覚えてる
}
# speaker: narrator
# term: gt_term_pritam_niwas
ヴィシャールは、緑の門を見上げたまま黙った。それから、母親に聞こえないくらいの声で言った。
# speaker: gt_vishal
# voice: gt_jaipur_main_city_palace_battle_vishal_006
……持っていったら、向こうで毎日食べる。そしたら毎日、帰りたくなる。だから、持っていきたくないんだ
# speaker: narrator
{heroine_name}は少し考えてから、口を開いた。
# speaker: heroine
# voice: gt_jaipur_main_city_palace_004
わたし、旅の途中で、家のお味噌汁が恋しくなることがあります。我慢したら、もっと恋しくなりました
# speaker: heroine
# voice: gt_jaipur_main_city_palace_005
恋しくなるのは、帰る場所があるってことだと思います。……恥ずかしいことじゃ、ないです
# speaker: narrator
スシュマが、こちらを見た。得意げな顔ではなかった。それから、隣に立つ息子を、黙って見上げた。
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_012
……ねえ、上を見て。この宮殿の奥には、今も住んでる人がいるのよ。出ていかずに。知ってた？
-> quiz(3) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_city_palace_006
    はい。宮殿の一部は、今も王家の方の住まいなんですよね
- else:
    # speaker: narrator
    案内板には、宮殿の一部が今も王家の住まいだと書いてあった。博物館だけの建物ではないのだ。
}
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_013
王様の家族は、まだここに住んでる。……でも、うちの息子は出ていくの
# speaker: narrator
冗談めかした声が、途中でかすれた。ヴィシャールが母親の肩に手を置く。
# speaker: narrator
審判の答えを、二人が待っていた。{heroine_name}は、ヴィシャールが提げた秤を指さした。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_main_city_palace_007
五キロは無理でも、二キロなら入りますよね。……それで、漬物がなくなったら、電話してください。お母さんに、次の分を頼むって
# speaker: heroine
# voice: gt_jaipur_main_city_palace_008
なくなるたびに、電話する理由ができます
# speaker: narrator
スシュマとヴィシャールが、同時に黙った。先に口を開いたのは、母親の方だった。
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_014
……毎週よ。日曜の朝。時差があるなら、そっちに合わせてあげる
# speaker: gt_vishal
# voice: gt_jaipur_main_city_palace_battle_vishal_007
二キロと、毎週の電話。……分かった
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_015
    審判さん、全問正解ね。うちの息子より、この宮殿に詳しいじゃない
- battle_score == 2:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_016
    二問正解。審判としては合格。笑ったのは減点だけど
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_city_palace_battle_sushma_017
    答えは、まあまあね。でも、判定は一番いいのを出してくれた
}
# speaker: narrator
# item_show: gt_jaipur_sushma_lime_pickle
スシュマは手提げから小瓶を一つ取り出し、{heroine_name}の手に握らせた。ライムの漬物。審判の報酬だという。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_main_city_palace_009
# photo: gt_album_j039 # photo_caption: 審判の報酬、ライムの漬物
あ、ありがとうございます。……わたしにも、重量制限が……
# speaker: enemy
# voice: gt_jaipur_main_city_palace_battle_sushma_018
二百グラムよ。文句があるなら、電話してちょうだい
-> END
