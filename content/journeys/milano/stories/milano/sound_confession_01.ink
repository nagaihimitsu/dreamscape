VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR confession_result = "deferred"
VAR romance_stage = 1
VAR confession_ready = false
EXTERNAL has_memory(memory_id)
# background: milano_night_landmark
# speaker: narrator
ナヴィリオの橋に半分ほど上がったところで、彼女の方から立ち止まった。運河を見ないで、こちらを向いている。
# speaker: heroine
「何か言いかけたよね。渡り切る前に聞きたい。」
{ has_memory("sound_memory_maurizio_date_sound"):
# speaker: heroine
「あの教会で、別々に見て戻ったときも思った。待ち合わせるの、私けっこう好きです。」
}
* [「恋人として、これからも会いたい」]
    # speaker: narrator
    彼女は息を吸って、手すりから手を離した。
    -> reply
* [「好きです。あなたはどう思ってる？」]
    # speaker: narrator
    彼女は一度だけうなずいた。問いを受け取った、という小さな動きだった。
    -> reply
* [「帰った後の僕の予定に、君がいてほしい。付き合ってほしい」]
    # speaker: narrator
    目の前の人波が切れた。彼女は渡り始めず、その場に残った。
    -> reply

=== reply ===
{
- confession_result == "accepted":
# effect: milano_confession_accepted
# speaker: heroine
# emotion: shy
「うん。付き合いたい。私、明日何時に会うかまで、さっきから考えてた。」
# speaker: player
「何時？」
# speaker: heroine
# emotion: teasing
「それは恋人に相談します。……あなたなんだけど。」
# speaker: narrator
彼女が先に手を出した。指が重なったところで、ようやく二人は橋の残り半分を渡った。
-> END
- confession_result == "deferred":
# effect: milano_confession_deferred
# speaker: heroine
「うれしい。だからこそ、その勢いで「うん」って言うのを待って。私はもう少し、自分の言葉で考えたい。」
# speaker: player
「分かった。明日は、普通に会える？」
# speaker: heroine
「うん。普通に会いたいっていうのは、いま答えられる。」
# speaker: narrator
先に足を出したのは彼女だった。橋の下で、水が一度だけ石に当たった。
-> END
- else:
# effect: milano_confession_rejected
# speaker: heroine
# emotion: serious
「恋人としては、今は会えません。遠回しにすると、あなたに待たせてしまうから。」
# speaker: player
「聞かせてくれてありがとう。……少しだけ、ここで休んでいく。」
# speaker: heroine
「うん。先に橋の向こうにいるね。」
# speaker: narrator
すぐ隣にいなくても見えるところで、彼女は運河の方を向いた。
-> END
}
