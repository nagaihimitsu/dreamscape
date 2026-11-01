// 矛盾追及。先代劇場の火災とスカラ座への戦時被害を区別する。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "claim": -> claim }
{ battle_scene == "press": -> press }
{ battle_scene == "evidence_failure": -> evidence_failure }
{ battle_scene == "evidence_success": -> evidence_success }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_la_scala_date
# speaker: narrator
スカラ座博物館の案内板を前に、女性が鉛筆で短い宣伝文を書いていた。
# speaker: enemy
「『戦禍にも傷つかなかった劇場』。……これなら一行で入る」
# speaker: heroine
# emotion: worried
「待って、その一行、少し確かめていいですか」
# speaker: enemy
「リーヴァ。私は今日の見学グループの世話係。印刷まであと十分なの」
# speaker: heroine
# emotion: neutral
「私が間違えてたら謝ります。でも、先代の劇場と、ここは別ですよね？」
# speaker: enemy
「そこから？　じゃあ、最初の記録を一緒に見て。私も見落とすのは嫌い」
-> END

=== after_first ===
# background: milano_la_scala_date
{ answer_correct:
    # speaker: enemy
    「先代のドゥカーレ劇場が火事。その後にスカラ座。そこは印刷し直さなくて済むわ」
- else:
    # speaker: enemy
    「火事で失われたのは先代のドゥカーレ劇場。スカラ座はその後に建てられたの」
    # speaker: heroine
    # emotion: surprised
    「名前が近いと、同じ建物で続いたと思っちゃいますね。私も危なかった」
}
# speaker: narrator
リーヴァは原稿の端を折る。その隙に、彼女は別の資料を手元に引き寄せた。
-> END

=== claim ===
# background: milano_la_scala_date
# speaker: enemy
「でも、このスカラ座自体は、開場してから今日まで戦争で損傷したことは一度もない。そこは間違っていないはずよ」
-> END

=== press ===
# background: milano_la_scala_date
# speaker: enemy
「一度も、よ。建て替えの話と混ぜないで。私はスカラ座の建物について言っているの」
# speaker: heroine
# emotion: serious
「うん、そこは分けます。その上で、記録に例外がないか確認させてください」
-> END

=== evidence_failure ===
# background: milano_la_scala_date
# speaker: enemy
「それだけで、スカラ座が戦争で傷ついたとまでは言えないわ。別の記録も見て」
# speaker: heroine
# emotion: neutral
「時期だけじゃなくて、どの劇場に何が起きたかも確かめよう」
-> END

=== evidence_success ===
# background: milano_la_scala_date
# speaker: narrator
リーヴァは資料から鉛筆へ目を移す。まだ原稿には触れない。
# speaker: enemy
「その記録が、私の一文をどう変えるのかしら。続けて」
-> END

=== after_second ===
# background: milano_la_scala_date
{ answer_correct:
    # speaker: enemy
    「1943年の空襲で、この劇場が損傷……。『一度も』は消さないと」
- else:
    # speaker: enemy
    「反例は1943年の空襲よ。先代の火事じゃない。……自分の文章なのに、私が先に直すことになるなんて」
}
# speaker: heroine
# emotion: smile
「鉛筆でよかったですね」
# speaker: enemy
「印刷まで九分。インクじゃなくて本当によかった」
# speaker: narrator
彼女は書き直しかけ、消しゴムを止めた。
# speaker: enemy
「被害を書いたら、そこで終わったみたいになる。再開まで書けるかしら」
-> END

=== conclusion ===
# background: milano_la_scala_date
{ answer_correct:
    # speaker: enemy
    「再建後、演奏会で再開。よし、二行なら入る」
- else:
    # speaker: enemy
    「戦後に再建されて、1946年に演奏会で再開した。ここは削れないわね」
}
{
- battle_score == 3:
    # speaker: narrator
    リーヴァは紙の余白を見て、文字を一回り小さくした。
    # speaker: enemy
    「助かった。正確にするために文字を小さくするの、いつも悔しいのよ」
    # speaker: heroine
    # emotion: teasing
    「一行にしなければ？」
    # speaker: enemy
    「それを先に言うのね。……ありがとう、二行にする」
- battle_score == 2:
    # speaker: enemy
    「二人とも、一つは迷ったのね。私も最初から言い切らずに聞けばよかった」
    # speaker: narrator
    彼女は原稿の余白に、出典を書き足した。
    # speaker: heroine
    # emotion: smile
    「見た人が続きを調べられますね」
- else:
    # speaker: enemy
    「今日は私の方が少し詳しかった。でも、あなたが止めなければ、この間違いは刷られていたわ」
    # speaker: heroine
    # emotion: serious
    「悔しい。あとで博物館の記録、もう一回読んでみたい」
    # speaker: narrator
    リーヴァは急ぎ足で印刷室へ向かい、途中で振り返った。
    # speaker: enemy
    「今度は私より先に、間違いを見つけてね」
}
-> END
