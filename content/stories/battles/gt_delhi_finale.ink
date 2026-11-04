VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "after_3": -> after_third }
{ battle_scene == "after_4": -> after_fourth }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_delhi_red_fort
# speaker: narrator
レッド・フォートの見学路の脇で、{heroine_name}がスマートフォンを覗いていた。クトゥブ・ミナールを撮った動画が空になり、二人の笑い声が小さく流れる。
# speaker: enemy
「今の、自分で撮ったの？」
# speaker: narrator
少し離れた所から、青年が声をかけた。手には写真の束と、小さな旅行鞄。彼は先に、ニールと名乗った。
# speaker: heroine
「はい。塔を撮るつもりだったんですけど、途中から空になって」
# speaker: enemy
「ごめん、笑い声が聞こえて気になった。僕も旅の動画を撮ってる。見てもいい？」
# speaker: narrator
彼女は少し考えてから、画面を向ける。ニールも同じところで笑った。
# speaker: enemy
「この後、どこへ？　僕はアーグラ、それからジャイプール。向こうで友達と、旅行の映像を見せ合うんだ」
# speaker: heroine
# emotion: surprised
「同じ順番です。映像って、映画みたいな？」
# speaker: enemy
「もっと小さい。ジャイプールで仲間が数人集まって、短い映像を見せ合うだけ。一人三分。長いと、みんなおやつの方を見始める」
# speaker: narrator
彼は笑って、二人にも参加しないかと誘った。{heroine_name}の指が、動画を閉じる寸前で止まる。
# speaker: heroine
「三分なら……でも、景色を撮っただけでもいいんですか？」
# speaker: enemy
「もちろん。試しに、僕が持ってきた五枚で遊んでみる？　何を見た写真か、裏の説明を当てる勝負」
# speaker: narrator
ニールは写真を一枚だけ表にした。赤い壁の内側を写した、自分の写真だという。
# speaker: enemy
「点数で参加を決めるんじゃないよ。どこに興味を持つか知りたい。最初はこの城の中で、部屋と部屋をつないでいたもの」
-> END

=== after_first ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「水路。外の壁だけを撮ったら、中を水が通っていたことは伝わらないね」
- else:
    # speaker: heroine
    「宮殿の居室を水路がつないでいたんだ。赤い壁の写真だけだと、思い出すきっかけが少ないかも」
}
# speaker: enemy
「説明を入れるなら、ここで一言。それ以上長いと、次の写真に行きたくなる」
# speaker: narrator
ニールの指は、もう次の一枚を押し出していた。彼女はそれを目で追って、少し笑う。
# speaker: heroine
「早いですね。わたし、今やっと中に入ったところでした」
# speaker: enemy
「編集してる時も、よく言われる。じゃあ一呼吸。次は、低いまま残った塔」
-> END

=== after_second ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「クトゥブ・ミナールの二倍を目指した、未完の塔。小さく写っても、小さな計画じゃなかった」
- else:
    # speaker: heroine
    「アラーイー・ミナールは、クトゥブ・ミナールの二倍を目指したんだよね。第一層までの姿から、その先を想像した」
}
# speaker: narrator
彼女は自分の画面を見た。塔の先を追って、空へ行ってしまう動画の冒頭が止まっている。
# speaker: enemy
「君の動画なら、きれいに塔が入った所を最初にして、空のところを切れば短くなる」
# speaker: heroine
「そうですね。……そこは、後で自分でも見比べたいです」
# speaker: narrator
ニールは気軽にうなずき、庭の写真を出した。建物より、そこへ続く道が大きく写っている。
# speaker: enemy
「次は、この庭。墓の周りの余った場所、と説明したら、何を見落としている？」
-> END

=== after_third ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「水路に、楽園の川のイメージがある。建物だけでなく、庭も見に行ったんだよね」
- else:
    # speaker: heroine
    「フマユーン廟の庭の水路は、楽園の川と結び付けて説明される。墓までの道というだけじゃなかった」
}
# speaker: narrator
彼女は写真の道を指でたどりかけ、触れずに手を止めた。
# speaker: heroine
「ここ、歩いて近づいた時にうれしかった。全部三分にするなら、その感じはどうやって残すんだろう」
# speaker: enemy
「君が話してもいい。僕なら建物を先に見せるけど」
# speaker: narrator
ニールは四枚目を出す。ジャーマー・マスジドの中庭。人の姿も、小さく写っていた。
# speaker: enemy
「これを撮る時は、建物の形以外にも考えることがある。今のこの場所を、どう見る？」
-> END

=== after_fourth ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「今も祈りに来る人がいる場所。わたしたちの映像のために、邪魔していいわけじゃない」
- else:
    # speaker: heroine
    「昔の建物を見る場所である前に、今も礼拝に訪れる人がいるモスクなんだよね。見学や撮影の案内も確かめた」
}
# speaker: enemy
「うん。写したくなった人がいても、相手に聞く。断られたら、撮らない」
# speaker: narrator
彼女はうなずき、自分の動画の一覧を眺めた。残したいものと、カメラを向けなかったものが、頭の中で別々に並ぶ。
# speaker: heroine
「少し、作ってみたくなってきました。三分で、見たものを全部言おうとしなければ」
# speaker: enemy
「じゃあ最後。デリーからアーグラへ行く二人に、ぴったりの一枚」
# speaker: narrator
最後の写真はフマユーン廟だった。裏には、まだ訪ねていない建物へ続く説明がある。
-> END

=== conclusion ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「タージ・マハルへ。次の街で見る時、ここで歩いた庭も思い出せるね」
- else:
    # speaker: heroine
    「この庭園墓は、後のタージ・マハルにも影響した。別々に覚えるより、アーグラで比べてみたいな」
}
{
- battle_score == 5:
    # speaker: enemy
    「五枚とも正解。僕の方が、君たちの三分を見たくなった」
- battle_score >= 3:
    # speaker: enemy
    「いい勝負だった。写真の外の話まで出てきて、僕も楽しかった」
- else:
    # speaker: enemy
    「今回は僕の勝ち。でも、思い出す時の顔がいいね。そこは点数にできない」
}
# speaker: narrator
ニールは写真を片づけた。{heroine_name}はスマートフォンを持ち直し、こちらの目を見る。
# speaker: heroine
# emotion: serious
「わたし、参加してみたい。上手にできるかは、まだ分からないけど」
# speaker: narrator
こちらがうなずくと、彼女はニールへ向き直った。今度は、言葉が途中で止まらない。
# speaker: heroine
# emotion: smile
「三分の旅、作ります。まずは自分たちで、好きな所を選んでみたいです」
# speaker: enemy
「楽しみにしてる。細かいことは、あとで送る。アーグラでも会えたら、撮れたものを見せ合おう」
# speaker: narrator
連絡先を交換して別れた後、彼女は二つの動画を見比べた。塔が最後まで入ったもの。そして、途中から空になったもの。
# speaker: heroine
「始まりは、こっちにしたいな。笑っちゃった方」
# speaker: narrator
彼女は空になった動画を、候補の先頭へ置いた。完成の印ではなく、これから選ぶための印だった。
# speaker: heroine
# emotion: happy
「まだ三分には全然足りないね。アーグラで、何を見つけられるかな」
-> END
