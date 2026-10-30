// Dreamscape / Phase 1 のカフェデート。編集後は npm run content:check を実行。
// プログラム側で player_name, heroine_name を現在の設定値に差し替える。
VAR player_name = "なお"
VAR heroine_name = "りえ"

-> start

=== start ===
# background: milano_cafe
# speaker: narrator
運河沿いの小さなカフェ。
今日の予定をすべて終えた{heroine_name}は、ガイドブックを閉じた。
# speaker: heroine
「……予定がない時間って、落ち着かないと思ってた」
# speaker: narrator
コーヒーカップの取っ手を、彼女はしばらく指でなぞっている。
# speaker: heroine
「でも今は……もう少しだけ、予定がないままでいたいな」

* [「明日は『15時に道に迷う』って予定を入れよう」]
    # effect: milano_cafe_first_joke
    # speaker: heroine
    「……迷子を予約する人、初めて見た」
    # speaker: narrator
    彼女は笑いかけ、ガイドブックに視線を戻す。
    -> after_first

* [「{heroine_name}といると、時間が短く感じる」]
    # effect: milano_cafe_first_flirt
    # emotion: shy
    # speaker: heroine
    「……そういうこと、急に言うんだね」
    # speaker: narrator
    彼女はカップを持ち上げた。でも、まだ飲まなかった。
    -> after_first

* [「明日はどこへ行きたい？」]
    # effect: milano_cafe_first_interest
    # speaker: heroine
    「……私が決めても、いいの？」
    # speaker: narrator
    その言い方が、少し嬉しそうに聞こえた。
    -> after_first

=== after_first ===
# speaker: narrator
# emotion: neutral
しばらくして、{heroine_name}は鞄から小さなメモ帳を取り出した。
# speaker: heroine
「……{player_name}さん。明日の予定、一つだけ書いてもいい？」
# speaker: narrator
彼女のペンが止まる。ページの一番上には、すでに『自由時間』とあった。
# speaker: heroine
「……自由時間まで予約しちゃった」

* [「じゃあ、その時間は絶対に何もしないことにしよう」]
    # effect: milano_cafe_second_playful
    # speaker: heroine
    「……それ、ものすごく忙しい予定だね」
    # speaker: narrator
    彼女は『絶対に』の文字だけ二重線で囲んだ。
    -> ending

* [「その時間は、{heroine_name}の行きたい場所へ行こう」]
    # effect: milano_cafe_second_warm
    # speaker: heroine
    「……じゃあ、一つだけ。観光案内には載ってない所があるの」
    # speaker: narrator
    彼女はメモ帳を閉じた。まだ教えてくれるつもりはないらしい。
    -> ending

* [「何もしないなら、またこうして話そう」]
    # effect: milano_cafe_second_honest
    # emotion: shy
    # speaker: heroine
    「……それって、何もしないに入るのかな」
    # speaker: narrator
    彼女は窓の外に目を向けた。口元は少しだけ緩んでいた。
    -> ending

=== ending ===
# speaker: narrator
運河の向こうに街灯が灯り始めた。
コーヒーはすっかり冷めていたが、誰も急いで飲み干そうとはしなかった。
-> END
