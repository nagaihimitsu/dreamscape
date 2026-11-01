// スカラ座。台詞、間、観客のいない場所の違いを二人で話す。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_la_scala_date
# speaker: narrator
スカラ座の前で、人の流れが開場を待つ列に変わる。
{heroine_name}は入口より少し離れた場所で、手にした案内をたたんだ。
# speaker: heroine
「昔の劇場が火事でなくなって、ここに新しい劇場を建てたんだって」
「前の劇場で桟敷席を持っていた人たちが、建設費を出したそうです」
「……自分たちの席を、もう一度つくったんですね」
# speaker: narrator
開いた扉の向こうから、笑い声が漏れる。
# speaker: heroine
「舞台では、知らない人がたくさん見ていても、言葉を届けるんですよね」
「私なら、最初の一言を忘れそう」

* [「そのときは、客席から次の台詞を叫ぼうか」]
    # effect: milano_la_scala_first_joke
    # speaker: heroine
    # emotion: smile
    「助かるけど、あなたの席が一番目立っちゃう」
    「私の台詞より先に、係の人が来そうです」
    -> after_first
* [「何を言う役なら、やってみたい？」]
    # effect: milano_la_scala_first_listen
    # speaker: heroine
    「帰らないで、って言う役。……言われたほうも、困るかな」
    # speaker: narrator
    彼女は閉じた案内の角を指でそろえた。
    -> after_first
* [「大勢の前より、二人のときの声を聞きたいな」]
    # effect: milano_la_scala_first_honest
    # speaker: heroine
    # emotion: shy
    「……それなら、客席のいちばん後ろまで届かなくてもいいですね」
    # speaker: narrator
    彼女は声を少し落として、もう一度「いいですね」と言った。
    -> after_first

=== after_first ===
# speaker: narrator
人の列が少し進み、扉の前に短い隙間ができた。
# speaker: heroine
「拍手って、不思議です。言葉がなくても、終わったことが伝わる」
「……でも、終わってほしくないときは、どうするんだろう」

* [「拍手を一回だけ、ものすごく長くする」]
    # effect: milano_la_scala_second_joke
    # speaker: heroine
    # emotion: teasing
    「手を合わせたまま？　それ、祈っている人に見えます」
    「カーテンも、閉めていいか迷いそう」
    -> ending
* [「まだ聞いていたいって、伝える」]
    # effect: milano_la_scala_second_listen
    # speaker: heroine
    # emotion: smile
    「そっか。拍手のあとに、言ってもいいんですね」
    # speaker: narrator
    彼女は入口を見てから、隣のほうへ向き直った。
    -> ending
* [「今日は、もう少し一緒にいたい」]
    # effect: milano_la_scala_second_honest
    # speaker: heroine
    # emotion: shy
    「……それは、拍手より分かりやすいです」
    「私も、急いではいません」
    -> ending

=== ending ===
# speaker: narrator
列は扉の中へ吸い込まれ、広場の音がまた聞こえた。
二人は入口に背を向けるまで、少しだけ時間をかけた。
-> END
