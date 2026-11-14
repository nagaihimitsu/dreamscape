INCLUDE modules.ink
-> DONE

// ナヴィリオ地区の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// デート。

// デート（本筋）。romance/date_catalog.json の milano_night_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_night_01 ===
# scene: date
# title: 拍を外して歩く
# background: milano_night_landmark
# speaker: narrator
ナヴィリオの夜。向こう岸の声が水を越えてくる。隣の足音だけ、ときどき半拍遅れる。
# speaker: heroine
さっきから歩幅を合わせようとして、歩き方を忘れました
# speaker: player
# reaction: heroine,exasperated,sigh
どうりで右足だけ偉そうだった
# speaker: heroine
# emotion: exasperated
見てたの、それ。先に言ってよ
運河沿いには、家の入口をつなぐ共同の廊下がある建物もあるんだって。つい窓を見ちゃう
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は水際から一人分あけて歩く。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
二つの足音がそろった瞬間だけ、彼女がこちらの手を見た。
}

* [「三歩だけ競争しよう」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        競争すると余計に頑張っちゃうよ。今日はゆっくりがいい
    - else:
        # speaker: heroine
        三歩なら勝つ。よーい、って言った人がもう一歩出てるから
    }
    -> join_1

* [「先に歩いてみて」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        先頭はちょっと恥ずかしい。一緒にいて、遅くなったらそのままで
    - else:
        # speaker: heroine
        じゃあ、この辺。わたし、運河側だといつも遅くなる
    }
    -> join_1

* [「別々の歩幅で並べるよ」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        言うのは簡単なんだけど、つい見ちゃうんだよね、隣の足
    - else:
        # speaker: heroine
        それ、やってみたかった。合わなくなったら橋で待とう
    }
    -> join_1

= join_1
# speaker: narrator
橋の手前で彼女が止まった。立ち飲みの輪を避けたのかと思ったら、手すりの向こうを見ていた。
# speaker: heroine
わたしがゆっくりなの、疲れたからだと思った？

* [「少しそう思った」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_night_01
    { romance_result == "negative":
        # speaker: heroine
        少し、か。……疲れてはいないよ。今は、橋から水を見たいだけ
    - else:
        # speaker: heroine
        正解は半分。疲れたのと、まだ帰りたくないのと
    }
    -> join_2

* [「早く帰りたくなかった？」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_night_01
    { romance_result == "negative":
        # speaker: heroine
        気持ちまで先回りしないで。言いたくなったら自分で言うね
    - else:
        # speaker: heroine
        ……それをそっちが先に言うの、ずるい。うん、もう少し
    }
    -> join_2

* [「腰掛けて、答えを待つ」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_night_01
    { romance_result == "negative":
        # speaker: heroine
        座らずに、そばで立っててくれる？　今そこで灯りが切れそう
    - else:
        # speaker: heroine
        ありがとう。座った途端、もう一周する元気が出てきた。困ったね
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
橋の上だけは、どちらの足音も聞こえなかった。
}
# speaker: narrator
橋を下りて、二人は違う速さで同じ角を曲がった。
-> END

// デート（本筋）。romance/date_catalog.json の milano_navigli_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_navigli_date_01 ===
# scene: date
# title: 片方だけの手袋
# background: milano_navigli_date
# speaker: narrator
洗濯屋小路の石の洗い場の近くに、子どもの赤い手袋が落ちていた。拾った彼女が、しゃがんだまま止まる。
# speaker: heroine
遠くから見える所に掛けたい。でも、子どもの目の高さって、ここなんだね
この傾いた石、昔は洗濯する人たちが水を引いて使ってたんだって。手袋を置いたら濡れちゃうかな
# speaker: player
僕らの見やすいところが、いちばんとは限らないか
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は手袋の濡れていない方だけをつまんだ。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
# reaction: heroine,smile
二人が同時にしゃがんだので、彼女は額がぶつかる寸前で笑った。
}

* [「低い所で手に持って待つ」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        一人で十分だよ。少し先で、片手が寒そうな人を見てて
    - else:
        # speaker: heroine
        わたしも横にいよう。二人ともこの姿勢だと、何か隠してる人みたいだけど
    }
    -> join_1

* [「片手だけ寒い人を探そう」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        見ただけで当てるより、いま来た道にいるか見てみたい
    - else:
        # speaker: heroine
        いい観察。……あの人、片方だけ手をポケットに。あ、大人だった
    }
    -> join_1

* [「見つけやすい場所を一緒に選ぶ」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        わたしはここで手渡したい。少し待ってもいい？
    - else:
        # speaker: heroine
        うん。勝手に持って遠くへ行く前に、それがいい
    }
    -> join_1

= join_1
# speaker: narrator
洗い場の石には、人がそこで働いていた頃の傾きが残っている。彼女が同じ高さに手を置くと、さっきの親子が戻ってきた。
# speaker: heroine
持ち主、見つかった。なのに、立ちたくない。いまの高さだと、水の色がちょっと違う

* [「その目線、貸して」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_navigli_date_01
    { romance_result == "negative":
        # speaker: heroine
        真似して転ばないで。濡れてない場所で見よう
    - else:
        # speaker: heroine
        貸し出し無料。返すときは、膝に手をついてゆっくりね
    }
    -> join_2

* [「待ててよかった」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_navigli_date_01
    { romance_result == "negative":
        # speaker: heroine
        もう少し待ちたかったな。手袋じゃなくて、この景色に
    - else:
        # speaker: heroine
        うん。何もしないで待つの、わたしは意外と苦手。付き合ってくれてありがとう
    }
    -> join_2

* [「先に立って手を貸す」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_navigli_date_01
    { romance_result == "negative":
        # speaker: heroine
        大丈夫、自分で立てる。隣が空いてたほうが立ちやすいよ
    - else:
        # speaker: heroine
        ありがとう。……思ったよりちゃんと握っちゃった
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は立つ前に、こちらの膝についた砂を指さした。
}
# speaker: narrator
親子の後ろで赤い手が二つ揺れた。二人は水に近い道を選んだ。
-> END
