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
# hint: アーグラの観光を一つ終えてから
# background: gt_bg_agra_chini_rauza
# speaker: narrator
ヤムナー川の東岸、細い道の突き当たりに、四角い墓廟がぽつんと建っていた。チーニー・カ・ラウザー。
# speaker: narrator
# term: gt_term_afzal_khan
# term: gt_term_shah_jahan
眠っているのは、アフザル・ハーン・シーラーズィー。学者で詩人で、シャー・ジャハーンの宰相を務めた人だ。
# speaker: narrator
# photo: gt_album_a094 # photo_caption: 島のように残るタイルの色
壁は一面、色とりどりの釉薬のタイルで覆われていたという。今はほとんど剥がれ落ちて、青と緑と黄色が、島のように残っている。
# speaker: heroine
# voice: gt_agra_date_chini_rauza_001
色が、少しだけ残ってる。全部残ってたら、どんなだったんだろう。目が痛いくらい、きらきらしてたのかな
# speaker: narrator
アーチの下で、口ひげの男が、銀色の反射板を抱えて電話に怒鳴っていた。電話を切ると、二人を上から下まで眺め、ぱっと顔を明るくした。
# speaker: gt_jagdeep
# unnamed
# voice: gt_agra_date_chini_rauza_jagdeep_001
お願いがある。カップルが橋の渋滞で遅れてる。光を決めたいのに、立つ人がいない。……二人とも、身長がちょうどいい。代役をやってくれないか
# speaker: gt_jagdeep
# cutin: name
# voice: gt_agra_date_chini_rauza_jagdeep_002
# term: gt_term_prewedding
ジャグディープだ。アーグラで、結婚前の二人の写真を撮ってる
# speaker: heroine
# emotion: surprised
# voice: gt_agra_date_chini_rauza_002
# photo: gt_album_a095 # photo_caption: 反射板の写真家に代役を頼まれる # photo_with: gt_jagdeep
代役……カップルの？
# speaker: gt_jagdeep
# voice: gt_agra_date_chini_rauza_jagdeep_003
立ってるだけでいい。台詞はいらない。顔も作らなくていい。光を見るだけだ
# speaker: gt_jagdeep
# voice: gt_agra_date_chini_rauza_jagdeep_004
はい、アーチの下で向かい合って。もっと近く。……もっと。おでこがくっつくくらい
* [指示どおり、近づく # option: step_closer]
    # profile: bold
    # memory: gt_agra_date_chini_rauza_memory
    { romance_result == "negative":
        # speaker: narrator
        # stand: apart
        一歩近づいたところで、彼女が反射的に半歩下がった。
        # speaker: heroine
        # reaction: heroine,surprised_big,sweat
        # voice: gt_agra_date_chini_rauza_003
        ち、近い！　ごめん、反射で。代役なのに
    - else:
        # speaker: narrator
        # stand: close
        一歩。もう一歩。彼女の前髪が、こちらの額に触れそうになる。
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        # voice: gt_agra_date_chini_rauza_004
        # photo: gt_album_a096 # photo_caption: おでこがくっつくくらい # photo_with: gt_jagdeep
        ……代役、だからね。光を見るための
    }
* [「これ以上は、彼女に聞いてから」 # option: ask_her_first]
    # profile: attentive
    # memory: gt_agra_date_chini_rauza_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        # voice: gt_agra_date_chini_rauza_005
        そこで聞かれると、余計に恥ずかしい……。だ、大丈夫だから
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        # voice: gt_agra_date_chini_rauza_006
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
        # voice: gt_agra_date_chini_rauza_007
        ……そんなに離れなくても、いいのに
        # speaker: gt_jagdeep
        # voice: gt_agra_date_chini_rauza_jagdeep_005
        遠い！　別れ話の写真か！
    - else:
        # speaker: gt_jagdeep
        # voice: gt_agra_date_chini_rauza_jagdeep_006
        遠い！　別れ話の写真か！
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_agra_date_chini_rauza_008
        # photo: gt_album_a096 # photo_caption: おでこがくっつくくらい # photo_with: gt_jagdeep
        ふふっ！　だめ、もう、顔が戻らない。代役が笑ってたら、光、決まらないよね
    }
-
# speaker: gt_jagdeep
# voice: gt_agra_date_chini_rauza_jagdeep_007
よし。次が本番の構図だ。膝をついて、これを差し出す
# speaker: narrator
# photo: gt_album_a097 # photo_caption: 空っぽの指輪の箱、膝をつく代役
# stand: near
# emotion: shy
渡されたのは、空っぽの指輪の箱だった。膝をつくと、石の床がひんやりした。見上げると、彼女が、どこを見ればいいのか分からない顔で立っていた。
# speaker: heroine
# emotion: surprised_big
# voice: gt_agra_date_chini_rauza_009
こ、これ、代役だよね？　分かってるけど。分かってるんだけど
* [黙って、空の箱を開ける # option: open_empty_box]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # se: box_open
        # voice: gt_agra_date_chini_rauza_010
        開けないでよ……！　心臓に悪い。空っぽなのは分かってるのに
    - else:
        # speaker: narrator
        # se: box_open
        # emotion: smile
        中には何もない。彼女はそれを見て、ほっとしたような、拍子抜けしたような顔で笑った。
        # speaker: heroine
        # voice: gt_agra_date_chini_rauza_011
        空っぽで、よかった。入ってたら、どうしようかと思った
    }
* [「台本どおりに」と言ってみる # option: by_the_script]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_agra_date_chini_rauza_012
        台本、か。……そうだよね。代役だもんね
    - else:
        # speaker: heroine
        # emotion: teasing
        # voice: gt_agra_date_chini_rauza_013
        台本、あるんだ。ふふ、ジャグディープさん、台詞はいらないって
    }
* [「本番のつもりで」と言ってみる # option: like_the_real_one]
    # requires: stage >= 3
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_agra_date_chini_rauza_014
        そういうの、冗談で言わないで。……代役でも、わたし、ちゃんと聞いちゃうから
    - else:
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        # voice: gt_agra_date_chini_rauza_015
        ……っ。そういうの、代役でも、ずるい
        # speaker: narrator
        # se: camera_shutter
        # emotion: shy_deep
        # photo: gt_album_a098 # photo_caption: 「代役でも、ずるい」 # photo_with: gt_jagdeep
        彼女は顔を手であおぎ、反射板の向こうのジャグディープをにらんだ。シャッターの音が、何度も鳴っていた。
    }
-
# speaker: narrator
# se: car_door
車のドアの閉まる音。走ってくる足音が二つ。
{ cond("episode gt_agra_main_taj_mahal"):
    # speaker: narrator
    # together: gt_nikhil gt_tanvi
    汗だくの青年と、緑のクルタの女性。青年が、こちらを見て立ち止まった。
    # speaker: gt_nikhil
    # voice: gt_agra_date_chini_rauza_nikhil_001
    君たちは……タージの、ベンチの！
    # speaker: gt_tanvi
    # voice: gt_agra_date_chini_rauza_tanvi_001
    また会えた。……今日は、ベンチは要らないの。場所は、二人で決めたから
    # speaker: narrator
    ニキルとタンヴィ。タージ・マハルで、指輪を出しそびれた二人だった。
    # speaker: gt_tanvi
    # voice: gt_agra_date_chini_rauza_tanvi_002
    地図を二人で見て、名前もちゃんと読めない場所を選んだの。誰かの有名な恋の話の、背景にならない所がよかった
    # speaker: gt_tanvi
    # voice: gt_agra_date_chini_rauza_tanvi_003
    それに、色が少しだけ残ってるでしょう。全部きれいに残ってるより、ちょっとだけ残ってる方が、本当っぽい
    # speaker: narrator
    ニキルが、折りたたんだ紙をジャグディープに差し出した。撮ってほしい構図の一覧。三十枚。タンヴィが、その紙をそっと取り上げて、自分の鞄にしまった。
    # speaker: gt_tanvi
    # voice: gt_agra_date_chini_rauza_tanvi_004
    今日は、一枚も決めないで撮って。……写真屋さんを呼んだのは、この人の、唯一のわがままなの
    # speaker: narrator
    # leave: gt_tanvi
    # leave: gt_nikhil
    代役の二人は、柱の陰に隠れた。アーチの下で、ニキルが膝をつく。今度の箱は、空っぽではなかった。
    タンヴィの返事は、柱の陰まで聞こえた。
    # speaker: gt_tanvi
    # pause: 800
    # leave: gt_tanvi
    # voice: gt_agra_date_chini_rauza_tanvi_005
    # photo: gt_album_a099 # photo_caption: 「……ハーン」 # photo_with: gt_nikhil gt_tanvi gt_jagdeep
    ……ハーン
    # speaker: narrator
    # local_word: gt_agra_word_haan
    短い、ヒンディー語の、はい、だった。
    # speaker: heroine
    # reaction: heroine,happy,heart
    # voice: gt_agra_date_chini_rauza_016
    言った。今、ちゃんと言った。場所から、一緒に決めたら、本当に同じ答えになった
- else:
    # speaker: narrator
    プネーから来た二人だった。半年後に式を挙げるという。この場所を選んだのは、花嫁になる方だった。
    # speaker: gt_agra_chini_bride
    # voice: gt_agra_date_chini_rauza_agra_chini_bride_001
    タージは、みんなが撮るでしょう。わたしたちの写真の後ろに、ほかの人の恋の話が写るのは、ちょっと嫌だったの
    # speaker: gt_agra_chini_bride
    # voice: gt_agra_date_chini_rauza_agra_chini_bride_002
    ここは、色が少しだけ残ってる。全部残ってるより、ちょっとだけ残ってる方が本当っぽくて、わたしたちに似てる気がして
    # speaker: narrator
    # leave: gt_agra_chini_bride
    撮影が始まると、代役の二人は柱の陰に下がった。アーチの下で、花婿になる方が、花嫁の髪についた埃を、真剣な顔で取ってやっていた。
    # speaker: narrator
    # photo: gt_album_a100 # photo_caption: 構図にない一枚 # photo_with: gt_jagdeep
    ジャグディープは、構図にない、その一枚を一番長く撮っていた。
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_date_chini_rauza_017
    決めた構図より、決めてない方が、いい写真になるんだね
}
# speaker: narrator
# photo: gt_album_a101 # photo_caption: 代役の試し撮り # photo_with: gt_jagdeep
撮影の終わりに、ジャグディープが携帯を見せてくれた。光を決めるための試し撮り。アーチの下で膝をつく一人と、どこを見ればいいか分からない顔で立つ一人。
# speaker: gt_jagdeep
# voice: gt_agra_date_chini_rauza_jagdeep_008
代役の写真だ。いらなければ消す。……正直、今日の試し撮りで、一番いい顔をしてる
-> gt_agra_chini_rauza_test_shot ->
# speaker: narrator
# leave: gt_jagdeep
# photo: gt_album_a102 # photo_caption: 落ちなかった青いタイル
帰りぎわ、彼女は墓廟の壁に残った青いタイルの前で立ち止まった。四百年近く、雨と日差しを受けて、それでも落ちなかった一枚。
# speaker: heroine
# voice: gt_agra_date_chini_rauza_018
ちょっとだけ残る方が、本当っぽい、か。なんだか、分かる気がする
-> END

// 【3】手伝いの knot：代役の試し撮りを残すか（噛み合いでない選択）
=== gt_agra_chini_rauza_test_shot ===
* [「残しておいてください」 # option: keep_test_shot]
    # rel: affection +1
    # speaker: heroine
    # reaction: heroine,shy,blush
    # voice: gt_agra_chini_rauza_test_shot_001
    じゃあ、わたしの携帯にも送ってもらおう。……代役の記念に
* [「消してください」 # option: delete_test_shot]
    # speaker: heroine
    # voice: gt_agra_chini_rauza_test_shot_002
    ……うん。そうだね。本物じゃないもんね
    # speaker: narrator
    ジャグディープが写真を消す間、彼女は画面から目をそらしていた。消えたのを確かめてから、小さく言った。
    # speaker: heroine
    # voice: gt_agra_chini_rauza_test_shot_003
    ちょっとだけ、もったいなかったかな
* [「君が決めて」 # option: she_decides_shot]
    # rel: trust +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_agra_chini_rauza_test_shot_004
    わたしが？　……残す。代役だったけど、緊張したのは本物だったから
- ->->
