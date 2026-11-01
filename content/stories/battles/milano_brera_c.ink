// 証拠連結。祭壇画の元の場所と、移送後の収集目的を結ぶ。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "claim": -> claim }
{ battle_scene == "evidence_failure": -> evidence_failure }
{ battle_scene == "evidence_success": -> evidence_success }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_brera_case
# speaker: narrator
ブレラ絵画館の中庭で、旅行者が美術館の冊子と手帳を開いていた。
# speaker: enemy
「カメリーノの祭壇画、見てきた？　私は今から。友達に説明したいんだけど、文字が足りなくて」
# speaker: narrator
女性は名をソフィアと名乗り、小さなメッセージカードを見せた。宛名の下は、ほとんど白い。
# speaker: heroine
# emotion: smile
「そんなに短く？　私、感想を書こうとしたら余白からはみ出しました」
# speaker: enemy
「いいなあ。私は一枚に収めたい。まず、あの絵が何のためのものだったか知りたいの」
-> END

=== after_first ===
# background: milano_brera_case
{ answer_correct:
    # speaker: enemy
    「教会の祭壇。じゃあ、壁の飾りとして生まれたわけじゃないのね」
- else:
    # speaker: heroine
    # emotion: surprised
    「教会の祭壇だったんだ。展示室で見ると、最初から額に入っていたように思っちゃう」
    # speaker: enemy
    「私も。友達に送る前に聞いてよかった」
}
# speaker: narrator
ソフィアはカードに「教会」と書き、少し離して「ミラノ」と書いた。
# speaker: enemy
「でも、今は一部がここ、別の部分は遠くにあるらしい。どこまで一緒だったんだろう」
-> END

=== after_second ===
# background: milano_brera_case
{ answer_correct:
    # speaker: enemy
    「主要な板絵はブレラ、上の部分は別の場所。全部そろったまま、ではないのね」
- else:
    # speaker: enemy
    「主要な板絵はブレラに残って、上部の三点は別の場所に移った。私もさっき調べ直したの」
}
# speaker: heroine
# emotion: worried
「一つずつ別の道を通ったんだ。カードには、どこまで書く？」
# speaker: enemy
「『今はブレラにある』だけでよくない？　前に何に使われたかと、移された後の目的は別の話でしょ」
-> END

=== claim ===
# background: milano_brera_case
# speaker: enemy
「元の場所と、ミラノで集められた理由は、つなげなくても来歴は伝わる。二つを合わせて何かわかる？」
-> END

=== evidence_failure ===
# background: milano_brera_case
# speaker: enemy
「二枚並んでいても、両方が同じ時期の話なら移動は見えないかも」
# speaker: heroine
# emotion: neutral
「最初の場所と、ミラノへ届いたときの記録。片方ずつ見直そう」
-> END

=== evidence_success ===
# background: milano_brera_case
# speaker: narrator
ソフィアは二枚の記録を手帳の上に並べる。カードはまだ白いままだ。
# speaker: enemy
「うん、この二枚なら、前と後を比べられそう。どんな道だったの？」
-> END

=== conclusion ===
# background: milano_brera_case
{ answer_correct:
    # speaker: enemy
    「教会の祭壇から、学生のための収集へ。絵が移っただけじゃなくて、見られ方も変わったのね」
- else:
    # speaker: enemy
    「祭壇にあった作品が、徴発と移送を経てミラノの収集に入った。学生が色々な画派を学ぶためでもあったんだって」
    # speaker: heroine
    # emotion: serious
    「移ったことと、どうして集められたか。両方ないと途中が抜けるね」
}
{
- battle_score == 3:
    # speaker: narrator
    ソフィアはカードを裏返した。
    # speaker: enemy
    「裏を使えばよかった。なんで片面にこだわってたんだろう」
    # speaker: heroine
    # emotion: happy
    「私のは両面いっぱいです。まだ宛名を書いてません」
    # speaker: enemy
    「それは私の勝ちね」
- battle_score == 2:
    # speaker: enemy
    「一つ迷ったけど、友達には前と後の両方を送る。短い方がいいとは限らないから」
    # speaker: heroine
    # emotion: smile
    「返事が来たら、どこが気になったか聞いてみて」
- else:
    # speaker: heroine
    # emotion: worried
    「急いでつないだら、途中を読み落としちゃった。もう一回、見に戻っていい？」
    # speaker: enemy
    「もちろん。私はカードを書いて待ってる。こっちも一枚で足りない気がしてきたから」
}
-> END
