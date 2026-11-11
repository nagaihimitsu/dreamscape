INCLUDE modules.ink
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
ハワー・マハルの正面は、通りに向かって無数の小窓を広げていた。{heroine_name}が見上げて立ち止まると、足もとから声が飛んだ。
# speaker: enemy
そこ、うちの大根に影が落ちてるよ
# speaker: narrator
歩道の端に布を敷き、野菜を並べている女性がいた。大根、人参、オクラ、小ぶりのトマト。古い日傘を、竿にくくりつけている。
# speaker: heroine
# reaction: heroine,surprised,sweat
す、すみません！　……写真を撮ろうとしてて
# speaker: enemy
撮るなら、大根も一緒に入れなさい。四十年、あの窓の下にいるのは、こっちなんだから
# speaker: enemy
ガウラよ。この歩道で野菜を売って四十年。朝四時に卸の市場で仕入れて、昼過ぎまでここに座ってる。膝が痛いのは、三十年前から
# speaker: heroine
四十年……じゃあ、中にも何度も？
# speaker: enemy
一度も。入場券の値段で、トマトが何キロ買えると思う。それに、あれは王様の女の人たちの建物。私らのじゃない
# speaker: narrator
ガウラはトマトを一つ磨きながら、窓を見上げた。四十年見上げてきた人の、慣れた角度だった。
# speaker: enemy
ねえ、外国の娘さん。上に行くなら、頼みがあるの
# speaker: heroine
頼み、ですか？
# speaker: enemy
窓から、私を見て。上からだと、私がどう見えるか。帰りに教えてちょうだい
# speaker: narrator
冗談のような口ぶりだった。けれど、トマトを磨く手は止まっていた。
# speaker: heroine
# emotion: serious
……はい。ちゃんと見てきます
# speaker: enemy
ついでに、あの屋根の形。ガイドが毎日、何かにたとえてるのよ。四十年聞いてるのに、いつも途中で客が来て聞きそびれる
-> quiz(1) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: enemy
    クリシュナ様の冠！　それそれ。四十年かかって、やっと最後まで聞けた
- else:
    # speaker: enemy
    ……今、隣のガイドが言ったわ。クリシュナ様の冠だって。あんたのおかげで、四十年ぶりに最後まで聞けた
}
# speaker: narrator
ガウラは満足そうに、オクラの山を整え直した。そして、思い出したように付け加える。
# speaker: enemy
それとね。窓の数も数えたのよ。暇な日に、少しずつ。何度数えても九百五十一。ガイドの言う数と、合わないの
# speaker: narrator
入口は正面ではなく、裏手の路地にあった。券を買って中へ入ると、{heroine_name}は首をかしげた。上の階が見えるのに、どこにも階段がない。
# speaker: heroine
# reaction: heroine,surprised,question
あれ……どうやって上がるの？
-> quiz(2) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    坂道だ。階段じゃなくて、ゆるい坂でぐるぐる上がっていくんだ
- else:
    # speaker: narrator
    係員が指さした先に、ゆるい坂道があった。階段ではなく、傾斜路で上の階へ上がるのだ。
}
# speaker: narrator
上の階へ行くほど、通路は細くなっていった。小窓の格子に顔を寄せると、通りが真下に広がっていた。
# speaker: narrator
車、リキシャ、牛、人。そのすべてが、こちらに気づかずに流れていく。
# speaker: narrator
古い日傘はすぐに見つかった。ガウラは客と値段で揉めていた。それから、通りがかった子どもに、トマトを一つ黙って渡した。日傘の陰で髪を直し、膝をさすった。
# speaker: heroine
# emotion: neutral
……ここにいた人たちも、毎日こうやって見てたんだ。下の人は、上に誰がいるか知らないまま
# speaker: narrator
窓の数を数えようとして、{heroine_name}はすぐに諦めた。中からでは、とても数えきれない。ガウラは四十年、外から数え続けてきたのだ。
-> quiz(3) ->
# background: gt_bg_jaipur_hawa_mahal
{ quiz_correct:
    # speaker: heroine
    九百五十三、なんだって。ガウラさんの九百五十一、ほとんど合ってます
- else:
    # speaker: narrator
    出口の案内板に、窓の数が書いてあった。九百五十三。ガウラの数とは、二つしか違わない。
}
# speaker: narrator
通りに戻ると、ガウラが待ちかねた顔で手招きした。
# speaker: enemy
で？　私は、どう見えた
# speaker: heroine
ガウラさんは、お客さんと値段で喧嘩してました。それから、子どもにトマトを一つあげてました。誰にも見られてないと思って
# speaker: heroine
……上から見たガウラさんが、通りで一番、生きてるって感じがしました
# speaker: narrator
ガウラは何も言わず、日傘の竿を握り直した。目が、少し赤かった。
# speaker: heroine
# emotion: smile
あの、今度、一緒に上に行きませんか。入場券は、わたしが……
# speaker: enemy
# reaction: enemy,anger
施しはいらないよ
# speaker: narrator
ぴしゃりとした声だった。{heroine_name}は、自分の言葉が何をしたのかに気づいた。
# speaker: heroine
# emotion: worried
……ごめんなさい。聞きもしないで、決めちゃいました
# speaker: enemy
行くなら、自分のお金で、自分の足で行く。……今の話を聞いたら、行きたくなったわ。膝が言うことを聞く日にね
{
- battle_score == 3:
    # speaker: enemy
    あんた、全部ちゃんと見てきたね。屋根も、坂も、窓の数も。それに、私も
- battle_score == 2:
    # speaker: enemy
    一つ取りこぼしたって、いいのよ。私なんか四十年、窓の数を二つ取りこぼしてた
- else:
    # speaker: enemy
    答えは、まあ、外れが多かったわね。でも、一番大事な頼みごとは、ちゃんとやってきた
}
# speaker: narrator
ガウラは大根を一本、新聞紙でくるんで差し出した。報告のお礼だという。
# speaker: heroine
# reaction: heroine,exasperated,sweat
だ、大根……。ホテルで、どうしよう……
# speaker: enemy
宿の台所に渡しなさい。明日の朝、あんたの皿に戻ってくるから
-> END
