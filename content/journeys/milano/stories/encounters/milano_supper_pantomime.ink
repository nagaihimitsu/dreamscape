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
