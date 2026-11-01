VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_darsena_finale
# speaker: narrator
ダルセナの水辺で、{heroine_name}が折りたたんだ旅のメモを開いた。
# speaker: heroine
# emotion: smile
「赤い印、こんなに増えてる。間違えたところと、もう一度見たいところ」
「あと……字を小さくしようとしたところ」
{
- ending_reached:
    # speaker: narrator
    彼女はメモを片手に持ち替え、空いた手を差し出す。
    # speaker: heroine
    # emotion: teasing
    「恋人の意見も聞きます。余白、半分残しておいたから」
- romance_stage >= 4:
    # speaker: heroine
    # emotion: shy
    「街の話も、{player_address}の話も、まだ聞き足りない。もう少しだけ、ここにいませんか」
- romance_stage >= 3:
    # speaker: heroine
    # emotion: smile
    「同じ道を歩いたのに、メモしたところは違いそう。帰り道に見せ合おうよ」
- romance_stage >= 2:
    # speaker: heroine
    # emotion: teasing
    「これ、私だけで読んだら、自分の字が読めないかも。その時は通訳お願いします」
- else:
    # speaker: heroine
    # emotion: smile
    「一緒に見てくれて、ありがとうございました。ひとりだったら気づかなかったところ、たくさんあります」
}
# speaker: narrator
風がメモの角をめくる。彼女はそこを押さえてから、隣を見た。
# speaker: heroine
# emotion: neutral
「帰り道は、急がなくていい？」
# speaker: narrator
二人は水辺から歩き出した。残った余白は、まだ白いままだ。
-> END
