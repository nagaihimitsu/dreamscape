// ミラノ都市クリア後の短い通常デート。3択×2回。交際済みでも読める。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false
VAR ending_reached = false
VAR has_cafe_memory = false

VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

-> start

=== start ===
# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの店先で、少しだけ腰を下ろした。{heroine_name}は屋根の下を行き交う人を見ている。
# speaker: heroine
「ここ、ドゥオモ広場とスカラ広場をつなぐ道でもあるんだよね」
「道の途中に、帰りたくなくなる椅子がある。……少し困るかも」
# speaker: narrator
彼女は旅のメモを広げた。
大聖堂、ガッレリア、食堂、城。名前の横には、小さな書き込みが並んでいた。
# speaker: heroine
「名所の説明より、変な人の話のほうが長くなっちゃった」
# speaker: narrator
最後の行だけ、空いている。

* [「最後に『指揮者に息継ぎを許可された』って書こう」]
    # effect: milano_city_date_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「許可待ちだったのは、あなただけかも」
        # speaker: narrator
        彼女は紙に何か書きかけて、やめた。
    - else:
        # speaker: heroine
        「それだと、息を止めて観光したみたい」
        # speaker: narrator
        彼女は笑って、一度だけ深呼吸した。ペン先はまだ紙に触れなかった。
    }
    -> last_line

* [「書き足す前に、どんな一日だったか聞きたい」]
    # effect: milano_city_date_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「すぐ聞かれると、まだ言葉にならないな」
        # speaker: narrator
        彼女は空いた行にペンを置いたまま、通りを眺めた。
    - else:
        # speaker: heroine
        「……思ってたより、忙しかった。目が。あと、笑うのを我慢するところが」
        # speaker: narrator
        思い出したらしく、彼女は手で口元を押さえた。
    }
    -> last_line

* [「隣で笑ってた顔を、いちばん覚えてる」]
    # effect: milano_city_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……メモの中身も、見てくれてた？」
        # speaker: narrator
        彼女は紙を少しだけ自分のほうへ戻した。
    - else:
        # speaker: heroine
        # emotion: shy
        「名所のほうも、少しは覚えて帰ってね」
        # speaker: narrator
        そう言いながら、彼女は開いたメモをこちら側へ傾けた。
    }
    -> last_line

=== last_line ===
# emotion: neutral
# speaker: heroine
{has_cafe_memory:
    「{memory_callback}。あのときのことも、ここに入れたかったんだけど」
- else:
    「大理石を運んだ道も、絵の中へ続く部屋も。知らなかった場所が、少し近くなった気がする」
}
「最後の行まで埋めると、全部終わったことになりそうで」
{
- ending_reached:
    「でも、帰ってからも話せるね。……話の続きは、まだたくさんあるし」
- romance_stage >= 3:
    「{player_address}と話してる時間は、もう少し残しておきたいな」
- else:
    「{player_address}は、急いで埋めなくても平気な人ですか？」
}

* [「『続きは余白で』。メモに残業してもらおう」]
    # effect: milano_city_date_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「余白には、休んでいてもらおうよ」
        # speaker: narrator
        彼女はメモを閉じかけ、最後の行をもう一度見た。
    - else:
        # speaker: heroine
        「余白、無口だからって働かせすぎないでね」
        # speaker: narrator
        彼女は欄の外に、小さく『本日休業』と書いた。空いた行が、少し堂々として見えた。
    }
    -> ending

* [「空けておこう。今は、ここで一緒に休もう」]
    # effect: milano_city_date_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「そうだね。でも、まだ少し書きたいかも」
        # speaker: narrator
        彼女はペンのふたを閉めずに、行の端を指で押さえた。
    - else:
        # speaker: heroine
        「うん。書かなくても、今日はあったから」
        # speaker: narrator
        ペンのふたが閉まった。彼女の肩が、少し下がった。
    }
    -> ending

* [「次の一行も、一緒に考えたい」]
    # effect: milano_city_date_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……次の一行は、私にも考えさせてね」
        # speaker: narrator
        彼女はメモを二人の真ん中に置き直した。
    - else:
        # speaker: heroine
        {
        - ending_reached:
            「じゃあ、私が先に書いても消さないでね。ふたりの分だから」
        - romance_stage >= 3:
            「……候補は、先に聞かせて。ひとりで決めないでね」
        - else:
            「それなら、次は私から題を出してもいいですか」
        }
        # speaker: narrator
        彼女はメモの空いた端を、指先で二度たたいた。
    }
    -> ending

=== ending ===
# speaker: narrator
立ち上がる前に、二人で帰り道を確かめた。地図には、いま座っていた時間の印はない。
それでも、そこを通り過ぎる時は、しばらく覚えていそうだった。
-> END
