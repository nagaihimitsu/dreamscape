VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_brera_case
# speaker: narrator
ブレラ宮殿の中庭で彼女は本を閉じかけた。小指が一冊に挟まれて、空いた手で鞄を閉められずにいる。

* [Want my bull bookmark? # option: offer # translation: この雄牛のしおり、使う？]
    # speaker: narrator
    指の代わりに牛が一頭、本の中へ入った。
    # speaker: heroine
    「ありがとう。今日は角のあるところから、続きが読める。」
    -> END

* [This can guard your page. # option: gift # translation: これならページを守れるよ。]
    # speaker: narrator
    彼女は雄牛のしおりを少しだけ表紙から出した。
    # speaker: heroine
    「よし。読書中は、見張り番がいます。」
    -> END

* [I'll hang on to it today. # option: later # translation: 今日は自分で持っておくよ。]
    # speaker: narrator
    彼女は挟んだページ番号を二度つぶやき、自分で鞄を閉めた。しおりは旅のポケットに残った。
    -> END
