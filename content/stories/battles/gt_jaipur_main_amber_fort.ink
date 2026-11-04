VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_amber_fort
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
アンベール城の中庭で、帽子を二つ持った男性がスマートフォンを見つめている。隣の鞄から、もう一つ帽子のつばが飛び出していた。
# speaker: heroine
「落ちそうですよ。あ、その……三つ目の帽子が」
# speaker: enemy
「ありがとう。日よけ、予備、なくした時の予備。ハリッシュだ。昔はバスを運転していたから、準備だけはいいんだよ」
# speaker: narrator
男性は鞄を閉じた。画面には同じ中庭の写真が何枚も並んでいる。
# speaker: enemy
「甥に城の写真を三枚送る約束をしてね。どれも同じだと言われない三枚を選びたい」
# speaker: heroine
# emotion: smile
「帽子と違って、予備は要らないんですね」
# speaker: enemy
「そう、それが難しい。君たちは、ここをどう見ている？」
# speaker: narrator
彼女は中庭を見回した。目立つ門へ向いていた指が、ゆっくり下がる。
# speaker: heroine
「写真なら門を入れたいです。でも、ここに人が集まっていた頃のことも、少し知りたい」
# speaker: enemy
「じゃあ、私の候補に付き合ってくれないか。案内で確かめながら、三つ。まずは、この広い中庭が何に使われたか」
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「その通り。帰還した軍隊が、戦利品を人々に示した場所だったんだ」
- else:
「ここは帰還した軍隊が、戦利品を人々に示した場所だったそうだ。今の人の流れとは違うね」
}
# speaker: heroine
# emotion: serious
「大勢が集まった、だけでは分からないですね。誰が何を見せたかったのかも違う」
# speaker: narrator
ハリッシュは写真を一枚残した。画面の隅には、門をくぐろうとする人の小さな姿が写っている。
# speaker: enemy
「勝って帰った側の景色だ、とひと言添えよう。大きくて立派、だけでは済ませたくないな」
# speaker: heroine
「じゃあ、次の写真も説明つきにしましょう。三枚で、長いお便りになりそう」
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「住まいや庭や寺院もある。城の中だけで、ずいぶん違う時間が流れていたんですね」
- else:
「戦うための場所ばかり考えてました。住まいも庭も寺院もあったなら、毎日の使い方はもっと複雑ですね」
}
# speaker: enemy
「私は仕事をしていた時、終点のことばかり考えていた。でも、途中で降りる人にも、それぞれ用事がある」
# speaker: narrator
彼は言ってから、照れたように帽子を持ち替えた。
# speaker: enemy
「いや、城をバスにしてしまった。今日は仕事の話はしないつもりだったのに」
# speaker: heroine
# emotion: smile
「わたしには分かりやすかったです。全部の場所を同じ気分で見なくていいんだって」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「最後も合っている。地下通路でつながる相手は、ジャイガル城だ」
- else:
「地下通路はジャイガル城につながっている。丘の上の城同士に、そういう結び付きもあったんだ」
}
# speaker: heroine
「見える壁だけで終わりじゃないんですね。そっちは、案内図でもう一度見たいな」
# speaker: narrator
通路へ向かう代わりに、二人で地図を確かめる。ハリッシュは三枚目の候補を拡大して、今度はゆっくり画面を閉じた。
# speaker: enemy
{ battle_score == 3:
「三つともよく見ていたね。おかげで、説明の方まで決まった」
- else:
「一緒に確かめられて助かった。人に送る前に話してみると、足りないところが分かる」
}
# speaker: heroine
# emotion: teasing
「それで、三枚に絞れました？」
# speaker: enemy
「三枚送って、続きは甥と来た時に見ようと思う。案内役の練習は、もう少し必要だけどね」
# speaker: narrator
彼は帽子を一つかぶり、残りを鞄へ収める。その足が、出口ではなく次の中庭へ向いた。
# speaker: heroine
# emotion: happy
「練習、続けるんですね。わたしたちも、もう少し見ていこう」
-> END
