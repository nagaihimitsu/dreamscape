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
# background: gt_bg_delhi_jama_masjid
# speaker: enemy
「そっちは、誰でも通れたわけじゃない門。僕らの用事なら、こっち」
# speaker: narrator
ジャーマー・マスジドの見学を終えた出口側で、青年が弟へ電話していた。{heroine_name}が自分たちの来た方を振り返る。
# speaker: heroine
# reaction: heroine,worried,interrobang
「あの、わたしたち、通っちゃいけない所から来ました？」
# speaker: enemy
「え？　違う違う。昔の話。弟への目印。……電話と君に同時に違うこと言ってるな、僕」
# speaker: narrator
青年は通話をいったん切り、イムランと名乗った。旧市街の飲食店を手伝っているという。弟との待ち合わせが、なかなか決まらない。
# speaker: enemy
「さっき場所を説明したら、赤い建物なら城だろ、って。赤いのは全部うちの店でもないぞ」
# speaker: heroine
# reaction: heroine,teasing,music
「でも、色を目印にするのは、わたしもやります」
# speaker: narrator
彼女はもう一度、見学の案内を確かめて息をついた。今の通行案内と、昔の門の使い方は別の話だった。
# speaker: enemy
「城とモスクを取り違えるのも、全然無関係じゃないけどね。造った皇帝に、つながりがある」
# speaker: narrator
イムランは自分の記憶だけで言い切らず、建物の説明を開いた。タージ・マハルの名前も、そこに並んでいる。
-> END

=== after_first ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: heroine
    「シャー・ジャハーン。タージ・マハルとレッド・フォートも、同じ皇帝なんですね」
- else:
    # speaker: heroine
    「造ったのはシャー・ジャハーン。タージ・マハルやレッド・フォートにもつながるんだ。赤いだけでは、足りないですね」
}
# speaker: enemy
「弟には『同じ人が造った』を言わないでおこう。ほら同じ場所だ、って返してくる」
# speaker: heroine
# reaction: heroine,serious,question
「本当に弟さんが悪いんですか。誰でも通れない、で、わたしも迷いました」
# speaker: enemy
# reaction: enemy,sweat
「う。今日は僕の説明が雑。でも、門の話はでまかせじゃない」
# speaker: narrator
彼は東の入口についての記述を示す。彼女も読み込む。昔、そこを通った人々の立場が、門の大きさと結び付いていた。
-> END

=== after_second ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「もともとは王と宮廷の人々の入口。そういうこと。今、僕が入場資格を決めてるわけじゃない」
- else:
    # speaker: enemy
    「東の入口は、もともと王と宮廷の人々のためだったんだ。昔の役割の話を、今の道案内に混ぜたのがまずかった」
}
# speaker: heroine
# reaction: heroine,exasperated,sigh
「最初に『昔の』があれば、わたしの心臓、普通に働いてたのに」
# speaker: enemy
「分かった。次から門の話の前に付ける。……弟の方にも」
# speaker: narrator
彼が送った新しい連絡は、短く、今立っている場所だけだった。送信を見届けてから、彼女は中庭へ目を戻した。
# speaker: heroine
「歴史の話に気を取られると、今ここに来る人のこと、忘れそうになりますね」
# speaker: enemy
「僕は建物の説明を忘れがち。顔見知りの用事ばかり気にするから」
# speaker: narrator
見学者とは違う目的で歩く人がいる。二人はモスクの現在の使われ方を確かめた。
-> END

=== conclusion ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: heroine
    「今も礼拝の場所。昔の皇帝だけじゃなくて、今日ここへ来た人の場所でもあるんだね」
- else:
    # speaker: heroine
    「今も礼拝に訪れる人がいるんですね。見学の案内を、昔の使い方だけで考えちゃいけなかった」
}
{
- battle_score == 3:
    # speaker: enemy
    「説明は全部合った。これで弟も迷わなければ、今日は満点なんだけど」
- battle_score == 2:
    # speaker: enemy
    「一つ確かめ直せたね。僕の道案内も、それくらい早く直せばよかった」
- else:
    # speaker: enemy
    「記憶だけだと外すなあ。弟にも、分からないって言う余地を残しておこう」
}
# speaker: narrator
また電話が鳴る。弟からの返事を聞いたイムランの顔が、急にせわしくなった。
# speaker: enemy
# reaction: enemy,interrobang
「先に店へ戻った？　待ち合わせは？　……僕が仕込みを代わる話、してた？　それは覚えてる！」
# speaker: narrator
覚えていたとは思えない速さで、彼は荷物を持ち直した。彼女が声をかけるより早い。
# speaker: enemy
「ごめん、続きは王様抜きで。店の人に怒られる方が現実なので」
# speaker: narrator
礼を言い終える前に、彼は人の流れへ戻っていく。{heroine_name}は空いた隣を見てから、こちらを見た。
# speaker: heroine
# reaction: heroine,teasing,music
「最後の説明は、すごく分かりやすかった」
# speaker: narrator
彼女はメモに『王様の門』と書き、急いで前に『昔の』を足した。録画はない。帰って話す時の順番だけ、決まった。
-> END
