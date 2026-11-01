// ノヴェチェント美術館。展示作品と窓から見える街が、二人の見方を変える。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: milano_novecento_date
# speaker: narrator
ドゥオモ広場に面したノヴェチェント美術館。螺旋のスロープを上って、二人はフォンタナ室に入った。
# speaker: heroine
# emotion: surprised
「わ、窓が大きい。外のドゥオモが、展示室の中まで来たみたい」
# speaker: narrator
ガラスの向こうに尖塔が見える。天井近くには、光の線が幾重にも曲がっていた。
# speaker: heroine
「最初、電気の配線かと思っちゃった。作品だったんだ」
「ルーチョ・フォンタナのネオン。曲がった管をつないで、この線になってるんですね」
{
- relationship_tone == "strained":
彼女は展示の案内を読み直し、言葉を選んだ。
- relationship_tone == "guarded_attraction":
彼女は窓に映った二人を見て、少し場所をずらした。
- relationship_tone == "comfortable":
彼女は光の線を目で追い、端を見失って笑った。
- relationship_tone == "warm":
彼女は窓とネオンを交互に見て、面白いものを見つけた顔で振り返った。
- relationship_tone == "romantic_tension":
彼女は窓に映る二人の距離を確かめ、何も言わず隣に並んだ。
- else:
彼女は展示の説明を指で追い、もう一度天井を見上げた。
}
# speaker: heroine
「わたし、どこから見たらいいのか迷ってる。{player_address}は、何に見える？」

* [「迷路。入口を探してるうちに一日終わりそう」]
    # effect: milano_novecento_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「入口が見つかっても、出口も探すんですよね？」
        「閉館までには戻ってきてください」
    - else:
        # speaker: heroine
        # emotion: smile
        「わたし、もう二回迷った。たぶん同じところを見てる」
        「案内板、光の線の途中に欲しいね」
    }
    -> after_first
* [「光の線より先に、広場の人たちを見てた」]
    # effect: milano_novecento_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「作品の前でそっちを見るんだ。……でも、人の流れ、ずっと変わってるね」
    - else:
        # speaker: heroine
        # emotion: smile
        「あ、本当だ。あの人、急に戻った」
        「忘れ物かな。さっきのわたしみたい」
    }
    -> after_first
* [「君が最初に配線だと思ったのを、もう一度聞きたい」]
    # effect: milano_novecento_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「そんなに面白かった？　ちょっと恥ずかしいな」
        「でも間違えたおかげで、ちゃんと見直せたからいいや」
    - else:
        # speaker: heroine
        # emotion: teasing
        「聞きたいんじゃなくて、もう一回笑いたいんでしょ」
        「いいよ。その代わり、次の勘違いは教えてね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
窓際で足を止めると、ネオンの光と広場の景色が同じ視界に重なった。
# speaker: heroine
「さっき下で見上げたときは、ドゥオモしか見てなかったな」
「上に来たら、広場の中を歩く人も、光の線も一緒に見える」
# speaker: narrator
彼女は少し移動して、窓に映る光の形が変わるのを確かめる。
# speaker: heroine
「ここ、好きかも。作品だけ見ればいいのかと思ってた」
「でも、窓の外まで見ていたくなるね」

* [「下に戻ったら、この窓を探してみよう」]
    # effect: milano_novecento_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: smile
        「探すのはいいけど、ここから見た景色も忘れないでね」
        「下に降りたら、きっと人にぶつかりそうだし」
    - else:
        # speaker: heroine
        # emotion: happy
        「いいね。見つけたら、さっきまで自分たちがいた場所だって分かる」
        「先に見つけたほうが教えること！」
    }
    -> ending
* [「広場も作品の一部みたいだ」]
    # effect: milano_novecento_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「そう見えるね。でも、広場の人は自分が作品の中だと思ってないかも」
        「わたし、そこが面白いな」
    - else:
        # speaker: heroine
        # emotion: smile
        「もしそうなら、さっき歩いてたわたしたちも出演してた？」
        「あっ、変な顔してなかったかな」
    }
    -> ending
* [「見えるものが違っても、一緒に来られてよかった」]
    # effect: milano_novecento_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。今はもう少し、別々に見てからでもいい？」
        「後で、わたしが見つけたものも話したいから」
    - else:
        # speaker: heroine
        { ending_reached:
            # emotion: teasing
            「じゃあ、次の部屋でも違うものを探そう。先に答え合わせしないでね」
        - else:
            # emotion: smile
            「わたしも。見落としたものを、あとから聞けるのがいいね」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
{heroine_name}は部屋を出かけてから、もう一度だけ窓のほうを振り向いた。
# speaker: heroine
「やっぱり、配線には見えないか。……今のは忘れて」
# speaker: narrator
言いながら、彼女は先に笑った。
-> END
