INCLUDE modules.ink
-> DONE

// チーニー・カ・ラウザーのデート（噛み合いの選択は2回）。
// タージ・マハルの回を終えていれば、遅れてくる二人はニキルとタンヴィ（「次は、場所から一緒に決めて」の続き）。
// 終えていなければ、プネーから来た婚約中の二人。試し撮りを残すかは、手伝いの knot の選択。

// 【3】
=== gt_agra_date_chini_rauza ===
# scene: date
# title: 代役の二人
# when: episodes agra >= 1
# background: gt_bg_agra_chini_rauza
# speaker: narrator
ヤムナー川の東岸、細い道の突き当たりに、四角い墓廟がぽつんと建っていた。チーニー・カ・ラウザー。壁は一面、色とりどりの釉薬のタイルで覆われていたというが、今はほとんどが剥がれ落ち、ところどころに、青と緑と黄色が、島のように残っている。
眠っているのは、アフザル・ハーン・シーラーズィー。学者で詩人で、シャー・ジャハーンの宰相を務めた人だ。
# speaker: heroine
色が、少しだけ残ってる。全部残ってたら、どんなだったんだろう。目が痛いくらい、きらきらしてたのかな
# speaker: narrator
アーチの下で、口ひげの男が、銀色の反射板を抱えて電話に怒鳴っていた。電話を切ると、二人を上から下まで眺め、ぱっと顔を明るくした。
# speaker: gt_agra_chini_man
お願いがある。カップルが橋の渋滞で遅れてる。光を決めたいのに、立つ人がいない。……二人とも、身長がちょうどいい。代役をやってくれないか
# speaker: gt_jagdeep
# cutin: name
ジャグディープだ。アーグラで、結婚前の二人の写真を撮ってる
# speaker: heroine
# reaction: heroine,surprised,question
代役……カップルの？
# speaker: gt_jagdeep
立ってるだけでいい。顔は写さない。光を見るだけだ。はい、アーチの下で向かい合って。もっと近く。……もっと。おでこがくっつくくらい
* [指示どおり、近づく # option: step_closer]
    # profile: bold
    # memory: gt_agra_date_chini_rauza_memory
    { romance_result == "negative":
        # speaker: narrator
        # stand: apart
        一歩近づいたところで、彼女が反射的に半歩下がった。
        # speaker: heroine
        # reaction: heroine,surprised_big,sweat
        ち、近い！　ごめん、反射で。代役なのに
    - else:
        # speaker: narrator
        # stand: close
        一歩。もう一歩。彼女の前髪が、こちらの額に触れそうになる。
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        ……代役、だからね。光を見るための
    }
* [「これ以上は、彼女に聞いてから」 # option: ask_her_first]
    # profile: attentive
    # memory: gt_agra_date_chini_rauza_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        そこで聞かれると、余計に恥ずかしい……。だ、大丈夫だから
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        あ、うん。聞いてくれて、ありがとう。大丈夫。代役だし
        # speaker: narrator
        # stand: close
        そう言って、彼女の方から、半歩だけ近づいた。
    }
* [冗談で、思いきり遠くに立つ # option: stand_far]
    # profile: playful
    # memory: gt_agra_date_chini_rauza_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……そんなに離れなくても、いいのに
        # speaker: gt_jagdeep
        遠い！　別れ話の写真か！
    - else:
        # speaker: gt_jagdeep
        遠い！　別れ話の写真か！
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        ふふっ！　だめ、もう、顔が戻らない。代役が笑ってたら、光、決まらないよね
    }
-
# speaker: gt_jagdeep
よし。次が本番の構図だ。膝をついて、これを差し出す
# speaker: narrator
# photo: gt_album_a47 # photo_caption: 空っぽの指輪の箱、膝をつく代役
# stand: near
渡されたのは、空っぽの指輪の箱だった。膝をつくと、石の床がひんやりした。見上げると、彼女が、どこを見ればいいのか分からない顔で立っていた。
# speaker: heroine
# reaction: heroine,surprised_big,blush
こ、これ、代役だよね？　分かってるけど。分かってるんだけど
* [黙って、空の箱を開ける # option: open_empty_box]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        開けないでよ……！　心臓に悪い。空っぽなのは分かってるのに
    - else:
        # speaker: narrator
        中には何もない。彼女はそれを見て、ほっとしたような、拍子抜けしたような顔で笑った。
        # speaker: heroine
        空っぽで、よかった。入ってたら、どうしようかと思った
    }
* [「台本どおりに」と言ってみる # option: by_the_script]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        台本、か。……そうだよね。代役だもんね
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        台本、あるんだ。ふふ、ジャグディープさん、台詞はいらないって
    }
* [「本番のつもりで」と言ってみる # option: like_the_real_one]
    # requires: stage >= 3
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        そういうの、冗談で言わないで。……代役でも、わたし、ちゃんと聞いちゃうから
    - else:
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        ……っ。そういうの、代役でも、ずるい
        # speaker: narrator
        彼女は顔を手であおぎ、反射板の向こうのジャグディープをにらんだ。シャッターの音が、何度も鳴っていた。
    }
-
# speaker: narrator
車の止まる音がした。走ってくる足音が二つ。
{ cond("episode gt_agra_main_taj_mahal"):
    # speaker: narrator
    汗だくの青年と、緑のクルタの女性。青年が、こちらを見て立ち止まった。
    # speaker: gt_nikhil
    君たちは……タージの、ベンチの！
    # speaker: gt_tanvi
    また会えた。……今日は、ベンチは要らないの。場所は、二人で決めたから
    # speaker: narrator
    ニキルとタンヴィ。タージ・マハルで、指輪を出しそびれた二人だった。
    # speaker: gt_tanvi
    地図を二人で見て、名前もちゃんと読めない場所を選んだの。誰かの有名な恋の話の、背景にならない所がよかった。それに、色が少しだけ残ってるでしょう。全部きれいに残ってるより、ちょっとだけ残ってる方が、本当っぽい
    # speaker: narrator
    ニキルが、折りたたんだ紙をジャグディープに差し出した。撮ってほしい構図の一覧。三十枚。タンヴィが、その紙をそっと取り上げて、自分の鞄にしまった。
    # speaker: gt_tanvi
    今日は、一枚も決めないで撮って。……写真屋さんを呼んだのは、この人の、唯一のわがままなの
    # speaker: narrator
    二人は柱の陰に隠れた。アーチの下で、ニキルが膝をつく。今度の箱は、空っぽではなかった。
    タンヴィの返事は、柱の陰まで聞こえた。
    # speaker: gt_tanvi
    # pause: 800
    ……ハーン
    # speaker: narrator
    # local_word: gt_agra_word_haan
    短い、ヒンディー語の、はい、だった。
    # speaker: heroine
    # reaction: heroine,happy,heart
    言った。今、ちゃんと言った。場所から、一緒に決めたら、本当に同じ答えになった
- else:
    # speaker: narrator
    プネーから来た二人だった。半年後に式を挙げるという。この場所を選んだのは、花嫁になる方だった。
    # speaker: gt_agra_chini_bride
    タージは、みんなが撮るでしょう。わたしたちの写真の後ろに、ほかの人の恋の話が写るのは、ちょっと嫌だったの。ここは、色が少しだけ残ってる。全部残ってるより、その方が、わたしたちに似てる気がして
    # speaker: narrator
    撮影が始まると、二人は柱の陰に下がった。アーチの下で、花婿になる方が、花嫁の髪についた埃を、真剣な顔で取ってやっていた。ジャグディープは、構図にない、その一枚を一番長く撮っていた。
    # speaker: heroine
    # emotion: smile
    決めた構図より、決めてない方が、いい写真になるんだね
}
# speaker: narrator
撮影の終わりに、ジャグディープが携帯を見せてくれた。光を決めるための試し撮り。アーチの下で膝をつく一人と、どこを見ればいいか分からない顔で立つ一人。
# speaker: gt_jagdeep
代役の写真だ。いらなければ消す。……正直、今日の試し撮りで、一番いい顔をしてる
-> gt_agra_chini_rauza_test_shot ->
# speaker: narrator
帰りぎわ、彼女は墓廟の壁に残った青いタイルの前で立ち止まった。四百年近く、雨と日差しを受けて、それでも落ちなかった一枚。
# speaker: heroine
ちょっとだけ残る方が、本当っぽい、か。なんだか、分かる気がする
-> END

// 【3】手伝いの knot：代役の試し撮りを残すか（噛み合いでない選択）
=== gt_agra_chini_rauza_test_shot ===
* [「残しておいてください」 # option: keep_test_shot]
    # rel: affection +1
    # speaker: heroine
    # reaction: heroine,shy,blush
    じゃあ、わたしの携帯にも送ってもらおう。……代役の記念に
* [「消してください」 # option: delete_test_shot]
    # speaker: heroine
    ……うん。そうだね。本物じゃないもんね
    # speaker: narrator
    ジャグディープが写真を消す間、彼女は画面から目をそらしていた。消えたのを確かめてから、小さく言った。
    # speaker: heroine
    ちょっとだけ、もったいなかったかな
* [「君が決めて」 # option: she_decides_shot]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    わたしが？　……残す。代役だったけど、緊張したのは本物だったから
- ->->
