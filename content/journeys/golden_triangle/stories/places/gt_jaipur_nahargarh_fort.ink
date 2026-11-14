INCLUDE modules.ink
-> DONE

// ナーハルガル砦のデート（二人きり。噛み合いの選択は2回）。
// かくれんぼはミニゲーム「かくれんぼ」（# minigame: nahargarh_hide_seek）。選択肢の代わりに、同じ形の扉が並ぶ廊下で彼女を探す。
// 彼女は七つ目の扉（hide 7）。扉を開ける（1つ目か2つ目で見つけたら door_quick、3つ目以降なら door_by_door）・
// 「名前を呼ぶ」を3回（call_her_name）・何もしないで待つ（just_wait）。結果の選択肢の # profile: で1回目の噛み合いが決まる。
// 扉には名前を描かない（扉に王妃の名前が書かれていたことは、公的な資料で確かめられていない。地の文の「伝えられている」のまま）。

// 【3】
=== gt_jaipur_date_nahargarh_fort ===
# scene: date
# title: 同じ形の部屋
# when: episodes jaipur >= 1
# hint: ジャイプールの観光を一つ終えてから
# background: gt_bg_jaipur_nahargarh_fort
# speaker: narrator
ナーハルガル砦は、ジャイプールの町を見下ろす尾根の上にあった。城壁の端に立つと、桃色の旧市街が、碁盤の目のまま足もとに広がっている。
砦の名には、言い伝えがある。この地には、ナーハル・シン・ボーミヤーという人の霊がいて、砦の工事を邪魔したのだという。砦の中に彼のための祠を建てると霊は鎮まり、砦は彼の名で呼ばれるようになった。
# speaker: heroine
幽霊に、ちゃんとあいさつしたら、工事が進んだんだ。怖い話なのに、ちょっと礼儀正しいね
# speaker: narrator
砦の奥に、二階建ての宮殿が建っていた。マーダヴェーンドラ・バワン。王と、九人の王妃のための部屋が、中庭を囲んで並んでいる。王妃たちの部屋はどれも同じ造りで、廊下でつながっていた。
部屋を間違えないように、扉には王妃たちの名前が書かれていたと伝えられている。王は廊下を通って、ほかの王妃に知られずに、誰の部屋にでも行くことができた、とも。
# speaker: heroine
# reaction: heroine,surprised,question
同じ部屋が、ずらっと……。どこにいるのか、すぐ分からなくなりそう
# speaker: narrator
彼女は廊下の先を見て、それから、こちらを振り返った。目が、少しいたずらっぽく光っていた。
# speaker: heroine
# emotion: teasing
ねえ、かくれんぼしよう。わたしが隠れる。百数えたら、探しに来て。ちゃんと数えてね
# speaker: narrator
# stand: apart
# se: footsteps_run
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
        呼ばれたら、出たら負けな気がして。かくれんぼ、終わっちゃうでしょ
    - else:
        # speaker: narrator
        名前を呼ぶと、声が廊下に跳ね返って、四方から同じ名前が返ってきた。どこから自分の声が戻ってくるのかも分からない。
        # stand: close
        三回目に呼んだとき、すぐ後ろの扉の陰から、くすくす笑う声がした。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # photo: gt_album_j28 # photo_caption: 同じ形の扉が続く廊下で、かくれんぼ
        ふふっ、呼ばれたら、出たくなっちゃうでしょ。ずるい探し方。でも、うれしい探し方
    }
* [かくれんぼ：扉を一つずつ開けて見つけた # option: door_by_door]
    # profile: attentive
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        # se: door_creak
        扉を開ける。空っぽの部屋。次の扉。また同じ部屋。七つ目の扉を開けたとき、壁にもたれた彼女が、待ちくたびれた顔をしていた。
        # speaker: heroine
        # emotion: exasperated
        遅い……。ずっと待ってたんだよ。途中で、出ていこうかと思った
    - else:
        # speaker: narrator
        # se: door_creak
        扉を開ける。空っぽの部屋。壁の絵。次の扉。また同じ部屋。七つ目の扉を開けたとき、壁の絵の前で、彼女が背中を向けて立っていた。
        # speaker: heroine
        # reaction: heroine,surprised,blush
        あ……見つかった。一個ずつ、全部開けてきたの？
        # speaker: heroine
        # emotion: smile
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
        ……早すぎ。ちゃんと百、数えた？
        # speaker: heroine
        # emotion: worried
        ちょっと、のぞいてみただけなのに。かくれんぼって、もう少し、探してほしいんだけどな
    - else:
        # speaker: narrator
        # se: door_creak
        扉を開けると、もう、そこに彼女がいた。壁の絵の前で、息を止めて立っている。
        # speaker: heroine
        # reaction: heroine,surprised_big,interrobang
        えっ、もう？
        # speaker: heroine
        # emotion: teasing
        ずるい。始まったばっかりなのに、かくれんぼ、終わっちゃった。……のぞいたの、見えちゃった？
        # speaker: heroine
        # emotion: smile
        次は、わたしが探す番。すぐ見つけてあげるから、覚悟してね
    }
* [かくれんぼ：廊下の真ん中で待った # option: just_wait]
    # profile: provocative
    # memory: gt_jaipur_date_nahargarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        動かずに待った。長い時間がたった。やがて、廊下の角から、彼女がそっと顔を出した。
        # speaker: heroine
        # emotion: worried
        ……探してくれないの？　ずっと待ってたのに。……ちょっと、さみしかった
    - else:
        # speaker: narrator
        動かずに待った。長い時間がたった。やがて、廊下の角から、彼女がそっと顔を出した。ちょっと不満そうな顔だった。
        # speaker: heroine
        # emotion: exasperated
        探してくれないの？　かくれんぼってね、隠れるのが楽しいんじゃなくて、見つけてもらうのが楽しいんだよ。今の、ちゃんと覚えておいてね
    }
-
# speaker: narrator
# stand: near
並んで廊下を歩いた。どの扉の前を通っても、同じ部屋がある。この中に一人ずつ、王妃が住んでいた。
# speaker: heroine
王さまは、ほかの人に知られずに、誰の部屋にでも行けたんだよね。便利だけど、さみしい建物
# speaker: heroine
# emotion: serious
来てもらう方は、廊下の音を聞いて、今夜は自分の扉かなって、待ってるだけだったのかな
* [「自分なら、廊下は使わない」 # option: no_corridor]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        ……それ、ちゃんと分かって言ってる？　かっこいいこと言うの、簡単だよ
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        ……そっか。うん。わたしも、そっちがいい
    }
* [「待つ方も、案外楽しんでたかもしれない」 # option: waiting_fun]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        ……そうは、思えないな。待つだけって、けっこう苦しいよ
    - else:
        # speaker: heroine
        そうかな。……そうだったらいいな。わたしなら、待つだけは、たぶん嫌だけど
    }
* [「君なら、どうしてほしい？」 # option: ask_what_she_wants]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        ……急に、真面目に聞くね。ちょっと、考えさせて
    - else:
        # speaker: heroine
        わたし？
    }
-
# speaker: heroine
# emotion: serious
わたしは、見られてもいいから、正面から来てほしいな。廊下じゃなくて、中庭を通って。……それから、自分からも、行きたい。待つだけじゃなくて
# speaker: narrator
宮殿の屋上に出ると、町の全部が見えた。桃色の屋根、白い寺院の塔、遠くの湖の光。
# speaker: heroine
# emotion: smile
あ、見て。あの辺が、たぶん、わたしたちの宿。この高さから見ると、迷ってばっかりだった道が、ちゃんと碁盤の目になってる
-> END
