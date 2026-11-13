// Test fixture (not game content): this encounter's story in the one-scene form of a catalog encounter, as Milan had it
// until 2026-11-13 (the game's is a knot of a place file). For the tests of the catalog encounters' checks.
// 道中交流「弦を一本、余らせて」（encounters/catalog.json の castello_pick）。
// 今は起こらない：条件『スフォルツェスコ城を終えた』（入場ルールの when の episodeCompleted）は、城のバトルを終えると満たす。その後は交流が始まる観察がない。
// バトルを終えると、城は地図の行き先に出なくなる。バトルの画面（結果の画面も）から観察に戻れるが、バトルの途中なので交流は始まらない。
// 後回しにする選択肢（option: later）以外は青いピックが要る。青いピックも、今は起こらない「切れた三本目」でしか手に入らない。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
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
