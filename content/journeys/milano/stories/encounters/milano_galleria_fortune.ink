VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_galleria
# speaker: narrator
ガッレリアの雄牛の床飾りの前で、少年が靴を脱いでいる。母親が片足立ちの彼を支えた。
# speaker: narrator
少年「かかとで回るといいことがあるんでしょ。僕の靴、昨日買ったばっかり。靴だけ良くなったら困る」
# speaker: heroine
「それで靴を脱ぐんだ。でも、靴下で回るの、怖くない？」

* [I'll keep count for you. # option: believe # translation: 回数を数えるよ。]
    # speaker: narrator
    少年は靴を履き直し、一周だけして自分で拍手した。「残りは明日の僕の分」
    # speaker: heroine
    「いいね。使い切らない運。」
    -> END

* [I'd rather make my own luck. # option: doubt # translation: 運は自分で作りたいな。]
    # speaker: narrator
    母親「なら、その子が転ばないように一歩あけて。いいこと一個、もうできた」
    # speaker: heroine
    「いまの一歩、けっこういいご利益ですね。」
    -> END

* [I'll leave the bull in peace. # option: leave # translation: 雄牛はそっとしておくよ。]
    # speaker: narrator
    少年「牛にも休み時間いるもんね」。靴紐を結び直し、順番を次の人へ譲った。
    # speaker: heroine
    「じゃあ、私たちも行こう。」
    -> END
