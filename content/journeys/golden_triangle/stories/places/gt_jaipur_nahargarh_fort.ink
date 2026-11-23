INCLUDE modules.ink
-> DONE

// ナハルガル城のデート（二人きり。噛み合いの選択は2回）。
// かくれんぼはミニゲーム「かくれんぼ」（# minigame: nahargarh_hide_seek）。選択肢の代わりに、同じ形の扉が並ぶ廊下で彼女を探す。
// 彼女は七つ目の扉（hide 7）。扉を開ける（1つ目か2つ目で見つけたら door_quick、3つ目以降なら door_by_door）・
// 「名前を呼ぶ」を3回（call_her_name）・何もしないで待つ（just_wait）。結果の選択肢の # profile: で1回目の噛み合いが決まる。
// 扉には名前を描かない（扉に王妃の名前が書かれていたことは確かめられていないので、地の文でも言わない）。

// 【3】
=== gt_jaipur_date_nahargarh_fort ===
# scene: date
# title: 同じ形の部屋
# when: episodes jaipur >= 1
# hint: ジャイプールの観光を一つ終えてから
# background: gt_bg_jaipur_nahargarh_fort
# speaker: narrator
# photo: gt_album_j073 # photo_caption: 碁盤の目の旧市街
ナハルガル城は、ジャイプールの町を見下ろす尾根の上にあった。城壁の端に立つと、桃色の旧市街が、碁盤の目のまま足もとに広がっている。
# term: gt_term_nahar_singh_bhomia
砦の名には、言い伝えがある。この地には、ナハル・シン・ボーミヤーという人の霊がいて、砦の工事を邪魔したのだという。砦の中に彼のための祠を建てると霊は鎮まり、砦は彼の名で呼ばれるようになった。
# speaker: heroine
# voice: gt_jaipur_date_nahargarh_fort_001
幽霊に、ちゃんとあいさつしたら、工事が進んだんだ。怖い話なのに、ちょっと礼儀正しいね
# speaker: narrator
砦の奥に、二階建ての宮殿が建っていた。マーダヴェーンドラ・バワン。王と王妃たちの部屋が、九つの区画に分かれて、中庭を囲んでいる。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_date_nahargarh_fort_002
# photo: gt_album_j074 # photo_caption: 同じ部屋が、ずらっと
同じ部屋が、ずらっと……。どこにいるのか、すぐ分からなくなりそう
# speaker: narrator
部屋どうしは廊下でつながっていて、王はそこを通って、ほかの王妃に知られずに、誰の部屋にでも行けた、と伝えられている。
# speaker: narrator
# emotion: teasing
彼女は廊下の先を見て、それから、こちらを振り返った。目が、少しいたずらっぽく光っていた。
# speaker: heroine
# emotion: teasing
# voice: gt_jaipur_date_nahargarh_fort_003
# photo: gt_album_j075 # photo_caption: 「かくれんぼしよう」
ねえ、かくれんぼしよう。わたしが隠れる。百数えたら、探しに来て。ちゃんと数えてね
# speaker: narrator
# se: footsteps_run
# leave: heroine
返事を待たずに、足音が廊下の奥へ消えていった。
# minigame: nahargarh_hide_seek auto door_by_door hide 7 art.bay gt_img_jaipur_nahargarh_doorways art.room gt_img_jaipur_nahargarh_chamber
九十八、九十九、百。廊下に出ると、同じ形のアーチ、同じ形の扉、同じ色の壁が、どこまでも続いていた。自分が今、どの王妃の部屋の前にいるのかも分からない。
// かくれんぼ：選択肢の代わりにミニゲーム。探し方の ID の選択肢をゲームが選ぶ（噛み合いはここで1回）。
* [かくれんぼ：名前を呼んで探した # option: call_her_name]
    # profile: playful
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        名前を呼ぶと、声が廊下に跳ね返って、四方から同じ名前が返ってきた。こだまにまじって、小さな笑い声がしたきり、返事はない。三回目に呼んだとき、ようやく扉の陰から彼女が出てきた。
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_nahargarh_fort_004
        呼ばれたら、出たら負けな気がして。かくれんぼ、終わっちゃうでしょ
    - else:
        # speaker: narrator
        名前を呼ぶと、声が廊下に跳ね返って、四方から同じ名前が返ってきた。どこから自分の声が戻ってくるのかも分からない。
        # stand: close
        # photo: gt_album_j076 # photo_caption: 三回目に呼んだら、駆け寄ってきた
        三回目に呼んだとき、笑い声のしていた扉が開いて、彼女が駆け寄ってきた。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # photo: gt_album_j28 # photo_caption: 同じ形の扉が続く廊下で、かくれんぼ
        # voice: gt_jaipur_date_nahargarh_fort_005
        ふふっ、呼ばれたら、出たくなっちゃうでしょ。ずるい探し方。でも、うれしい探し方
    }
* [かくれんぼ：扉を一つずつ開けて見つけた # option: door_by_door]
    # profile: attentive
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        # se: door_creak
        扉を開ける。空っぽの部屋。次の扉。また同じ部屋。いくつ目かの扉を開けたとき、壁にもたれた彼女が、待ちくたびれた顔をしていた。
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_nahargarh_fort_021
        遅い……。ずっと待ってたんだよ。途中で、出ていこうかと思った
    - else:
        # speaker: narrator
        # se: door_creak
        # photo: gt_album_j077 # photo_caption: 壁の絵の前で、振り向く
        扉を開ける。空っぽの部屋。壁の絵。次の扉。また同じ部屋。いくつ目かの扉を開けたとき、壁の絵を見ていた彼女が、振り向いた。
        # speaker: heroine
        # reaction: heroine,surprised,blush
        # voice: gt_jaipur_date_nahargarh_fort_007
        あ……見つかった。一個ずつ、全部開けてきたの？
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_nahargarh_fort_022
        ちゃんと探してくれたんだね。時間かかったのに
    }
* [かくれんぼ：開けてすぐの扉で見つけた # option: door_quick]
    # profile: bold
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        # se: door_creak
        扉を開けると、もう、そこに彼女がいた。壁ぎわにしゃがもうとしたところで、目が合った。
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_nahargarh_fort_023
        ……早すぎ。ちゃんと百、数えた？
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_nahargarh_fort_031
        ちょっと、のぞいてみただけなのに。かくれんぼって、もう少し、探してほしいんだけどな
    - else:
        # speaker: narrator
        # se: door_creak
        # photo: gt_album_j078 # photo_caption: 息を止めて立っていた
        扉を開けると、もう、そこに彼女がいた。壁の絵の前で、息を止めて立っている。
        # speaker: heroine
        # reaction: heroine,surprised_big,interrobang
        # voice: gt_jaipur_date_nahargarh_fort_025
        えっ、もう？
        # speaker: heroine
        # emotion: teasing
        # voice: gt_jaipur_date_nahargarh_fort_032
        ずるい。始まったばっかりなのに、かくれんぼ、終わっちゃった。……のぞいたの、見えちゃった？
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_nahargarh_fort_027
        次は、わたしが探す番。すぐ見つけてあげるから、覚悟してね
    }
* [かくれんぼ：廊下の真ん中で待った # option: just_wait]
    # profile: provocative
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        # stand: apart
        # photo: gt_album_j079 # photo_caption: 廊下の角から、そっと
        動かずに待った。長い時間がたった。やがて、廊下の角から、彼女がそっと顔を出した。
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_nahargarh_fort_009
        ……探してくれないの？　ずっと待ってたのに。……ちょっと、さみしかった
    - else:
        # speaker: narrator
        # stand: apart
        # photo: gt_album_j079 # photo_caption: 廊下の角から、そっと
        動かずに待った。長い時間がたった。やがて、廊下の角から、彼女がそっと顔を出した。ちょっと不満そうな顔だった。
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_nahargarh_fort_033
        探してくれないの？　かくれんぼってね、隠れるのが楽しいんじゃなくて、見つけてもらうのが楽しいんだよ
        # speaker: heroine
        # emotion: teasing
        # voice: gt_jaipur_date_nahargarh_fort_034
        今の、ちゃんと覚えておいてね
    }
-
# speaker: narrator
# stand: near
並んで廊下を歩いた。どの扉の前を通っても、同じ部屋がある。その一つ一つに、王妃が住んでいたという。
# speaker: heroine
# voice: gt_jaipur_date_nahargarh_fort_030
王さまは、ほかの人に知られずに、誰の部屋にでも行けたって、言われてるんだよね。便利だけど、さみしい建物
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_nahargarh_fort_012
来てもらう方は、廊下の音を聞いて、今夜は自分の扉かなって、待ってるだけだったのかな
* [「自分なら、廊下は使わない」 # option: no_corridor]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_nahargarh_fort_013
        ……それ、ちゃんと分かって言ってる？　かっこいいこと言うの、簡単だよ
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        # voice: gt_jaipur_date_nahargarh_fort_014
        ……そっか。うん。わたしも、そっちがいい
    }
* [「待つ方も、案外楽しんでたかもしれない」 # option: waiting_fun]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_nahargarh_fort_015
        ……そうは、思えないな。待つだけって、けっこう苦しいよ
    - else:
        # speaker: heroine
        # voice: gt_jaipur_date_nahargarh_fort_016
        そうかな。……そうだったらいいな。わたしなら、待つだけは、たぶん嫌だけど
    }
* [「君なら、どうしてほしい？」 # option: ask_what_she_wants]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # voice: gt_jaipur_date_nahargarh_fort_017
        ……急に、真面目に聞くね。ちょっと、考えさせて
    - else:
        # speaker: heroine
        # voice: gt_jaipur_date_nahargarh_fort_018
        わたし？
    }
-
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_nahargarh_fort_035
わたしは、見られてもいいから、正面から来てほしいな。廊下じゃなくて、中庭を通って
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_date_nahargarh_fort_036
……それから、自分からも、行きたい。待つだけじゃなくて
# speaker: narrator
宮殿の屋上に出ると、町の全部が見えた。桃色の屋根、白い寺院の塔、遠くの湖の光。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_nahargarh_fort_020
# photo: gt_album_j081 # photo_caption: 屋上から、町の全部
あ、見て。あの辺が、たぶん、わたしたちの宿。この高さから見ると、迷ってばっかりだった道が、ちゃんと碁盤の目になってる
-> END
