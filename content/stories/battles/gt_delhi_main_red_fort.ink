VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_delhi_red_fort
# speaker: enemy
# reaction: enemy,exclamation
「そこから入ったら負け」
# speaker: narrator
レッド・フォートの見学路で、{heroine_name}の足が止まる。声をかけた女性は、慌てて手帳を持ち上げた。
# speaker: enemy
「こっちの城の話。ごめん。現物は、もちろん見学の案内どおり」
# speaker: narrator
ターラーと名乗った彼女の手帳には、友達と遊ぶ盤面がある。壁の中は『広場』『広場』『かなり広い広場』で埋まっていた。
# speaker: heroine
# reaction: heroine,teasing,music
「最後の広場だけ、気合が入ってますね」
# speaker: enemy
「仕事じゃ荷物の行き先を全部決めるのに、休みの日は三マスで行き詰まる。入っていいよ。負けるけど」
# speaker: heroine
# reaction: heroine,surprised,interrobang
「入っても入らなくても負けませんか？」
# speaker: narrator
ターラーは口元だけ笑う。昨日、友人に同じ手で負けたので、自分の版では勝ちたいのだという。
# speaker: heroine
# emotion: serious
「でも、この中で暮らす人の場所がないです。城を取っても、帰れない」
# speaker: enemy
「住む？　ここを？　……待って。私、防御だけ見てた？」
# speaker: narrator
彼女が開いた城の説明に、駒を置く手が止まる。まずは、この城が新しい都に造られた理由から読み直すことになった。
-> END

=== after_first ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「宮殿要塞。皇帝も暮らす。私の城、雇い主の家がなかった」
- else:
    # speaker: enemy
    「新都の中心の宮殿要塞なんだ。防衛だけじゃなく、皇帝の住まい。二人して立ち退かせるところだった」
}
# speaker: narrator
ターラーは『かなり広い広場』を宮殿に直し、隅に小さく『食事中は攻撃不可』と書いた。
# speaker: heroine
「それは、昔の決まり？」
# speaker: enemy
# reaction: enemy,music
「私の決まり。昨日、おやつを取りに行った隙に負けたから」
# speaker: heroine
# reaction: heroine,teasing,question
「歴史を直すより、仕返しが進んでる気がします」
# speaker: narrator
ターラーは聞こえなかった顔で、建物をつなぐ線へ駒を置く。こちらが配置図を示すと、彼女は指を止めた。
# speaker: enemy
「これ、通り道にしていい線？　色を決める前に知りたい」
-> END

=== after_second ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「水路。ナフル・イ・ベヒシュト。宮殿の居室をつないでいた……この駒、泳いでる」
- else:
    # speaker: enemy
    「道じゃなく、水路だって。ナフル・イ・ベヒシュトが居室をつないでいた。移動のルールも直さなきゃ」
}
# speaker: narrator
青く塗った線が、勢い余って宮殿までにじむ。ターラーは黙って手帳を遠ざけた。
# speaker: heroine
# reaction: heroine,happy,music
「大変。皇帝の家が、またなくなりました」
# speaker: enemy
# reaction: enemy,sweat
「乾かしてる。歴史的な被害には数えないで」
# speaker: narrator
笑いながらあおぐうち、別のページが開いた。城を取ったら終わり、と太い線で囲まれている。
# speaker: heroine
「本物は、取ったところで終わってないですよね。説明の続き、もっと後まであります」
# speaker: enemy
「ゲームを長くする相談なら、慎重に聞きます。仕事があるので」
-> END

=== conclusion ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「宮殿、英軍の施設、独立を祝う場所。同じ壁でも、そこでやることが変わってきたのか」
- else:
    # speaker: enemy
    「宮殿の後は英軍の施設にもなって、やがて独立を祝う場所になったんだ。勝った人の名前だけ変えるんじゃ足りないね」
}
# speaker: narrator
ターラーは『城を取ったら終わり』を見つめる。それから消さず、線をもう一本引いた。
# speaker: heroine
# reaction: heroine,surprised,question
「そこは、変えないんですか？」
# speaker: enemy
「変えない。私の休み、帝国の歴史ほど長くないから。ゲームはここまで。本物の続きは、見に行く」
{
- battle_score == 3:
    # speaker: enemy
    「建物の方は全部取られた。でも盤面なら、まだ負けてない」
- battle_score == 2:
    # speaker: enemy
    「二つ見つかった。見落とした一つは、地図を挟んでおく。未来の私に任せる」
- else:
    # speaker: enemy
    「調べ直すページが増えたね。私も広場三つで済ませた前科があるので、追及はしません」
}
# speaker: narrator
二人の見学者の印を置くと、ターラーはその先へ、もう一つ小さな四角を足した。
# speaker: enemy
# reaction: enemy,music
「では、新ルール。見学の人も、おやつの時間は帰る」
# speaker: heroine
# reaction: heroine,exasperated,sigh
「その友達、よほど悔しかったんですね」
# speaker: narrator
ターラーは否定せず、にじんだ青をあおぎ続けた。二人は実物の水路を見に行く。こちらの城には、ターラーの新ルールはない。
-> END
