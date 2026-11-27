INCLUDE modules.ink
-> DONE

// ジャンタル・マンタルの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_jaipur_jantar_mantar_guide ===
# scene: guide
# background: gt_bg_jaipur_jantar_mantar
# speaker: narrator
# term: gt_term_samrat_yantra
# term: gt_term_jai_prakash
ジャンタル・マンタルの敷地には、見たことのない形が並んでいた。巨大な階段、半球のくぼみ、空に向かって傾いた三角の壁。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_jantar_mantar_guide_001
現代美術の公園……じゃないよね。全部、空を測るための道具なんだって
# speaker: narrator
十八世紀に、ジャイプールを築いた王が造らせた天文台。望遠鏡ではなく、肉眼で星や太陽の位置を測るための、石の道具たちだ。
# speaker: heroine
# voice: gt_jaipur_jantar_mantar_guide_002
# photo: gt_album_j016 # photo_caption: 空を測る、石の道具
道具の中に、人が歩いて入れるんだ。道具の方が、わたしより大きい
# speaker: narrator
# photo: gt_album_j017 # photo_caption: 帽子のつばと、くっきりした影
日差しが強い。{heroine_name}は帽子のつばを下げ、地面に落ちた影の濃さに目を細めた。
# speaker: heroine
# emotion: neutral
# voice: gt_jaipur_jantar_mantar_guide_003
影が、すごくくっきりしてる。……ここだと、影も道具の一部なのかもね
# speaker: narrator
# term: gt_term_dhoti
一番大きな三角の壁の日陰で、白い腰布の老人が、古い冊子を膝に広げて座っていた。そこへ、眼鏡の若い女性が、まっすぐ歩いていく。
# speaker: heroine
# reaction: heroine,worried,question
# voice: gt_jaipur_jantar_mantar_guide_004
……あの人、すごい勢い。何かに怒ってるみたい
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_jaipur_main_jantar_mantar_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_jaipur_main_jantar_mantar_battle ===
# scene: battle
# background: gt_bg_jaipur_jantar_mantar
# speaker: narrator
巨大な三角の斜面が、空に向かって伸びていた。世界でも指折りの大きな日時計、サムラート・ヤントラ。その日陰で、言い争いが始まっていた。
# speaker: gt_jaipur_jantar_woman
# unnamed
# voice: gt_jaipur_main_jantar_mantar_battle_divya_001
十一時四十三分？　天体物理学の博士論文を、占いの時刻に提出しろって言うんですか！
# speaker: narrator
# together: enemy gt_shastri
# term: gt_term_panchang
声の主は、眼鏡の若い女性だった。向かいの石段には、白い腰布の老人が座っている。膝の上に、使い込んだ暦の冊子。
# speaker: narrator
老人は、こちらに軽く会釈した。
# speaker: gt_shastri
# cutin: name
# voice: gt_jaipur_main_jantar_mantar_battle_shastri_001
# term: gt_term_muhurat
シャーストリー。毎朝ここで、影を眺めている。町の占星術師だよ
# speaker: enemy
# cutin: name
# voice: gt_jaipur_main_jantar_mantar_battle_divya_002
ディヴィヤです。ベンガルールの研究所で、星の研究をしています。母が、わたしに黙って、この人に時刻を決めさせたんです
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_main_jantar_mantar_001
それで、直接、抗議に……？
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_003
ええ。この人は、太陽で決めた時刻だと言うんです。でも、根拠がない
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_004
正午は十二時。太陽が一番高いのも十二時。十一時四十三分なんて、ただの思いつきです
# speaker: narrator
シャーストリーは何も言わず、日時計の斜面に落ちた影を、杖の先で示した。
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_005
# photo: gt_album_j018 # photo_caption: 大日時計の日陰の言い争い # photo_with: gt_jaipur_jantar_woman gt_shastri
ちょうどいい。あなた、外国の人ですよね。証人になってください。十二時になったら、この日時計が、わたしの正しさを証明しますから
# speaker: narrator
{heroine_name}は、斜面の影と、女性の自信に満ちた顔を見比べた。ふと、素朴な疑問が浮かぶ。この影は、何の時刻を示しているのだろう。
-> quiz(1) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_jantar_mantar_002
    この日時計が示すのは、ジャイプールの太陽で決まる時刻、なんですよね。携帯の時刻とは、別の
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_006
    ……地方時。もちろん知ってます。天文学の基礎です
- else:
    # speaker: narrator
    シャーストリーが、穏やかに口を開いた。
    # speaker: gt_shastri
    # voice: gt_jaipur_main_jantar_mantar_battle_shastri_002
    影が示すのは、この町の太陽の時刻だよ。あんたの携帯とは違う
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_007
    ……地方時。もちろん知ってます。天文学の基礎です
}
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_008
でも、そんなの誤差でしょう。日時計なんて、だいたいの時刻しか分からない。わたしたちの世界は、秒の単位なんです
# speaker: narrator
老人は、ゆっくり首を振った。そして、斜面の端に刻まれた、細かな目盛りを指さす。
# speaker: gt_shastri
# voice: gt_jaipur_main_jantar_mantar_battle_shastri_003
だいたい、かどうか。この装置がどれだけ細かく時を測れるか、あんたは知っているかね
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_main_jantar_mantar_003
# photo: gt_album_j019 # photo_caption: 目盛りが、すごく細かい
わ……目盛りが、すごく細かい。大きいのは、見せびらかすためじゃなかったんだ
-> quiz(2) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: enemy
    # em: 二秒
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_009
    ……二秒。石の装置で、二秒？　三百年近く前に？
- else:
    # speaker: narrator
    シャーストリーが言った。
    # speaker: gt_shastri
    # em: 二秒
    # voice: gt_jaipur_main_jantar_mantar_battle_shastri_004
    二秒だよ
    # speaker: narrator
    ディヴィヤの口が、半分開いたまま止まった。
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_010
    ……二秒。石の装置で、三百年近く前に？
}
# speaker: narrator
ディヴィヤの声から、とげが少し抜けた。研究者の顔が、斜面の目盛りを追い始める。
# speaker: narrator
正午が近づいた。三人は日陰を出て、影の先端を見守った。ディヴィヤが携帯の画面を掲げる。
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_011
十二時ちょうど。……ほら、影は……
# speaker: narrator
# pause: 800
影は、正午の線に届いていなかった。まだ、目に見えて手前にある。
# speaker: enemy
# reaction: enemy,interrobang
# voice: gt_jaipur_main_jantar_mantar_battle_divya_012
# photo: gt_album_j020 # photo_caption: 十二時ちょうど、届かない影 # photo_with: gt_jaipur_jantar_woman gt_shastri
どうして？　太陽が一番高いのは、十二時のはずなのに
# speaker: narrator
シャーストリーは暦の冊子を閉じ、ようやく立ち上がった。若い天文学者に向ける目は、意地悪ではなかった。孫の宿題を見る目だった。
-> quiz(3) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_jantar_mantar_battle_001
    携帯の時刻は、国の標準時ですよね
    # speaker: heroine
    # voice: gt_jaipur_main_jantar_mantar_battle_002
    ジャイプールの太陽の時刻にするには、経度の差と、季節のずれを直さないといけないんだと思います
- else:
    # speaker: narrator
    斜面の脇の案内板に、換算の説明があった。日時計の地方時を標準時に直すには、経度の差と季節のずれを補正する。
}
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_013
……ジャイプールは、標準時の基準より西。だから、ここの太陽が南中するのは、十二時より遅い
# speaker: narrator
ディヴィヤは自分の額に手を当てた。知っていたはずのことだった。ただ、目の前の老人が知っているとは、思っていなかった。
# speaker: narrator
シャーストリーが暦を開いて見せた。十一時四十三分の横に、細かな数字の換算が書き込まれている。
# speaker: gt_shastri
# voice: gt_jaipur_main_jantar_mantar_battle_shastri_005
この町の太陽で計算して、あんたの携帯の時刻に直してある。あんたのお母さんは、携帯の時刻しか見ないからね
# speaker: enemy
# reaction: enemy,sweat
# voice: gt_jaipur_main_jantar_mantar_battle_divya_014
……根拠がない、なんて言って。すみませんでした
# speaker: narrator
老人は笑って手を振った。
# speaker: gt_shastri
# voice: gt_jaipur_main_jantar_mantar_battle_shastri_006
占いを信じろとは言わないよ。ただ、時計の読み方は、昔からここで教わってきたんだ
# speaker: heroine
# voice: gt_jaipur_main_jantar_mantar_005
ディヴィヤさん、論文、何時に出すんですか？
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_015
……十一時四十三分に出します。占いを信じたからじゃない。中身は、何時に出しても、わたしのものだから
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_016
だったら時刻くらい、母にあげてもいい。母が安心して眠れるなら、それも計算のうちです
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_017
    証人さん、全部正解でしたね。……わたしより、先に気づいてた
- battle_score == 2:
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_018
    二問正解。証人としては十分です。一問くらい外してくれないと、わたしの立場がなかった
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_jantar_mantar_battle_divya_019
    わたしも、あなたも、今日は間違えた。間違えた人が多い日の方が、たくさん学べるんです
}
# speaker: narrator
帰りぎわ、ディヴィヤは老人の隣に座り直した。
# speaker: enemy
# voice: gt_jaipur_main_jantar_mantar_battle_divya_020
影の読み方を、最初から教えてもらえますか
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_jaipur_main_jantar_mantar_006
# photo: gt_album_j021 # photo_caption: 天文学者と占星術師が、同じ影を # photo_with: gt_jaipur_jantar_woman gt_shastri
天文学者と占星術師が、同じ影を見てる。……なんだか、いい眺め
-> END
