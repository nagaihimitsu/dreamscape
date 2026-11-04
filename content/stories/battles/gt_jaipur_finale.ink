VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_jantar_mantar
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "after_3": -> after_third }
{ battle_scene == "after_4": -> after_fourth }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: narrator
ジャンタル・マンタルで待ち合わせの相手を探すと、男性がこちらへ手を振った。連絡に添えられていた写真と同じ、四角い眼鏡をかけている。
# speaker: enemy
「ラヴィです。ニールから聞いているよ。三分の作品が、三都市を通ってついに到着した！」
# speaker: heroine
# emotion: surprised
「そんなに大きく紹介されると、ちょっと困ります。旅行中に撮った、短い動画なので」
# speaker: enemy
「それが見たいんだ。私の友人も何人か、見学が終わったら合流する。画面は小さいけど、ちゃんと上映会だよ」
# speaker: narrator
互いに名乗り、彼女が動画の長さを見せる。ラヴィは画面へ顔を寄せて、指で小さく丸を作った。
# speaker: enemy
「三分以内。よし。ニールはこの約束を守れないことがある。自分で決めたのにね」
# speaker: heroine
# emotion: smile
「どこを切るかで、すごく迷いました。アーグラでは、一度つないだ順番を変えて」
# speaker: enemy
「そうやってできた一本か。紹介は私に任せて。二人の大冒険を、壮大に――」
# speaker: heroine
「あまり、壮大にしないでくださいね。余計に緊張しそう」
# speaker: narrator
ラヴィは両手を小さく広げ直した。彼女は笑ったが、画面を持つ指には少し力が入っている。
# speaker: enemy
「では小さく、正確に。その前に、私の五問に付き合ってくれる？　街を見た人と答え合わせをするのが好きなんだ」
# speaker: heroine
「上映の審査ではないですよね？」
# speaker: enemy
「違う違う。点数で動画を取り上げたりしない。映像の説明に間違いを混ぜないためにも、楽しく確かめよう」
# speaker: narrator
彼女の指が少し緩む。スマートフォンをしまい、ラヴィの持つ街の写真へ目を向けた。
-> END

=== after_first ===
# speaker: enemy
{ answer_correct:
「いいね。アンベールは中庭を備えた区画に分かれていて、場所ごとに役割がある」
- else:
「アンベールには中庭を備えた区画があり、場所ごとに役割が違う。大きい城、の一言でまとめるともったいないね」
}
# speaker: heroine
「門をくぐったら、まだ先があった。初めに思っていたより、ずっと中が広かったです」
# speaker: enemy
「その時の顔も撮っておけばよかったね」
# speaker: heroine
# emotion: teasing
「そういう時は、撮る方も見上げてるんです。二人とも画面のことを忘れて」
# speaker: narrator
ラヴィが楽しそうにうなずく。動画に入っていない話まで聞きたくなった顔だった。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「格子の内側から、街の様子を眺めていた。外観だけ撮ると、その人の目線は見えないですね」
- else:
「街から姿を見られずに外を眺める格子だったんですね。見える側と見られる側を、逆に考えてしまいました」
}
# speaker: enemy
「私は窓を数えている途中で、いつも諦める。誰かに数えてもらった方が早い」
# speaker: heroine
# emotion: smile
「それは、自分で見たふりをしなければ大丈夫そう」
# speaker: narrator
ラヴィは胸に手を当て、大げさにうなずいた。彼女の返事も、少し速くなっている。
# speaker: enemy
「分かった。数え終えていないと正直に言う。次は、宮殿を支えた仕事の話だ」
-> END

=== after_third ===
# speaker: enemy
{ answer_correct:
「その通り。シティ・パレスには、王の住まいだけではない活動や、芸術・工芸を支える役割があった」
- else:
「シティ・パレスは住まいだけでなく、さまざまな活動の場で、芸術や工芸も支えていたんだ」
}
# speaker: heroine
「作品を見ていると、作った人の話も聞きたくなります。どうしてこの形にしたのかなって」
# speaker: enemy
「じゃあ私も、あとで君に聞こう。どうしてその場面を選んだのか。私が紹介する時の材料にもなる」
# speaker: narrator
彼女は答えかけて、スマートフォンの入った鞄へ手を置いた。
# speaker: heroine
# emotion: neutral
「うん。……その話なら、わたしにも、話したいことがあります」
-> END

=== after_fourth ===
# speaker: heroine
{ answer_correct:
「大きな装置で、肉眼で天体の位置を測る。見慣れた空でも、測り方が変わると分かることが増えるんですね」
- else:
「肉眼で天体の位置を測るための装置なんですね。大きな建物として見ていたから、道具としての見方が抜けてました」
}
# speaker: enemy
「私の時計は小さいけどね。三分の約束を守ってもらうには、これで十分だ」
# speaker: heroine
# emotion: teasing
「ラヴィさんの紹介が三分を超えないように、わたしも時計を見ていていいですか？」
# speaker: enemy
「それは強敵だ。では、最後の一問まで真面目に。ここに集まった知識の話をしよう」
# speaker: narrator
彼女は鞄から手を離した。今はもう、ラヴィの顔をまっすぐ見ている。
-> END

=== conclusion ===
# speaker: enemy
{ answer_correct:
「最後も、その通り。異なる文化の知識が出会い、この観測所の仕事へつながった」
- else:
「ここは異なる文化の天文学が出会った場所だ。一人の頭の中だけで、すべてができたわけではないんだね」
}
# speaker: narrator
ラヴィは写真を片づけ、彼女に小さく一礼した。遠くで、こちらへ合図を送る人がいる。
# speaker: enemy
{
- battle_score == 5:
「五問とも正解。私の方が、説明を間違えないように気をつけないと」
- battle_score >= 3:
「よく見てきたね。確かめたところも含めて、これで街の話は安心してできる」
- else:
「一緒に確かめられてよかった。分からなかったところを、分かったふりで話さずに済む」
}
# speaker: heroine
# emotion: serious
「ラヴィさん。最初の紹介、少しだけわたしが話してもいいですか？」
# speaker: enemy
「もちろん。私の出番を、何秒残してくれる？」
# speaker: heroine
# emotion: smile
「名前を呼ぶところまで。あとは、わたしが」
# speaker: narrator
言い終えてから、彼女は一度だけこちらを見た。うなずくと、スマートフォンを取り出して動画の最初へ戻す。
# speaker: enemy
「了解。紹介を短くする、いちばんいい方法が見つかった。では、見せてもらおうか」
# speaker: heroine
「はい。上手にできたかは分からないけど。これを見せたい、というところまでは決めました」
# speaker: narrator
彼女が画面を明るくする。最初の一枚が、その手の中に現れた。
-> END
