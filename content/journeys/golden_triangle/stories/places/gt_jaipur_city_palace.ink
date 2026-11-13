INCLUDE modules.ink
-> DONE

// シティ・パレスの場所のファイル（新しい書き方への形の移し替え。文は今のまま）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_jaipur_city_palace_guide ===
# scene: guide
# background: gt_bg_jaipur_city_palace
# speaker: narrator
シティ・パレスの門の前に、赤いターバンと白い制服の門番が立っていた。立派な口ひげが、左右にくるりと巻き上がっている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
ひげ、すごい……。あの形、毎朝どうやって作ってるんだろう
# speaker: narrator
観光客が次々と門番と並んで写真を撮っていく。門番は表情を変えず、ひげの角度だけを完璧に保っていた。
# speaker: narrator
門をくぐると、中庭がいくつも連なっていた。白と桃色の建物、細かな彫刻の柱。奥の方の建物には、見学者の入れない階もある。
# speaker: heroine
お城っていうより、町の中に、もう一つ町があるみたい
# speaker: narrator
ある中庭の真ん中で、{heroine_name}の足が止まった。人の背丈ほどもある銀の壺が、二つ並んでいる。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
なに、これ……！　お風呂？　……じゃないよね。何を入れるための壺なんだろう
# speaker: narrator
壺の陰で、サリー姿の女性と青年が、何やら言い合いをしていた。青年の手には、小さな秤。女性の手提げからは、ガラス瓶がのぞいている。
# speaker: heroine
……あの二人、何か揉めてる。秤と、瓶……？
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_jaipur_main_city_palace_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 【3】頭の札（結果を初めて記録したとき1回当たる）。足した札：審判の報酬のライムの漬物を受け取る
=== gt_jaipur_main_city_palace_battle ===
# scene: battle
# on_done: item gt_jaipur_sushma_lime_pickle
# background: gt_bg_jaipur_city_palace
# speaker: narrator
宮殿の中庭の一角に、人の背丈ほどもある銀の壺が二つ、並んで光っていた。{heroine_name}がその大きさに口を開けていると、すぐ隣で言い争う声が始まった。
# speaker: gt_jaipur_city_palace_woman
五キロ！　五キロのどこが多いの！
# speaker: narrator
サリー姿の女性と、二十代半ばの青年。青年の手には、荷物の重さを測る小さな秤。女性の手提げからは、ガラス瓶がのぞいている。
# speaker: gt_jaipur_city_palace_young_man
母さん、預け荷物は二十三キロまでなんだ。漬物だけで五キロは無理だって
# speaker: gt_vishal
# cutin: name
すみません、騒がしくて。ヴィシャールです。来週、仕事でドイツに発つんです。母のスシュマは、ぼくのために漬けたライムとマンゴーの漬物を、全部持たせるつもりで
# speaker: gt_vishal
最後の週末だから、家族で宮殿を見に来たんですけど
# speaker: enemy
# cutin: name
ちょっと、そこの旅行者さん。あなた、外国から来たのよね
# speaker: heroine
# reaction: heroine,surprised,question
は、はい。日本から……
# speaker: enemy
教えて。外国に家の味を持っていくのは、恥ずかしいこと？
# speaker: narrator
二組の目が、同時に{heroine_name}を見た。母親の目と、息子の目。どちらに答えても、片方が傷つく。
# speaker: heroine
# reaction: heroine,worried,sweat
え、ええと……それは……
# speaker: narrator
スシュマは返事を待たず、銀の壺を指さした。勝ちを確信した弁護士のような手つきだった。
# speaker: enemy
この壺はね、昔の王様が外国へ持っていったのよ。中に何を入れていったと思う？
-> quiz(1) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: enemy
    そう！　ガンジスの水！　王様だって、自分の家の水を持っていったのよ。漬物五キロくらい、何よ
- else:
    # speaker: enemy
    ガンジスの水よ！　王様だって、自分の家の水を壺に詰めて持っていったの。漬物五キロくらい、何よ
}
# speaker: gt_vishal
王様には、荷物の重量制限がなかったんだよ、母さん
# speaker: narrator
ヴィシャールの切り返しに、{heroine_name}は思わず吹き出した。慌てて口を押さえたが、もう遅い。
# speaker: enemy
# reaction: enemy,anger
笑ったわね。審判が笑うなんて
# speaker: heroine
# reaction: heroine,exasperated,sweat
す、すみません！　……でも、どっちの言い分も、ちょっと分かるんです
# speaker: narrator
ヴィシャールが小声で言う。向こうで新しい同僚に、漬物の匂いのする部屋だと思われたくない。最初くらい、身軽に始めたいのだと。
# speaker: narrator
スシュマは聞こえないふりをして、二人を隣の中庭へ引っぱっていった。四方に、色の違う四つの門が並んでいる。
# speaker: enemy
ほら、この門。何を表してるか、あんたは知ってる？　小さい頃に連れてきたのに、どうせ覚えてないでしょう
-> quiz(2) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: enemy
    四つの季節。春も、夏も、秋も、冬も。……うちの台所には、季節ごとの漬物があったの。あんたが忘れても、瓶は覚えてる
- else:
    # speaker: enemy
    四季よ。孔雀が秋で、蓮が夏。……うちの台所にも、季節ごとの漬物があったの。あんたが忘れても、瓶は覚えてる
}
# speaker: narrator
ヴィシャールは、緑の門を見上げたまま黙った。それから、母親に聞こえないくらいの声で言った。
# speaker: gt_vishal
……持っていったら、向こうで毎日食べる。そしたら毎日、帰りたくなる。だから、持っていきたくないんだ
# speaker: narrator
本当の理由は、同僚の目ではなかった。{heroine_name}は少し考えてから、口を開いた。
# speaker: heroine
わたし、旅の途中で、家のお味噌汁が恋しくなることがあります。我慢したら、もっと恋しくなりました
# speaker: heroine
恋しくなるのは、帰る場所があるってことだと思います。……恥ずかしいことじゃ、ないです
# speaker: narrator
スシュマが、こちらを見た。勝ち誇った顔ではなかった。息子が、遠くへ行ってしまうことを、今さら思い知った顔だった。
# speaker: enemy
……ねえ、上を見て。この宮殿の奥には、今も住んでる人がいるのよ。出ていかずに。知ってた？
-> quiz(3) ->
# background: gt_bg_jaipur_city_palace
{ quiz_correct:
    # speaker: heroine
    はい。宮殿の一部は、今も王家の方の住まいなんですよね
- else:
    # speaker: narrator
    案内板には、宮殿の一部が今も王家の住まいだと書いてあった。博物館だけの建物ではないのだ。
}
# speaker: enemy
王様の家族は、まだここに住んでる。……でも、うちの息子は出ていくの
# speaker: narrator
冗談めかした声が、途中でかすれた。ヴィシャールが母親の肩に手を置く。
# speaker: narrator
審判の答えを、二人が待っていた。{heroine_name}は、どちらの側にも立たないことにした。
# speaker: heroine
# emotion: serious
五キロは無理でも、二キロなら入りますよね。……それで、漬物がなくなったら、電話してください。お母さんに、次の分を頼むって
# speaker: heroine
なくなるたびに、電話する理由ができます
# speaker: narrator
スシュマとヴィシャールが、同時に黙った。先に口を開いたのは、母親の方だった。
# speaker: enemy
……毎週よ。日曜の朝。時差があるなら、そっちに合わせてあげる
# speaker: gt_vishal
二キロと、毎週の電話。……分かった
{
- battle_score == 3:
    # speaker: enemy
    審判さん、全問正解ね。うちの息子より、この宮殿に詳しいじゃない
- battle_score == 2:
    # speaker: enemy
    二問正解。審判としては合格。笑ったのは減点だけど
- else:
    # speaker: enemy
    答えは、まあまあね。でも、判定は一番いいのを出してくれた
}
# speaker: narrator
# item_show: gt_jaipur_sushma_lime_pickle
スシュマは手提げから小瓶を一つ取り出し、{heroine_name}の手に握らせた。ライムの漬物。審判の報酬だという。
# speaker: heroine
# reaction: heroine,exasperated,sweat
あ、ありがとうございます。……わたしにも、重量制限が……
# speaker: enemy
二百グラムよ。文句があるなら、電話してちょうだい
-> END
