INCLUDE modules.ink
-> DONE

// プラダ財団の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// デート。

// デート（本筋）。romance/date_catalog.json の milano_fondazione_prada_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_fondazione_prada_date_01 ===
# scene: date
# title: 金色のせいにする
# background: milano_fondazione_prada_date
# speaker: narrator
元蒸留所を生かしたプラダ財団。金色の建物の前で、彼女は上着を一度脱いで、すぐに着直した。
# speaker: heroine
昔、真っ黄色のコートを買ったんです。一度も外に着ていけなかった。ここの隣なら、だいぶ地味だったかも
# speaker: player
返品した？
# speaker: heroine
# emotion: smile
できませんでした。家の中で着すぎて
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は上着のボタンをいちばん上まで留めた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公の上着の色と自分の袖を並べた。
}

* [「家では一軍だったんだ」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        笑うところかな。外に着ていきたかったのは、ほんとだよ
    - else:
        # speaker: heroine
        そう！　ご飯のときはさすがに脱ぐ、特別待遇でした
    }
    -> join_1

* [「その色のどこが好き？」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        理由が言えたら買っていい、とかじゃないよね。単に好きだったの
    - else:
        # speaker: heroine
        朝の台所が明るくなるの。わたしが通るだけで
    }
    -> join_1

* [「着てるところ、見てみたい」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        見せるってなるとまた着られなくなりそう。自分から出てくるまで待って
    - else:
        # speaker: heroine
        帰ったら一度だけ。見たあとに「よく目立つね」は禁止ね
    }
    -> join_1

= join_1
# speaker: narrator
金色の外側の下には元の建物の形が残っている。彼女は壁と並んで、肩幅を比べるように立った。
# speaker: heroine
ここ、昔の建物と新しく作った建物が並んでるんだって。金色の方は昔からあった建物なんだね
目立ちたい日と、見られたくない日って、同じ日に来るんだね

* [「横に立って一緒に目立つ」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_fondazione_prada_date_01
    { romance_result == "negative":
        # speaker: heroine
        今日は一人で立ってみる。写真はまだ撮らないでね
    - else:
        # speaker: heroine
        来て。これで目立つ仕事を半分ずつ……いや、二倍になったかも
    }
    -> join_2

* [「見たいところだけ見るよ」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_fondazione_prada_date_01
    { romance_result == "negative":
        # speaker: heroine
        わたしが見せたいところも聞いてくれたら、もっといいな
    - else:
        # speaker: heroine
        それなら、まず袖。あのコート、袖口だけ違う黄色だったの
    }
    -> join_2

* [「僕なら夕方から着る」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_fondazione_prada_date_01
    { romance_result == "negative":
        # speaker: heroine
        夜に隠して着るのも、ちょっと悔しい。着るなら晴れた日がいい
    - else:
        # speaker: heroine
        少しずつ夜になるから？　いい考え。わたしは夕方の一駅から始めようかな
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女の袖の裏だけが、さっきより少し長く出ていた。
}
# speaker: narrator
帰り道で彼女は自分の袖口をひと折りした。裏の色が、細い一本だけのぞいた。
-> END
