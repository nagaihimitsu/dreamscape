INCLUDE modules.ink
-> DONE

// スターバックス・ロースタリーの場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// デート。

// デート（本筋）。romance/date_catalog.json の milano_cafe_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_cafe_01 ===
# scene: date
# title: 冷めてからが本番
# background: milano_starbucks_roastery_date
# speaker: narrator
# reaction: heroine,worried,sweat
ロースタリーの焙煎を見ていたら、彼女の小さいカップだけ先に届いた。鼻を近づけて、ちょっと困った顔をする。
# speaker: heroine
湯気はすごく好き。飲むほうは……まだ舌が信用できません
# speaker: player
熱いの苦手だった？
# speaker: heroine
猫舌なのに、いちばんいい匂いのときに飲みたいんです。かなり不利な趣味
あの透明な管、焙煎する前の豆が通ってるんだって。追いかけているうちに冷めるかな
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はカップの取っ手を自分の方へ向けた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は二人のカップを並べてから、そっと取っ手をこちらに向けた。
}

* [「その一口目、実況しようか」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        実況されたら、勢いで飲んでしまいそう。ちょっと待って
    - else:
        # speaker: heroine
        # emotion: teasing
        まだ試合前です。選手の舌から冷静な判断を引き出しています
    }
    -> join_1

* [「冷めるまで焙煎を見よう」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        今席を離れると、ちょうどいい瞬間も逃しそう。ここで待ちたい
    - else:
        # speaker: heroine
        いいね。あそこで豆が返るたび、香りの向きが変わる気がする
    }
    -> join_1

* [「同じのを頼めばよかった」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        好きかどうか、わたしもまだ分かんない。もう少し待ってから決めて
    - else:
        # speaker: heroine
        ひと口ずつ、あとで交換しようよ。比べたい
    }
    -> join_1

= join_1
# speaker: narrator
やっと飲めた彼女は目を丸くした。隣に置いた水を飲み、もう一度味を確かめる。
# speaker: heroine
思ってたより酸っぱい。でも、嫌いっていうのとも違う。こういうとき、何て言う？

* [「もうひと口ほしい味」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_cafe_01
    { romance_result == "negative":
        # speaker: heroine
        うーん。もうひと口はわたしが決める。まだお水の番
    - else:
        # speaker: heroine
        それ。美味しいかは保留なのに、カップはもう持ち上がってる
    }
    -> join_2

* [「感想をあとで交換しよう」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_cafe_01
    { romance_result == "negative":
        # speaker: heroine
        あとでだと忘れちゃう。わたしは今、変な顔のうちに言いたい
    - else:
        # speaker: heroine
        いい。先に言われると、その味を探しちゃうから
    }
    -> join_2

* [「その顔がもう感想だよ」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_cafe_01
    { romance_result == "negative":
        # speaker: heroine
        顔を見られると味に集中できないよ。カップの方を見てて
    - else:
        # speaker: heroine
        そんなに出てた？　じゃあそっちが飲むときは絶対見る
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
カップとカップが軽く当たった。彼女は離す前に、一度だけこちらを見た。
}
# speaker: narrator
帰り際、彼女はカップの底をもう一度のぞいた。残っていた一滴だけ、自分の舌で確かめた。
-> END

// デート（本筋）。romance/date_catalog.json の milano_starbucks_roastery_date_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_starbucks_roastery_date_01 ===
# scene: date
# title: 買わないおみやげ
# background: milano_starbucks_roastery_date
# speaker: narrator
豆を選ぶ人の手元を眺めながら、彼女が自分のポケットを両方裏返した。糸くずが一つ落ちた。
# speaker: heroine
今日は豆を買いません。買わない日のほうが、値段を見ずに好きなのを選べるから
# speaker: player
じゃあ、どれを僕に選ぶ？
# speaker: heroine
待って。そこ、当ててもらう側も参加する仕組みにしたい
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はポケットの口を丁寧に整えた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公のポケットまでのぞくふりをした。
}

* [「僕のヒントは朝寝坊」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        朝寝坊だけじゃ味が分かんないよ。好きな朝ごはんから聞いていい？
    - else:
        # speaker: heroine
        じゃあ香りで起こす係を探そう。コーヒーに任せて、わたしは二度寝
    }
    -> join_1

* [「先に、君の好みを当てる」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        当てられる前に、自分で決めたいな。わたしの番を少し待って
    - else:
        # speaker: heroine
        どうぞ。わたしの顔を見て答え直すのは一回まで
    }
    -> join_1

* [「選んだ理由を交換しよう」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        理由までうまく言えるかな。今日は匂いだけで決めてもいい？
    - else:
        # speaker: heroine
        賛成。値札の代わりに理由がついてるおみやげだ
    }
    -> join_1

= join_1
# speaker: narrator
焙煎の様子の見える場所で、彼女は甘い香りのほうへ少し寄った。
# speaker: heroine
ここ、昔は郵便局だったんだって。香りも届けられたらよかったのに
実は、わたしに選んでほしかったのは豆？　それとも、考えてる時間のほう？

* [「ばれた。後のほう」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_starbucks_roastery_date_01
    { romance_result == "negative":
        # speaker: heroine
        そっか。わたしは本当に、気に入る味を見つけたかったよ
    - else:
        # speaker: heroine
        わたしも。ちゃんと考えたから、今日は空のポケットで大成功
    }
    -> join_2

* [「糸くずに似合う味」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_starbucks_roastery_date_01
    { romance_result == "negative":
        # speaker: heroine
        それは洗濯で落とそう。今はちゃんと選んでるんだから
    - else:
        # speaker: heroine
        いちばん長く旅してるやつだ。持ち主より先におみやげ決まったね
    }
    -> join_2

* [「今日だけ答えは持ち帰る」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_starbucks_roastery_date_01
    { romance_result == "negative":
        # speaker: heroine
        秘密ばっかりは寂しい。ひとことでも聞かせて
    - else:
        # speaker: heroine
        じゃあ宿題。次に聞いたとき、ちゃんと自分の言葉でね
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は鼻先を近づけ、上着に残った香りを笑った。
}
# speaker: narrator
彼女はポケットを戻し、店を出た。焙煎の匂いだけが、しばらく上着についてきた。
-> END
