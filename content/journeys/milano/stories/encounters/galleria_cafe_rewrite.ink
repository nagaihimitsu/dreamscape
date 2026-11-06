VAR player_name = ""
VAR heroine_name = ""

# background: milano_galleria
# speaker: narrator
ガッレリア入口のカンパリーノ。店先で風にあおられた注文票が、足元へ滑ってきた。
# speaker: heroine
「待って、それ飛ぶ！」
# speaker: narrator
彼女が一枚を靴で押さえる。もう一枚は主人公の手をすり抜け、店員の足元に着地した。
店員「風のお客さんまで増えたら、席が足りませんね」
# speaker: heroine
「私は風より先に座りたいな」
# speaker: narrator
カウンターの向こうでは、小さなカップを傾け、また街へ戻る人がいる。何を頼もう。

* [Two coffees, please.]
    # speaker: narrator
    店員「エスプレッソを二つですね」
    # speaker: heroine
    「小さい！　……あ、濃い。見た目で油断してた」
    「そっちは平気な顔してる。まさか私だけ？」
    -> done
* [A cappuccino and a pastry, please.]
    # speaker: narrator
    店員「カプチーノとクロワッサンですね」
    # speaker: heroine
    「泡がきれい。……このクロワッサン、半分にできるかな」
    # speaker: narrator
    分けようとした端から、ぱらぱらと屑が落ちた。
    # speaker: heroine
    「二等分には成功。きれいには、ちょっと失敗」
    -> done
* [Nothing for now, thank you.]
    # speaker: narrator
    店員「承知しました。お手伝い、ありがとうございました」
    # speaker: heroine
    「香りだけで少し休んだ気分。後で別のものを探してもいいね」
    -> done

=== done ===
# speaker: narrator
この店は一九一五年から続き、ミラノのアペリティーヴォでも知られている。
# speaker: heroine
「コーヒーをさっと飲む人も、誰かを待ってる人もいる。休み方が一つじゃないんだね」
# speaker: narrator
店員「注文票を拾ってくださったお礼です。よかったら、こちらも」
店員は二ユーロと、雄牛が描かれた小さなしおりを渡した。
-> END
