INCLUDE modules.ink
-> DONE

// ローディー・ガーデンのデート（噛み合いの選択は2回。2回目は、フマユーン廟の回を終えたかで別の場面になる）。
// 終えていれば、スレーシュと「大学の同級生」に再会する。終えていなければ、二人を知らないまま、胸に薔薇をさした老人を見かけるだけ。
// 後の道で「一緒に言おう」を選ぶと、ミニゲーム「一緒に言う」（# minigame: say_together）で、彼女の「せーの」に声を合わせる（手伝いの knot）。

// 【3】
=== gt_delhi_date_lodhi_garden ===
# scene: date
# title: 笑う会の秘密
# when: episodes delhi >= 1
# hint: デリーの観光を一つ終えてから
# background: gt_bg_delhi_lodhi_garden
# speaker: narrator
ローディー・ガーデンの芝生には、五百年以上前の墓が、まるで大きな置物のように点々と座っている。散歩の人、走る人、ベンチで新聞を読む人。墓の方が先にあって、公園は1930年代、そのまわりに後から作られたのだという。
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_001
お墓の間を、みんなジョギングしてる。日本だと、ちょっと考えられないね
# speaker: narrator
そのとき、芝生の真ん中で、二十人ほどの輪が、いっせいに笑い出した。手を叩き、空を仰ぎ、腹を抱えて。冗談を言った人は、どこにもいない。
# speaker: heroine
# reaction: heroine,surprised_big,question
# voice: gt_delhi_date_lodhi_garden_002
え、なに？　何がおかしかったの？　誰も、何も言ってないよね？
# speaker: narrator
輪の中心にいた白い口ひげの老人が、二人に気づいて手招きした。張りのある、よく通る声だった。
# speaker: gt_delhi_lodhi_old_man
乗客の皆さま、ご注意ください。まもなく、新しい笑いが到着いたします
# speaker: gt_dubey
# cutin: name
ドゥベイと申します。鉄道の駅で、三十年、列車の案内放送をしておりました。ここは、笑うために集まる会。理由がなくても笑う。作り笑いを続けているうちに、本当の笑いに変わっていくんです
# speaker: narrator
会の人たちは、そう信じている。
# speaker: gt_dubey
ホー、ホー、ハ、ハ、ハ。手を叩いて。はい、次は電話の笑い。誰かから電話が来たつもりで、受話器に向かって笑うんです
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_lodhi_garden_003
理由がないのに笑うの、難しい……。顔が、ひきつってるのが自分で分かる
* [見えない電話を耳に当て、全力で笑う # option: phone_laugh]
    # profile: playful
    # memory: gt_delhi_date_lodhi_garden_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_delhi_date_lodhi_garden_004
        ちょ、ちょっと、声が大きい。みんな、こっち見てる……
        # speaker: narrator
        それでも、隣の老人がつられて笑い出し、輪の笑い声が一段大きくなった。彼女は、少し遅れて、小さく笑った。
    - else:
        # speaker: narrator
        架空の相手は、よほど面白いことを言ったらしい。こちらが膝を叩いて笑い転げると、彼女が先に吹き出した。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_lodhi_garden_005
        誰と話してるの、それ。だめ、止まらない。作り笑いじゃなくなっちゃった
    }
* [輪の外で、見ているだけにする # option: watch_only]
    # profile: honest
    # memory: gt_delhi_date_lodhi_garden_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_lodhi_garden_006
        見てるだけ？　……一人でやるの、恥ずかしいって分かってるのに
        # speaker: narrator
        彼女は少しだけ肩を落とし、一人で輪に入った。こちらが後から加わると、何も言わずに隣を空けた。
    - else:
        # speaker: heroine
        # emotion: teasing
        # voice: gt_delhi_date_lodhi_garden_007
        あっ、見てるだけ？　ずるい。わたしだけ変な顔させる気？
        # speaker: narrator
        腕をつかまれ、輪の中へ引っぱり込まれた。隣の老人が、こちらの肩を叩いて、頼まれてもいないのに笑い出す。結局、二人とも笑っていた。
    }
* [「一緒に入ろう」と手を差し出す # option: join_hand]
    # profile: bold
    # memory: gt_delhi_date_lodhi_garden_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # voice: gt_delhi_date_lodhi_garden_008
        あ、手は……ううん、大丈夫。並んでやろう
        # speaker: narrator
        差し出した手は、見えない電話を持つ手になった。並んで笑ううち、彼女の声も、だんだん本物になっていった。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_delhi_date_lodhi_garden_009
        ……うん。一人だと恥ずかしいけど、二人なら、恥ずかしさも半分だね
        # speaker: narrator
        手をつないだまま、二人で見えない電話を耳に当てた。相手のいない電話に笑ううち、彼女の笑い声が、だんだん本物になっていった。
    }
-
{ cond("episode gt_delhi_main_humayun_tomb"):
    -> suresh_again
- else:
    -> rose_stranger
}

= suresh_again
# speaker: narrator
輪の向こう側で、誰よりも大きな声で笑っている老人がいた。胸ポケットに、赤い薔薇。隣には、淡い色のサリーの女性。
目が合った。老人の笑いが、途中で止まった。フマユーン廟で、姪とその同級生を問い詰めていた、あの元調査官だった。
# speaker: heroine
# reaction: heroine,surprised,interrobang
# voice: gt_delhi_date_lodhi_garden_010
スレーシュさん！
# speaker: gt_dubey
はい、次はあいさつの笑い。全員と握手して、言葉のかわりに笑いましょう
# speaker: narrator
逃げ場はなかった。スレーシュは彼女の手を握り、律儀に笑いながら、早口でささやいた。
# speaker: gt_suresh
ハ、ハ、ハ。……今日も、誰も、誰にも会わなかった。ハ、ハ
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_011
ハ、ハ……はい。ハ
# speaker: narrator
# se: camera_shutter
会の最後に、ドゥベイが集合写真を撮った。新入りにも送るからと、二人の番号を聞いていく。スレーシュは写真の端で、新聞で顔を隠していた。
それから、観念したように、女性を連れてやってきた。
# speaker: gt_suresh
ミーナだ。大学の同級生。……週に二回、ここで笑っている。健康のためだ。あくまで健康の
# speaker: gt_meena
# cutin: name
この人、四十年前の教室では一度も笑わなかったのよ。あなたたち、すごいものを見たわね
# speaker: gt_suresh
家族に知れたら、夕飯の前に親戚中に知れる。この年で何をしている、と笑われる
# speaker: narrator
彼女が、ほんの一瞬、目を見開いた。廟の庭で、姪のメヘルも、ほとんど同じことを言っていた。
# speaker: heroine
# emotion: serious
# voice: gt_delhi_date_lodhi_garden_012
メヘルさんなら、笑わないと思います
# speaker: gt_suresh
どうして、そう言い切れる
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_013
理由は、言えません。わたしが言っていいことじゃないので。……でも、たぶん、笑いません
# speaker: narrator
スレーシュは長いこと彼女の顔を見ていた。三十五年、話の合わない申告を見抜いてきた目だった。
* [「自分たちは、今日も誰にも会っていません」 # option: keep_secret]
    # profile: attentive
    # set: gt_delhi_suresh_kept_secret
    { romance_result == "negative":
        # speaker: gt_suresh
        よろしい。申告に誤りなし
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_lodhi_garden_014
        ……それで、いいのかな
        # speaker: narrator
        彼女の小さな声は、東の門へ歩いていく二人には届かなかった。
    - else:
        # speaker: gt_suresh
        よろしい。申告に誤りなし
        # speaker: narrator
        スレーシュは胸の薔薇を指で直し、ミーナと並んで東の門へ歩いていった。笑う会の後なのに、背中が少し誇らしげだった。
    }
* [「笑う会の写真、メヘルさんに送ってみたら」 # option: suggest_tell]
    # profile: bold
    # set: gt_delhi_suresh_encouraged
    { romance_result == "negative":
        # speaker: gt_suresh
        君に申告の指導を受ける覚えはない
        # speaker: gt_meena
        まあまあ。……いい考えだと、わたしは思うけれど
    - else:
        # speaker: gt_suresh
        わしが？　自分から？　……それは、自主申告というやつだな
        # speaker: gt_meena
        いい考えね。わたしは、隠れるのは四十年で十分
    }
    # speaker: narrator
    スレーシュは携帯を取り出し、さっきの集合写真を開いたまま、しばらく固まっていた。送ったかどうかは、分からない。
    # speaker: gt_suresh
    結果は、笑う会の連絡で知らせる
    # speaker: narrator
    それだけ言って、帰っていった。
* [「ミーナさんは、どう思いますか」と聞く # option: ask_meena]
    # profile: honest
    # set: gt_delhi_suresh_kept_secret
    { romance_result == "negative":
        # speaker: gt_meena
        わたしに決めさせないで。それは、この人の申告だもの
        # speaker: narrator
        スレーシュは返事のかわりに、咳払いを一つした。
    - else:
        # speaker: gt_meena
        この人が決めることよ。でも、決めるまでは、一緒に笑っててあげる
        # speaker: narrator
        スレーシュは返事のかわりに、小さく一回だけ笑った。
        # speaker: gt_suresh
        ……ハ
        # speaker: narrator
        たぶん、本物の方だった。
    }
- -> two_of_us

= rose_stranger
# speaker: narrator
輪の向こう側で、誰よりも大きな声で笑っている老人がいた。胸ポケットに、赤い薔薇。隣には、淡い色のサリーの女性。会が終わると、二人は人目を避けるように、別々の門から出ていった。
# speaker: heroine
# reaction: heroine,teasing,heart
# voice: gt_delhi_date_lodhi_garden_015
見た？　あのおじいさん、胸に薔薇さしてた。デートかな。別々に帰るところまで、本気だね
# speaker: narrator
ドゥベイが、二人の前に立った。会の最後に、新入りには、いつも一つ頼むことがあるという。
# speaker: gt_dubey
わたしの決まり文句を、大きな声で。『乗客の皆さま、ご注意ください』。ヒンディー語でね。ヤートリーガン、クリプヤー、ディヤーン、デーン
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_016
や、ヤートリーガン、クリプヤー、ディヤーン、デーン
# speaker: gt_dubey
小さい。駅は広いんです。一番奥のホームまで届かせて
* [「一緒に言おう」と声を合わせる # option: shout_together]
    # profile: playful
    -> gt_delhi_lodhi_garden_say_together ->
* [「君なら、届くよ」とだけ言う # option: you_can_reach]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_lodhi_garden_018
        ……そう言われると、余計に出ないかも
        # speaker: narrator
        それでも彼女は息を吸い、さっきより、ほんの少しだけ大きな声で言い切った。
    - else:
        # speaker: narrator
        彼女は一度だけこちらを見て、息を吸った。
        # speaker: heroine
        # reaction: heroine,surprised_big,exclamation
        # size: large
        # voice: gt_delhi_date_lodhi_garden_019
        ヤートリーガン、クリプヤー、ディヤーン、デーン！
        # speaker: narrator
        思ったより大きな声が出て、本人がいちばん驚いていた。
    }
* [「もっと大きく！」と、ドゥベイの真似をする # option: mimic_dubey]
    # profile: provocative
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        # voice: gt_delhi_date_lodhi_garden_020
        からかわないで。本当に恥ずかしいんだから
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_lodhi_garden_021
        似てる！　ふふっ、もう、笑っちゃって言えない
        # speaker: heroine
        # reaction: heroine,happy,music
        # size: large
        # voice: gt_delhi_date_lodhi_garden_022
        ディヤーン、デーン！
        # speaker: narrator
        笑いながらの声は、今日いちばん大きかった。
    }
-
# speaker: gt_dubey
合格。退職してから、毎日、誰にも話しかけることがなくなりましてね。それで、この会を始めたんです。声には、行き先が要る
-> two_of_us

= two_of_us
# speaker: narrator
人がいなくなった芝生を、二人で歩いた。大きなドームの墓の階段に腰を下ろすと、日陰の石は、まだ少しひんやりしていた。
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_023
ねえ、さっきの、もう一回やってみる。理由のない笑い
# speaker: narrator
彼女は真顔で言った。
# speaker: heroine
# voice: gt_delhi_date_lodhi_garden_024
ハ、ハ、ハ
# speaker: narrator
三回目で、自分で吹き出した。
# speaker: heroine
# reaction: heroine,happy,music
# voice: gt_delhi_date_lodhi_garden_025
だめだ、一人だと、ただの変な人だね。理由のない笑いって、誰かと一緒じゃないと、できないのかも
# speaker: heroine
# emotion: smile
# voice: gt_delhi_date_lodhi_garden_026
理由がなくても笑っていいって言われると、ちょっと楽になるね。わたし、いつも、笑っていい理由を探してから笑ってた気がする
-> END

// 【3】手伝いの knot：「一緒に言おう」（ミニゲーム「一緒に言う」 # minigame: say_together）。
// 彼女が「せー」「の」と数え、次の拍で言う。主人公はそれに合わせて「言う」を押す。大きさではなく、出だしのタイミングを合わせる
// （2026-11-13 ユーザー判断）。結果は、そろった（together）・先に言った（early）・出遅れた（late）・言わなかった（silent）。
// 場面の中の選択なので噛み合いはなく、関係値も動かさない（噛み合いは、この前の「一緒に言おう」の選択で1回）。
// 彼女の声の大きさと気持ちは、その噛み合いの romance_result のまま分ける。結果の後は、ドゥベイの「合格」へ合流する。
=== gt_delhi_lodhi_garden_say_together ===
{ romance_result == "negative":
    # speaker: heroine
    # emotion: worried
    うん。じゃあ、『せーの』で。……わたしの声が小さくても、笑わないでね
- else:
    # speaker: heroine
    # reaction: heroine,happy,music
    うん、二人なら届きそう。わたしが『せーの』って言うから、その次ね
}
# speaker: narrator
# minigame: say_together auto together
彼女は小さく息を吸って、こちらを見た。
* [声を合わせた：「の」の次の拍で、二人の声がそろった # option: together]
    { romance_result == "negative":
        # speaker: narrator
        出だしは、ぴったり重なった。二人の声は、芝生の向こうの墓まで届いた。ただ、届いたのはほとんどこちらの声だった。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_delhi_date_lodhi_garden_017
        ……今の、九割くらい、そっちの声だったよ
    - else:
        # speaker: narrator
        出だしが、ぴたりと重なった。二人の声が、芝生の向こうの墓まで届いた。散歩の人が振り返り、ジョギングの若者が、走りながら笑った。
        # speaker: heroine
        # reaction: heroine,happy,music
        そろった！　今の、ぴったりだったよね
    }
* [声を合わせた：合図より先に、こちらが言った # option: early]
    # speaker: narrator
    こちらの声だけが、先に飛び出した。一人分の声が芝生を渡っていき、少し遅れて、彼女の声が追いかけてきた。
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        えっ、もう？　……わたし、置いていかれちゃった
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        早いよ！　『その次』って言ったのに。ふふ、一人で全部言っちゃうんだもん
    }
    # speaker: gt_dubey
    ただいまの列車は、定刻より早く発車いたしました。お乗り遅れのお客様が、お一人
* [声を合わせた：彼女が先に言い、こちらは後から続いた # option: late]
    # speaker: narrator
    「の」の次の一拍で、彼女の声だけが先に出た。こちらの声は、その後から追いかけた。
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        今の、わたしの声だけ先に出てた。……恥ずかしい
    - else:
        # speaker: heroine
        # reaction: heroine,surprised_big,exclamation
        遅いよ！　一瞬、わたし一人で叫んでた
        # speaker: narrator
        そう言いながら、彼女は笑っていた。
    }
    # speaker: gt_dubey
    後続の列車は、少々遅れての到着となりました
* [声を合わせた：こちらは言わず、彼女が一人で言った # option: silent]
    # speaker: narrator
    「の」の次の一拍で、彼女の声だけが芝生に響いた。こちらの口は、開いたまま動かなかった。
    { romance_result == "negative":
        # speaker: narrator
        最後の「デーン」は、ほとんど聞こえなかった。彼女は、ゆっくりこちらを向いた。
        # speaker: heroine
        # emotion: worried
        ……一緒にって、言ったよね
    - else:
        # speaker: narrator
        彼女は最後まで言い切ってから、ゆっくりこちらを向いた。
        # speaker: heroine
        # reaction: heroine,teasing,question
        もしかして、わざと黙ってた？
        # speaker: heroine
        # reaction: heroine,happy,music
        もう。……でも、言えちゃった。一人で、最後まで
    }
    # speaker: gt_dubey
    お知らせいたします。列車が一本、運休となりました
- ->->
