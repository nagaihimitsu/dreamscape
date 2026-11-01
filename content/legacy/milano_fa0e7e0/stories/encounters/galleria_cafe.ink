VAR player_name = ""
VAR heroine_name = ""

# background: milano_galleria
# speaker: narrator
ガッレリアのカフェの店先で、注文票が風にあおられた。
# speaker: heroine
「あっ、こっちはテーブルの番号だ。拾うの、手伝おう」
# speaker: narrator
二人が票を集めると、店員は輪ゴムを二重に巻いた。
店員「助かりました。後でお礼をさせてください」
店員「次は風にも注文を取らないと」
# speaker: heroine
「わたしは砂糖少なめでお願いします、風さん」
# speaker: narrator
カウンターでは、立ったまま小さなカップを傾ける人もいる。
# speaker: heroine
「座ってゆっくりするだけじゃないんだ。何にしようか」

* [Two coffees, please.]
    # speaker: narrator
    店員「はい、二杯ですね」
    # speaker: heroine
    「じゃあ、私もここで立って飲んでみたい」
    「熱っ。地元の人、平然としてるのすごいね」
    -> done
* [A cappuccino and a pastry, please.]
    # speaker: narrator
    店員「甘いものもですね」
    # speaker: heroine
    「カプチーノ、泡がきれい。お菓子は半分こしない？」
    「あ、最後の一口だけは交渉させて」
    -> done
* [Nothing for now, thank you.]
    # speaker: narrator
    店員「どうぞ、ごゆっくり」
    # speaker: heroine
    「見てるだけでも、注文の仕方がいろいろあって面白いね」
    「さっきの風さん、結局何にしたんだろう」
    -> done

=== done ===
# speaker: heroine
「カウンターでさっと飲んで、また街へ。いろんな休憩の仕方があるんだね」
# speaker: narrator
店員「さっきのお礼の二ユーロです。よかったら、この雄牛のしおりもどうぞ」
-> END
