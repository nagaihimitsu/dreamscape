// Test fixture (not game content): this encounter's story in the one-scene form of a catalog encounter, as Milan had it
// until 2026-11-13 (the game's is a knot of a place file). For the tests of the catalog encounters' checks.
// 道中交流「広場の無声映画」（encounters/catalog.json の supper_pantomime）。
// 今は起こらない：条件『最後の晩餐を終えた』（入場ルールの when の episodeCompleted）は、最後の晩餐のバトルを終えると満たす。その後は交流が始まる観察がない。
// バトルを終えると、最後の晩餐は地図の行き先に出なくなる。バトルの画面（結果の画面も）から観察に戻れるが、バトルの途中なので交流は始まらない。
// シナリオの改稿で見直す（2026-11-08 のユーザー判断）。それまで起こる時は変えない。変えたら、このコメントも直す。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_refectory
# speaker: narrator
グラツィエ教会前で、イーダが両腕を伸ばして静止した。兄が首を振る。「ちがう、それだと『大きな魚』！」
# speaker: narrator
兄「今日の声は店じまい。あとは妹が代わりに晩ご飯を注文する」。どうやら、見本を見せるために一言だけ解禁したらしい。

* [May I try a gesture? # option: act # translation: 身振りを一つ試してもいい？]
    # speaker: narrator
    指を一本立て、くるくる回した。兄はフォークを巻き取る真似で応じた。
    # speaker: heroine
    「通じた。食べたいものの話になると、みんな役者なんですね。」
    -> END

* [What do you actually want for dinner? # option: ask # translation: 本当は夕食に何が食べたいの？]
    # speaker: narrator
    兄は両手で丸を作った。イーダ「……ピザ？　さっき魚じゃないって言ってたから、私が勝手にパスタにした」
    # speaker: heroine
    「当てるのが上手な人ほど、聞くのを忘れるのかも。」
    -> END

* [Enjoy your dinner together. # option: leave # translation: 二人で夕食を楽しんで。]
    # speaker: narrator
    兄は指にキスをして、こちらへ小さく投げた。イーダ「それだけは通訳がいらないね」。
    # speaker: heroine
    「あれ、私もいつか自然にやってみたい。」
    -> END
