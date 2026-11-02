VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: milano_galleria
# speaker: narrator
ガッレリアで架空の出店「リナの紋章室」が、小さな手回しプレスを見せている。紙をめくると雄牛が現れ、子どもの列から鼻息の真似が返った。
# speaker: narrator
リナ「見本はそこに。実演一回は四ユーロ。紙が出るまで、私が何を刷ったか当てた顔をしないでね」

* [Show us a fresh print, please. # option: pay # translation: 刷りたてを見せてください。]
    # speaker: narrator
    リナは版に薄く色を引いた。出てきた牛の片角だけ、インクが足りない。
    # speaker: narrator
    リナ「角がないのも一回のうち。二度目は請求しないよ」。二枚目の牛にはちゃんと角があった。
    # speaker: heroine
    「二頭目を見ると、一頭目がかわいくなってきた。」
    -> END

* [Can we look at the sample? # option: sample # translation: 見本を見てもいい？]
    # speaker: narrator
    見本には同じ牛が三つ並ぶ。端の一頭だけにリナの指紋がついていた。
    # speaker: narrator
    リナ「それ、いちばん先に売れかけたの。私の指をどこに飾る気か、ちょっと聞きたかった」
    # speaker: heroine
    「私も、そっちから見ました。」
    -> END

* [We'll come back another time. # option: leave # translation: また別のときに来ます。]
    # speaker: narrator
    リナは手の甲で挨拶した。掌は真っ青だった。
    # speaker: heroine
    「あれで握手してたら、立派なお土産ができてたね。」
    -> END
