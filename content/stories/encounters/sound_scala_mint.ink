VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_la_scala_date
# speaker: narrator
スカラ座前で、声の大きな客が二人、飴を持って口論している。片方が袋を開け、片方が「噛んだら三秒だ」とこぼした。
# speaker: narrator
架空の菓子売り「この二人、毎回これで開演前の時間をつぶすのよ。小袋なら二ユーロ」

* [A small bag, please. # option: buy # translation: 小袋を一つください。]
    # speaker: narrator
    受け取った彼女が一粒を口に入れた。かり、と音がして、二人の客が同時に振り向いた。
    # speaker: heroine
    「……三秒、もたなかったです。」
    -> END

* [Who won last time? # option: ask # translation: 前はどっちが勝ったの？]
    # speaker: narrator
    菓子売り「私。口論が長いと、開演前にもう一袋売れるの」。客がそろって袋を握りしめた。
    # speaker: heroine
    「今日の勝負は長くなりそう。」
    -> END

* [No sweets for me, thanks. # option: leave # translation: 私は飴は遠慮します。]
    # speaker: narrator
    菓子売りは袋をしまい、二人の客に目をやった。「あんたたちも、たまにはこの人を見習って黙ってみたら」
    # speaker: narrator
    二人は同時に抗議した。飴が頬の同じ側でふくらんだ。
    -> END
