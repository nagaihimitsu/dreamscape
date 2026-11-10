INCLUDE modules.ink
# background: gt_bg_jaipur_jantar_mantar
# speaker: narrator
巨大な三角の斜面が、空に向かって伸びていた。世界でも指折りの大きな日時計、サムラート・ヤントラ。その日陰で、言い争いが始まっていた。
# speaker: enemy
「十一時四十三分？　天体物理学の博士論文を、占いの時刻に提出しろって言うんですか！」
# speaker: narrator
声の主は、眼鏡の若い女性だった。向かいの石段には、白い腰布の老人が座っている。膝の上に、使い込んだ暦の冊子。
# speaker: narrator
老人はシャーストリー。毎朝ここで影を眺めている、町の占星術師だという。女性の母親が、娘の論文の提出に一番よい時刻を、彼に頼んだのだ。
# speaker: enemy
「ディヴィヤです。ベンガルールの研究所で、星の研究をしています。母が、わたしに黙って、この人に時刻を決めさせたんです」
# speaker: heroine
# reaction: heroine,surprised,question
「それで、直接、抗議に……？」
# speaker: enemy
「ええ。それに、この人の時刻には根拠がない。正午は十二時。太陽が一番高いのも十二時。十一時四十三分なんて、ただの思いつきです」
# speaker: narrator
シャーストリーは何も言わず、日時計の斜面に落ちた影を、杖の先で示した。
# speaker: enemy
「ちょうどいい。あなた、外国の人ですよね。証人になってください。十二時になったら、この日時計が、わたしの正しさを証明しますから」
# speaker: narrator
{heroine_name}は、斜面の影と、女性の自信に満ちた顔を見比べた。ふと、素朴な疑問が浮かぶ。この影は、何の時刻を示しているのだろう。
-> quiz(1) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: heroine
    「この日時計が示すのは、ジャイプールの太陽で決まる時刻、なんですよね。携帯の時刻とは、別の」
    # speaker: enemy
    「……地方時。もちろん知ってます。天文学の基礎です」
- else:
    # speaker: narrator
    シャーストリーが、穏やかに口を開いた。「影が示すのは、この町の太陽の時刻だよ。あんたの携帯とは違う」
    # speaker: enemy
    「……地方時。もちろん知ってます。天文学の基礎です」
}
# speaker: enemy
「でも、そんなの誤差でしょう。日時計なんて、だいたいの時刻しか分からない。わたしたちの世界は、秒の単位なんです」
# speaker: narrator
老人は、ゆっくり首を振った。そして、斜面の端に刻まれた、細かな目盛りを指さす。
# speaker: narrator
「だいたい、かどうか。この装置がどれだけ細かく時を測れるか、あんたは知っているかね」
# speaker: heroine
# emotion: smile
「わ……目盛りが、すごく細かい。大きいのは、見せびらかすためじゃなかったんだ」
-> quiz(2) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: enemy
    「……二秒。石の装置で、二秒？　三百年近く前に？」
- else:
    # speaker: narrator
    シャーストリーが言った。「二秒だよ」。ディヴィヤの口が、半分開いたまま止まった。
    # speaker: enemy
    「……二秒。石の装置で、三百年近く前に？」
}
# speaker: narrator
ディヴィヤの声から、とげが少し抜けた。研究者の顔が、斜面の目盛りを追い始める。
# speaker: narrator
正午が近づいた。三人は日陰を出て、影の先端を見守った。ディヴィヤが携帯の画面を掲げる。
# speaker: enemy
「十二時ちょうど。……ほら、影は……」
# speaker: narrator
影は、正午の線に届いていなかった。まだ、目に見えて手前にある。
# speaker: enemy
# reaction: enemy,interrobang
「どうして？　太陽が一番高いのは、十二時のはずなのに」
# speaker: narrator
シャーストリーは暦の冊子を閉じ、ようやく立ち上がった。若い天文学者に向ける目は、意地悪ではなかった。孫の宿題を見る目だった。
-> quiz(3) ->
# background: gt_bg_jaipur_jantar_mantar
{ quiz_correct:
    # speaker: heroine
    「携帯の時刻は、国の標準時ですよね。ジャイプールの太陽の時刻にするには、経度の差と、季節のずれを直さないといけないんだと思います」
- else:
    # speaker: narrator
    斜面の脇の案内板に、換算の説明があった。日時計の地方時を標準時に直すには、経度の差と季節のずれを補正する。
}
# speaker: enemy
「……ジャイプールは、標準時の基準より西。だから、ここの太陽が南中するのは、十二時より遅い」
# speaker: narrator
ディヴィヤは自分の額に手を当てた。知っていたはずのことだった。ただ、目の前の老人が知っているとは、思っていなかった。
# speaker: narrator
シャーストリーが暦を開いて見せた。十一時四十三分の横に、細かな数字の換算が書き込まれている。
# speaker: narrator
「この町の太陽で計算して、あんたの携帯の時刻に直してある。あんたのお母さんは、携帯の時刻しか見ないからね」
# speaker: enemy
# reaction: enemy,sweat
「……根拠がない、なんて言って。すみませんでした」
# speaker: narrator
老人は笑って手を振った。占いを信じろとは言わない。ただ、時計の読み方は、昔からここで教わってきたのだと。
# speaker: heroine
「ディヴィヤさん、論文、何時に出すんですか？」
# speaker: enemy
「……十一時四十三分に出します。占いを信じたからじゃない。中身は、何時に出しても、わたしのものだから」
# speaker: enemy
「だったら時刻くらい、母にあげてもいい。母が安心して眠れるなら、それも計算のうちです」
{
- battle_score == 3:
    # speaker: enemy
    「証人さん、全部正解でしたね。……わたしより、先に気づいてた」
- battle_score == 2:
    # speaker: enemy
    「二問正解。証人としては十分です。一問くらい外してくれないと、わたしの立場がなかった」
- else:
    # speaker: enemy
    「わたしも、あなたも、今日は間違えた。間違えた人が多い日の方が、たくさん学べるんです」
}
# speaker: narrator
帰りぎわ、ディヴィヤは老人の隣に座り直した。影の読み方を、最初から教えてほしいと頼んでいる。
# speaker: heroine
# reaction: heroine,smile,music
「天文学者と占星術師が、同じ影を見てる。……なんだか、いい眺め」
-> END
