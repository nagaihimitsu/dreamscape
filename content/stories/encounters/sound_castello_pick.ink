VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_castello
# speaker: narrator
城の中庭の端で、小さなギターを抱えたティノが、親指に絆創膏を巻き直している。開いたケースに青い三角の跡だけがあった。
# speaker: heroine
「ノラさんのピック、あそこの形と同じですね。」

* [Would this pick fit your hand? # option: give # translation: このピック、手に合いそう？]
    # speaker: narrator
    ティノは弦を一本だけ弾いた。「うわ。自分の指だと、こんなに強く弾けなかった」。中庭の壁から細く音が返る。
    # speaker: heroine
    「最初に鳴らしたのが一音なの、いいね。」
    -> END

* [Could you play one note with this? # option: ask # translation: これで一音弾いてくれる？]
    # speaker: narrator
    ティノ「曲じゃなくて一音なら、外しようがないね」。豪快に隣の弦をはじき、本人が一番驚いた。
    # speaker: heroine
    「いまのでお願いします。二回目は、違う音になっちゃうから。」
    -> END

* [I'll hold on to it for now. # option: later # translation: 今は自分で持っておくよ。]
    # speaker: narrator
    彼女はケースの青い跡の上に落ちた葉を取り、ティノに目で挨拶した。ピックはまだ手元にある。
    -> END
