// 道中交流「券を一枚、手の中へ」（encounters/catalog.json の galleria_ticket_press）。
// 今は起こらない：後回しにする選択肢（option: later）以外は展示券が要る。展示券は「回らない願掛け」のクイズの当たりでしか手に入らず、そのクイズが今は起こらないため。
// 入場ルールの条件は『最後の晩餐を終えた』（when の episodeCompleted）。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_galleria
# speaker: narrator
ガッレリアの架空の出店「リナの紋章室」。リナは展示券を光にかざし、券の角の切れ込みを親指で確かめた。
# speaker: narrator
リナ「これ、当たりの人用。今日は押す係も頼めるよ。ふちを押さえるか、持ち手を握るか」

* [I'll turn the handle. # option: press # translation: 私がハンドルを回します。]
    # speaker: narrator
    半回転で腕が重くなった。紙を持ち上げると、雄牛の腹がいちばん濃い。
    # speaker: heroine
    「そのへんで頑張ったの、見てて知ってた。」
    -> END

* [Please make one for us. # option: watch # translation: 一枚、刷ってください。]
    # speaker: narrator
    リナが版を押し、彼女がそっと紙をはがした。リナ「そこが一番いい役。譲ったの、ちゃんと覚えといて」
    # speaker: heroine
    「はい。はがすときの音まで、たぶん覚えてます。」
    -> END

* [I'll keep my ticket for later. # option: later # translation: 券はまた今度使います。]
    # speaker: narrator
    リナは切れ込みに指を置いたまま、券をそのまま返した。「まだ切ってない。またおいで」
    -> END
