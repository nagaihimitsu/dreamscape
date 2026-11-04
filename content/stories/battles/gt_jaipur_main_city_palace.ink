VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_city_palace
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
シティ・パレスの中庭で、小さな女の子が両手の指を組み合わせている。父親はその隣で、同じことをずっと不器用に繰り返していた。
# speaker: heroine
「あっ。門の形？」
# speaker: narrator
女の子がぱっとこちらを向き、うなずいた。父親は自分の指をほどき、少し肩をすくめる。
# speaker: enemy
「先に分かってしまったね。私はヴィクラム。仕立ての仕事なら手先には自信があるんだが、これは別らしい」
# speaker: heroine
# emotion: smile
「わたしも、手だけでは分からなかったと思います。向こうの形と一緒に見たから」
# speaker: enemy
「娘は形を見る。私は作った手間が気になる。それぞれの説明が長くて、なかなか先へ進めないんだ」
# speaker: narrator
女の子は父親を指さしてから、大きく両手を広げた。長いのはそちら、と言っているようだ。
# speaker: enemy
「そうか、私の方が長いか。では、説明の代わりに三問。君たちにも参加してもらっていいかな」
# speaker: heroine
# emotion: teasing
「三問のあとに、長い解説がついてくる気もします」
# speaker: enemy
「見抜かれた。短くするよ。まず、ここがどんな人の活動を支えていた場所なのか、そこから」
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「そう。王の住まいであるだけでなく、行政や儀礼、人の集まる活動の場でもあった」
- else:
「住まいだけではないんだ。行政や儀礼、人の集まる活動も、宮殿の役割だった」
}
# speaker: heroine
「建物の名前だけだと、中の人まで一人にして考えてしまいますね。こんなに場所があるのに」
# speaker: narrator
女の子が中庭を横切る人を目で追い、自分の指で作った小さな門をのぞく。
# speaker: enemy
「私の店だって、客から見えるのは仕立て屋だけだ。でも布を届ける人も、直しを取りに来る人もいる」
# speaker: heroine
# emotion: smile
「一つの場所に、用事がたくさん集まる。そう考えると、歩いている人が増えて見えます」
-> END

=== after_second ===
# speaker: enemy
{ answer_correct:
「その通り。宮廷は多くの芸術や工芸を支えた。注文する人のそばには、作る仕事をする人がいる」
- else:
「宮廷はさまざまな芸術や工芸を支えたんだ。飾られた品から、作る仕事の方もたどれる」
}
# speaker: narrator
彼は空中で布を測るように、指先を広げた。娘がすぐに同じ動きをまねる。
# speaker: heroine
「仕事の話になると、手が先に動くんですね」
# speaker: enemy
「おっと。店では、説明がうまくなくても手で示せるからね。ここでは何も縫えないのに」
# speaker: heroine
# emotion: happy
「でも、分かりやすいです。今なら、その指で何を測っているか少し分かる」
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「そうだね。集められ、制作を依頼された品々が、今は博物館で地域の文化を伝えている」
- else:
「王家が集めたり、制作を依頼したりした品々を、博物館として見せている。昔の役割と今の役割は、同じではないんだ」
}
# speaker: narrator
娘が父親の袖を引き、小声で何か言った。ヴィクラムはうなずき、広げていた案内を畳む。
# speaker: enemy
「次は娘が選ぶ番だそうだ。私が見たかった場所には、もう十分付き合ってくれたからね」
# speaker: heroine
「どこに行きたいの？」
# speaker: narrator
「きれいなところ」と、女の子が答える。彼女は笑いかけてから、中庭を見回した。
# speaker: heroine
# emotion: surprised
「それ、ここだと難しいね。候補が多い」
# speaker: enemy
{ battle_score == 3:
「全部よく知っていたね。案内を頼みたいくらいだが、今日はこの小さな案内役が先だ」
- else:
「一緒に考えてくれてありがとう。帰ってから娘と話すことも、また増えた」
}
# speaker: narrator
父娘は並んで歩き出す。今度は娘の手が忙しく動き、父親の顔がそちらへ向いていた。
# speaker: heroine
# emotion: smile
「帰り道の話も長くなりそう。あの二人、けっこう似てるね」
-> END
