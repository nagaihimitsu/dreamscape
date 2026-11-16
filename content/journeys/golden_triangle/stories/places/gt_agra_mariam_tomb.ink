INCLUDE modules.ink
-> DONE

// マリアム廟のデート（噛み合いの選択は2回）。
// イティマード・ウッダウラ廟の回を終えていれば、ヴィムラーが新しい請願書を持って現れる（署名は手伝いの knot の選択）。
// 終えていなければ、ピクニックの家族だけで話が進む（ヴィムラーとの初対面は本筋に残す）。

// 【3】
=== gt_agra_date_mariam_tomb ===
# scene: date
# title: 本当の名前
# when: episodes agra >= 1
# hint: アーグラの観光を一つ終えてから
# background: gt_bg_agra_mariam_tomb
# speaker: narrator
アクバル廟から少し離れた所に、赤い砂岩の四角い建物が、芝生の真ん中に静かに建っていた。マリアム・ウッザマーニーの墓廟。訪れる人は、ずっと少ない。
木陰で、ピクニックの家族が弁当を広げていた。父親が、子どもたちに得意げに説明している。
# speaker: gt_agra_mariam_father
ここはな、ジョーダー・バーイーの墓だ。映画で見ただろう。アクバルの、いちばん有名な妃だ
# speaker: gt_agra_mariam_daughter
パパ、違う。ジョーダー・バーイーって名前、当時の記録には出てこないんだって。ほら、ここに書いてある
# speaker: narrator
十五、六の娘が携帯を突きつける。父親は画面を見ようともしない。
# speaker: gt_agra_mariam_father
映画の方が正しいんだ
# speaker: narrator
母親は笑って、揚げ菓子を配っている。
# speaker: heroine
# emotion: surprised
# voice: gt_agra_date_mariam_tomb_001
名前が、違うの？　お墓の人の？
# speaker: gt_agra_mariam_daughter
そう。ここに眠ってるのは、アンベールの王さまの娘なの。ジャイプールのそばの、山の上のお城
# speaker: gt_agra_mariam_daughter
アクバルと結婚して、跡継ぎの皇子を産んで、『時代のマリアム』って称号をもらった人
# speaker: narrator
娘は、画面を父親の方へ向け直した。
# speaker: heroine
# voice: gt_agra_date_mariam_tomb_002
アンベール……。わたしたち、これから行く所だ。この人の、生まれた所なんだね
# speaker: heroine
# emotion: serious
# voice: gt_agra_date_mariam_tomb_003
ねえ。もし死んだ後で、自分が違う名前で呼ばれるようになって、みんながそっちの名前で覚えちゃったら、どうする？
* [「訂正して回る」 # option: correct_everyone]
    # profile: honest
    # memory: gt_agra_date_mariam_tomb_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_mariam_tomb_004
        みんなに、訂正して回るの？　それは、さすがに疲れそう
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_agra_date_mariam_tomb_005
        一人ずつ？　世界中の人に？　でも、ちょっと分かる。わたしも、たぶん回る
    }
* [「新しい名前の方が、気に入るかもしれない」 # option: like_new_name]
    # profile: playful
    # memory: gt_agra_date_mariam_tomb_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_date_mariam_tomb_006
        それは、本人が言うことだと思う。……本人は、もう何も言えないのに
    - else:
        # speaker: heroine
        # emotion: surprised
        # voice: gt_agra_date_mariam_tomb_007
        気に入る？　そっか、そういう人もいるかもね。映画の名前、きれいだし
    }
* [「呼ぶ人が覚えていれば、それでいい」 # option: remembered_is_enough]
    # profile: attentive
    # memory: gt_agra_date_mariam_tomb_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_mariam_tomb_008
        ……それ、ちょっとさみしくない？　覚えてる人が、いなくなったら
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_mariam_tomb_009
        呼ぶ人、か。うん。ちゃんと呼んでくれる人が一人いたら、それでいいのかも
    }
-
{ cond("episode gt_agra_main_itimad_tomb"):
    -> vimla_again
- else:
    -> grandmother
}

= vimla_again
# speaker: narrator
墓廟の入口に、見覚えのあるクリップボードがあった。白髪をきっちりまとめた女性が、ピクニックの父親に、静かに一枚の紙を差し出している。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
# voice: gt_agra_date_mariam_tomb_010
ヴィムラー先生！
# speaker: gt_vimla
あら。署名の前に読む人ね。……今度の請願書は、これ。案内やガイドの説明で、この方を正しい名前で呼んでほしい、という内容
# speaker: narrator
紙には、小さな字で、三行だけ書いてあった。確かめられることだけを、確かめられる言葉で。大きな字は、どこにもない。
# speaker: gt_vimla
あなたに赤ペンを入れられてから、大きな字はやめたの。……署名は、まだ七人だけど
-> gt_agra_mariam_tomb_petition ->
# speaker: narrator
署名を終えた父親が、ばつが悪そうに家族の方へ戻っていった。娘が、勝ち誇った顔をしている。
# speaker: heroine
# voice: gt_agra_date_mariam_tomb_011
先生は、どうして、お墓の名前にこだわるんですか？
# speaker: narrator
ヴィムラーは、少しのあいだ、墓廟の赤い壁を見上げていた。
# speaker: gt_vimla
# local_word: gt_agra_word_bahu
嫁いだ家で、三十年、『バフー』と呼ばれたの。嫁、という意味
# speaker: gt_vimla
夫の母も、夫の弟も、近所の人も。わたしの名前を呼んだのは、学校の書類と、夫のお葬式の日の役所の人だけ
# speaker: gt_vimla
死んだ後に付いた名前で、今も呼ばれ続けるのは、かわいそうでしょう。……せめて、お墓くらいは
# speaker: heroine
# emotion: serious
# voice: gt_agra_date_mariam_tomb_012
名前って、呼んでもらえないと、なくなっちゃうみたいですね。……ヴィムラー先生。ヴィムラー先生
# speaker: gt_vimla
二回も呼ばなくていいの
# speaker: narrator
そう言いながら、ヴィムラーは、少しも嫌そうではなかった。
# speaker: narrator
# leave: gt_vimla
ヴィムラーはクリップボードを抱え直して、次に来る人を待ちに、入口へ戻っていった。
-> what_we_call

= grandmother
# speaker: narrator
言い合う父と娘の横で、それまで黙っていた祖母が、ゆっくり口を開いた。娘が英語に訳してくれる。
# speaker: gt_agra_mariam_daughter
おばあちゃんが言ってる。名前なんてどうでもいい、って男の人は言うけど、それは、ずっと自分の名前で呼ばれてきた人の言い方だって
# speaker: gt_agra_mariam_daughter
おばあちゃんは、結婚してから、ずっと『誰々の嫁』『誰々の母』だったから。……初めて聞いた、そんな話
# speaker: narrator
# term: gt_term_tiffin
父親が、弁当箱のふたを持ったまま、黙りこんだ。祖母は涼しい顔で、揚げ菓子をもう一つ取った。
# speaker: heroine
# emotion: serious
# leave: gt_agra_mariam_daughter
# voice: gt_agra_date_mariam_tomb_013
死んだ後に付いた名前で、ずっと呼ばれるのって、どんな気持ちなんだろう。本人は、もう何も言えないのに
-> what_we_call

= what_we_call
# speaker: narrator
墓廟の裏手は、ひっそりしていた。この建物は、イギリスの時代には、政府の印刷所として使われていたこともあるという。
# speaker: heroine
# voice: gt_agra_date_mariam_tomb_014
お墓で、印刷。この人、本当にいろんな呼ばれ方と、使われ方をしてきたんだね
# speaker: narrator
彼女は芝生の端で立ち止まり、少し迷うように、こちらを見た。
# speaker: heroine
ねえ。わたし、いつもの呼び方で呼んでるでしょ。最初に、そう呼んでいいか、ちゃんと聞いたっけ
* [「そのままがいい」 # option: keep_as_is]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # voice: gt_agra_date_mariam_tomb_016
        ……そっか。うん、そのままにするね
        # speaker: narrator
        # emotion: worried
        彼女はうなずいたが、ほんの少しだけ、何か言い足りない顔をしていた。
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_mariam_tomb_017
        よかった。わたしも、気に入ってるから。呼ぶたびに、ちょっとだけ
    }
* [「好きに呼んで」 # option: call_me_anything]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_agra_date_mariam_tomb_018
        好きに、が一番困るんだけど。本当に困る。ちゃんと答えてほしかったな
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_agra_date_mariam_tomb_019
        好きに、が一番困るんだよ。じゃあ、そのままにする。好きで、呼んでるから
    }
* [「君は、どう呼ばれたい？」 # option: ask_her_name]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # voice: gt_agra_date_mariam_tomb_020
        え……わたし？　急に聞かれても。考えとく
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        # voice: gt_agra_date_mariam_tomb_021
        わたし？　聞かれると思わなかった
        # speaker: heroine
        # emotion: smile
        # voice: gt_agra_date_mariam_tomb_022
        名前で。今みたいに。それで十分。ちゃんと、わたしの名前だから
    }
- -> END

// 【3】手伝いの knot：ヴィムラーの請願書に署名する（噛み合いでない選択）
=== gt_agra_mariam_tomb_petition ===
* [先に全部読んでから、署名する # option: read_then_sign]
    # rel: trust +1
    # speaker: gt_vimla
    あなたも読むのね。二人そろって。……いい旅の仕方だわ
* [すぐに署名する # option: sign_at_once]
    # speaker: gt_vimla
    読みなさい。署名は、読んでから
    # speaker: narrator
    ペンを取り上げられた。三行を読み終えるまで、返してもらえなかった。
* [「君に、先に読んでもらおう」 # option: she_reads_first]
    # rel: affection +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_mariam_tomb_petition_001
    うん。読む。三行とも、本当のことだけ。今度は、線を引くところがない
- ->->
